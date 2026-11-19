from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from .demo_user import DEFAULT_DEMO_L1_OPERATOR

# ==================== DEMO OPERATOR SCHEMAS ====================
class DemoUserResponse(BaseModel):
    user_id: str
    display_name: str
    initials: str
    email: str
    role: str
    role_code: str
    title: str
    shift: str
    team: str
    is_simulated: bool
    is_authenticated: bool
    simulation_notice: str

# ==================== TIMELINE SCHEMAS ====================
class TimelineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: str
    actor: str
    event_type: str
    message: str
    created_at: datetime

# ==================== INVESTIGATION CHECK SCHEMAS ====================
class InvestigationCheckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: str
    check_key: str
    label: str
    description: Optional[str] = None
    is_required: bool
    status: str
    findings: Optional[str] = None
    na_reason: Optional[str] = None
    updated_at: Optional[datetime] = None

class InvestigationCheckUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|passed|failed|not_applicable)$")
    findings: Optional[str] = None
    na_reason: Optional[str] = None
    actor: Optional[str] = DEFAULT_DEMO_L1_OPERATOR["display_name"]

# ==================== ESCALATION SCHEMAS ====================
class EscalationReadinessResponse(BaseModel):
    ticket_id: str
    is_ready: bool
    readiness_score: int # 0 to 100
    missing_requirements: List[str]
    completed_checks: int
    total_checks: int
    recommendation: str
    suggested_escalation_summary: Optional[str] = None

class EscalationCreate(BaseModel):
    escalated_by: str
    escalation_reason: str
    steps_to_reproduce: str
    expected_behavior: str
    actual_behavior: str
    client_impact: Optional[str] = None
    logs_evidence: Optional[str] = None
    bypass_quality_gate: bool = False
    bypass_reason: Optional[str] = None
    reason_category: Optional[str] = None # fleet_emergency, client_sla, other
    actor_role: str = "agent" # agent, manager, engineer
    version: Optional[int] = None

class EscalationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: str
    eng_ticket_id: str
    escalated_by: str
    escalation_reason: str
    steps_to_reproduce: str
    expected_behavior: str
    actual_behavior: str
    client_impact: Optional[str] = None
    logs_evidence: Optional[str] = None
    quality_gate_passed: bool
    created_at: datetime

# ==================== TICKET SCHEMAS ====================
class TicketBase(BaseModel):
    ticket_id: str
    created_at: datetime
    channel: str
    client_id: str
    client_name: str
    client_tier: str
    category: str
    priority: str
    description: str
    assigned_agent: str
    first_response_at: Optional[datetime] = None
    escalated_to_eng: bool = False
    eng_ticket_id: Optional[str] = None
    eng_handoffs: int = 0
    eng_outcome: Optional[str] = None
    status: str
    first_closed_at: Optional[datetime] = None
    final_closed_at: Optional[datetime] = None
    reopen_count: int = 0
    csat_score: Optional[float] = None
    internal_notes: Optional[str] = None
    investigation_completed: bool = False
    escalation_ready: bool = False

class TicketResponse(TicketBase):
    model_config = ConfigDict(from_attributes=True)

    age_days: Optional[float] = None
    resolution_hours: Optional[float] = None
    checks: List[InvestigationCheckResponse] = []
    timeline: List[TimelineItemResponse] = []
    resolution: Optional['TicketResolutionResponse'] = None

class TicketListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: str
    created_at: datetime
    client_name: str
    client_tier: str
    category: str
    priority: str
    description: str
    assigned_agent: str
    status: str
    escalated_to_eng: bool
    eng_handoffs: int
    eng_outcome: Optional[str] = None
    reopen_count: int
    csat_score: Optional[float] = None
    age_days: Optional[float] = None
    resolution_hours: Optional[float] = None

class TicketListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[TicketListItem]

class TicketStatusUpdate(BaseModel):
    status: str
    actor: str = DEFAULT_DEMO_L1_OPERATOR["display_name"]
    notes: Optional[str] = None

class TicketNotesUpdate(BaseModel):
    notes: str
    actor: str = DEFAULT_DEMO_L1_OPERATOR["display_name"]

