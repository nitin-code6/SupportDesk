import React, { useEffect, useState, useMemo } from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  User,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Zap,
  Layers,
  Flame,
  FileCheck2
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketListItem, AgentMetric } from '../../types';

interface DashboardProps {
  onSelectTicket: (ticketId: string) => void;
  onNavigateToQueue: () => void;
}

export const OperationsDashboard: React.FC<DashboardProps> = ({ onSelectTicket, onNavigateToQueue }) => {
  const [l1Tickets, setL1Tickets] = useState<TicketListItem[]>([]);
  const [engTickets, setEngTickets] = useState<TicketListItem[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // L1 Agent Filter: Default to Rahul T (our primary L1 triage specialist from case study)
  const [selectedAgent, setSelectedAgent] = useState<string>('Rahul T');
  const [activeQueueTab, setActiveQueueTab] = useState<'all_l1' | 'returned' | 'critical' | 'eng'>('all_l1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAgentMenu, setShowAgentMenu] = useState<boolean>(false);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [l1Res, engRes, agents] = await Promise.all([
        api.getTickets({ status: 'Open - with L1', page_size: 50 }),
        api.getTickets({ status: 'Open - with Engineering', page_size: 50 }),
        api.getAgentMetrics()
      ]);
      setL1Tickets(l1Res.items);
      setEngTickets(engRes.items);
      setAgentMetrics(agents);
    } catch (err) {
      console.error('Failed to load L1 Command Center data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter tickets by selected agent
  const agentL1Tickets = useMemo(() => {
    if (selectedAgent === 'ALL') return l1Tickets;
    return l1Tickets.filter(t => t.assigned_agent === selectedAgent);
  }, [l1Tickets, selectedAgent]);

  const agentEngTickets = useMemo(() => {
    if (selectedAgent === 'ALL') return engTickets;
    return engTickets.filter(t => t.assigned_agent === selectedAgent);
  }, [engTickets, selectedAgent]);

  // Returned from Engineering (bounced back to L1)
  const returnedTickets = useMemo(() => {
    return agentL1Tickets.filter(t => 
      t.eng_handoffs > 0 && 
      t.eng_outcome && 
      (t.eng_outcome.toLowerCase().includes('returned') || t.eng_outcome.toLowerCase().includes('insufficient') || t.eng_outcome.toLowerCase().includes('config'))
    );
  }, [agentL1Tickets]);

  // Critical / High Priority Tickets (P1 or P2)
  const criticalTickets = useMemo(() => {
    return agentL1Tickets.filter(t => t.priority === 'P1' || t.priority === 'P2');
  }, [agentL1Tickets]);

  // Current tab items
  const currentTabTickets = useMemo(() => {
    let list: TicketListItem[] = [];
    if (activeQueueTab === 'all_l1') list = agentL1Tickets;
    else if (activeQueueTab === 'returned') list = returnedTickets;
    else if (activeQueueTab === 'critical') list = criticalTickets;
    else if (activeQueueTab === 'eng') list = agentEngTickets;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.ticket_id.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeQueueTab, agentL1Tickets, returnedTickets, criticalTickets, agentEngTickets, searchQuery]);

  // Current agent performance record
  const currentAgentStat = useMemo(() => {
    return agentMetrics.find(a => a.agent === selectedAgent);
  }, [agentMetrics, selectedAgent]);

  const agentList = [
    'Rahul T',
    'Ananya R',
    'Arjun K',
    'Karan B',
    'Neha P',
    'Priya D',
    'Sneha M',
    'Vikram S'
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-brand-bg min-h-screen">
      {/* Agent Header & Operational Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-brand-tealDark border border-teal-200">
              L1 Triage Workspace
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Shift Focus: Escalation Quality & Avoidable Return Prevention
            </span>
          </div>
          <h1 className="text-2xl font-black text-brand-text tracking-tight flex items-center gap-2">
            What requires your attention today?
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Investigate customer issues thoroughly with category protocols before escalating to engineering.
          </p>
        </div>

        {/* Agent Switcher & Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} />
          </button>

          {/* Agent Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-full bg-brand-sidebar flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {selectedAgent === 'ALL' ? 'ALL' : selectedAgent.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-xs font-bold text-brand-text leading-tight">
                  {selectedAgent === 'ALL' ? 'All Team Tickets' : selectedAgent}
                </div>
                <div className="text-[10px] text-brand-textMuted leading-tight font-medium">
                  {selectedAgent === 'ALL' ? '29 Open with L1' : 'Primary L1 Specialist'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showAgentMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs text-slate-700">
                <div className="px-4 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active L1 Agent
                </div>
                <button
                  onClick={() => { setSelectedAgent('ALL'); setShowAgentMenu(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition ${
                    selectedAgent === 'ALL' ? 'bg-teal-50/50 text-brand-teal font-bold' : ''
                  }`}
                >
                  <span className="font-semibold">All L1 Support Team</span>
                  <span className="font-mono text-[11px] text-slate-400">{l1Tickets.length} open</span>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                {agentList.map((agentName) => {
                  const count = l1Tickets.filter(t => t.assigned_agent === agentName).length;
                  const isCurrent = selectedAgent === agentName;
                  return (
                    <button
                      key={agentName}
                      onClick={() => { setSelectedAgent(agentName); setShowAgentMenu(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition ${
                        isCurrent ? 'bg-teal-50/50 text-brand-teal font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{agentName}</span>
                        {agentName === 'Rahul T' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                            Case Focus
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">{count} open</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Agent Operational Focus Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: My Open L1 Queue */}
        <div 
          onClick={() => setActiveQueueTab('all_l1')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeQueueTab === 'all_l1' 
              ? 'bg-white border-brand-teal shadow-md ring-2 ring-brand-teal/20' 
              : 'bg-white border-brand-border shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Requires My Action</span>
            <div className="p-2 rounded-xl bg-brand-tealLight text-brand-teal">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-brand-text">
              {agentL1Tickets.length}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-50 text-brand-tealDark border border-teal-200">
              Open with L1
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-2 font-medium">
            Pending preliminary triage and investigation
          </p>
        </div>

        {/* Card 2: Returned from Engineering */}
        <div 
          onClick={() => setActiveQueueTab('returned')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeQueueTab === 'returned' 
              ? 'bg-white border-brand-coral shadow-md ring-2 ring-brand-coral/20' 
              : 'bg-white border-brand-border shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Returned by Engineering</span>
            <div className="p-2 rounded-xl bg-brand-coralLight text-brand-coral">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-brand-coral">
              {returnedTickets.length}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-brand-coral border border-rose-200">
              Urgent Re-Triage
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-2 font-medium">
            Bounced for missing info or client config errors
          </p>
        </div>

        {/* Card 3: Critical & High Priority */}
        <div 
          onClick={() => setActiveQueueTab('critical')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeQueueTab === 'critical' 
              ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20' 
              : 'bg-white border-brand-border shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Critical & High (P1/P2)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-amber-600">
              {criticalTickets.length}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              SLA Risk
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-2 font-medium">
            High client impact requiring immediate triage
          </p>
        </div>

        {/* Card 4: Under Engineering Review */}
        <div 
          onClick={() => setActiveQueueTab('eng')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeQueueTab === 'eng' 
              ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20' 
              : 'bg-white border-brand-border shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Waiting on Engineering</span>
            <div className="p-2 rounded-xl bg-brand-blueLight text-brand-blue">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-brand-text">
              {agentEngTickets.length}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Active Escalations
            </span>
          </div>
          <p className="text-xs text-brand-textMuted mt-2 font-medium">
            Currently with engineering development team
          </p>
        </div>
      </div>

      {/* Operational Escalation Quality Reminder Banner */}
      <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200/90 text-brand-tealDark text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-brand-text font-bold">Your Shift Target: Reduce Escalation Bounce Rate to &lt; 15%.</strong> Direct L1 resolution takes <strong>12.6 hrs</strong> median vs <strong>128.0 hrs</strong> when engineering returns a ticket. Always verify diagnostic checklists before escalating.
          </div>
        </div>
        <button
          onClick={onNavigateToQueue}
          className="text-xs font-bold text-brand-teal hover:text-brand-tealDark underline shrink-0 cursor-pointer"
        >
          View Full Ticket Queue ({l1Tickets.length + engTickets.length} total) →
        </button>
      </div>

      {/* Main Operational Workspace: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Actionable Worklist */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
            {/* Queue Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveQueueTab('all_l1')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeQueueTab === 'all_l1'
                      ? 'bg-brand-sidebar text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>My Open Tickets ({agentL1Tickets.length})</span>
                </button>

                <button
                  onClick={() => setActiveQueueTab('returned')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeQueueTab === 'returned'
                      ? 'bg-brand-coral text-white shadow-xs'
                      : 'bg-rose-50 text-brand-coral hover:bg-rose-100/80'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Returned by Eng ({returnedTickets.length})</span>
                </button>

                <button
                  onClick={() => setActiveQueueTab('critical')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeQueueTab === 'critical'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100/80'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Critical P1/P2 ({criticalTickets.length})</span>
                </button>

                <button
                  onClick={() => setActiveQueueTab('eng')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeQueueTab === 'eng'
                      ? 'bg-brand-blue text-white shadow-xs'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100/80'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>With Engineering ({agentEngTickets.length})</span>
                </button>
              </div>

              {/* Quick Search inside Active Worklist */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter active list..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:border-brand-teal focus:bg-white"
                />
              </div>
            </div>

            {/* Ticket Cards List */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-teal" />
                  Loading your operational worklist...
                </div>
              ) : currentTabTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-700">No tickets in this triage view!</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {searchQuery ? 'Try clearing your search query.' : 'All tickets in this category have been attended to.'}
                  </p>
                </div>
              ) : (
                currentTabTickets.map((ticket) => {
                  const isReturned = ticket.eng_handoffs > 0 && ticket.eng_outcome && ticket.eng_outcome.toLowerCase().includes('returned');
                  const isP1orP2 = ticket.priority === 'P1' || ticket.priority === 'P2';

                  return (
                    <div
                      key={ticket.ticket_id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-brand-teal/80 bg-white hover:bg-slate-50/40 transition space-y-3 group"
                    >
                      {/* Ticket Top Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ticket.priority === 'P1'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : ticket.priority === 'P2'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {ticket.priority}
                          </span>
                          <span className="font-mono text-xs font-bold text-brand-teal">
                            {ticket.ticket_id}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-xs text-brand-text">
                            {ticket.client_name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {ticket.client_tier}
                          </span>
                        </div>

                        {/* Age & Status */}
                        <div className="flex items-center gap-2 text-xs">
                          {ticket.age_days !== undefined && (
                            <span className="font-mono text-slate-400 text-[11px]">
                              Age: {ticket.age_days}d
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ticket.status === 'Open - with L1'
                              ? 'bg-teal-50 text-brand-tealDark border border-teal-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {ticket.status === 'Open - with L1' ? 'With L1 (You)' : 'With Eng'}
                          </span>
                        </div>
                      </div>

                      {/* Ticket Description & Category */}
                      <div>
                        <h3 className="text-sm font-bold text-brand-text group-hover:text-brand-teal transition">
                          {ticket.description}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {ticket.category}
                          </span>
                          {ticket.eng_handoffs > 0 && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Handoff #{ticket.eng_handoffs}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Engineering Return Alert (When ticket was bounced) */}
                      {isReturned && (
                        <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-brand-coral" />
                            <span>Engineering Return Verdict: {ticket.eng_outcome}</span>
                          </div>
                          <p className="text-[11px] text-rose-700 leading-relaxed">
                            Engineering returned this ticket because preliminary triage was incomplete. Verify diagnostic checklist and test cutoff/config before re-escalating.
                          </p>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400">
                          Assigned to: <strong className="text-slate-600">{ticket.assigned_agent}</strong>
                        </div>

                        <button
                          onClick={() => onSelectTicket(ticket.ticket_id)}
                          className="px-3.5 py-1.5 rounded-lg bg-brand-teal hover:bg-brand-tealDark text-white font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>Open in Workbench</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): L1 Triage Playbooks & Best Practices */}
        <div className="lg:col-span-4 space-y-6">
          {/* Diagnostic Protocols Quick-Reference */}
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCheck2 className="w-4 h-4 text-brand-teal" />
              <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider">
                Top Triage Playbooks
              </h2>
            </div>

            <p className="text-xs text-brand-textMuted leading-relaxed">
              These top 3 categories caused <strong>78% of all engineering escalations</strong>. Check these rules first:
            </p>

            <div className="space-y-3.5 text-xs">
              {/* Playbook 1 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-text">1. Roster Sync Issues</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    50.9% Escalated
                  </span>
                </div>
                <ul className="text-slate-600 space-y-1 text-[11px] list-disc list-inside">
                  <li>Check shift cutoff time (T-120 min rule).</li>
                  <li>Verify employee ID column in CSV upload.</li>
                  <li>Check HRMS/SFTP sync connection token.</li>
                </ul>
              </div>

              {/* Playbook 2 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-text">2. Live Tracking / GPS</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    55.7% Escalated
                  </span>
                </div>
                <ul className="text-slate-600 space-y-1 text-[11px] list-disc list-inside">
                  <li>Verify driver app battery-saver permission.</li>
                  <li>Check driver telematics ping recency (&lt;60s).</li>
                  <li>Confirm whether vehicle has active OBD tracker.</li>
                </ul>
              </div>

              {/* Playbook 3 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-text">3. Report Export Failing</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    37.4% Escalated
                  </span>
                </div>
                <ul className="text-slate-600 space-y-1 text-[11px] list-disc list-inside">
                  <li>Verify export query is within 90-day limit.</li>
                  <li>Check client admin user role permissions.</li>
                  <li>Avoid synchronous downloads for &gt;5,000 trips.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Resolution SLA Benchmark Box */}
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider">
                Why L1 Triage Matters
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-900 font-semibold">
                <span>Direct L1 Resolution</span>
                <span className="font-mono font-bold">12.6 hrs</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-slate-700">
                <span>Escalated to Engineering</span>
                <span className="font-mono font-bold">86.8 hrs</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 text-rose-900 font-semibold">
                <span>Bounced Back from Eng</span>
                <span className="font-mono font-bold">128.0 hrs</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 leading-relaxed">
              When tickets bounce between L1 and Engineering, client CSAT drops from <strong>4.01 to 2.43</strong>. Thorough preliminary checks prevent this delay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
