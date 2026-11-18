"""
AI Resilience, Chaos Mocks, PII Redaction & Concurrency Tests
"""

import pytest
from unittest.mock import MagicMock
from app.ai.pii_scrubber import scrub_text
from app.ai.base_provider import BaseAIProvider
from app.ai.deterministic_brief import (
    build_deterministic_summary,
    build_deterministic_investigation,
    build_deterministic_escalation
)
from app.ai.schemas import (
    TicketSummarizationInput,
    InvestigationAssistantInput,
    EscalationSummaryInput
)

def test_pii_scrubber_redacts_sensitive_data():
    """Verify scrubber removes emails, phone numbers, employee IDs, credit cards, and OTPs."""
    raw = (
        "Customer John at john.doe@acme-corp.com called from +91 9876543210. "
        "Employee ID EMP-88912 reported that cab OTP: 4589 failed to authenticate. "
        "Also note client corporate card 4111 2222 3333 4444 was charged incorrectly."
    )
    clean = scrub_text(raw)
    assert "john.doe@acme-corp.com" not in clean
    assert "[EMAIL-REDACTED]" in clean

    assert "9876543210" not in clean
    assert "[PHONE-REDACTED]" in clean

    assert "EMP-88912" not in clean
    assert "[EMP-ID-REDACTED]" in clean

    assert "4589" not in clean
    assert "[OTP-REDACTED]" in clean

    assert "4111" not in clean
    assert "[CARD-REDACTED]" in clean

def test_circuit_breaker_consecutive_failures_trips_to_open():
    """Verify 3 consecutive failures trips the circuit breaker to open."""
    class DummyProvider(BaseAIProvider):
        def summarize_ticket(self, input_data): pass
        def assist_investigation(self, input_data): pass
        def generate_escalation_summary(self, input_data): pass

    p = DummyProvider("test-ai", "test-model", "http://test", "dummy-key")
    assert p.is_available is True
    assert p.circuit_state == "closed"

    # 1st failure
    p.record_failure("Upstream 500 internal error")
    assert p.consecutive_failures == 1

    # 2nd failure
    p.record_failure("Upstream 500 internal error")
    assert p.consecutive_failures == 2

    # 3rd failure trips circuit breaker
    p.record_failure("Upstream 500 internal error")
    assert p.consecutive_failures == 3
    assert p.circuit_state == "open"
    assert p.is_available is False
    assert p.get_health_status().cooldown_seconds_remaining > 0

def test_fallback_attribution_separation():
    """Verify triggered_fallbacks and served_fallbacks are tracked separately."""
    class DummyProvider(BaseAIProvider):
        def summarize_ticket(self, input_data): pass
        def assist_investigation(self, input_data): pass
        def generate_escalation_summary(self, input_data): pass

    gemini = DummyProvider("gemini", "gemini-3.8-flash", "http://test", "gemini-key")
    groq = DummyProvider("groq", "gpt-oss-120b", "http://test", "groq-key")

    # Gemini fails and triggers failover
    gemini.record_triggered_fallback()
    groq.record_served_fallback()

    assert gemini.triggered_fallbacks == 1
    assert gemini.served_fallbacks == 0

    assert groq.triggered_fallbacks == 0
    assert groq.served_fallbacks == 1

    status_gemini = gemini.get_health_status()
    status_groq = groq.get_health_status()

    assert status_gemini.triggered_fallbacks == 1
    assert status_groq.served_fallbacks == 1

def test_deterministic_fallback_when_all_llms_offline():
    """Verify deterministic fallback generates valid schema responses without throwing."""
    # Escalation Summary Fallback
    esc_input = EscalationSummaryInput(
        ticket_id="SUP-10001",
        client_name="Nexus Enterprises",
        client_tier="Enterprise",
        category="Roster / booking not syncing",
        priority="P1",
        description="Shift 2 employee roster failed to sync with dispatch portal",
        investigation_results=[
            {"label": "Roster Format Validation", "status": "failed", "findings": "Missing pickup coordinates"},
            {"label": "Shift Cutoff Window", "status": "passed", "findings": "Submitted at T-140m"}
        ]
    )
    fallback = build_deterministic_escalation(esc_input)
    assert fallback.provider_used == "deterministic-rule-engine"
    assert len(fallback.investigation_performed) == 2
    assert "Roster Format Validation: Missing pickup coordinates" in fallback.actual_recorded_results
    assert len(fallback.reproduction_steps) > 0