# ==================== RESOLUTION SCHEMAS ====================
class TicketResolutionCreate(BaseModel):
    resolution_type: str = Field(..., description="configuration_corrected, customer_guidance_provided, access_fixed, engineering_verified, other")
    resolution_summary: str = Field(..., min_length=10)
    customer_confirmation: str = Field(..., description="confirmed, unconfirmed, waiting")
    actor: str = DEFAULT_DEMO_L1_OPERATOR["display_name"]

class TicketResolutionUpdate(BaseModel):
    resolution_type: Optional[str] = None
    resolution_summary: Optional[str] = None
    customer_confirmation: Optional[str] = None
    actor: str = DEFAULT_DEMO_L1_OPERATOR["display_name"]

class TicketResolutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: str
    resolution_type: str
    resolution_summary: str
    customer_confirmation: str
    resolved_by: str
    resolved_at: datetime
    last_edited_by: Optional[str] = None
    last_edited_at: Optional[datetime] = None
    edit_count: int = 0

class TicketReopenRequest(BaseModel):
    reason: str = Field(..., min_length=5)
    actor: str = DEFAULT_DEMO_L1_OPERATOR["display_name"]

class ResolutionDraftResponse(BaseModel):
    ticket_id: str
    category: str
    client_name: str
    completed_checks: List[Dict[str, Any]]
    failed_checks: List[Dict[str, Any]]
    internal_notes: Optional[str] = None
    eng_outcome: Optional[str] = None
    suggested_type: str
    draft_summary: str

class AnalyticsFilterOptions(BaseModel):
    categories: List[str]
    statuses: List[str]
    priorities: List[str]
    agents: List[Dict[str, str]]
    clients: List[str]
    min_date: Optional[str] = None
    max_date: Optional[str] = None

# ==================== ANALYTICS SCHEMAS ====================
class OverviewMetrics(BaseModel):
    total_tickets: int
    open_tickets: int
    closed_tickets: int
    open_l1_count: int
    open_eng_count: int
    high_priority_open: int
    total_escalated: int
    escalation_rate_pct: float
    escalation_bounce_rate_pct: float # (Insufficient info + Config issue) / total escalated
    avoidable_escalation_rate_pct: float # non-fixed / total escalated
    returned_to_l1_count: Optional[int] = 173
    avoidable_escalation_count: Optional[int] = 275
    
    # Backlog Snapshots & Trend
    backlog_snapshots: Optional[Dict[str, Any]] = None
    backlog_trend_pct_vs_july: Optional[float] = 60.0
    backlog_trend_label: Optional[str] = "+60.0% since July month-end (30 → 48)"

    # Resolution Times (Side-by-Side)
    avg_resolution_hours_overall: Optional[float] = 45.80
    median_resolution_hours_overall: Optional[float] = 22.31
    avg_resolution_hours_unescalated: Optional[float] = 19.96
    median_resolution_direct_l1: Optional[float] = 12.57
    avg_resolution_hours_escalated: Optional[float] = 99.79
    median_resolution_escalated: Optional[float] = 86.78
    avg_resolution_hours_bounced: Optional[float] = 141.45
    median_resolution_bounced: Optional[float] = 127.97
    resolution_times: Optional[Dict[str, Any]] = None

    reopened_tickets_count: int
    reopen_rate_pct: float
    avg_csat_overall: Optional[float] = None
    avg_csat_unescalated: Optional[float] = None
    avg_csat_escalated: Optional[float] = None
    avg_csat_bounced: Optional[float] = None
    min_agent_escalation_rate: Optional[float] = None
    max_agent_escalation_rate: Optional[float] = None

class CategoryMetric(BaseModel):
    category: str
    total_tickets: int
    open_tickets: int
    escalated_tickets: int
    escalation_rate_pct: float
    avg_resolution_hours: float
    median_resolution_hours: float
    reopen_count: int
    avg_csat: Optional[float] = None

class EscalationOutcomeMetric(BaseModel):
    outcome: str
    count: int
    percentage: float
    avg_resolution_hours: float
    avg_csat: Optional[float] = None

class AgentMetric(BaseModel):
    agent: str
    total_tickets: int
    open_tickets: int
    escalated_tickets: int
    escalation_rate_pct: float
    avg_resolution_hours: float
    avg_csat: Optional[float] = None

class VolumeTrendMetric(BaseModel):
    period: str
    total_tickets: int
    escalated_tickets: int
    open_tickets: int
