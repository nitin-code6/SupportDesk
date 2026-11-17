import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { CategoryMetric, EscalationOutcomeMetric, AgentMetric } from '../../types';

export const AnalyticsView: React.FC = () => {
  const [categories, setCategories] = useState<CategoryMetric[]>([]);
  const [outcomes, setOutcomes] = useState<EscalationOutcomeMetric[]>([]);
  const [agents, setAgents] = useState<AgentMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [c, o, a] = await Promise.all([
          api.getCategoryMetrics(),
          api.getEscalationOutcomes(),
          api.getAgentMetrics()
        ]);
        setCategories(c);
        setOutcomes(o);
        setAgents(a);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-brand-textMuted font-medium">Loading operational analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="border-b border-brand-border pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-teal" />
          <h1 className="text-2xl font-black text-brand-text tracking-tight">
            Operational Intelligence & Triage Analytics
          </h1>
        </div>
        <p className="text-xs text-brand-textMuted mt-1">
          Evidence-based diagnosis derived from 1,444 RideOps ticket records as of 30 September 2026.
        </p>
      </div>

      {/* Category Deep-Dive Table */}
      <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-brand-text">Category-Level Risk & Escalation Profile</h2>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Resolution time and CSAT degradation by functional problem domain
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-brand-border">
              <tr>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Total Volume</th>
                <th className="py-3 px-3.5">Open Backlog</th>
                <th className="py-3 px-3.5">Escalated</th>
                <th className="py-3 px-3.5">Escalation %</th>
                <th className="py-3 px-3.5">Median Res</th>
                <th className="py-3 px-3.5">Reopens</th>
                <th className="py-3 px-3.5">Mean CSAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {categories.map((c, idx) => {
                const isHeavy = c.escalation_rate_pct > 40;
                return (
                  <tr key={idx} className={`hover:bg-slate-50/80 transition ${isHeavy ? 'bg-amber-50/20' : ''}`}>
                    <td className="py-3.5 px-3.5 font-bold text-brand-text">
                      {c.category}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-slate-700">{c.total_tickets}</td>
                    <td className="py-3.5 px-3.5 font-mono font-bold text-amber-700">{c.open_tickets}</td>
                    <td className="py-3.5 px-3.5 font-mono text-slate-700">{c.escalated_tickets}</td>
                    <td className="py-3.5 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        c.escalation_rate_pct > 40 ? 'bg-rose-50 text-brand-coral border border-rose-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.escalation_rate_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-slate-700">{c.median_resolution_hours} hrs</td>
                    <td className="py-3.5 px-3.5 font-mono text-slate-500">{c.reopen_count}</td>
                    <td className="py-3.5 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        (c.avg_csat || 0) < 3.5 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {c.avg_csat ? `${c.avg_csat} / 5` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Performance & Triage Disparity */}
      <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-teal" /> Agent Triage Disparity & Coaching Needs
          </h2>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Wide variance in escalation rate (16.1% to 61.6%) confirms the absence of standardized diagnostic tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((a, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-text text-xs">{a.agent}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  a.escalation_rate_pct > 45 ? 'bg-rose-100 text-brand-coral' : 'bg-brand-tealLight text-brand-tealDark'
                }`}>
                  {a.escalation_rate_pct}% Esc
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Tickets</span>
                  <span className="font-mono text-slate-800 font-bold">{a.total_tickets}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Open Backlog</span>
                  <span className="font-mono text-amber-700 font-bold">{a.open_tickets}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mean Res</span>
                  <span className="font-mono text-slate-800 font-bold">{a.avg_resolution_hours}h</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mean CSAT</span>
                  <span className="font-mono text-emerald-700 font-bold">{a.avg_csat || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
