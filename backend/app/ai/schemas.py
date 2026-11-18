from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ==================== TICKET SUMMARIZATION ====================
class TicketSummarizationInput(BaseModel):
    ticket_id: str
    client_name: str
    client_tier: str
    category: str
    priority: str
    description: str
    internal_notes: Optional[str] = None

class TicketSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: str
    provider_used: str
    issue_summary: str
    reported_symptoms: List[str]
    affected_service: str
    important_information: List[str]
    missing_information: List[str]
    potential_investigation_areas: List[str]
    latency_ms: float

# ==================== INVESTIGATION ASSISTANT ====================
class InvestigationAssistantInput(BaseModel):
    ticket_id: str
    category: str
    priority: str
    description: str
    completed_checks: List[Dict[str, Any]]
    internal_notes: Optional[str] = None

class InvestigationAssistantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: str
    provider_used: str
    possible_causes: List[str]
    suggested_diagnostic_checks: List[str]
    additional_information_required: List[str]
    recommended_next_steps: List[str]
    confidence_assessment: str
    latency_ms: float

# ==================== ENGINEERING ESCALATION SUMMARY ====================
class EscalationSummaryInput(BaseModel):
    ticket_id: str
    client_name: str
    client_tier: str
    category: str
    priority: str
    description: str
    investigation_results: List[Dict[str, Any]]
    internal_notes: Optional[str] = None

class EscalationSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: str
    provider_used: str
    original_issue: str
    concise_problem_summary: str
    investigation_performed: List[str]
    actual_recorded_results: List[str]
    missing_information: List[str]
    escalation_reason: str
    reproduction_steps: List[str]
    expected_vs_actual: Dict[str, str]
    latency_ms: float

# ==================== HEALTH & OBSERVABILITY ====================
class ProviderHealthStatus(BaseModel):
    name: str
    is_configured: bool
    is_available: bool
    total_requests: int
    successful_requests: int
    failed_requests: int
    fallback_count: int
    triggered_fallbacks: int = 0
    served_fallbacks: int = 0
    consecutive_failures: int = 0
    circuit_state: str = "closed"
    rate_limit_count: int
    avg_latency_ms: float
    last_error: Optional[str] = None
    cooldown_seconds_remaining: float = 0.0
    summary_sentence: Optional[str] = None

class AIHealthStatusResponse(BaseModel):
    active_strategy: str
    fallback_enabled: bool
    healthy_providers_count: int
    providers: Dict[str, ProviderHealthStatus]
