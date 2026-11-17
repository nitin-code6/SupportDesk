import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldAlert, 
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketListItem } from '../../types';

interface TicketWorkspaceProps {
  onSelectTicket: (ticketId: string) => void;
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

export const TicketWorkspace: React.FC<TicketWorkspaceProps> = ({ onSelectTicket }) => {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [escalatedOnly, setEscalatedOnly] = useState<boolean>(false);

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
        escalated_only: escalatedOnly ? true : undefined,
      });
      setTickets(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [page, category, priority, status, escalatedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTickets();
  };

  const priorityBadge = (p: string) => {
    switch (p) {
      case 'P1': 
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Critical (P1)</span>;
      case 'P2': 
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">High (P2)</span>;
      case 'P3': 
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Medium (P3)</span>;
      default: 
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Low (P4)</span>;
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'Closed') {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Closed</span>;
    }
    if (s === 'Open - with Engineering') {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Engineering</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Open with L1</span>;
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-brand-bg min-h-screen">
      {/* Title & Filter Controls */}
      <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-brand-text tracking-tight">Support Ticket Queue</h1>
            <p className="text-xs text-brand-textMuted mt-0.5">
              Showing {tickets.length} of {total} operational tickets from RideOps dataset
            </p>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadTickets}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-brand-text hover:bg-slate-50 transition"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Ticket ID, Client, Issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:border-brand-teal focus:bg-white"
            />
          </div>

          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal max-w-[200px]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
          >
            <option value="">All Priorities</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
          >
            <option value="">All Statuses</option>
            <option value="Open - with L1">Open - with L1</option>
            <option value="Open - with Engineering">Open - with Engineering</option>
            <option value="Closed">Closed</option>
          </select>

          <button
            type="button"
            onClick={() => { setEscalatedOnly(!escalatedOnly); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              escalatedOnly 
                ? 'bg-rose-50 text-brand-coral border-rose-300' 
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Escalated Only
          </button>
        </form>
      </div>

      {/* Ticket Table */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-brand-border">
              <tr>
                <th className="px-4 py-3.5">Ticket</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Agent</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Handoffs</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-teal" />
                    Loading tickets from database...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                    No tickets found matching the specified filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-brand-teal">
                      {t.ticket_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-brand-text">{t.client_name}</div>
                      <div className="text-[10px] text-brand-textMuted font-normal">{t.client_tier}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 max-w-[180px] truncate">
                      {t.category}
                    </td>
                    <td className="px-4 py-3.5">
                      {priorityBadge(t.priority)}
                    </td>
                    <td className="px-4 py-3.5 text-brand-text max-w-xs truncate" title={t.description}>
                      {t.description}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {t.assigned_agent}
                    </td>
                    <td className="px-4 py-3.5">
                      {statusBadge(t.status)}
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {t.escalated_to_eng ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-brand-coral border border-rose-200">
                          {t.eng_handoffs}x Eng
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => onSelectTicket(t.ticket_id)}
                        className="px-3 py-1.5 rounded-lg bg-brand-tealLight hover:bg-brand-teal text-brand-teal hover:text-white font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs"
                      >
                        Workbench <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/60 border-t border-brand-border flex items-center justify-between text-xs text-brand-textMuted font-medium">
          <div>
            Showing Page <strong className="text-brand-text">{page}</strong> of <strong className="text-brand-text">{totalPages}</strong> ({total} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition flex items-center gap-1 font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition flex items-center gap-1 font-semibold"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
