import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  CheckCircle2, 
  FileSpreadsheet,
  Clock
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
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading comprehensive operational analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Operational Intelligence & Triage Analytics</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Evidence-based diagnosis derived from 1,444 RideOps ticket records as of 30 September 2026.
        </p>
      </div>

      {/* Category Deep-Dive Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Category-Level Risk & Escalation Profile</h3>
            <p className="text-xs text-slate-400">Resolution time and CSAT degradation by functional category</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-3">Category</th>
                <th className="px-3.5 py-3">Total Volume</th>
                <th className="px-3.5 py-3">Open Backlog</th>
                <th className="px-3.5 py-3">Escalated</th>
                <th className="px-3.5 py-3">Escalation %</th>
                <th className="px-3.5 py-3">Median Res</th>
                <th className="px-3.5 py-3">Reopens</th>
                <th className="px-3.5 py-3">Mean CSAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categories.map((c, idx) => {
                const isHeavy = c.escalation_rate_pct > 40;
                return (
                  <tr key={idx} className={`hover:bg-slate-800/40 ${isHeavy ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-3.5 py-3 font-medium text-slate-200">
                      {c.category}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-300">{c.total_tickets}</td>
                    <td className="px-3.5 py-3 font-mono font-semibold text-amber-400">{c.open_tickets}</td>
                    <td className="px-3.5 py-3 font-mono text-slate-300">{c.escalated_tickets}</td>
                    <td className="px-3.5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.escalation_rate_pct > 40 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {c.escalation_rate_pct}%
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-200">{c.median_resolution_hours} hrs</td>
                    <td className="px-3.5 py-3 font-mono text-slate-400">{c.reopen_count}</td>
                    <td className="px-3.5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        (c.avg_csat || 0) < 3.5 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
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

      {/* Agent Performance & Triage Variance */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            Agent Triage Disparity & Coaching Needs
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Wide variance in escalation rate (16.1% to 61.6%) reveals the absence of standardized diagnostic SOPs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((a, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{a.agent}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  a.escalation_rate_pct > 45 ? 'bg-rose-500/20 text-rose-300' : 'bg-sky-500/20 text-sky-300'
                }`}>
                  {a.escalation_rate_pct}% Esc
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-700/40">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Tickets</span>
                  <span className="font-mono text-slate-200 font-bold">{a.total_tickets}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Open Backlog</span>
                  <span className="font-mono text-amber-300 font-bold">{a.open_tickets}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mean Res (h)</span>
                  <span className="font-mono text-slate-200">{a.avg_resolution_hours}h</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mean CSAT</span>
                  <span className="font-mono text-emerald-400 font-bold">{a.avg_csat || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
