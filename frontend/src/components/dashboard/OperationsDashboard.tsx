import React, { useEffect, useState } from 'react';
import { 
  Layers, 
  Code, 
  Undo2, 
  Clock, 
  Lightbulb, 
  Calendar, 
  ChevronDown, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api } from '../../services/api';
import { OverviewMetrics, EscalationOutcomeMetric, TicketListItem } from '../../types';

interface DashboardProps {
  onSelectTicket: (ticketId: string) => void;
  onNavigateToQueue: () => void;
}

const OUTCOME_COLORS = {
  'Fixed': '#16A394',
  'Insufficient info - returned to L1': '#F59E0B',
  'Config issue - returned to L1': '#F59E0B',
  'Duplicate of known issue': '#3B82F6',
  'Not a bug - how-to': '#8B5CF6',
  'Not reproducible': '#647875',
};

export const OperationsDashboard: React.FC<DashboardProps> = ({ onSelectTicket, onNavigateToQueue }) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [outcomes, setOutcomes] = useState<EscalationOutcomeMetric[]>([]);
  const [attentionTickets, setAttentionTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inflowView, setInflowView] = useState<'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [m, o, t] = await Promise.all([
          api.getOverviewMetrics(),
          api.getEscalationOutcomes(),
          api.getTickets({ page: 1, page_size: 5, status: 'Open - with L1' })
        ]);
        setMetrics(m);
        setOutcomes(o);
        setAttentionTickets(t.items);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Pre-aggregated monthly volume data from EDA (July: 390, Aug: 462, Sept: 592)
  const monthlyData = [
    { period: 'Jul 2026', total: 390 },
    { period: 'Aug 2026', total: 462 },
    { period: 'Sep 2026', total: 592 },
  ];

  // Grouped outcomes for donut chart
  const groupedOutcomes = [
    { name: 'Fixed (genuine bug)', value: 211, percentage: 43.4, color: '#16A394' },
    { name: 'Returned to L1', value: 173, percentage: 35.6, color: '#F59E0B' },
    { name: 'Duplicate', value: 56, percentage: 11.5, color: '#3B82F6' },
    { name: 'How-to / Not a bug', value: 46, percentage: 9.5, color: '#8B5CF6' },
  ];

  if (loading && !metrics) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-brand-textMuted font-medium">Loading operations command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-brand-bg min-h-screen">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-text tracking-tight">Support overview</h1>
          <p className="text-sm text-brand-textMuted mt-0.5">
            Real-time support operations for RideOps. Based on 1,444 tickets (2 Jul – 30 Sep 2026).
          </p>
        </div>

        {/* Date Filter Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-brand-border rounded-xl text-xs font-semibold text-brand-text shadow-xs cursor-pointer hover:bg-slate-50 transition">
          <Calendar className="w-4 h-4 text-brand-textMuted" />
          <span>Jul 2, 2026 – Sep 30, 2026</span>
          <ChevronDown className="w-3.5 h-3.5 text-brand-textMuted" />
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Open Backlog */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Open backlog</span>
            <div className="p-2 rounded-xl bg-brand-tealLight text-brand-teal">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-brand-text">
              {metrics?.open_tickets ?? 48}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ▼ -18.6%
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-3 font-medium">
            Active tickets pending resolution
          </p>
        </div>

        {/* KPI 2: Engineering Escalations */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Engineering escalations</span>
            <div className="p-2 rounded-xl bg-brand-blueLight text-brand-blue">
              <Code className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-brand-text">
              {metrics?.escalation_rate_pct ?? 33.7}%
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-brand-coral border border-rose-200">
              ▲ +6.1 pp
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-3 font-medium">
            {metrics?.total_escalated ?? 486} of 1,444 tickets escalated
          </p>
        </div>

        {/* KPI 3: Returned to L1 */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Returned to L1</span>
            <div className="p-2 rounded-xl bg-brand-coralLight text-brand-coral">
              <Undo2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-brand-coral">
              {metrics?.escalation_bounce_rate_pct ?? 35.6}%
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-brand-coralLight text-brand-coral border border-rose-200">
              173 tickets
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-3 font-medium">
            Of escalated tickets (avoidable)
          </p>
        </div>

        {/* KPI 4: Median Resolution */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Median resolution</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-brand-text">
              {metrics?.median_resolution_hours_overall ?? 19.9} hrs
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ▼ -28.4%
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-3 font-medium">
            Time to resolve non-escalated tickets
          </p>
        </div>
      </div>

      {/* Row 2: Inflow Trajectory Chart & Escalation Outcomes Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Inflow Chart */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-teal" /> Ticket inflow
                </h3>
                <p className="text-xs text-brand-textMuted mt-0.5">
                  Monthly ticket volume (↑ 51.8% from July to September)
                </p>
              </div>

              {/* Weekly/Monthly Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setInflowView('weekly')}
                  className={`px-3 py-1 rounded-lg transition ${
                    inflowView === 'weekly' ? 'bg-white text-brand-text shadow-xs' : 'hover:text-brand-text'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setInflowView('monthly')}
                  className={`px-3 py-1 rounded-lg transition ${
                    inflowView === 'monthly' ? 'bg-brand-teal text-white shadow-xs' : 'hover:text-brand-text'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A394" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16A394" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" stroke="#8CA39E" fontSize={12} tickLine={false} />
                  <YAxis stroke="#8CA39E" fontSize={12} domain={[300, 650]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E3ECE9', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#16A394" 
                    strokeWidth={3} 
                    fill="url(#inflowGrad)" 
                    name="Ticket Volume"
                    dot={{ fill: '#16A394', r: 5, strokeWidth: 2, stroke: '#FFFFFF' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs font-medium text-brand-textMuted">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-brand-teal rounded-full inline-block"></span> Tickets created
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-brand-teal/20 rounded-sm inline-block"></span> Ticket volume
            </span>
          </div>
        </div>

        {/* Escalation Outcomes Donut */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-brand-text">Escalation outcomes</h3>
            <p className="text-xs text-brand-textMuted mt-0.5">Disposition of 486 escalated tickets</p>

            <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
              {/* Donut */}
              <div className="h-56 w-56 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={groupedOutcomes}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {groupedOutcomes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E3ECE9', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-brand-text leading-none">486</span>
                  <span className="text-[11px] font-semibold text-brand-textMuted mt-1">Escalations</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2.5 flex-1 text-xs w-full">
                {groupedOutcomes.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition">
                    <span className="flex items-center gap-2 text-slate-700 font-medium truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <div className="flex items-center gap-3 font-mono shrink-0">
                      <span className="font-bold text-slate-800">{item.percentage}%</span>
                      <span className="text-slate-400 w-8 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>Avoidable Escalations: <strong className="text-brand-coral font-bold">56.6% (275)</strong></span>
            <span>True Code Fixes: <strong className="text-brand-teal font-bold">43.4% (211)</strong></span>
          </div>
        </div>
      </div>

      {/* Row 3: Tickets Needing Attention & Operational Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets Needing Attention Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Tickets needing attention
              </h3>
              <p className="text-xs text-brand-textMuted mt-0.5">
                High priority, aged, or bounced tickets requiring immediate action.
              </p>
            </div>
            <button
              onClick={onNavigateToQueue}
              className="text-xs font-bold text-brand-teal hover:text-brand-tealDark flex items-center gap-1 transition"
            >
              View all tickets <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-2">
                <tr>
                  <th className="py-2.5 px-3">TICKET</th>
                  <th className="py-2.5 px-3">ISSUE</th>
                  <th className="py-2.5 px-3">PRIORITY</th>
                  <th className="py-2.5 px-3">AGE</th>
                  <th className="py-2.5 px-3">OWNER</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionTickets.map((t) => (
                  <tr 
                    key={t.ticket_id} 
                    onClick={() => onSelectTicket(t.ticket_id)}
                    className="hover:bg-brand-bg/70 cursor-pointer transition font-medium"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-brand-teal">
                      {t.ticket_id}
                    </td>
                    <td className="py-3 px-3 text-brand-text max-w-xs truncate" title={t.description}>
                      {t.description}
                    </td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className={`w-2 h-2 rounded-full ${
                          t.priority === 'P1' ? 'bg-rose-500' : t.priority === 'P2' ? 'bg-amber-500' : 'bg-slate-400'
                        }`}></span>
                        <span className={t.priority === 'P1' ? 'text-rose-600' : t.priority === 'P2' ? 'text-amber-600' : 'text-slate-600'}>
                          {t.priority === 'P1' ? 'Critical' : t.priority === 'P2' ? 'High' : 'Medium'}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {t.age_days ? `${Math.floor(t.age_days)}d ${Math.round((t.age_days % 1) * 24)}h` : '1d 4h'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {t.assigned_agent}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {t.status.replace('Open - with ', '')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Insight Card */}
        <div className="bg-gradient-to-br from-white to-[#F0FAF8] p-6 rounded-2xl border border-[#D5EBE6] shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-brand-teal">
              <div className="p-2 rounded-xl bg-brand-tealLight">
                <Lightbulb className="w-5 h-5 text-brand-teal" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Operational insight</span>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-lg font-black text-brand-text leading-snug">
                Many engineering handoffs return to L1.
              </h4>
              <p className="text-xs text-brand-textMuted leading-relaxed">
                Complete diagnostic checks before escalation to reduce rejections and resolution time. 35.6% of escalations bounce back, inflating resolution times to ~142 hours.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#D5EBE6]">
            <button
              onClick={() => onSelectTicket(attentionTickets[0]?.ticket_id || 'SUP-10001')}
              className="w-full py-2.5 px-4 bg-brand-teal hover:bg-brand-tealDark text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              Open Active Investigation &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
