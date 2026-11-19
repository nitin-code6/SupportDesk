import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  History, 
  Bot, 
  Zap, 
  Save, 
  ArrowLeft, 
  AlertCircle,
  Check,
  Lock,
  RotateCcw,
  Edit3,
  CheckSquare,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { 
  TicketDetail, 
  EscalationReadiness, 
  AISummaryResponse, 
  ResolutionDraft,
  TicketResolution
} from '../../types';

interface WorkbenchProps {
  ticketId: string;
  onOpenEscalationGate: (ticketId: string) => void;
  onBackToQueue: () => void;
}

const RESOLUTION_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  configuration_corrected: {
    label: 'Configuration corrected',
    desc: 'Settings, routing parameters, or master data updated to match correct behavior.'
  },
  customer_guidance_provided: {
    label: 'Customer guidance provided',
    desc: 'Clarified system operation, boundaries, or portal usage instructions with client.'
  },
  access_fixed: {
    label: 'Account or access issue fixed',
    desc: 'User lockout, SSO credentials, or role permissions corrected.'
  },
  engineering_verified: {
    label: 'Engineering fix verified',
    desc: 'Engineering team deployed code or database fix; validated by support.'
  },
  other: {
    label: 'Other',
    desc: 'Issue resolved through alternative or custom operational procedure.'
  }
};

