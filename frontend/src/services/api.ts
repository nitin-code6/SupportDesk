import {
  TicketListItem, TicketDetail, OverviewMetrics, CategoryMetric,
  EscalationOutcomeMetric, AgentMetric, VolumeTrendMetric,
  EscalationReadiness, AIHealthStatus, AISummaryResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  // Tickets
  async getTickets(params: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    priority?: string;
    status?: string;
    assigned_agent?: string;
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
    const res = await fetch(`${API_BASE}/tickets/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch ticket ${id}`);
    return res.json();
  },

  async updateTicketStatus(id: string, status: string, notes?: string, actor: string = 'Support Agent'): Promise<TicketDetail> {
    const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, actor }),
    });
    if (!res.ok) throw new Error('Failed to update ticket status');
    return res.json();
  },

  async updateTicketNotes(id: string, notes: string, actor: string = 'Support Agent'): Promise<TicketDetail> {
    const res = await fetch(`${API_BASE}/tickets/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, actor }),
    });
    if (!res.ok) throw new Error('Failed to update ticket notes');
    return res.json();
  },

  // Investigation
  async getChecks(ticketId: string) {
    const res = await fetch(`${API_BASE}/investigation/${ticketId}/checks`);
    if (!res.ok) throw new Error('Failed to fetch checks');
    return res.json();
  },

  async updateCheck(ticketId: string, checkId: number, status: string, findings?: string) {
    const res = await fetch(`${API_BASE}/investigation/${ticketId}/checks/${checkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, findings }),
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
  }) {
    const res = await fetch(`${API_BASE}/escalations/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw err;
    }
    return res.json();
  },

  // Analytics
  async getOverviewMetrics(clientId?: string, category?: string): Promise<OverviewMetrics> {
    const query = new URLSearchParams();
    if (clientId) query.append('client_id', clientId);
    if (category) query.append('category', category);
    const res = await fetch(`${API_BASE}/analytics/overview?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  },

  async getCategoryMetrics(): Promise<CategoryMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/categories`);
    if (!res.ok) throw new Error('Failed to fetch category metrics');
    return res.json();
  },

  async getEscalationOutcomes(): Promise<EscalationOutcomeMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/escalation-outcomes`);
    if (!res.ok) throw new Error('Failed to fetch escalation outcomes');
    return res.json();
  },

  async getAgentMetrics(): Promise<AgentMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/agents`);
    if (!res.ok) throw new Error('Failed to fetch agent metrics');
    return res.json();
  },

  async getVolumeTrends(): Promise<VolumeTrendMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/trends`);
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
