import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ExternalLink, 
  ShieldAlert, 
  Clock, 
  CheckCircle,
  RefreshCw
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

  const priorityColor = (p: string) => {
    switch (p) {
      case 'P1': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'P2': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'P3': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const statusColor = (s: string) => {
    if (s === 'Closed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (s === 'Open - with Engineering') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Support Ticket Workspace</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Viewing {tickets.length} of {total} operational tickets
          </p>
        </div>

        {/* Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44"
            />
          </div>

          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 max-w-[180px]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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
            className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="Open - with L1">Open - with L1</option>
            <option value="Open - with Engineering">Open - with Engineering</option>
            <option value="Closed">Closed</option>
          </select>

          <button
            type="button"
            onClick={() => { setEscalatedOnly(!escalatedOnly); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              escalatedOnly 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Escalated Only
          </button>
        </form>
      </div>

      {/* Ticket Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Ticket ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Escalated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No tickets match the selected criteria.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-sky-400">
                      {t.ticket_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{t.client_name}</div>
                      <div className="text-[10px] text-slate-400">{t.client_tier}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">
                      {t.category}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={t.description}>
                      {t.description}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {t.assigned_agent}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.escalated_to_eng ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Yes
                          </span>
                          {t.eng_handoffs > 1 && (
                            <span className="text-[10px] font-mono text-amber-400 font-bold" title="Multiple handoffs">
                              ({t.eng_handoffs}x)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectTicket(t.ticket_id)}
                        className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white border border-sky-500/30 transition text-[11px] font-medium inline-flex items-center gap-1"
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

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
