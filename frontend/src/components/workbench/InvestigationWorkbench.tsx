import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MinusCircle, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Send, 
  FileText, 
  History,
  Bot,
  Zap,
  Save,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketDetail, InvestigationCheck, EscalationReadiness, AISummaryResponse } from '../../types';

interface WorkbenchProps {
  ticketId: string;
  onOpenEscalationGate: (ticketId: string) => void;
  onBackToQueue: () => void;
}

export const InvestigationWorkbench: React.FC<WorkbenchProps> = ({ 
  ticketId, 
  onOpenEscalationGate,
  onBackToQueue 
}) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [readiness, setReadiness] = useState<EscalationReadiness | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeCheckFindings, setActiveCheckFindings] = useState<{ [id: number]: string }>({});

  async function loadData() {
    try {
      setLoading(true);
      const [t, r] = await Promise.all([
        api.getTicket(ticketId),
        api.getReadiness(ticketId)
      ]);
      setTicket(t);
      setReadiness(r);
      setNotes(t.internal_notes || '');
      
      const findingsMap: { [id: number]: string } = {};
      t.checks.forEach(c => {
        findingsMap[c.id] = c.findings || '';
      });
      setActiveCheckFindings(findingsMap);
    } catch (err) {
      console.error('Failed to load workbench data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [ticketId]);

  const handleUpdateCheck = async (checkId: number, status: string) => {
    try {
      const findings = activeCheckFindings[checkId];
      await api.updateCheck(ticketId, checkId, status, findings);
      // Reload ticket and readiness
      const [updatedTicket, updatedReadiness] = await Promise.all([
        api.getTicket(ticketId),
        api.getReadiness(ticketId)
      ]);
      setTicket(updatedTicket);
      setReadiness(updatedReadiness);
    } catch (err) {
      console.error('Failed to update check:', err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      const updated = await api.updateTicketNotes(ticketId, notes);
      setTicket(updated);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleQuickStatus = async (newStatus: string) => {
    try {
      const updated = await api.updateTicketStatus(ticketId, newStatus, 'Status updated from Workbench');
      setTicket(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleRunAISummary = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      const summary = await api.summarizeTicketAI(ticketId);
      setAiSummary(summary);
    } catch (err: any) {
      setAiError(err.message || 'AI summarization failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading diagnostic workbench for {ticketId}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Ticket Profile */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={onBackToQueue}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              &larr; Back to Queue
            </button>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-xs font-bold text-sky-400">{ticket.ticket_id}</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
              {ticket.priority}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {ticket.status}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">{ticket.description}</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
            <span>Client: <strong className="text-slate-200">{ticket.client_name}</strong> ({ticket.client_tier})</span>
            <span>Category: <strong className="text-slate-200">{ticket.category}</strong></span>
            <span>Agent: <strong className="text-slate-200">{ticket.assigned_agent}</strong></span>
            <span>Handoffs: <strong className="text-amber-300 font-mono">{ticket.eng_handoffs}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {ticket.status !== 'Closed' && (
            <button
              onClick={() => handleQuickStatus('Closed')}
              className="px-3.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-xs font-semibold transition"
            >
              Resolve Ticket
            </button>
          )}
          <button
            onClick={() => onOpenEscalationGate(ticket.ticket_id)}
            className="px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-rose-500/20"
          >
            <ShieldAlert className="w-4 h-4" />
            Escalation Quality Gate
          </button>
        </div>
      </div>

      {/* Escalation Recommendation Banner */}
      {readiness && (
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          readiness.is_ready 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}>
          {readiness.is_ready ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                Triage Recommendation & Escalation Readiness ({readiness.readiness_score}%)
              </span>
              <span className="text-xs font-mono">
                {readiness.completed_checks} / {readiness.total_checks} Checks Verified
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {readiness.recommendation}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Diagnostic Checklist & AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category Diagnostic Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  Category Diagnostic Protocol: {ticket.category}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete required triage checks to prevent incomplete engineering handoffs.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {ticket.checks.map((check) => {
                const currentStatus = check.status;
                return (
                  <div 
                    key={check.id}
                    className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 hover:border-slate-600/80 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-200">{check.label}</h4>
                          {check.is_required && (
                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {check.description}
                        </p>
                      </div>

                      {/* Status Pills */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleUpdateCheck(check.id, 'passed')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                            currentStatus === 'passed'
                              ? 'bg-emerald-500 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-emerald-300'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Passed
                        </button>

                        <button
                          onClick={() => handleUpdateCheck(check.id, 'failed')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                            currentStatus === 'failed'
                              ? 'bg-rose-500 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-300'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </button>

                        <button
                          onClick={() => handleUpdateCheck(check.id, 'not_applicable')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                            currentStatus === 'not_applicable'
                              ? 'bg-slate-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" /> N/A
                        </button>
                      </div>
                    </div>

                    {/* Findings Input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-700/40">
                      <input
                        type="text"
                        placeholder="Log diagnostic findings or evidence (e.g. verified CSV headers in portal)..."
                        value={activeCheckFindings[check.id] || ''}
                        onChange={(e) => setActiveCheckFindings({
                          ...activeCheckFindings,
                          [check.id]: e.target.value
                        })}
                        className="flex-1 px-3 py-1 bg-slate-900 border border-slate-700/80 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                      <button
                        onClick={() => handleUpdateCheck(check.id, check.status)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Investigation Notes & Timeline */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Internal Investigation Notes
              </h3>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record findings, client communications, or reproduction attempts..."
              className="w-full p-3 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />

            {/* Audit Timeline */}
            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Ticket Audit Trail
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {ticket.timeline.map((event) => (
                  <div key={event.id} className="text-xs p-2 rounded bg-slate-800/40 border border-slate-800 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-sky-400">[{event.actor}]</span>{' '}
                      <span className="text-slate-300">{event.message}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Multi-Provider AI Assistant */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Diagnostic Assistant</h3>
                  <p className="text-[11px] text-slate-400">Multi-Provider (Gemini + Groq)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Rotated
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Auto-generates structured summaries, highlights missing preliminary information, and suggests targeted diagnostic actions.
            </p>

            <button
              onClick={handleRunAISummary}
              disabled={aiLoading}
              className="w-full py-2 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              {aiLoading ? 'Querying AI Providers...' : 'Generate AI Ticket Summary'}
            </button>

            {aiError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {aiError}
              </div>
            )}

            {aiSummary && (
              <div className="mt-4 space-y-3 pt-3 border-t border-slate-800 text-xs animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Provider: <strong className="text-indigo-400 uppercase">{aiSummary.provider_used}</strong></span>
                  <span>Latency: <strong className="text-emerald-400">{aiSummary.latency_ms} ms</strong></span>
                </div>

                <div>
                  <span className="font-semibold text-slate-300">Issue Summary:</span>
                  <p className="text-slate-200 mt-0.5 bg-slate-800/60 p-2 rounded border border-slate-700/50">
                    {aiSummary.issue_summary}
                  </p>
                </div>

                {aiSummary.reported_symptoms.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-300">Symptoms:</span>
                    <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                      {aiSummary.reported_symptoms.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.missing_information.length > 0 && (
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    <span className="font-semibold block mb-1">Missing Preliminary Data:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {aiSummary.missing_information.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