const CONFIRMATION_LABELS: Record<string, string> = {
  confirmed: 'Customer confirmed the issue is fixed',
  unconfirmed: 'Customer has not confirmed',
  waiting: 'Waiting for customer confirmation'
};

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
  const [activeNaReasons, setActiveNaReasons] = useState<{ [id: number]: string }>({});
  const [savingCheckId, setSavingCheckId] = useState<number | null>(null);
  const [savedCheckId, setSavedCheckId] = useState<number | null>(null);

  // Resolution Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(false);
  const [draftData, setDraftData] = useState<ResolutionDraft | null>(null);
  const [resolveType, setResolveType] = useState<string>('configuration_corrected');
  const [resolveSummary, setResolveSummary] = useState<string>('');
  const [customerConfirmation, setCustomerConfirmation] = useState<string>('confirmed');
  const [submittingResolve, setSubmittingResolve] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Edit Resolution State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editType, setEditType] = useState<string>('configuration_corrected');
  const [editSummary, setEditSummary] = useState<string>('');
  const [editConfirmation, setEditConfirmation] = useState<string>('confirmed');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reopen Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [submittingReopen, setSubmittingReopen] = useState<boolean>(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

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
      const naMap: { [id: number]: string } = {};
      t.checks.forEach(c => {
        findingsMap[c.id] = c.findings || '';
        if (c.na_reason) naMap[c.id] = c.na_reason;
      });
      setActiveCheckFindings(findingsMap);
      setActiveNaReasons(naMap);
    } catch (err) {
      console.error('Failed to load workbench data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [ticketId]);

  const handleUpdateCheck = async (checkId: number, status: string, customFindings?: string, customNaReason?: string) => {
    // Prevent re-entrant rapid clicks while this check is already saving
    if (savingCheckId === checkId) return;

    const currentCheck = ticket?.checks?.find(c => c.id === checkId);
    const findings = customFindings !== undefined ? customFindings : (activeCheckFindings[checkId] ?? currentCheck?.findings ?? '');
    const naReason = customNaReason !== undefined ? customNaReason : (activeNaReasons[checkId] || (status === 'not_applicable' ? 'Verified non-applicable to client config' : undefined));

    // Idempotency guard: If status, findings, and naReason have not changed, do nothing
    if (
      currentCheck &&
      currentCheck.status === status &&
      (currentCheck.findings || '') === (findings || '') &&
      (currentCheck.na_reason || '') === (naReason || '')
    ) {
      return;
    }

    try {
      setSavingCheckId(checkId);
      
      await api.updateCheck(ticketId, checkId, status, findings, naReason);
      const [updatedTicket, updatedReadiness] = await Promise.all([
        api.getTicket(ticketId),
        api.getReadiness(ticketId)
      ]);
      setTicket(updatedTicket);
      setReadiness(updatedReadiness);
      setSavedCheckId(checkId);
      setTimeout(() => setSavedCheckId(null), 1800);
    } catch (err) {
      console.error('Failed to update check:', err);
    } finally {
      setSavingCheckId(null);
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

  const handleOpenResolveModal = async () => {
    try {
      setIsResolveModalOpen(true);
      setLoadingDraft(true);
      setResolveError(null);
      const draft = await api.getResolutionDraft(ticketId);
      setDraftData(draft);
      setResolveType(draft.suggested_type || 'configuration_corrected');
      setResolveSummary(draft.draft_summary || '');
      setCustomerConfirmation('confirmed');
    } catch (err: any) {
      setResolveError(err.message || 'Failed to generate resolution draft');
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!resolveSummary.trim() || resolveSummary.trim().length < 10) {
      setResolveError('Resolution summary must be at least 10 characters long.');
      return;
    }
    try {
      setSubmittingResolve(true);
      setResolveError(null);
      const res = await api.resolveTicket(ticketId, {
        resolution_type: resolveType,
        resolution_summary: resolveSummary.trim(),
        customer_confirmation: customerConfirmation
      });
      setTicket(res);
      setIsResolveModalOpen(false);
      setStatusNotification(`Ticket ${ticketId} resolved successfully and closed.`);
      setTimeout(() => setStatusNotification(null), 4000);
    } catch (err: any) {
      setResolveError(err.message || 'Failed to submit ticket resolution');
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!ticket?.resolution) return;
    setEditType(ticket.resolution.resolution_type);
    setEditSummary(ticket.resolution.resolution_summary);
    setEditConfirmation(ticket.resolution.customer_confirmation);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleConfirmEditResolution = async () => {
    if (!editSummary.trim() || editSummary.trim().length < 10) {
      setEditError('Resolution summary must be at least 10 characters long.');
      return;
    }
    try {
      setSubmittingEdit(true);
      setEditError(null);
      const res = await api.updateResolution(ticketId, {
        resolution_type: editType,
        resolution_summary: editSummary.trim(),
        customer_confirmation: editConfirmation
      });
      if (ticket) {
        setTicket({
          ...ticket,
          resolution: res
        });
      }
      setIsEditModalOpen(false);
      setStatusNotification('Resolution details updated successfully.');
      setTimeout(() => setStatusNotification(null), 3500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update resolution');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleOpenReopenModal = () => {
    setReopenReason('');
    setReopenError(null);
    setIsReopenModalOpen(true);
  };

  const handleConfirmReopenTicket = async () => {
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      setReopenError('Please provide a reason for reopening (minimum 5 characters).');
      return;
    }
    try {
      setSubmittingReopen(true);
      setReopenError(null);
      const res = await api.reopenTicket(ticketId, {
        reason: reopenReason.trim()
      });
      setTicket(res);
      setIsReopenModalOpen(false);
      setStatusNotification(`Ticket ${ticketId} reopened and assigned to L1 queue.`);
      setTimeout(() => setStatusNotification(null), 4000);
    } catch (err: any) {
      setReopenError(err.message || 'Failed to reopen ticket');
    } finally {
      setSubmittingReopen(false);
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

  const isWithEngineering = ticket.status === 'Open - with Engineering';
  const isResolved = ticket.status === 'Closed' || (ticket.status as string) === 'Resolved';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen text-[#1E293B]">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <button
              onClick={onBackToQueue}
              className="text-xs font-semibold text-[#0D9488] hover:text-[#104C47] flex items-center gap-1 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to All Tickets
            </button>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs font-bold text-[#0F172A]">{ticket.ticket_id}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {ticket.priority}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
              isResolved
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isWithEngineering
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-teal-50 text-[#104C47] border-teal-200/80'
            }`}>
              {ticket.status === 'Open - with L1' ? 'With support' : ticket.status === 'Open - with Engineering' ? 'With engineering' : 'Resolved'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{ticket.description}</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {!isResolved ? (
            <button
              onClick={handleOpenResolveModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Resolve Ticket</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Resolved Ticket
              </span>
              {ticket.resolution && (
                <button
                  onClick={handleOpenEditModal}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit Resolution
                </button>
              )}
              <button
                onClick={handleOpenReopenModal}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Reopen Ticket
              </button>
            </div>
          )}

          {!isResolved && (
            isWithEngineering ? (
              <button
                onClick={() => onOpenEscalationGate(ticket.ticket_id)}
                className="px-4 py-2 rounded-xl bg-[#104C47] hover:bg-[#0c3834] text-white text-xs font-semibold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>View Escalation Review</span>
              </button>
            ) : readiness?.is_ready && readiness?.readiness_score === 100 ? (
              <button
                onClick={() => onOpenEscalationGate(ticket.ticket_id)}
                className="px-4 py-2 rounded-xl bg-[#104C47] hover:bg-[#0c3834] text-white text-xs font-semibold transition flex items-center gap-2 shadow-xs cursor-pointer ring-2 ring-emerald-400/40"
                title="All required checks completed! Click to open Escalation Review"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Escalation Review (100% Ready)</span>
              </button>
            ) : (
              <button
                disabled={true}
                title="Escalation Locked: You must complete all required diagnostic checks (100% score) before opening Escalation Review."
                className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold flex items-center gap-2 cursor-not-allowed select-none shadow-2xs"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Escalation Review Locked ({readiness?.readiness_score ?? 0}%)</span>
              </button>
            )
          )}
        </div>
      </div>

      {statusNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Resolved Ticket Protection Banner */}
      {isResolved && (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-start gap-3 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block mb-0.5">Ticket Resolved & Closed</span>
            <p className="text-emerald-900 leading-relaxed font-medium">
              This ticket has been permanently resolved. Diagnostic protocol checks, evidence inputs, notes editing, and escalation submissions are locked to preserve the historical resolution integrity. To modify investigation data, use the Reopen Ticket action.
            </p>
          </div>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (5 Cols): Ticket Profile, Issue, History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customer Issue Details */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9] pb-3">
              Customer Issue Information
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Corporate Client</span>
                <span className="text-sm font-bold text-[#0F172A]">{ticket.client_name}</span>
                <span className="text-[11px] text-[#0D9488] block font-semibold">{ticket.client_tier} Tier Account</span>
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

          {/* Internal Notes with Autosave / Lock */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0D9488]" /> Investigation Notes
              </h2>
              <div className="flex items-center gap-2">
                {notesSaved && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                {!isResolved && (
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-3 py-1 bg-[#104C47] hover:bg-[#0c3834] text-white font-semibold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                )}
                {isResolved && (
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
            </div>
            <textarea
              rows={3}
              value={notes}
              disabled={isResolved}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isResolved ? "Investigation notes are locked because this ticket is resolved." : "Record preliminary findings, client confirmations, or configuration observations..."}
              className={`w-full p-3 border rounded-xl text-xs transition ${
                isResolved 
                  ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                  : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:border-[#0D9488] focus:bg-white'
              }`}
            />
          </div>

          {/* Ticket History / Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#F1F5F9] pb-3">
              <History className="w-4 h-4 text-[#0D9488]" /> Ticket History Log
            </h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {ticket.timeline.map((event) => (
                <div key={event.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0D9488]">{event.actor}</span>
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

        {/* RIGHT COLUMN (7 Cols): Resolution Details, Diagnostic Checklist, AI Assistant */}
        <div className="lg:col-span-7 space-y-6">
          {/* DEDICATED RESOLUTION DETAILS SECTION (Part A Requirement 4) */}
          {isResolved && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/30 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#0F172A]">Resolution Details</h2>
                    <p className="text-[11px] text-slate-500">
                      Official permanent resolution record for this ticket
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ticket.resolution && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Revision #{(ticket.resolution.edit_count || 0) + 1}
                    </span>
                  )}
                  {ticket.resolution && (
                    <button
                      onClick={handleOpenEditModal}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  )}
                  <button
                    onClick={handleOpenReopenModal}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reopen
                  </button>
                </div>
              </div>

              {ticket.resolution ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Resolution Type</span>
                      <span className="font-bold text-[#0F172A] block">
                        {RESOLUTION_TYPE_LABELS[ticket.resolution.resolution_type]?.label || ticket.resolution.resolution_type}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {RESOLUTION_TYPE_LABELS[ticket.resolution.resolution_type]?.desc}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Customer Confirmation</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        ticket.resolution.customer_confirmation === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : ticket.resolution.customer_confirmation === 'waiting'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {CONFIRMATION_LABELS[ticket.resolution.customer_confirmation] || ticket.resolution.customer_confirmation}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Resolved By & On</span>
                      <span className="font-medium text-slate-800">
                        {ticket.resolution.resolved_by}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {new Date(ticket.resolution.resolved_at).toLocaleString()}
                      </span>
                    </div>

                    {ticket.resolution.edit_count > 0 && (
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Last Edited</span>
                        <span className="font-medium text-slate-800">
                          {ticket.resolution.last_edited_by || ticket.resolution.resolved_by}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {ticket.resolution.last_edited_at ? new Date(ticket.resolution.last_edited_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Final Resolution Summary
                    </span>
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                      {ticket.resolution.resolution_summary}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>Ticket was marked Resolved. Click to document the formal resolution record.</span>
                  <button
                    onClick={handleOpenResolveModal}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Add Resolution Details
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Triage Recommendation Banner (when not resolved) */}
          {!isResolved && readiness && (
            <div className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
              readiness.is_ready 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {readiness.is_ready ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    {readiness.is_ready ? 'Quality Gate Unlocked (100%)' : `Escalation Gate Locked (${readiness.readiness_score}%)`}
                  </span>
                  <span className="font-mono font-bold">
                    Score: {readiness.readiness_score}% ({readiness.completed_checks}/{readiness.total_checks} required)
                  </span>
                </div>
                <p className="leading-relaxed font-medium">
                  {readiness.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* Diagnostic Checklist */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  Diagnostic Checklist: {ticket.category}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {isResolved 
                    ? "Checklist is locked for audit integrity. Reopen the ticket to make modifications."
                    : "Complete each required item below to reach 100% score and unlock engineering escalation."}
                </p>
              </div>
              {isResolved && (
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>

            <div className="space-y-4">
              {ticket.checks.map((check) => {
                const currentStatus = check.status;
                const isSaving = savingCheckId === check.id;
                const isSaved = savedCheckId === check.id;

                return (
                  <div 
                    key={check.id}
                    className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 transition hover:border-slate-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#0F172A]">{check.label}</h4>
                          {check.is_required && (
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/60">
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
                          disabled={isResolved || isSaving}
                          onClick={() => handleUpdateCheck(check.id, 'passed')}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                            isResolved || isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            currentStatus === 'passed'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-emerald-700'
                          }`}
                        >
                          {isSaving && currentStatus === 'passed' ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )} Passed
                        </button>

                        <button
                          disabled={isResolved || isSaving}
                          onClick={() => handleUpdateCheck(check.id, 'failed')}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                            isResolved || isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            currentStatus === 'failed'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-rose-700'
                          }`}
                        >
                          {isSaving && currentStatus === 'failed' ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )} Failed
                        </button>

                        <button
                          disabled={isResolved || isSaving}
                          onClick={() => handleUpdateCheck(check.id, 'not_applicable')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                            isResolved || isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            currentStatus === 'not_applicable'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-800'
                          }`}
                        >
                          {isSaving && currentStatus === 'not_applicable' ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MinusCircle className="w-3.5 h-3.5" />
                          )} N/A
                        </button>
                      </div>
                    </div>

                    {/* Findings & N/A Reason Input */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          disabled={isResolved}
                          placeholder={isResolved ? "Investigation evidence locked." : "Type your findings or evidence here (e.g. checked driver logs, verified with client)..."}
                          value={activeCheckFindings[check.id] || ''}
                          onChange={(e) => setActiveCheckFindings({
                            ...activeCheckFindings,
                            [check.id]: e.target.value
                          })}
                          onBlur={() => {
                            if (isResolved) return;
                            const curVal = (activeCheckFindings[check.id] || '').trim();
                            const savedVal = (check.findings || '').trim();
                            if (curVal !== savedVal) {
                              handleUpdateCheck(check.id, check.status, curVal);
                            }
                          }}
                          className={`flex-1 px-3 py-1.5 border rounded-xl text-xs transition ${
                            isResolved 
                              ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0D9488]'
                          }`}
                        />
                        {!isResolved && isSaving && (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 shrink-0">
                            <div className="w-3 h-3 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </span>
                        )}
                        {!isResolved && isSaved && !isSaving && (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                            <Check className="w-3.5 h-3.5" /> Saved
                          </span>
                        )}
                      </div>

                      {currentStatus === 'not_applicable' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            disabled={isResolved}
                            placeholder="Why does this check not apply? (e.g. client does not use automated SFTP sync)..."
                            value={activeNaReasons[check.id] || ''}
                            onChange={(e) => setActiveNaReasons({
                              ...activeNaReasons,
                              [check.id]: e.target.value
                            })}
                            onBlur={() => {
                              if (isResolved) return;
                              const curVal = (activeNaReasons[check.id] || '').trim();
                              const savedVal = (check.na_reason || '').trim();
                              if (curVal !== savedVal) {
                                handleUpdateCheck(check.id, 'not_applicable', undefined, curVal);
                              }
                            }}
                            className={`flex-1 px-3 py-1.5 border rounded-xl text-xs ${
                              isResolved
                                ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-amber-50/60 border-amber-200 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-[#0D9488]'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Investigation Assistant Widget */}
          <div className="bg-gradient-to-br from-white to-[#F0FDFA] p-6 rounded-2xl border border-teal-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">AI Diagnostic Assistant</h3>
                  <p className="text-[11px] text-[#64748B]">Multi-Provider (Google Gemini + Groq)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200/80">
                Rotated
              </span>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Analyzes ticket symptoms, highlights missing preliminary details, and formulates structured summaries for engineering triage.
            </p>

            <button
              onClick={handleRunAISummary}
              disabled={aiLoading}
              className="w-full py-2.5 px-4 bg-[#104C47] hover:bg-[#0c3834] text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
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

      {/* ========================================================== */}
      {/* PART A: SMART TICKET RESOLUTION MODAL                       */}
      {/* ========================================================== */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-500">{ticket.ticket_id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Smart Resolution Workflow
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#0F172A]">Resolve Ticket</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Investigation information already recorded is reused below. Review the facts and confirm resolution.
                </p>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingDraft ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-7 h-7 border-3 border-[#0D9488] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500 font-medium">Assembling investigation summary and draft...</p>
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Section A: Investigation Summary (Saved Facts) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Investigation Summary
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Verified Facts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block font-semibold">Completed Diagnostic Checks</span>
                      <span className="font-bold text-slate-800">
                        {draftData?.completed_checks?.length || 0} checks passed / verified
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block font-semibold">Failed Diagnostic Checks</span>
                      <span className={`font-bold ${(draftData?.failed_checks?.length || 0) > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {draftData?.failed_checks?.length || 0} checks failed
                      </span>
                    </div>
                  </div>

                  {draftData?.internal_notes && (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block font-semibold mb-0.5">Recorded Investigation Notes</span>
                      <p className="text-slate-700 italic">{draftData.internal_notes}</p>
                    </div>
                  )}

                  {ticket.eng_outcome && (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block font-semibold mb-0.5">Engineering Outcome / Feedback</span>
                      <p className="text-slate-700 font-medium">{ticket.eng_outcome} ({ticket.eng_handoffs} handoffs)</p>
                    </div>
                  )}
                </div>

                {/* Section B: Resolution Type */}
                <div className="space-y-2.5">
                  <label className="font-bold text-slate-800 text-xs block">
                    Resolution Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(RESOLUTION_TYPE_LABELS).map(([key, info]) => {
                      const isSelected = resolveType === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setResolveType(key)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? 'bg-teal-50/70 border-[#0D9488] shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="resolution_type"
                            checked={isSelected}
                            onChange={() => setResolveType(key)}
                            className="mt-0.5 text-[#0D9488] focus:ring-[#0D9488]"
                          />
                          <div className="flex-1">
                            <span className="font-bold text-[#0F172A] block">{info.label}</span>
                            <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">{info.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section C: Resolution Summary (Auto-drafted & Editable) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-xs">
                      Resolution Summary <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Auto-drafted from investigation facts • Edit as needed
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={resolveSummary}
                    onChange={(e) => setResolveSummary(e.target.value)}
                    placeholder="Describe how the issue was resolved and verified..."
                    className="w-full p-3 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488] transition"
                  />
                  <p className="text-[11px] text-slate-500">
                    Min 10 characters. Reuses your recorded findings so you don't have to retype them.
                  </p>
                </div>

                {/* Section D: Customer Confirmation */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 text-xs block">
                    Customer Confirmation Status <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(CONFIRMATION_LABELS).map(([key, label]) => {
                      const isSelected = customerConfirmation === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setCustomerConfirmation(key)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 border-[#0D9488] font-bold text-[#104C47]'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-medium'
                          }`}
                        >
                          <input
                            type="radio"
                            name="customer_confirmation"
                            checked={isSelected}
                            onChange={() => setCustomerConfirmation(key)}
                            className="sr-only"
                          />
                          <span className="text-xs block leading-tight">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section E: Review Summary Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                    Submission Preview
                  </span>
                  <div>
                    <strong>Type:</strong> {RESOLUTION_TYPE_LABELS[resolveType]?.label}
                  </div>
                  <div>
                    <strong>Confirmation:</strong> {CONFIRMATION_LABELS[customerConfirmation]}
                  </div>
                  <div>
                    <strong>Action:</strong> Ticket status will be permanently updated to <strong>Resolved (Closed)</strong>.
                  </div>
                </div>

                {resolveError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{resolveError}</span>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsResolveModalOpen(false)}
                    disabled={submittingResolve}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmResolution}
                    disabled={submittingResolve}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingResolve ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Committing Resolution...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm Resolution</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* EDIT RESOLUTION MODAL                                       */}
      {/* ========================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Edit Saved Resolution</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updates will increment the resolution revision and be recorded in the audit history.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Resolution Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                >
                  {Object.entries(RESOLUTION_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Resolution Summary</label>
                <textarea
                  rows={4}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full p-3 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Customer Confirmation</label>
                <select
                  value={editConfirmation}
                  onChange={(e) => setEditConfirmation(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                >
                  {Object.entries(CONFIRMATION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEditResolution}
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl bg-[#104C47] hover:bg-[#0c3834] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* REOPEN TICKET MODAL                                         */}
      {/* ========================================================== */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Reopen Ticket {ticket.ticket_id}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reopening returns this ticket to "Open - with L1" and unlocks diagnostic investigation.
                </p>
              </div>
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Reason for Reopening <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Client reported issue recurred after session expiry; requires re-investigation..."
                  className="w-full p-3 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                />
                <p className="text-[11px] text-slate-400">Minimum 5 characters. Stored in ticket audit log.</p>
              </div>

              {reopenError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {reopenError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  disabled={submittingReopen}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReopenTicket}
                  disabled={submittingReopen}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingReopen ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
