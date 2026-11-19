import React, { useEffect, useState, useMemo } from 'react';
import {
  Inbox,
  Clock,
  ArrowRight,
  Search,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Sparkles,
  HelpCircle,
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketListItem, AgentMetric } from '../../types';
import { formatTicketAge } from '../../utils/formatters';

interface DashboardProps {
  onSelectTicket: (ticketId: string) => void;
  onNavigateToQueue: () => void;
}

export const OperationsDashboard: React.FC<DashboardProps> = ({ onSelectTicket, onNavigateToQueue }) => {
  const [l1Tickets, setL1Tickets] = useState<TicketListItem[]>([]);
  const [engTickets, setEngTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected agent: Default to Rahul T
  const [selectedAgent, setSelectedAgent] = useState<string>('Rahul T');
  const [activeTab, setActiveTab] = useState<'all' | 'returned' | 'urgent' | 'eng'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAgentMenu, setShowAgentMenu] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  async function loadData() {
    try {
      setLoading(true);
      const [l1Res, engRes] = await Promise.all([
        api.getTickets({ status: 'Open - with L1', page_size: 50 }),
        api.getTickets({ status: 'Open - with Engineering', page_size: 50 })
      ]);
      setL1Tickets(l1Res.items);
      setEngTickets(engRes.items);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter by agent
  const myL1Tickets = useMemo(() => {
    if (selectedAgent === 'ALL') return l1Tickets;
    return l1Tickets.filter((t) => t.assigned_agent === selectedAgent);
  }, [l1Tickets, selectedAgent]);

  const myEngTickets = useMemo(() => {
    if (selectedAgent === 'ALL') return engTickets;
    return engTickets.filter((t) => t.assigned_agent === selectedAgent);
  }, [engTickets, selectedAgent]);

  // Returned tickets (need info or config check)
  const returnedTickets = useMemo(() => {
    return myL1Tickets.filter(
      (t) =>
        t.eng_handoffs > 0 &&
        t.eng_outcome &&
        (t.eng_outcome.toLowerCase().includes('returned') ||
          t.eng_outcome.toLowerCase().includes('insufficient') ||
          t.eng_outcome.toLowerCase().includes('config'))
    );
  }, [myL1Tickets]);

  // High priority tickets (P1/P2)
  const urgentTickets = useMemo(() => {
    return myL1Tickets.filter((t) => t.priority === 'P1' || t.priority === 'P2');
  }, [myL1Tickets]);

  // Filtered list based on active tab and search
  const displayedTickets = useMemo(() => {
    let list: TicketListItem[] = [];
    if (activeTab === 'all') list = myL1Tickets;
    else if (activeTab === 'returned') list = returnedTickets;
    else if (activeTab === 'urgent') list = urgentTickets;
    else if (activeTab === 'eng') list = myEngTickets;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.ticket_id.toLowerCase().includes(q) ||
          t.client_name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, myL1Tickets, returnedTickets, urgentTickets, myEngTickets, searchQuery]);

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

  // Helper for human-friendly return notes
  const getFriendlyNote = (outcome?: string) => {
    if (!outcome) return null;
    const lower = outcome.toLowerCase();
    if (lower.includes('insufficient')) {
      return 'Engineering needs more details or screenshot evidence to reproduce this.';
    }
    if (lower.includes('config')) {
      return 'Engineering checked this and found a client setup or cutoff time issue, not a software bug.';
    }
    if (lower.includes('duplicate')) {
      return 'This is already tracked under an existing engineering ticket.';
    }
    return `Engineering note: ${outcome}`;
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto bg-[#F7FAF9] min-h-screen text-[#1E293B]">
      {/* Calm Greeting Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#16A394]"></span>
            <span className="text-xs font-semibold text-[#64748B]">Support Agent Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            {selectedAgent === 'ALL' ? 'Team Support Queue' : `Hello ${selectedAgent.split(' ')[0]}, here is your queue today`}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Pick a ticket below to review findings and run simple checks before sending it to engineering.
          </p>
        </div>

        {/* Header Controls: Help & Terms, Refresh, Agent Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Quick Help & Terms Button */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-medium text-[#475569] transition cursor-pointer shadow-xs"
            title="What do P1-P4 and Handoffs mean?"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Help & Terms</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#64748B] transition cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16A394]' : ''}`} />
          </button>

          {/* Simple Agent Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-slate-400 transition cursor-pointer text-left shadow-xs"
            >
              <div className="w-7 h-7 rounded-full bg-[#104C47] text-white flex items-center justify-center text-xs font-bold">
                {selectedAgent === 'ALL' ? 'All' : selectedAgent.split(' ')[0][0]}
              </div>
              <div>
                <div className="text-xs font-semibold text-[#0F172A] leading-tight">
                  {selectedAgent === 'ALL' ? 'All Support Agents' : selectedAgent}
                </div>
                <div className="text-[11px] text-[#64748B] leading-tight">
                  {selectedAgent === 'ALL' ? '29 open tickets' : 'Primary Agent'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showAgentMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-2 z-50 text-xs text-[#334155]">
                <div className="px-4 py-1.5 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                  View queue for:
                </div>
                <button
                  onClick={() => { setSelectedAgent('ALL'); setShowAgentMenu(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition ${
                    selectedAgent === 'ALL' ? 'bg-[#F0FDFA] text-[#0D9488] font-bold' : ''
                  }`}
                >
                  <span>All Support Agents</span>
                  <span className="text-[#94A3B8] font-mono">{l1Tickets.length} open</span>
                </button>
                <div className="border-t border-[#F1F5F9] my-1"></div>
                {agentList.map((name) => {
                  const count = l1Tickets.filter((t) => t.assigned_agent === name).length;
                  const isCurrent = selectedAgent === name;
                  return (
                    <button
                      key={name}
                      onClick={() => { setSelectedAgent(name); setShowAgentMenu(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition ${
                        isCurrent ? 'bg-[#F0FDFA] text-[#0D9488] font-bold' : ''
                      }`}
                    >
                      <span>{name}</span>
                      <span className="text-[#94A3B8] font-mono">{count} open</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Calm, Human-Friendly Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Open with you */}
        <div
          onClick={() => setActiveTab('all')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white border-[#14B8A6] shadow-sm ring-1 ring-[#14B8A6]'
              : 'bg-white border-[#E2E8F0] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569]">Waiting for your review</span>
            <div className="p-2 rounded-xl bg-[#F0FDFA] text-[#0D9488]">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0F172A]">{myL1Tickets.length}</span>
            <span className="text-xs text-[#64748B]">tickets in your queue</span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            Ready to be diagnosed or answered directly
          </p>
        </div>

        {/* Card 2: Returned by Engineering */}
        <div
          onClick={() => setActiveTab('returned')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'returned'
              ? 'bg-white border-[#F59E0B] shadow-sm ring-1 ring-[#F59E0B]'
              : 'bg-white border-[#E2E8F0] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569]">Sent back by engineering</span>
            <div className="p-2 rounded-xl bg-[#FFFBEB] text-[#D97706]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0F172A]">{returnedTickets.length}</span>
            <span className="text-xs text-[#B45309] font-medium">needs a second look</span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            Needs missing info or configuration checks
          </p>
        </div>

        {/* Card 3: With Engineering */}
        <div
          onClick={() => setActiveTab('eng')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'eng'
              ? 'bg-white border-[#64748B] shadow-sm ring-1 ring-[#64748B]'
              : 'bg-white border-[#E2E8F0] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569]">Currently with engineering</span>
            <div className="p-2 rounded-xl bg-[#F8FAFC] text-[#64748B]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0F172A]">{myEngTickets.length}</span>
            <span className="text-xs text-[#64748B]">escalations in progress</span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            The engineering team is looking into these
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Ticket List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#104C47] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:bg-slate-100'
                  }`}
                >
                  All open ({myL1Tickets.length})
                </button>

                <button
                  onClick={() => setActiveTab('returned')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'returned'
                      ? 'bg-[#B45309] text-white'
                      : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
                  }`}
                >
                  Sent back by engineering ({returnedTickets.length})
                </button>

                <button
                  onClick={() => setActiveTab('urgent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'urgent'
                      ? 'bg-[#334155] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:bg-slate-100'
                  }`}
                >
                  High priority ({urgentTickets.length})
                </button>

                <button
                  onClick={() => setActiveTab('eng')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'eng'
                      ? 'bg-[#475569] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:bg-slate-100'
                  }`}
                >
                  With engineering ({myEngTickets.length})
                </button>
              </div>

              {/* Simple Search */}
              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter list..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#14B8A6] focus:bg-white"
                />
              </div>
            </div>

            {/* Ticket Cards */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-[#94A3B8]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#14B8A6]" />
                  Loading your tickets...
                </div>
              ) : displayedTickets.length === 0 ? (
                <div className="py-12 text-center text-[#64748B]">
                  <CheckCircle2 className="w-8 h-8 text-[#14B8A6] mx-auto mb-2" />
                  <p className="font-semibold text-sm text-[#0F172A]">All clear!</p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    No tickets found in this tab. Great job!
                  </p>
                </div>
              ) : (
                displayedTickets.map((ticket) => {
                  const isReturned =
                    ticket.eng_handoffs > 0 &&
                    ticket.eng_outcome &&
                    ticket.eng_outcome.toLowerCase().includes('returned');
                  const friendlyNote = getFriendlyNote(ticket.eng_outcome);

                  return (
                    <div
                      key={ticket.ticket_id}
                      className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#14B8A6] bg-white transition space-y-3 group"
                    >
                      {/* Top Row: Meta info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#0D9488]">
                            {ticket.ticket_id}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-semibold text-[#0F172A]">
                            {ticket.client_name}
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            ({ticket.client_tier})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                          {ticket.age_days !== undefined && (
                            <span className="font-medium text-[#64748B] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTicketAge(ticket.age_days)}
                            </span>
                          )}
                          <span 
                            className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium cursor-pointer hover:bg-slate-200 transition-colors select-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGuideModal(true);
                            }}
                            title={
                              ticket.priority === 'P1' ? 'P1 (Critical) • Severe emergency or total service blockage. Immediate action. Click for full guide.' :
                              ticket.priority === 'P2' ? 'P2 (High) • Major disruption or urgent client SLA risk. Click for full guide.' :
                              ticket.priority === 'P3' ? 'P3 (Medium) • Standard daily issue affecting one user or routine operation. Click for full guide.' :
                              'P4 (Low) • Minor routine question or how-to request. Non-urgent. Click for full guide.'
                            }
                          >
                            {ticket.priority}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Issue Title & Category */}
                      <div>
                        <h3 className="text-sm font-semibold text-[#0F172A] leading-snug group-hover:text-[#0D9488] transition">
                          {ticket.description}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                            {ticket.category}
                          </span>
                          {ticket.eng_handoffs > 0 && (
                            <span 
                              className="text-[11px] font-medium text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded cursor-pointer hover:bg-amber-100 transition-colors select-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowGuideModal(true);
                              }}
                              title={`Handoff #${ticket.eng_handoffs} • Transferred between Support and Engineering ${ticket.eng_handoffs} times. Click for full guide.`}
                            >
                              Handoff #{ticket.eng_handoffs}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Gentle Note from Engineering (Subtle, NOT screaming pink) */}
                      {isReturned && friendlyNote && (
                        <div className="p-3 rounded-lg bg-[#F8FAFC] border-l-4 border-l-[#F59E0B] border border-[#E2E8F0] text-xs text-[#334155] space-y-1">
                          <div className="font-semibold text-[#B45309] flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Note from Engineering</span>
                          </div>
                          <p className="text-[11px] text-[#475569] leading-relaxed">
                            {friendlyNote}
                          </p>
                        </div>
                      )}

                      {/* Bottom Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#F8FAFC]">
                        <span className="text-[11px] text-[#94A3B8]">
                          Assigned to: <strong className="text-[#64748B]">{ticket.assigned_agent}</strong>
                        </span>

                        <button
                          onClick={() => onSelectTicket(ticket.ticket_id)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#104C47] hover:bg-[#0D3F3B] text-white font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
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

        {/* Right Column (4 cols): Calm, Helpful Tips */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Check Tips */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <Sparkles className="w-4 h-4 text-[#14B8A6]" />
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Quick Tips for Common Issues
              </h2>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Checking these 3 simple things first solves most tickets without needing engineering:
            </p>

            <div className="space-y-3 text-xs">
              {/* Tip 1 */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="font-semibold text-[#0F172A]">Roster & Booking Sync</span>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Make sure the employee's booking was uploaded at least <strong>2 hours (120 mins)</strong> before their shift starts.
                </p>
              </div>

              {/* Tip 2 */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="font-semibold text-[#0F172A]">Live GPS & Tracking</span>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Ask if the driver's phone has battery-saver turned on, or if the app was closed in the background.
                </p>
              </div>

              {/* Tip 3 */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="font-semibold text-[#0F172A]">Report Export Issues</span>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Downloads only work for date ranges up to <strong>90 days</strong>. For larger periods, split into two requests.
                </p>
              </div>
            </div>
          </div>

          {/* Simple Reminders */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <FileText className="w-4 h-4 text-[#64748B]" />
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Why checking first helps
              </h2>
            </div>

            <div className="space-y-2 text-[#475569] leading-relaxed text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F0FDFA] text-[#0F766E] font-medium">
                <span>Directly solved by you</span>
                <span className="font-mono font-bold">~12 hours</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] text-[#64748B]">
                <span>Sent back and forth with Eng</span>
                <span className="font-mono font-bold">~5 to 6 days</span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#F8FAFC] leading-relaxed">
              Taking 2 minutes to verify settings in the Workbench helps clients get back on the road much faster!
            </p>
          </div>
        </div>
      </div>

      {/* Help & Terms Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0D9488]" />
                <h3 className="text-base font-bold text-[#0F172A]">Quick Guide to Support Terms</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#334155]">
              {/* Priorities */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B]">What do P1 - P4 Priorities Mean?</h4>
                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <span className="font-bold text-rose-700 font-mono shrink-0">P1 (Critical):</span>
                    <span className="text-slate-600">Severe emergency. System down, fleet stopped, employee stranded at midnight. Handle immediately!</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <span className="font-bold text-amber-700 font-mono shrink-0">P2 (High):</span>
                    <span className="text-slate-600">Major delay or fleet disruption (e.g. VIP airport drop cab delayed). Urgent response needed.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <span className="font-bold text-blue-700 font-mono shrink-0">P3 (Medium):</span>
                    <span className="text-slate-600">Standard daily question or single employee issue (e.g. login trouble, billing discrepancy).</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <span className="font-bold text-slate-700 font-mono shrink-0">P4 (Low):</span>
                    <span className="text-slate-600">Minor routine question or how-to advice (e.g. report download). Solve directly at L1 without escalating.</span>
                  </div>
                </div>
              </div>

              {/* Handoffs */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B]">What is a "Handoff"?</h4>
                <p className="text-slate-600 leading-relaxed">
                  A <strong>handoff</strong> happens when a ticket is transferred between L1 Support and Engineering.
                </p>
                <div className="p-2.5 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] leading-relaxed">
                  • <strong>0 Handoffs:</strong> Solved directly by you in ~12 hours.<br />
                  • <strong>Handoff #1:</strong> Escalated once to engineering.<br />
                  • <strong>Handoff #2 or #3:</strong> Bounced back and forth. Can delay resolution to 5-7 days!
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-[#104C47] text-white text-xs font-semibold hover:bg-[#0D3F3B] transition cursor-pointer"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
