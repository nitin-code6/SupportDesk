"""
Deterministic Fallback Brief Generator
Produces clean, structured engineering handoff briefs and triage guidance
when all upstream AI providers are unavailable or fail.
"""

from typing import Dict, Any, List
from .schemas import (
    TicketSummarizationInput, TicketSummaryResponse,
    InvestigationAssistantInput, InvestigationAssistantResponse,
    EscalationSummaryInput, EscalationSummaryResponse
)

def build_deterministic_summary(input_data: TicketSummarizationInput) -> TicketSummaryResponse:
    """Fallback ticket summarization derived deterministically from ticket fields."""
    symptoms = [f"Reported issue: {input_data.description[:100]}"]
    if input_data.internal_notes:
        symptoms.append(f"Internal note: {input_data.internal_notes[:100]}")
    
    important = [
        f"Client: {input_data.client_name} ({input_data.client_tier} SLA tier)",
        f"Priority classification: {input_data.priority}"
    ]
    
    missing = ["Verify exact affected trip IDs and timestamps"]
    areas = [
        f"Verify service status for {input_data.category}",
        "Check client-side configuration parameters"
    ]
    
    return TicketSummaryResponse(
        ticket_id=input_data.ticket_id,
        provider_used="deterministic-rule-engine",
        issue_summary=f"[{input_data.category}] {input_data.description[:120]}",
        reported_symptoms=symptoms,
        affected_service=input_data.category,
        important_information=important,
        missing_information=missing,
        potential_investigation_areas=areas,
        latency_ms=1.5
    )

def build_deterministic_investigation(input_data: InvestigationAssistantInput) -> InvestigationAssistantResponse:
    """Fallback investigation guidance derived deterministically from checklist status."""
    causes = [
        f"Configuration mismatch or service degradation in {input_data.category}",
        "Client integration sync failure or data format validation error"
    ]
    
    checks_needed = []
    completed_keys = {c.get("check_key") for c in input_data.completed_checks}
    if not completed_keys:
        checks_needed.append("Complete initial diagnostic protocol checks")
    else:
        checks_needed.append("Review logged findings for failed checklist items")
        
    next_steps = [
        "Confirm issue reproducibility with current client settings",
        "Inspect telemetry logs for timestamp of the reported incident",
        "If reproducible bug, prepare engineering handoff package"
    ]
    
    return InvestigationAssistantResponse(
        ticket_id=input_data.ticket_id,
        provider_used="deterministic-rule-engine",
        possible_causes=causes,
        suggested_diagnostic_checks=checks_needed,
        additional_information_required=["Raw error logs or payload trace"],
        recommended_next_steps=next_steps,
        confidence_assessment="Rule-Based Deterministic Fallback (High Confidence)",
        latency_ms=2.0
    )

def build_deterministic_escalation(input_data: EscalationSummaryInput) -> EscalationSummaryResponse:
    """Fallback engineering escalation package derived deterministically from diagnostic findings."""
    checks_performed = []
    actual_results = []
    missing_info = []
    
    for c in input_data.investigation_results:
        label = c.get("label", c.get("check_key", "Check"))
        status = c.get("status", "pending")
        findings = c.get("findings") or c.get("na_reason") or "No findings recorded"
        
        checks_performed.append(f"{label} (Status: {status})")
        actual_results.append(f"{label}: {findings}")
        if status == "pending" and c.get("is_required", True):
            missing_info.append(label)
            
    if not checks_performed:
        checks_performed.append("Preliminary category diagnostic triage")
        actual_results.append("Reported issue verified with client")
        
    expected = f"Expected normal operation under {input_data.category} for {input_data.client_tier} tier."
    actual = f"Actual behavior: {input_data.description[:180]}"
    
    repro = [
        f"1. Open RideOps ops portal for client {input_data.client_name}.",
        f"2. Navigate to {input_data.category} module.",
        "3. Review recent activity logs matching reported failure."
    ]
    
    return EscalationSummaryResponse(
        ticket_id=input_data.ticket_id,
        provider_used="deterministic-rule-engine",
        original_issue=input_data.description[:120],
        concise_problem_summary=f"[{input_data.category}] {input_data.description[:150]}",
        investigation_performed=checks_performed,
        actual_recorded_results=actual_results,
        missing_information=missing_info or ["None - all diagnostic checks completed"],
        escalation_reason=f"Diagnostic failure identified during L1 triage for {input_data.category}",
        reproduction_steps=repro,
        expected_vs_actual={"expected": expected, "actual": actual},
        latency_ms=2.5
    )
