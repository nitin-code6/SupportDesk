"""
Comprehensive Multi-Provider AI Integration Tests (Gemini + Groq)
Tests rotation, automatic fallback, failure handling, schema validation, and health tracking.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.ai.schemas import (
    TicketSummarizationInput, TicketSummaryResponse,
    InvestigationAssistantInput, EscalationSummaryInput
)
from app.ai.base_provider import BaseAIProvider
from app.ai.rotation_manager import RotationManager
from app.ai.provider_manager import AIProviderManager
from app.ai.response_validator import ResponseValidator
from app.ai.exceptions import (
    AIAuthenticationError, AIRateLimitError, AITimeoutError,
    AIValidationError, AllAIProvidersFailedError
)

# Sample valid JSON outputs
SAMPLE_SUMMARY_JSON = """{
  "issue_summary": "Cab allocation sync failure for shift 2 roster",
  "reported_symptoms": ["Roster uploaded but cabs not scheduled"],
  "affected_service": "Roster & Booking",
  "important_information": ["Enterprise tier SLA applicable"],
  "missing_information": ["Employee pickup coordinates format"],
  "potential_investigation_areas": ["Shift cutoff window", "Upload header format"]
}"""

SAMPLE_ASSIST_JSON = """{
  "possible_causes": ["Header mismatch in CSV", "Cutoff passed"],
  "suggested_diagnostic_checks": ["Verify column names", "Check server timestamp"],
  "additional_information_required": ["Raw CSV payload"],
  "recommended_next_steps": ["Guide client to use v2 template"],
  "confidence_assessment": "High (90%)"
}"""

SAMPLE_ESCALATION_JSON = """{
  "original_issue": "Sync failure",
  "concise_problem_summary": "Sync daemon dropped batches",
  "investigation_performed": ["Verified template", "Checked ping"],
  "actual_recorded_results": ["Template valid, backend 500 error"],
  "missing_information": ["None"],
  "escalation_reason": "Backend batch processor crashed",
  "reproduction_steps": ["Upload batch with 50+ entries"],
  "expected_vs_actual": {"expected": "200 OK", "actual": "500 Internal Server Error"}
}"""

@pytest.fixture
def mock_input():
    return TicketSummarizationInput(
        ticket_id="SUP-101",
        client_name="Test Corp",
        client_tier="Enterprise",
        category="Roster / booking not syncing",
        priority="P1",
        description="Roster not syncing cabs for shift"
    )

def test_response_validator_extracts_clean_json():
    raw_markdown = f"```json\n{SAMPLE_SUMMARY_JSON}\n```"
    extracted = ResponseValidator.extract_json_from_text(raw_markdown)
    assert extracted["issue_summary"] == "Cab allocation sync failure for shift 2 roster"
    assert len(extracted["reported_symptoms"]) == 1

def test_response_validator_rejects_malformed_json():
    with pytest.raises(AIValidationError):
        ResponseValidator.extract_json_from_text("Sorry, I cannot answer this request.")

def test_round_robin_rotation_alternates():
    manager = RotationManager(strategy="round_robin")
    p1 = MagicMock(spec=BaseAIProvider)
    p1.name = "gemini"
    p1.is_configured = True
    
    p2 = MagicMock(spec=BaseAIProvider)
    p2.name = "groq"
    p2.is_configured = True
    
    providers = {"gemini": p1, "groq": p2}
    
    # First request -> primary p1 (gemini), fallback p2 (groq)
    order1 = manager.select_providers(providers)
    assert order1[0].name == "gemini"
    assert order1[1].name == "groq"
    
    # Second request -> primary p2 (groq), fallback p1 (gemini)
    order2 = manager.select_providers(providers)
    assert order2[0].name == "groq"
    assert order2[1].name == "gemini"
    
    # Third request -> primary p1 (gemini)
    order3 = manager.select_providers(providers)
    assert order3[0].name == "gemini"

def test_gemini_first_strategy():
    manager = RotationManager(strategy="gemini_first")
    p1 = MagicMock(spec=BaseAIProvider)
    p1.name = "gemini"
    p1.is_configured = True
    p2 = MagicMock(spec=BaseAIProvider)
    p2.name = "groq"
    p2.is_configured = True

    order = manager.select_providers({"groq": p2, "gemini": p1})
    assert order[0].name == "gemini"
    assert order[1].name == "groq"

def test_provider_manager_successful_execution(mock_input):
    mgr = AIProviderManager()
    
    # Mock Gemini provider
    mock_gemini = MagicMock(spec=BaseAIProvider)
    mock_gemini.name = "gemini"
    mock_gemini.is_configured = True
    mock_gemini.is_available = True
    mock_gemini.summarize_ticket.return_value = TicketSummaryResponse(
        ticket_id="SUP-101",
        provider_used="gemini",
        issue_summary="Summary from Gemini",
        reported_symptoms=[],
        affected_service="Roster",
        important_information=[],
        missing_information=[],
        potential_investigation_areas=[],
        latency_ms=120.0
    )
    
    mgr.providers = {"gemini": mock_gemini}
    mgr.rotation_manager.strategy = "gemini_first"
    
    res = mgr.summarize_ticket(mock_input)
    assert res.provider_used == "gemini"
    assert res.issue_summary == "Summary from Gemini"
    mock_gemini.record_success.assert_called_once_with(120.0)

def test_provider_manager_fallback_on_gemini_failure(mock_input):
    mgr = AIProviderManager()
    
    # Gemini fails with rate limit
    mock_gemini = MagicMock(spec=BaseAIProvider)
    mock_gemini.name = "gemini"
    mock_gemini.is_configured = True
    mock_gemini.is_available = True
    mock_gemini.summarize_ticket.side_effect = AIRateLimitError("Gemini 429 Rate Limit", provider="gemini")
    
    # Groq succeeds as fallback
    mock_groq = MagicMock(spec=BaseAIProvider)
    mock_groq.name = "groq"
    mock_groq.is_configured = True
    mock_groq.is_available = True
    mock_groq.fallback_count = 0
    mock_groq.summarize_ticket.return_value = TicketSummaryResponse(
        ticket_id="SUP-101",
        provider_used="groq",
        issue_summary="Fallback Summary from Groq",
        reported_symptoms=[],
        affected_service="Roster",
        important_information=[],
        missing_information=[],
        potential_investigation_areas=[],
        latency_ms=85.0
    )
    
    mgr.providers = {"gemini": mock_gemini, "groq": mock_groq}
    mgr.rotation_manager.strategy = "gemini_first"
    
    res = mgr.summarize_ticket(mock_input)
    assert res.provider_used == "groq"
    assert res.issue_summary == "Fallback Summary from Groq"
    mock_gemini.record_failure.assert_called_once()
    mock_groq.record_success.assert_called_once_with(85.0)
    assert mock_groq.fallback_count == 1

def test_provider_manager_fallback_on_groq_failure(mock_input):
    mgr = AIProviderManager()
    
    # Groq fails with timeout
    mock_groq = MagicMock(spec=BaseAIProvider)
    mock_groq.name = "groq"
    mock_groq.is_configured = True
    mock_groq.is_available = True
    mock_groq.summarize_ticket.side_effect = AITimeoutError("Groq Timeout", provider="groq")
    
    # Gemini succeeds
    mock_gemini = MagicMock(spec=BaseAIProvider)
    mock_gemini.name = "gemini"
    mock_gemini.is_configured = True
    mock_gemini.is_available = True
    mock_gemini.fallback_count = 0
    mock_gemini.summarize_ticket.return_value = TicketSummaryResponse(
        ticket_id="SUP-101",
        provider_used="gemini",
        issue_summary="Fallback Summary from Gemini",
        reported_symptoms=[],
        affected_service="Roster",
        important_information=[],
        missing_information=[],
        potential_investigation_areas=[],
        latency_ms=110.0
    )
    
    mgr.providers = {"groq": mock_groq, "gemini": mock_gemini}
    mgr.rotation_manager.strategy = "groq_first"
    
    res = mgr.summarize_ticket(mock_input)
    assert res.provider_used == "gemini"
    assert res.issue_summary == "Fallback Summary from Gemini"
    mock_groq.record_failure.assert_called_once()
    mock_gemini.record_success.assert_called_once_with(110.0)

def test_all_providers_failed_raises_error(mock_input):
    mgr = AIProviderManager()
    mock_gemini = MagicMock(spec=BaseAIProvider)
    mock_gemini.name = "gemini"
    mock_gemini.is_configured = True
    mock_gemini.is_available = True
    mock_gemini.summarize_ticket.side_effect = Exception("Fatal failure 1")

    mock_groq = MagicMock(spec=BaseAIProvider)
    mock_groq.name = "groq"
    mock_groq.is_configured = True
    mock_groq.is_available = True
    mock_groq.summarize_ticket.side_effect = Exception("Fatal failure 2")

    mgr.providers = {"gemini": mock_gemini, "groq": mock_groq}
    
    with pytest.raises(AllAIProvidersFailedError):
        mgr.summarize_ticket(mock_input)

def test_ai_health_endpoint_masks_credentials():
    mgr = AIProviderManager()
    health = mgr.get_health_status()
    assert health.active_strategy is not None
    assert "gemini" in health.providers
    assert "groq" in health.providers
    
    # Assert credentials are NEVER in health object
    health_dict = health.model_dump()
    json_str = str(health_dict)
    assert "gsk_" not in json_str
    assert "AIza" not in json_str
    assert "AQ." not in json_str
