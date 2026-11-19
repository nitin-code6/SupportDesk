import {
  TicketListItem, TicketDetail, OverviewMetrics, CategoryMetric,
  EscalationOutcomeMetric, AgentMetric, VolumeTrendMetric,
  EscalationReadiness, AIHealthStatus, AISummaryResponse,
  TicketResolution, ResolutionDraft, AnalyticsFilters, AnalyticsFilterOptions
} from '../types';
import { CURRENT_DEMO_USER, DemoAgentIdentity } from '../config/demoUser';

const isRender = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
const rawApiUrl = import.meta.env.VITE_API_URL || (isRender ? 'https://supportdesk-backend-ypdr.onrender.com/api' : '/api');
const API_BASE = rawApiUrl.startsWith('http')
  ? rawApiUrl.replace(/\/$/, '') + (rawApiUrl.endsWith('/api') ? '' : '/api')
  : '/api';

function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '' && val !== 'ALL') {
      query.append(key, String(val));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
}

export const api = {
  // Demo User / Simulated Identity
  async getDemoUser(): Promise<DemoAgentIdentity> {
    try {
      const res = await fetch(`${API_BASE}/demo-user`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback to central local config
    }
    return CURRENT_DEMO_USER;
  },

  // Tickets
  async getTickets(params: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    priority?: string;
    status?: string;
    assigned_agent?: string;
    agent_id?: string;
    client_tier?: string;
    escalated_only?: boolean;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<{ total: number; page: number; total_pages: number; items: TicketListItem[] }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const res = await fetch(`${API_BASE}/tickets?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  },

  async getTicket(id: string): Promise<TicketDetail> {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/tickets/${id}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch ticket ${id} (status: ${res.status})`);
        }
        return await res.json();
      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
    }
    throw lastErr || new Error(`Failed to fetch ticket ${id}`);
  },

  async updateTicketStatus(id: string, status: string, notes?: string, actor: string = CURRENT_DEMO_USER.display_name): Promise<TicketDetail> {
    const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, actor }),
    });
    if (!res.ok) throw new Error('Failed to update ticket status');
    return res.json();
  },

  async updateTicketNotes(id: string, notes: string, actor: string = CURRENT_DEMO_USER.display_name): Promise<TicketDetail> {
    const res = await fetch(`${API_BASE}/tickets/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, actor }),
    });
    if (!res.ok) throw new Error('Failed to update ticket notes');
    return res.json();
  },

  // Resolution Workflow
  async getResolutionDraft(ticketId: string): Promise<ResolutionDraft> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/resolution-draft`);
    if (!res.ok) throw new Error('Failed to fetch resolution draft');
    return res.json();
  },

  async resolveTicket(ticketId: string, data: {
    resolution_type: string;
    resolution_summary: string;
    customer_confirmation: string;
    actor?: string;
  }): Promise<TicketDetail> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: CURRENT_DEMO_USER.display_name, ...data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to resolve ticket' }));
      throw new Error(err.detail || 'Failed to resolve ticket');
    }
    return res.json();
  },

  async updateResolution(ticketId: string, data: {
    resolution_type?: string;
    resolution_summary?: string;
    customer_confirmation?: string;
    actor?: string;
  }): Promise<TicketResolution> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/resolution`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: CURRENT_DEMO_USER.display_name, ...data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update resolution' }));
      throw new Error(err.detail || 'Failed to update resolution');
    }
    return res.json();
  },

  async reopenTicket(ticketId: string, data: {
    reason: string;
    actor?: string;
  }): Promise<TicketDetail> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: CURRENT_DEMO_USER.display_name, ...data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reopen ticket' }));
      throw new Error(err.detail || 'Failed to reopen ticket');
    }
    return res.json();
  },

  // Investigation
  async getChecks(ticketId: string) {
    const res = await fetch(`${API_BASE}/investigation/${ticketId}/checks`);
    if (!res.ok) throw new Error('Failed to fetch checks');
    return res.json();
  },

  async updateCheck(ticketId: string, checkId: number, status: string, findings?: string, na_reason?: string, actor: string = CURRENT_DEMO_USER.display_name) {
    const res = await fetch(`${API_BASE}/investigation/${ticketId}/checks/${checkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, findings, na_reason, actor }),
    });
    if (!res.ok) throw new Error('Failed to update check');
    return res.json();
  },

  async getReadiness(ticketId: string): Promise<EscalationReadiness> {
    const res = await fetch(`${API_BASE}/investigation/${ticketId}/readiness`);
    if (!res.ok) throw new Error('Failed to evaluate escalation readiness');
    return res.json();
  },

  // Escalation
  async submitEscalation(ticketId: string, data: {
    escalated_by: string;
    escalation_reason: string;
    steps_to_reproduce: string;
    expected_behavior: string;
    actual_behavior: string;
    client_impact?: string;
    logs_evidence?: string;
    bypass_quality_gate?: boolean;
    bypass_reason?: string;
    reason_category?: string;
    actor_role?: string;
    version?: number;
  }) {
    const res = await fetch(`${API_BASE}/escalations/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let errDetail: any;
      try {
        errDetail = await res.json();
      } catch {
        const rawText = await res.text().catch(() => 'Server error');
        errDetail = { detail: rawText || `Server returned error (${res.status})` };
      }
      throw errDetail;
    }
    return res.json();
  },

  // Analytics
  async getAnalyticsFilters(): Promise<AnalyticsFilterOptions> {
    const res = await fetch(`${API_BASE}/analytics/filters`);
    if (!res.ok) throw new Error('Failed to fetch analytics filters');
    return res.json();
  },

  async getOverviewMetrics(filters?: AnalyticsFilters): Promise<OverviewMetrics> {
    const query = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/overview${query}`);
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  },

  async getCategoryMetrics(filters?: AnalyticsFilters): Promise<CategoryMetric[]> {
    const query = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/categories${query}`);
    if (!res.ok) throw new Error('Failed to fetch category metrics');
    return res.json();
  },

  async getEscalationOutcomes(filters?: AnalyticsFilters): Promise<EscalationOutcomeMetric[]> {
    const query = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/escalation-outcomes${query}`);
    if (!res.ok) throw new Error('Failed to fetch escalation outcomes');
    return res.json();
  },

  async getAgentMetrics(filters?: AnalyticsFilters): Promise<AgentMetric[]> {
    const query = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/agents${query}`);
    if (!res.ok) throw new Error('Failed to fetch agent metrics');
    return res.json();
  },

  async getVolumeTrends(filters?: AnalyticsFilters): Promise<VolumeTrendMetric[]> {
    const query = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/trends${query}`);
    if (!res.ok) throw new Error('Failed to fetch volume trends');
    return res.json();
  },

  // AI Multi-Provider
  async getAIHealth(): Promise<AIHealthStatus> {
    const res = await fetch(`${API_BASE}/v1/ai/health`);
    if (!res.ok) throw new Error('Failed to fetch AI health status');
    return res.json();
  },

  async summarizeTicketAI(ticketId: string): Promise<AISummaryResponse> {
    const res = await fetch(`${API_BASE}/v1/ai/summarize/${ticketId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'AI summarization failed');
    }
    return res.json();
  },

  async assistInvestigationAI(ticketId: string) {
    const res = await fetch(`${API_BASE}/v1/ai/investigate/${ticketId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'AI investigation assistance failed');
    }
    return res.json();
  },

  async generateEscalationSummaryAI(ticketId: string) {
    const res = await fetch(`${API_BASE}/v1/ai/escalation-summary/${ticketId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'AI escalation summary generation failed');
    }
    return res.json();
  }
};
