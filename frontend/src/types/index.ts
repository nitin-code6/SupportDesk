export interface TicketListItem {
  ticket_id: str;
  created_at: string;
  client_name: string;
  client_tier: 'Enterprise' | 'Mid-market' | 'SMB';
  category: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  description: string;
  assigned_agent: string;
  status: 'Closed' | 'Open - with L1' | 'Open - with Engineering';
  escalated_to_eng: boolean;
  eng_handoffs: number;
  eng_outcome?: string;
  reopen_count: number;
  csat_score?: number;
  age_days?: number;
  resolution_hours?: number;
}

export type str = string;

export interface InvestigationCheck {
  id: number;
  ticket_id: string;
  check_key: string;
  label: string;
  description?: string;
  is_required: boolean;
  status: 'pending' | 'passed' | 'failed' | 'not_applicable';
  findings?: string;
  na_reason?: string;
  updated_at?: string;
}

export interface TicketTimelineItem {
  id: number;
  ticket_id: string;
  actor: string;
  event_type: string;
  message: string;
  created_at: string;
}

export interface TicketDetail extends TicketListItem {
  channel: string;
  client_id: string;
  first_response_at?: string;
  eng_ticket_id?: string;
  first_closed_at?: string;
  final_closed_at?: string;
  internal_notes?: string;
  investigation_completed: boolean;
  escalation_ready: boolean;
  version: number;
  checks: InvestigationCheck[];
  timeline: TicketTimelineItem[];
}

export interface OverviewMetrics {
  total_tickets: number;
  open_tickets: number;
  closed_tickets: number;
  open_l1_count: number;
  open_eng_count: number;
  high_priority_open: number;
  total_escalated: number;
  escalation_rate_pct: number;
  escalation_bounce_rate_pct: number;
  avoidable_escalation_rate_pct: number;
  returned_to_l1_count?: number;
  avoidable_escalation_count?: number;
  backlog_trend_pct_vs_july?: number;
  backlog_trend_label?: string;
  backlog_snapshots?: {
    current_open: number;
    open_l1_count: number;
    open_eng_count: number;
    jul_month_end: number;
    aug_month_end: number;
    sep_month_end: number;
    trend_pct_vs_july: number;
    trend_pct_vs_august: number;
    trend_direction: string;
    comparison_label: string;
  };
  avg_resolution_hours_overall: number;
  median_resolution_hours_overall: number;
  avg_resolution_hours_unescalated: number;
  median_resolution_direct_l1?: number;
  avg_resolution_hours_escalated: number;
  median_resolution_escalated?: number;
  avg_resolution_hours_bounced: number;
  median_resolution_bounced?: number;
  resolution_times?: any;
  reopened_tickets_count: number;
  reopen_rate_pct: number;
  avg_csat_overall?: number;
  avg_csat_unescalated?: number;
  avg_csat_escalated?: number;
  avg_csat_bounced?: number;
}

export interface CategoryMetric {
  category: string;
  total_tickets: number;
  open_tickets: number;
  escalated_tickets: number;
  escalation_rate_pct: number;
  avg_resolution_hours: number;
  median_resolution_hours: number;
  reopen_count: number;
  avg_csat?: number;
}

export interface EscalationOutcomeMetric {
  outcome: string;
  count: number;
  percentage: number;
  avg_resolution_hours: number;
  avg_csat?: number;
}

export interface AgentMetric {
  agent: string;
  total_tickets: number;
  open_tickets: number;
  escalated_tickets: number;
  escalation_rate_pct: number;
  avg_resolution_hours: number;
  avg_csat?: number;
}

export interface VolumeTrendMetric {
  period: string;
  total_tickets: number;
  escalated_tickets: number;
  open_tickets: number;
}

export interface EscalationReadiness {
  ticket_id: string;
  is_ready: boolean;
  readiness_score: number;
  missing_requirements: string[];
  completed_checks: number;
  total_checks: number;
  recommendation: string;
  suggested_escalation_summary?: string;
}

export interface ProviderHealth {
  name: string;
  is_configured: boolean;
  is_available: boolean;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  fallback_count: number;
  triggered_fallbacks?: number;
  served_fallbacks?: number;
  consecutive_failures?: number;
  circuit_state?: string;
  rate_limit_count: number;
  avg_latency_ms: number;
  last_error?: string;
  cooldown_seconds_remaining: number;
  summary_sentence?: string;
}

export interface AIHealthStatus {
  active_strategy: string;
  fallback_enabled: boolean;
  healthy_providers_count: number;
  providers: Record<string, ProviderHealth>;
}

export interface AISummaryResponse {
  ticket_id: string;
  provider_used: string;
  issue_summary: string;
  reported_symptoms: string[];
  affected_service: string;
  important_information: string[];
  missing_information: string[];
  potential_investigation_areas: string[];
  latency_ms: number;
}
