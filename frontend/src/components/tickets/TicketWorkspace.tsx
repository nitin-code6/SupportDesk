import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  HelpCircle,
  Building2,
  User,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketListItem } from '../../types';
import { statusToPlainLanguage, handoffToPlainLanguage, formatTicketAge } from '../../utils/formatters';
import { CURRENT_DEMO_USER, AGENT_ROSTER, getAgentById, getAgentDbName } from '../../config/demoUser';

interface TicketWorkspaceProps {
  onSelectTicket: (ticketId: string) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  initialSearch?: string;
  selectedAgentId?: string;
}

const CATEGORIES = [
  'All Categories',
  'Roster / booking not syncing',
  'Live tracking / GPS incorrect',
  'Report export failing',
  'Cab delay / no-show complaint',
  'How-to / feature request',
  'Login / access issue',
  'OTP / boarding issue',
  'Billing / invoice discrepancy',
  'Employee address / geocode change',
  'Driver / vehicle compliance docs'
];

export const TicketWorkspace: React.FC<TicketWorkspaceProps> = ({ 
  onSelectTicket, 
  searchTerm: controlledSearchTerm,
  onSearchChange,
  initialSearch = '',
  selectedAgentId: selectedAgentIdProp
}) => {
  // Read initial query params from URL
  const queryParams = new URLSearchParams(window.location.search);
  const initialPage = parseInt(queryParams.get('page') || '1', 10);
  const initialCat = queryParams.get('category') || '';
  const initialPrio = queryParams.get('priority') || '';
  const initialStat = queryParams.get('status') || '';
  const initialEsc = queryParams.get('escalated_only') === 'true';
  const initialAgent = selectedAgentIdProp || queryParams.get('agent') || 'ALL';
  const initialTier = queryParams.get('tier') || '';
  const initialQ = controlledSearchTerm !== undefined ? controlledSearchTerm : (queryParams.get('q') || initialSearch);

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>(initialQ);
  const [category, setCategory] = useState<string>(initialCat);
  const [priority, setPriority] = useState<string>(initialPrio);
  const [status, setStatus] = useState<string>(initialStat);
  const [escalatedOnly, setEscalatedOnly] = useState<boolean>(initialEsc);
  const [selectedAgent, setSelectedAgent] = useState<string>(initialAgent);
  const [selectedTier, setSelectedTier] = useState<string>(initialTier);

  // Sync external search term from Navbar
  useEffect(() => {
    if (controlledSearchTerm !== undefined && controlledSearchTerm !== search) {
      setSearch(controlledSearchTerm);
      setPage(1);
    }
  }, [controlledSearchTerm]);

  // Sync external agent filter from global state (Command Center / Navbar)
  useEffect(() => {
    if (selectedAgentIdProp !== undefined && selectedAgentIdProp !== selectedAgent) {
      setSelectedAgent(selectedAgentIdProp);
      setPage(1);
    }
  }, [selectedAgentIdProp]);

  // Global active agent identity from operator session / command center
  const globalAgent = useMemo(() => {
    if (!selectedAgentIdProp || selectedAgentIdProp === 'ALL') {
      return null;
    }
    return getAgentById(selectedAgentIdProp) || null;
  }, [selectedAgentIdProp]);

  // Resolve human-friendly agent display name for current local filter
  const currentAgentName = useMemo(() => {
    if (!selectedAgent || selectedAgent === 'ALL') {
      return 'Support Team';
    }
    const found = getAgentById(selectedAgent);
    return found ? found.display_name : 'Support Agent';
  }, [selectedAgent]);

  // Dynamic pill text: "With [Global Agent] (You)" or "With Support Team"
  const l1PillLabel = useMemo(() => {
    if (globalAgent) {
      return `With ${globalAgent.display_name} (You)`;
    }
    return 'With Support Team';
  }, [globalAgent]);

  // Check if L1 preset pill is currently selected
  const isL1PillActive = status === 'Open - with L1' && !escalatedOnly && (
    globalAgent ? selectedAgent === globalAgent.agent_id : (!selectedAgent || selectedAgent === 'ALL')
  );

  // Sync state to URL
  const updateURL = useCallback((p: number, s: string, cat: string, prio: string, stat: string, esc: boolean, agent: string, tier: string) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (s) params.set('q', s);
    if (cat && cat !== 'All Categories') params.set('category', cat);
    if (prio) params.set('priority', prio);
    if (stat) params.set('status', stat);
    if (esc) params.set('escalated_only', 'true');
    if (agent && agent !== 'ALL') params.set('agent', agent);
    if (tier) params.set('tier', tier);

    const newQuery = params.toString();
    const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);

  async function loadTickets() {
    try {
      setLoading(true);
      const res = await api.getTickets({
        page,
        page_size: 15,
        search: search || undefined,
        category: category && category !== 'All Categories' ? category : undefined,
        priority: priority || undefined,
        status: status || undefined,
        assigned_agent: selectedAgent && selectedAgent !== 'ALL' ? getAgentDbName(selectedAgent) : undefined,
        agent_id: selectedAgent && selectedAgent !== 'ALL' ? selectedAgent : undefined,
        client_tier: selectedTier || undefined,
        escalated_only: escalatedOnly ? true : undefined,
      });
      setTickets(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL(page, search, category, priority, status, escalatedOnly, selectedAgent, selectedTier);
      loadTickets();
    }, 200);
    return () => clearTimeout(timer);
  }, [page, search, category, priority, status, escalatedOnly, selectedAgent, selectedTier]);

  // Keyboard navigation: Up/Down arrow keys (or j/k) to move, Enter to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < tickets.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < tickets.length) {
        onSelectTicket(tickets[selectedIndex].ticket_id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tickets, selectedIndex, onSelectTicket]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateURL(1, search, category, priority, status, escalatedOnly, selectedAgent, selectedTier);
    loadTickets();
  };

  const handleClearFilters = () => {
    setSearch('');
    if (onSearchChange) onSearchChange('');
    setCategory('');
    setPriority('');
    setStatus('');
    setEscalatedOnly(false);
    setSelectedAgent('ALL');
    setSelectedTier('');
    setPage(1);
    updateURL(1, '', '', '', '', false, 'ALL', '');
  };

  // Quick tab filter presets with select / unselect toggle support
  const handleQuickPreset = (preset: 'all' | 'l1' | 'eng' | 'bounced') => {
    setPage(1);
    if (preset === 'all') {
      setStatus('');
      setEscalatedOnly(false);
      setSelectedAgent('ALL');
    } else if (preset === 'l1') {
      if (isL1PillActive) {
        // Unselect (toggle off) back to all
        setStatus('');
        setEscalatedOnly(false);
        setSelectedAgent('ALL');
      } else {
        // Select
        setStatus('Open - with L1');
        setEscalatedOnly(false);
        if (globalAgent) {
          setSelectedAgent(globalAgent.agent_id);
        } else {
          setSelectedAgent('ALL');
        }
      }
    } else if (preset === 'eng') {
      if (status === 'Open - with Engineering') {
        setStatus('');
      } else {
        setStatus('Open - with Engineering');
      }
      setEscalatedOnly(false);
    } else if (preset === 'bounced') {
      if (status === 'Open - with L1' && escalatedOnly) {
        setStatus('');
        setEscalatedOnly(false);
      } else {
        setStatus('Open - with L1');
        setEscalatedOnly(true);
      }
    }
  };

  const hasActiveFilters = Boolean(
    search || 
    (category && category !== 'All Categories') || 
    priority || 
    status || 
    escalatedOnly || 
    (selectedAgent && selectedAgent !== 'ALL') || 
    selectedTier
  );

  const priorityBadge = (p: string) => {
    switch (p) {
      case 'P1':
        return (
          <span 
            className="px-2.5 py-0.5 rounded text-[12px] font-semibold bg-[#FEE2E2]/70 text-[#991B1B] border border-red-200/60 cursor-pointer hover:bg-red-100 transition-colors select-none whitespace-nowrap inline-block"
            onClick={(e) => { e.stopPropagation(); setShowGuideModal(true); }}
            title="P1 (Critical) • Severe emergency or total blockage. Click for guide."
          >
            P1
          </span>
        );
      case 'P2':
        return (
          <span 
            className="px-2.5 py-0.5 rounded text-[12px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-amber-200/60 cursor-pointer hover:bg-amber-100 transition-colors select-none whitespace-nowrap inline-block"
            onClick={(e) => { e.stopPropagation(); setShowGuideModal(true); }}
            title="P2 (High) • Major disruption or urgent SLA risk. Click for guide."
          >
            P2
          </span>
        );
      case 'P3':
        return (
          <span 
            className="px-2.5 py-0.5 rounded text-[12px] font-semibold bg-[#E0F2FE] text-[#0369A1] border border-sky-200/60 cursor-pointer hover:bg-sky-100 transition-colors select-none whitespace-nowrap inline-block"
            onClick={(e) => { e.stopPropagation(); setShowGuideModal(true); }}
            title="P3 (Medium) • Standard daily issue. Click for guide."
          >
            P3
          </span>
        );
      default:
        return (
          <span 
            className="px-2.5 py-0.5 rounded text-[12px] font-semibold bg-[#F1F5F9] text-[#475569] border border-slate-200/70 cursor-pointer hover:bg-slate-200 transition-colors select-none whitespace-nowrap inline-block"
            onClick={(e) => { e.stopPropagation(); setShowGuideModal(true); }}
            title="P4 (Low) • Minor routine question. Click for guide."
          >
            P4
          </span>
        );
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'Open - with L1') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-teal-50 text-[#104C47] border border-teal-200/70 whitespace-nowrap inline-block">
          With support
        </span>
      );
    }
    if (s === 'Open - with Engineering') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-amber-50 text-[#92400E] border border-amber-200/70 whitespace-nowrap inline-block">
          With engineering
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-slate-50 text-[#64748B] border border-slate-200 whitespace-nowrap inline-block">
        Resolved
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#0D9488] bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-full">
              L1 Operational Queue
            </span>
            <span className="text-xs font-medium text-[#64748B]">• 1,444 Ground-Truth Records</span>
            <span 
              className="text-[11px] text-[#0D9488] bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-full select-none"
              title={CURRENT_DEMO_USER.simulation_notice}
            >
              Operator Session: {CURRENT_DEMO_USER.display_name} ({CURRENT_DEMO_USER.role})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">All Tickets</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Search, filter, and review operational tickets. Use <kbd className="px-1.5 py-0.5 bg-white rounded text-[10px] font-semibold border border-slate-200 shadow-2xs">↑</kbd> / <kbd className="px-1.5 py-0.5 bg-white rounded text-[10px] font-semibold border border-slate-200 shadow-2xs">↓</kbd> to move and <kbd className="px-1.5 py-0.5 bg-white rounded text-[10px] font-semibold border border-slate-200 shadow-2xs">Enter</kbd> to open.
          </p>
        </div>

        {/* Header Controls: Help & Terms, Refresh */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-medium text-[#475569] transition cursor-pointer shadow-2xs"
            title="What do P1-P4 and Handoffs mean?"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Help & Terms</span>
          </button>

          <button
            onClick={loadTickets}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#64748B] transition cursor-pointer shadow-2xs"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Preset Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleQuickPreset('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
            !status && !escalatedOnly && (!selectedAgent || selectedAgent === 'ALL')
              ? 'bg-[#104C47] text-white border-[#104C47] shadow-xs'
              : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
          }`}
        >
          All Tickets
        </button>
        <button
          onClick={() => handleQuickPreset('l1')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border flex items-center gap-1.5 ${
            isL1PillActive
              ? 'bg-[#104C47] text-white border-[#104C47] shadow-xs'
              : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
          }`}
          title={isL1PillActive ? 'Selected: Click to unselect' : 'Click to select'}
        >
          <span>{l1PillLabel}</span>
          {isL1PillActive && (
            <span className="text-[10px] bg-white/20 hover:bg-white/30 rounded-full px-1 py-0.2 leading-none" title="Click to unselect">
              ✕
            </span>
          )}
        </button>
        <button
          onClick={() => handleQuickPreset('eng')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
            status === 'Open - with Engineering'
              ? 'bg-[#104C47] text-white border-[#104C47]'
              : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
          }`}
        >
          With Engineering
        </button>
        <button
          onClick={() => handleQuickPreset('bounced')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border flex items-center gap-1.5 ${
            status === 'Open - with L1' && escalatedOnly
              ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]'
              : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#B45309]" />
          <span>Sent Back by Eng</span>
        </button>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticket ID, client, description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (onSearchChange) onSearchChange(e.target.value);
              }}
              className="w-full pl-8 pr-7 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  if (onSearchChange) onSearchChange('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#334155] focus:outline-none focus:border-[#0D9488] max-w-[200px]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#334155] focus:outline-none focus:border-[#0D9488]"
          >
            <option value="">All Priorities</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#334155] focus:outline-none focus:border-[#0D9488]"
          >
            <option value="">All Statuses</option>
            <option value="Open - with L1">With support</option>
            <option value="Open - with Engineering">With engineering</option>
            <option value="Closed">Resolved</option>
          </select>

          {/* Unified Agent Filter (Local table queue filter; does not change global session) */}
          <select
            value={selectedAgent || 'ALL'}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedAgent(val);
              setPage(1);
            }}
            className={`px-3 py-2 bg-[#F8FAFC] border rounded-xl text-xs font-medium focus:outline-none focus:border-[#0D9488] transition cursor-pointer ${
              selectedAgent && selectedAgent !== 'ALL'
                ? 'border-[#0D9488] bg-teal-50/70 text-[#0F172A] font-semibold'
                : 'border-[#CBD5E1] text-[#334155]'
            }`}
            title="Filter queue by assigned L1 agent"
          >
            <option value="ALL">All Support Agents</option>
            {AGENT_ROSTER.map((a) => (
              <option key={a.agent_id} value={a.agent_id}>Agent: {a.display_name}</option>
            ))}
          </select>

          {/* Client Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => { setSelectedTier(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#334155] focus:outline-none focus:border-[#0D9488]"
          >
            <option value="">All Client Tiers</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Mid-market">Mid-market</option>
            <option value="SMB">SMB</option>
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#475569] transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </form>
      </div>

      {/* Ticket Table Card with Deliberate Column Widths & Typography */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1190px] text-left border-collapse table-fixed">
            {/* Deliberate Column Sizing */}
            <colgroup>
              <col style={{ width: '115px' }} />
              <col style={{ width: '145px' }} />
              <col style={{ width: '155px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '125px' }} />
              <col style={{ width: '155px' }} />
              <col style={{ width: '115px' }} />
              <col style={{ width: '135px' }} />
            </colgroup>

            <thead className="bg-[#F8FAFC] text-[12px] font-semibold uppercase text-[#64748B] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Ticket ID</th>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Client</th>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Category</th>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Priority</th>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Issue Description</th>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Agent</th>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Status</th>
                <th className="px-3.5 py-3.5 align-middle whitespace-nowrap">Handoffs</th>
                <th className="px-3.5 py-3.5 align-middle text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-[#64748B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0D9488]" />
                    <span className="text-[13px] font-medium">Loading tickets from ground-truth database...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-[#64748B]">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-[14px] font-semibold text-[#0F172A]">No tickets found matching the specified filters.</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="px-4 py-2 rounded-xl bg-[#104C47] hover:bg-[#0D3F3B] text-white text-[13px] font-semibold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reset Filters & View All
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((t, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <tr
                      key={t.ticket_id}
                      onClick={() => onSelectTicket(t.ticket_id)}
                      className={`cursor-pointer transition group h-[74px] ${
                        isSelected 
                          ? 'bg-teal-50/60 border-l-4 border-l-[#104C47]' 
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {/* 1. Ticket ID: 115px (single line, nowrap) */}
                      <td className="px-3.5 py-3.5 align-middle whitespace-nowrap">
                        <div className="font-mono font-semibold text-[13px] text-[#104C47] group-hover:underline">
                          {t.ticket_id}
                        </div>
                        {t.age_days !== undefined && (
                          <div className="text-[12px] text-[#64748B] flex items-center gap-1 mt-0.5 font-normal">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatTicketAge(t.age_days)}</span>
                          </div>
                        )}
                      </td>

                      {/* 2. Client: 145px (wraps naturally up to 2 lines) */}
                      <td className="px-3.5 py-3.5 align-middle">
                        <div className="text-[13px] font-bold text-[#0F172A] leading-snug line-clamp-2" title={t.client_name}>
                          {t.client_name}
                        </div>
                        <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded inline-block mt-1 whitespace-nowrap">
                          {t.client_tier}
                        </span>
                      </td>

                      {/* 3. Category: 155px (wraps naturally up to 2 lines) */}
                      <td className="px-3.5 py-3.5 align-middle">
                        <div className="text-[13px] text-[#475569] leading-snug line-clamp-2 break-words" title={t.category}>
                          {t.category}
                        </div>
                      </td>

                      {/* 4. Priority: 85px (single line, nowrap) */}
                      <td className="px-3.5 py-3.5 align-middle whitespace-nowrap">
                        {priorityBadge(t.priority)}
                      </td>

                      {/* 5. Issue Description: 260px (ellipsis, full text in title tooltip) */}
                      <td className="px-3.5 py-3.5 align-middle">
                        <span 
                          className="text-[13px] font-medium text-[#0F172A] truncate block leading-normal" 
                          title={t.description}
                        >
                          {t.description}
                        </span>
                      </td>

                      {/* 6. Agent: 125px (horizontally aligned, nowrap) */}
                      <td className="px-3.5 py-3.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-[#104C47]/10 text-[#104C47] text-[11px] font-bold flex items-center justify-center shrink-0">
                            {t.assigned_agent.split(' ')[0][0]}
                          </span>
                          <span 
                            className="text-[13px] font-medium text-[#334155] truncate max-w-[90px]" 
                            title={t.assigned_agent}
                          >
                            {t.assigned_agent}
                          </span>
                        </div>
                      </td>

                      {/* 7. Status: 155px (single line, nowrap) */}
                      <td className="px-3.5 py-3.5 align-middle whitespace-nowrap">
                        {statusBadge(t.status)}
                      </td>

                      {/* 8. Handoffs: 115px (single line, nowrap) */}
                      <td className="px-3.5 py-3.5 align-middle whitespace-nowrap">
                        {t.eng_handoffs > 0 ? (
                          <span 
                            className="text-[12px] font-medium text-[#B45309] bg-[#FEF3C7] border border-amber-200/60 px-2.5 py-0.5 rounded cursor-pointer hover:bg-amber-100 transition-colors select-none whitespace-nowrap inline-block"
                            onClick={(e) => { e.stopPropagation(); setShowGuideModal(true); }}
                            title={`Handoff #${t.eng_handoffs} • Transferred between Support and Engineering ${t.eng_handoffs} times. Click for guide.`}
                          >
                            Handoff #{t.eng_handoffs}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[12px] whitespace-nowrap">Direct L1</span>
                        )}
                      </td>

                      {/* 9. Action: 135px (Workbench button, consistent size, aligned right) */}
                      <td className="px-3.5 py-3.5 align-middle text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t.ticket_id);
                          }}
                          className="h-8 px-3 rounded-lg bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#104C47] text-[13px] font-semibold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                        >
                          <span>Workbench</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#0D9488]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[13px] text-[#64748B] font-medium">
          <div>
            Showing Page <strong className="text-[#0F172A]">{page}</strong> of <strong className="text-[#0F172A]">{totalPages}</strong> ({total} total tickets)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 px-3.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] text-[13px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 px-3.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] text-[13px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Help & Terms Guide Modal (Matches Command Center) */}
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
