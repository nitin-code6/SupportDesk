import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MinusCircle, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  History,
  Bot,
  Zap,
  Save,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketDetail, EscalationReadiness, AISummaryResponse } from '../../types';

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
  const [notesSaved, setNotesSaved] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
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
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
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
      setStatusNotification(`Ticket status updated to "${newStatus}"`);
      setTimeout(() => setStatusNotification(null), 3500);
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
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-brand-textMuted font-medium">Loading diagnostic workbench for {ticketId}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-brand-bg min-h-screen">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-brand-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={onBackToQueue}
              className="text-xs font-bold text-brand-teal hover:text-brand-tealDark flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
            </button>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs font-bold text-brand-text">{ticket.ticket_id}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {ticket.priority}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {ticket.status}
            </span>
          </div>
          <h1 className="text-xl font-black text-brand-text tracking-tight">{ticket.description}</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {ticket.status !== 'Closed' && (
            <button
              onClick={() => handleQuickStatus('Closed')}
              className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition"
            >
              Resolve Ticket
            </button>
          )}
          <button
            onClick={() => onOpenEscalationGate(ticket.ticket_id)}
            className="px-4 py-2 rounded-xl bg-brand-coral hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            Escalation Quality Gate
          </button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (5 Cols): Ticket Profile, Issue, History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customer Issue Details */}
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider border-b border-slate-100 pb-3">
              Customer Issue Information
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Corporate Client</span>
                <span className="text-sm font-bold text-brand-text">{ticket.client_name}</span>
                <span className="text-[11px] text-brand-teal block font-semibold">{ticket.client_tier} Tier Account</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Tagged Category</span>
                <span className="font-semibold text-slate-800">{ticket.category}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Assigned Agent</span>
                <span className="font-semibold text-slate-800">{ticket.assigned_agent}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Logged Channel</span>
                <span className="font-semibold text-slate-800">{ticket.channel}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Engineering Handoff History</span>
                <span className="font-mono font-bold text-slate-800">{ticket.eng_handoffs} handoffs</span>
                {ticket.eng_outcome && (
                  <span className="text-rose-600 block text-[11px] font-semibold mt-0.5">
                    Last Verdict: {ticket.eng_outcome}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-teal" /> Investigation Notes
              </h2>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-3 py-1 bg-brand-teal hover:bg-brand-tealDark text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record preliminary findings, client confirmations, or configuration observations..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal focus:bg-white"
            />
          </div>

          {/* Ticket History / Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <History className="w-4 h-4 text-brand-teal" /> Ticket History Log
            </h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {ticket.timeline.map((event) => (
                <div key={event.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-teal">{event.actor}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">{event.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 Cols): Diagnostic Checklist, AI Assistant, Recommendations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Triage Recommendation Banner */}
          {readiness && (
            <div className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
              readiness.is_ready 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {readiness.is_ready ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold uppercase tracking-wider">
                    {readiness.is_ready ? 'Quality Gate Passed' : 'Preliminary Investigation Incomplete'}
                  </span>
                  <span className="font-mono font-bold">
                    Score: {readiness.readiness_score}% ({readiness.completed_checks}/{readiness.total_checks})
                  </span>
                </div>
                <p className="leading-relaxed font-medium">
                  {readiness.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* Diagnostic Checklist */}
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider">
                  Category Diagnostic Protocol: {ticket.category}
                </h2>
                <p className="text-xs text-brand-textMuted mt-0.5">
                  Verify required items to prevent premature handoffs to engineering.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {ticket.checks.map((check) => {
                const currentStatus = check.status;
                return (
                  <div 
                    key={check.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 transition hover:border-slate-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-brand-text">{check.label}</h4>
                          {check.is_required && (
                            <span className="text-[10px] font-bold text-brand-coral uppercase tracking-wide">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {check.description}
                        </p>
                      </div>

                      {/* Status Pills */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleUpdateCheck(check.id, 'passed')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                            currentStatus === 'passed'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Passed
                        </button>

                        <button
                          onClick={() => handleUpdateCheck(check.id, 'failed')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                            currentStatus === 'failed'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-rose-700'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </button>

                        <button
                          onClick={() => handleUpdateCheck(check.id, 'not_applicable')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                            currentStatus === 'not_applicable'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-800'
                          }`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" /> N/A
                        </button>
                      </div>
                    </div>

                    {/* Findings Input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                      <input
                        type="text"
                        placeholder="Log diagnostic findings or evidence..."
                        value={activeCheckFindings[check.id] || ''}
                        onChange={(e) => setActiveCheckFindings({
                          ...activeCheckFindings,
                          [check.id]: e.target.value
                        })}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:border-brand-teal"
                      />
                      <button
                        onClick={() => handleUpdateCheck(check.id, check.status)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Investigation Assistant Widget */}
          <div className="bg-gradient-to-br from-white to-[#F0FAF8] p-6 rounded-2xl border border-brand-teal/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-tealLight text-brand-teal">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-text">AI Diagnostic Assistant</h3>
                  <p className="text-[11px] text-brand-textMuted">Multi-Provider (Google Gemini + Groq)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand-tealLight text-brand-tealDark border border-brand-teal/30">
                Rotated
              </span>
            </div>

            <p className="text-xs text-brand-textMuted leading-relaxed">
              Analyzes ticket symptoms, highlights missing preliminary details, and formulates structured summaries for engineering triage.
            </p>

            <button
              onClick={handleRunAISummary}
              disabled={aiLoading}
              className="w-full py-2.5 px-4 bg-brand-teal hover:bg-brand-tealDark text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              {aiLoading ? 'Querying AI Providers...' : 'Generate AI Ticket Summary & Diagnosis'}
            </button>

            {aiError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {aiError}
              </div>
            )}

            {aiSummary && (
              <div className="space-y-3 pt-3 border-t border-slate-200/80 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Provider: <strong className="text-brand-tealDark uppercase">{aiSummary.provider_used}</strong></span>
                  <span>Latency: <strong className="text-emerald-700">{aiSummary.latency_ms} ms</strong></span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="font-bold text-brand-text block mb-1">Issue Summary:</span>
                  <p className="text-slate-700 leading-relaxed">{aiSummary.issue_summary}</p>
                </div>

                {aiSummary.reported_symptoms.length > 0 && (
                  <div>
                    <span className="font-bold text-brand-text block mb-1">Reported Symptoms:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                      {aiSummary.reported_symptoms.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.missing_information.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold block mb-1">Missing Preliminary Information:</span>
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
