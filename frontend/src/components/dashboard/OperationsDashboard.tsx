import React, { useEffect, useState } from 'react';
import { 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCcw,
  Zap,
  Users
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api } from '../../services/api';
import { OverviewMetrics, CategoryMetric, EscalationOutcomeMetric, VolumeTrendMetric } from '../../types';

interface DashboardProps {
  onSelectTicket?: (ticketId: string) => void;
  onNavigateToQueue?: () => void;
}

const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];

export const OperationsDashboard: React.FC<DashboardProps> = ({ onSelectTicket, onNavigateToQueue }) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [categories, setCategories] = useState<CategoryMetric[]>([]);
  const [outcomes, setOutcomes] = useState<EscalationOutcomeMetric[]>([]);
  const [trends, setTrends] = useState<VolumeTrendMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [m, c, o, t] = await Promise.all([
          api.getOverviewMetrics(),
          api.getCategoryMetrics(),
          api.getEscalationOutcomes(),
          api.getVolumeTrends()
        ]);
        setMetrics(m);
        setCategories(c);
        setOutcomes(o);
        setTrends(t);
      } catch (err) {
        console.error('Failed to load dashboard analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading operations command centre data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Strategic Problem Framing Alert */}
      {metrics.high_priority_open > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-300">
                Critical Operational Focus: {metrics.high_priority_open} High-Priority (P1/P2) Tickets Open
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Backlog snapshot reveals {metrics.open_tickets} total unresolved issues ({metrics.open_eng_count} currently in Engineering, {metrics.open_l1_count} in L1). 
                Eliminating the <span className="font-semibold text-rose-300">35.6% escalation bounce rate</span> prevents handoff delays of up to 142 hours per ticket.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToQueue}
            className="px-3 py-1.5 bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-amber-400 transition flex items-center gap-1.5 shrink-0"
          >
            Review Queue <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Backlog */}
        <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Total Active Backlog</span>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.open_tickets}</span>
            <span className="text-xs text-slate-400">of {metrics.total_tickets} tickets</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-700/50">
            <span className="text-slate-400">L1: <strong className="text-slate-200">{metrics.open_l1_count}</strong></span>
            <span className="text-slate-400">Engineering: <strong className="text-rose-300">{metrics.open_eng_count}</strong></span>
          </div>
        </div>

        {/* Card 2: Escalation Rate */}
        <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Engineering Escalation Rate</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{metrics.escalation_rate_pct}%</span>
            <span className="text-xs text-slate-400">{metrics.total_escalated} escalated</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 pt-3 border-t border-slate-700/50">
            Target: <span className="text-emerald-400 font-semibold">&lt; 20%</span> with Quality Gate
          </div>
        </div>

        {/* Card 3: Escalation Bounce Rate (The Core Bottleneck) */}
        <div className="p-5 rounded-xl bg-slate-800/60 border border-rose-500/30 hover:border-rose-500/50 transition shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span className="text-rose-300 font-semibold">Escalation Bounce Rate</span>
            <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">{metrics.escalation_bounce_rate_pct}%</span>
            <span className="text-xs text-slate-400">173 rejected</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 pt-3 border-t border-slate-700/50 flex justify-between">
            <span>Avg delay when bounced:</span>
            <span className="font-mono text-rose-300 font-bold">{metrics.avg_resolution_hours_bounced} hrs</span>
          </div>
        </div>

        {/* Card 4: Mean Resolution & CSAT */}
        <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Mean Resolution Time</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.avg_resolution_hours_overall}h</span>
            <span className="text-xs text-slate-400">median {metrics.median_resolution_hours_overall}h</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 pt-3 border-t border-slate-700/50 flex justify-between">
            <span>Overall CSAT:</span>
            <span className="font-semibold text-amber-300">{metrics.avg_csat_overall || '3.70'} / 5.0</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Volume Trend & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Ticket Inflow & Escalation Trajectory</h3>
                <p className="text-xs text-slate-400 mt-0.5">Weekly volume surge (+51.8% from July to September)</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                July – Sept 2026
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEsc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="total_tickets" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total Created" />
                  <Area type="monotone" dataKey="escalated_tickets" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorEsc)" name="Escalated to Eng" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex items-center gap-6 justify-center text-xs text-slate-400 pt-2 border-t border-slate-700/40">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-sky-500 inline-block"></span> Total Tickets Inflow</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500 inline-block"></span> Engineering Escalations</span>
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Top Problem Categories & Escalation Load</h3>
                <p className="text-xs text-slate-400 mt-0.5">Top 3 categories account for 78% of all engineering escalations</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="category" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_tickets" fill="#38bdf8" name="Total Volume" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="escalated_tickets" fill="#f43f5e" name="Escalated to Eng" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex items-center gap-6 justify-center text-xs text-slate-400 pt-2 border-t border-slate-700/40">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-sky-400 rounded-sm inline-block"></span> Total Tickets</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm inline-block"></span> Escalated to Eng</span>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Escalation Outcomes & Root Causes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outcome Breakdown */}
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Engineering Escalation Outcomes</h3>
            <p className="text-xs text-slate-400 mb-4">56.6% of escalations were avoidable or rejected</p>
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomes}
                    dataKey="count"
                    nameKey="outcome"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {outcomes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 mt-2">
            {outcomes.slice(0, 4).map((o, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="truncate">{o.outcome}</span>
                </span>
                <span className="font-mono text-slate-400">{o.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Time Impact by Outcome */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Resolution Time Penalty by Handoff Outcome (Hours)</h3>
          <p className="text-xs text-slate-400 mb-4">Bounced tickets (Insufficient info & Config issues) average ~142 hours</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Escalation Outcome</th>
                  <th className="px-3 py-2.5">Volume</th>
                  <th className="px-3 py-2.5">Share %</th>
                  <th className="px-3 py-2.5">Mean Resolution</th>
                  <th className="px-3 py-2.5 rounded-r-lg">Mean CSAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {outcomes.map((item, idx) => {
                  const isBounced = item.outcome.includes('returned to L1');
                  return (
                    <tr key={idx} className={`hover:bg-slate-700/20 ${isBounced ? 'bg-rose-500/5' : ''}`}>
                      <td className="px-3 py-2.5 font-medium text-slate-200 flex items-center gap-2">
                        {isBounced && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>}
                        {item.outcome}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300">{item.count}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-400">{item.percentage}%</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-200">
                        {item.avg_resolution_hours} hrs
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          (item.avg_csat || 0) < 3.0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.avg_csat ? `${item.avg_csat} / 5` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
