import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Layers,
  TrendingDown,
  AlertTriangle,
  Award,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
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

  // Prepare chart data for top categories by volume
  const chartData = categories.slice(0, 6).map((c) => ({
    name: c.category.length > 20 ? `${c.category.substring(0, 18)}...` : c.category,
    fullName: c.category,
    total: c.total_tickets,
    escalated: c.escalated_tickets,
    rate: c.escalation_rate_pct
  }));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen text-[#1E293B]">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#0D9488]" />
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Operational Intelligence & Analytics
          </h1>
        </div>
        <p className="text-xs text-[#64748B] mt-1">
          Evidence-based diagnosis derived from 1,444 RideOps ticket records as of 30 September 2026.
        </p>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">Overall Escalation Rate</span>
          <div className="text-2xl font-bold text-[#0F172A] mt-2 font-mono">33.7%</div>
          <p className="text-xs text-[#64748B] mt-2">
            486 of 1,444 tickets escalated to engineering
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">Avoidable Escalations</span>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono">56.6%</div>
          <p className="text-xs text-[#64748B] mt-2">
            275 tickets (duplicates, how-to, unverified)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">Customer Satisfaction (CSAT)</span>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">3.70 / 5</div>
          <p className="text-xs text-[#64748B] mt-2">
            Direct L1: 4.01 vs Bounced: 2.55 CSAT
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">Agent Escalation Range</span>
          <div className="text-2xl font-bold text-[#0D9488] mt-2 font-mono">16.1% – 61.6%</div>
          <p className="text-xs text-[#64748B] mt-2">
            Standardization needed across 8 triage agents
          </p>
        </div>
      </div>

      {/* Category Inflow & Escalation Visual Chart */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Volume vs. Escalation by Problem Category</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Highlighting categories with disproportionate engineering escalation volume
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#0D9488] inline-block"></span> Total Tickets
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#E11D48] inline-block"></span> Escalated to Eng
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} angle={-10} textAnchor="end" />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                formatter={(val: any, name: any) => [val, name === 'total' ? 'Total Tickets' : 'Escalated to Engineering']}
              />
              <Bar dataKey="total" fill="#0D9488" radius={[6, 6, 0, 0]} name="total" maxBarSize={40} />
              <Bar dataKey="escalated" fill="#E11D48" radius={[6, 6, 0, 0]} name="escalated" maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Deep-Dive Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A]">Category-Level Risk & Escalation Profile</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Full operational breakdown across all support categories
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase text-[#64748B] border-b border-[#E2E8F0]">
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
            <tbody className="divide-y divide-[#F1F5F9] font-medium">
              {categories.map((c, idx) => {
                const isHeavy = c.escalation_rate_pct > 40;
                return (
                  <tr key={idx} className={`hover:bg-slate-50/80 transition ${isHeavy ? 'bg-amber-50/20' : ''}`}>
                    <td className="py-3 px-3.5 font-bold text-[#0F172A]">
                      {c.category}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">{c.total_tickets}</td>
                    <td className="py-3 px-3.5 font-mono font-bold text-amber-700">{c.open_tickets}</td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">{c.escalated_tickets}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.escalation_rate_pct > 40 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.escalation_rate_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">{c.median_resolution_hours} hrs</td>
                    <td className="py-3 px-3.5 font-mono text-slate-500">{c.reopen_count}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
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
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0D9488]" /> Agent Triage Disparity & Coaching Needs
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Wide variance in escalation rate (16.1% to 61.6%) confirms the critical need for standard quality gates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((a, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A] text-xs">{a.agent}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  a.escalation_rate_pct > 45 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-teal-50 text-[#104C47] border border-teal-200/80'
                }`}>
                  {a.escalation_rate_pct}% Esc
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#E2E8F0]">
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
