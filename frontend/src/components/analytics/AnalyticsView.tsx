import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Layers,
  TrendingDown,
  AlertTriangle,
  Award,
  Sparkles,
  Filter,
  RotateCcw,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../../services/api';
import { 
  CategoryMetric, 
  EscalationOutcomeMetric, 
  AgentMetric, 
  OverviewMetrics,
  AnalyticsFilters,
  AnalyticsFilterOptions
} from '../../types';

export const AnalyticsView: React.FC = () => {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [categories, setCategories] = useState<CategoryMetric[]>([]);
  const [outcomes, setOutcomes] = useState<EscalationOutcomeMetric[]>([]);
  const [agents, setAgents] = useState<AgentMetric[]>([]);
  const [filterOptions, setFilterOptions] = useState<AnalyticsFilterOptions | null>(null);

  // Filters State
  const [filters, setFilters] = useState<AnalyticsFilters>({
    client_name: 'ALL',
    category: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    agent: 'ALL',
    start_date: '',
    end_date: ''
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Initial load: fetch filter options
  useEffect(() => {
    async function init() {
      try {
        const opts = await api.getAnalyticsFilters();
        setFilterOptions(opts);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    init();
  }, []);

  // Fetch dynamic metrics whenever filters change
  useEffect(() => {
    async function loadMetrics() {
      try {
        if (!loading) setRefreshing(true);
        const [o, c, out, a] = await Promise.all([
          api.getOverviewMetrics(filters),
          api.getCategoryMetrics(filters),
          api.getEscalationOutcomes(filters),
          api.getAgentMetrics(filters)
        ]);
        setOverview(o);
        setCategories(c);
        setOutcomes(out);
        setAgents(a);
      } catch (err) {
        console.error('Failed to load dynamic analytics:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
    loadMetrics();
  }, [filters]);

  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      client_name: 'ALL',
      category: 'ALL',
      status: 'ALL',
      priority: 'ALL',
      agent: 'ALL',
      start_date: '',
      end_date: ''
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (!v) return false;
    if (v === 'ALL') return false;
    return true;
  }).length;

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-brand-textMuted font-medium">Computing dynamic database analytics...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data for top categories by volume
  const chartData = categories.slice(0, 7).map((c) => ({
    name: c.category.length > 22 ? `${c.category.substring(0, 20)}...` : c.category,
    fullName: c.category,
    total: c.total_tickets,
    escalated: c.escalated_tickets,
    rate: c.escalation_rate_pct
  }));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen text-[#1E293B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#0D9488]" />
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Team Insights & Operational Analytics
            </h1>
            {refreshing && (
              <span className="w-4 h-4 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin ml-2" />
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time, dynamically calculated operational metrics from SQLite database (RideOps ground-truth records).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs">
            {overview?.total_tickets.toLocaleString() ?? 0} Matched Tickets
          </span>
        </div>
      </div>

      {/* ========================================================== */}
      {/* UNIVERSAL DYNAMIC FILTER BAR                                */}
      {/* ========================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0D9488]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Analytics Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
                {activeFilterCount} Active
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#0D9488] hover:text-[#104C47] flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Corporate Client */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Corporate Client</label>
            <select
              value={filters.client_name || 'ALL'}
              onChange={(e) => handleFilterChange('client_name', e.target.value)}
              className="w-full p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
            >
              <option value="ALL">All Clients</option>
              {filterOptions?.clients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Category</label>
            <select
              value={filters.category || 'ALL'}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
            >
              <option value="ALL">All Categories</option>
              {filterOptions?.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Status</label>
            <select
              value={filters.status || 'ALL'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open - with L1">With Support (L1)</option>
              <option value="Open - with Engineering">With Engineering</option>
              <option value="Closed">Resolved / Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Priority</label>
            <select
              value={filters.priority || 'ALL'}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
            >
              <option value="ALL">All Priorities</option>
              {filterOptions?.priorities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Assigned Agent */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Assigned Agent</label>
            <select
              value={filters.agent || 'ALL'}
              onChange={(e) => handleFilterChange('agent', e.target.value)}
              className="w-full p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
            >
              <option value="ALL">All Support Agents</option>
              {filterOptions?.agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Date Boundary</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-1/2 p-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[10px] text-slate-800"
                title="Start Date"
              />
              <span className="text-slate-400 text-[10px]">to</span>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-1/2 p-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[10px] text-slate-800"
                title="End Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* DYNAMIC KPI METRIC CARDS (REAL DATABASE CALCULATIONS)       */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Escalation Rate */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#64748B] block">Overall Escalation Rate</span>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">
            {overview?.escalation_rate_pct.toFixed(1) ?? 0}%
          </div>
          <p className="text-xs text-[#64748B] pt-1">
            {overview?.total_escalated ?? 0} of {overview?.total_tickets ?? 0} tickets escalated to eng
          </p>
        </div>

        {/* Metric 2: Return-to-L1 Bounce Rate */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#64748B] block">Return-to-L1 Rate</span>
          <div className="text-2xl font-bold text-rose-600 font-mono">
            {overview?.escalation_bounce_rate_pct.toFixed(1) ?? 0}%
          </div>
          <p className="text-xs text-[#64748B] pt-1">
            {overview?.returned_to_l1_count ?? 0} of {overview?.total_escalated ?? 0} escalations bounced to L1
          </p>
        </div>

        {/* Metric 3: Customer Satisfaction (CSAT) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#64748B] block">Customer Satisfaction (CSAT)</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {overview?.avg_csat_overall ? `${overview.avg_csat_overall.toFixed(2)} / 5` : 'N/A'}
          </div>
          <p className="text-xs text-[#64748B] pt-1">
            Direct L1: {overview?.avg_csat_unescalated?.toFixed(2) ?? 'N/A'} vs Bounced: {overview?.avg_csat_bounced?.toFixed(2) ?? 'N/A'}
          </p>
        </div>

        {/* Metric 4: Agent Escalation Range */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#64748B] block">Agent Escalation Range</span>
          <div className="text-2xl font-bold text-[#0D9488] font-mono">
            {overview?.min_agent_escalation_rate ?? 0}% – {overview?.max_agent_escalation_rate ?? 0}%
          </div>
          <p className="text-xs text-[#64748B] pt-1">
            Variance across {agents.length} triage agents
          </p>
        </div>
      </div>

      {/* Secondary Metrics Bar: Avoidable Escalation Rate & Resolution Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-xs">
          <span className="text-slate-400 font-medium block">Avoidable Escalations</span>
          <span className="text-base font-bold text-amber-700 font-mono">
            {overview?.avoidable_escalation_rate_pct.toFixed(1) ?? 0}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {overview?.avoidable_escalation_count ?? 0} non-fixed tickets (duplicates, how-to, config)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-xs">
          <span className="text-slate-400 font-medium block">Mean Resolution Time</span>
          <span className="text-base font-bold text-slate-800 font-mono">
            {overview?.avg_resolution_hours_overall.toFixed(1) ?? 0} hrs
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Direct L1: {overview?.avg_resolution_hours_unescalated.toFixed(1) ?? 0}h vs Escalated: {overview?.avg_resolution_hours_escalated.toFixed(1) ?? 0}h
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-xs">
          <span className="text-slate-400 font-medium block">Ticket Reopen Rate</span>
          <span className="text-base font-bold text-slate-800 font-mono">
            {overview?.reopen_rate_pct.toFixed(1) ?? 0}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {overview?.reopened_tickets_count ?? 0} tickets reopened by client/support
          </span>
        </div>
      </div>

      {/* ========================================================== */}
      {/* CATEGORY VOLUME VS ESCALATION CHART                         */}
      {/* ========================================================== */}
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

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="name" 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false} 
                angle={-15} 
                textAnchor="end" 
                interval={0}
              />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#E2E8F0', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
                }}
                formatter={(val: any, name: any) => [
                  val, 
                  name === 'total' ? 'Total Tickets' : 'Escalated to Engineering'
                ]}
                labelFormatter={(_label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return _label;
                }}
              />
              <Bar dataKey="total" fill="#0D9488" radius={[6, 6, 0, 0]} name="total" maxBarSize={38} />
              <Bar dataKey="escalated" fill="#E11D48" radius={[6, 6, 0, 0]} name="escalated" maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================== */}
      {/* ESCALATION OUTCOMES BREAKDOWN (WHY ENG RETURNED / FIXED)    */}
      {/* ========================================================== */}
      {outcomes.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Engineering Escalation Outcomes</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Breakdown of root causes and verdicts after engineering triage
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {outcomes.map((o, idx) => {
              const isBounced = o.outcome.includes('returned to L1') || o.outcome.includes('Sent back');
              const isFixed = o.outcome === 'Fixed';
              return (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    isFixed 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : isBounced 
                      ? 'bg-rose-50/50 border-rose-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-700 block truncate" title={o.outcome}>
                    {o.outcome}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-mono font-bold text-[#0F172A]">{o.count}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{o.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Res: {o.avg_resolution_hours.toFixed(0)}h • CSAT: {o.avg_csat ? o.avg_csat.toFixed(1) : 'N/A'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CATEGORY DEEP-DIVE TABLE                                   */}
      {/* ========================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A]">Category-Level Risk & Escalation Profile</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Full operational breakdown across all {categories.length} categories matching current filters
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
                        {c.escalation_rate_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">{c.median_resolution_hours.toFixed(1)} hrs</td>
                    <td className="py-3 px-3.5 font-mono text-slate-500">{c.reopen_count}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        (c.avg_csat || 0) < 3.5 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {c.avg_csat ? `${c.avg_csat.toFixed(2)} / 5` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================== */}
      {/* AGENT PERFORMANCE & TRIAGE DISPARITY                       */}
      {/* ========================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0D9488]" /> Agent Triage Disparity & Performance
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Standardization needed across triage agents to minimize avoidable escalations and improve first-touch resolution.
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
                  {a.escalation_rate_pct.toFixed(1)}% Esc
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
                  <span className="font-mono text-slate-800 font-bold">{a.avg_resolution_hours.toFixed(1)}h</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mean CSAT</span>
                  <span className="font-mono text-emerald-700 font-bold">{a.avg_csat ? a.avg_csat.toFixed(2) : 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
