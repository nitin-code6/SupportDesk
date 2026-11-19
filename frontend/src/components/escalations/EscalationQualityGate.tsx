import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lock,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketDetail, EscalationReadiness } from '../../types';
import { UserRole } from '../layout/Navbar';
import { CURRENT_DEMO_USER } from '../../config/demoUser';

interface QualityGateProps {
  ticketId: string;
  onBackToWorkbench: () => void;
  onEscalationSuccess: () => void;
  currentRole?: UserRole;
}

export const EscalationQualityGate: React.FC<QualityGateProps> = ({ 
  ticketId, 
  onBackToWorkbench,
  onEscalationSuccess,
  currentRole = 'agent'
}) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [readiness, setReadiness] = useState<EscalationReadiness | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [escalatedBy, setEscalatedBy] = useState<string>(CURRENT_DEMO_USER.display_name);
  const [reason, setReason] = useState<string>('');
  const [reproductionSteps, setReproductionSteps] = useState<string>('');
  const [expectedBehavior, setExpectedBehavior] = useState<string>('');
  const [actualBehavior, setActualBehavior] = useState<string>('');
  const [clientImpact, setClientImpact] = useState<string>('');
  const [logsEvidence, setLogsEvidence] = useState<string>('');
  const [bypass, setBypass] = useState<boolean>(false);
  const [supervisorName, setSupervisorName] = useState<string>('Priya M (Support Lead)');
  const [reasonCategory, setReasonCategory] = useState<string>('client_sla');
  const [bypassReason, setBypassReason] = useState<string>('');

  async function loadData() {
    if (!ticketId) {
      setLoading(false);
      setTicket(null);
      setReadiness(null);
      return;
    }
    try {
      setLoading(true);
      const [t, r] = await Promise.all([
        api.getTicket(ticketId),
        api.getReadiness(ticketId)
      ]);
      setTicket(t);
      setReadiness(r);
      setEscalatedBy(t.assigned_agent);
      setReason(`Backend defect causing ${t.category}`);
      setExpectedBehavior(`Normal system operation per ${t.client_tier} SLA.`);
      setActualBehavior(t.description);
      setClientImpact(`Impacting ${t.client_name} operations.`);
    } catch (err) {
      console.error('Failed to load quality gate:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [ticketId]);

  const handleGenerateAIEscalationBrief = async () => {
    try {
      setAiGenerating(true);
      setErrorMsg(null);
      const brief = await api.generateEscalationSummaryAI(ticketId);
      setReason(brief.escalation_reason);
      setReproductionSteps(brief.reproduction_steps.join('\n'));
      setExpectedBehavior(brief.expected_vs_actual.expected || expectedBehavior);
      setActualBehavior(brief.expected_vs_actual.actual || actualBehavior);
      setLogsEvidence(`Verified by AI via ${brief.provider_used.toUpperCase()}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI brief generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmitEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!readiness?.is_ready && !bypass) {
      setErrorMsg('Quality Gate Blocked: Please complete all mandatory diagnostic checks or request supervisor authorization.');
      return;
    }

    if (bypass) {
      if (!bypassReason.trim() || bypassReason.trim().length < 20) {
        setErrorMsg('Supervisor override requires a detailed justification of at least 20 characters.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await api.submitEscalation(ticketId, {
        escalated_by: escalatedBy,
        escalation_reason: reason,
        steps_to_reproduce: reproductionSteps || 'Verified via portal test account',
        expected_behavior: expectedBehavior,
        actual_behavior: actualBehavior,
        client_impact: clientImpact,
        logs_evidence: logsEvidence,
        bypass_quality_gate: bypass,
        bypass_reason: bypass ? `[Supervisor Override - Authorized by ${supervisorName.trim() || 'Support Lead'}]: ${bypassReason.trim()}` : undefined,
        reason_category: bypass ? reasonCategory : undefined,
        actor_role: bypass ? 'manager' : (currentRole || 'agent'),
        version: ticket?.version
      });

      setSuccessMsg(`Ticket successfully escalated to Engineering as ${res.eng_ticket_id}!`);
      setTimeout(() => {
        onEscalationSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.detail?.message || err.detail || err.message || 'Escalation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticketId) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-4 max-w-md text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-brand-teal flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Ticket Selected</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Please select an open ticket from All Tickets or My Dashboard to review quality gate checklist readiness before engineering handoff.
            </p>
          </div>
          <button
            onClick={onBackToWorkbench}
            className="px-5 py-2.5 text-xs font-bold text-white bg-brand-teal hover:bg-[#104C47] rounded-xl transition shadow-sm cursor-pointer"
          >
            Browse All Tickets
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-brand-textMuted font-medium">Loading escalation quality gate for {ticketId}...</p>
        </div>
      </div>
    );
  }

  if (!ticket || !readiness) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-4 max-w-md text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Quality Gate Unavailable</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Unable to load escalation readiness for {ticketId}. Please return to the queue.
            </p>
          </div>
          <button
            onClick={onBackToWorkbench}
            className="px-5 py-2.5 text-xs font-bold text-white bg-brand-teal hover:bg-[#104C47] rounded-xl transition shadow-sm cursor-pointer"
          >
            Back to All Tickets
          </button>
        </div>
      </div>
    );
  }

  const isAlreadyWithEngineering = ticket.status === 'Open - with Engineering';

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto bg-[#F8FAFC] min-h-screen text-[#1E293B]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div>
          <button
            onClick={onBackToWorkbench}
            className="text-xs font-semibold text-[#0D9488] hover:text-[#104C47] mb-1.5 flex items-center gap-1 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Investigate Ticket
          </button>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0D9488]" />
            Engineering Escalation Review
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Preventing premature handoffs and keeping bounce-back rate below 15%.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#64748B]">Target Ticket</div>
          <div className="text-base font-bold font-mono text-[#0F172A]">{ticket.ticket_id}</div>
        </div>
      </div>

      {/* Already with engineering banner */}
      {isAlreadyWithEngineering ? (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Already with Engineering</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                This ticket was escalated as <strong>{ticket.eng_ticket_id || 'ENG-ACTIVE'}</strong>. Engineering is actively reviewing this defect.
              </p>
            </div>
          </div>
          <button
            onClick={onBackToWorkbench}
            className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100/60 transition cursor-pointer shadow-2xs"
          >
            Return to Workbench
          </button>
        </div>
      ) : (
        /* Quality Gate Status Indicator */
        <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
          readiness.is_ready 
            ? 'bg-emerald-50 border-emerald-200' 
            : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${
              readiness.is_ready ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {readiness.is_ready ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {readiness.is_ready ? 'Quality Gate Passed: Ready for Engineering' : 'Quality Gate Incomplete: Preliminary Checks Missing'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  readiness.is_ready ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                }`}>
                  Score: {readiness.readiness_score}%
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 max-w-2xl leading-relaxed font-medium">
                {readiness.recommendation}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateAIEscalationBrief}
            disabled={aiGenerating}
            className="px-4 py-2.5 rounded-xl bg-[#104C47] hover:bg-[#0c3834] text-white font-semibold text-xs flex items-center gap-2 shrink-0 shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            {aiGenerating ? 'AI Generating Brief...' : 'Auto-Fill with AI Brief'}
          </button>
        </div>
      )}

      {/* Missing Requirements List */}
      {!isAlreadyWithEngineering && !readiness.is_ready && readiness.missing_requirements.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Pending Quality Gate Requirements
          </h4>
          <ul className="space-y-1 text-xs text-slate-700">
            {readiness.missing_requirements.map((req, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured Escalation Form */}
      {!isAlreadyWithEngineering && (
        <form onSubmit={handleSubmitEscalation} className="space-y-5 bg-white border border-[#E2E8F0] p-8 rounded-2xl shadow-xs">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9] pb-3">
            Structured Engineering Handoff Package
          </h3>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Escalating Agent</label>
              <input
                type="text"
                value={escalatedBy}
                onChange={(e) => setEscalatedBy(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0D9488] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Escalation Reason / Defect Class</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0D9488] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Steps to Reproduce Issue</label>
            <textarea
              rows={3}
              value={reproductionSteps}
              onChange={(e) => setReproductionSteps(e.target.value)}
              placeholder="1. Log in to corporate portal...&#10;2. Upload roster CSV...&#10;3. Observe 500 error on driver sync..."
              required
              className="w-full p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0D9488] focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Behavior</label>
              <textarea
                rows={2}
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                required
                className="w-full p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0D9488] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Actual Observed Behavior</label>
              <textarea
                rows={2}
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                required
                className="w-full p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0D9488] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Client Impact & Fleet Criticality</label>
            <input
              type="text"
              value={clientImpact}
              onChange={(e) => setClientImpact(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0D9488] focus:bg-white transition"
            />
          </div>

          {/* Diagnostic Incomplete Guidance & Supervisor Override */}
          {!readiness.is_ready && (
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">
                    Diagnostic Checklist Incomplete ({readiness.readiness_score}% Score)
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={bypass}
                    onChange={(e) => setBypass(e.target.checked)}
                    className="rounded border-amber-300 text-[#0D9488] focus:ring-0"
                  />
                  Emergency Supervisor Override
                </label>
              </div>

              {!bypass ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Escalation is locked. You must complete 100% of all required diagnostic checks in Investigate Ticket before this ticket can be escalated to Engineering.
                  </p>
                  <button
                    type="button"
                    onClick={onBackToWorkbench}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-700" /> Return to Investigate Ticket
                  </button>
                </div>
              ) : (
                <div className="text-xs space-y-3 pt-2 border-t border-amber-200/60">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Authorizing Lead / Supervisor</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya M (Support Lead)"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-[#0F172A] text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Override Reason Category</label>
                    <select
                      value={reasonCategory}
                      onChange={(e) => setReasonCategory(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-[#0F172A] text-xs focus:outline-none"
                    >
                      <option value="fleet_emergency">Fleet Emergency (Active Shifts Impacted)</option>
                      <option value="client_sla">Client SLA Escalation / Executive Escalation</option>
                      <option value="other">Other Operational Exception</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 mb-1">
                      Mandatory Justification (Audit Logged — Min 20 characters)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shift Lead approved immediate engineering handoff due to fleet booking outage."
                      value={bypassReason}
                      onChange={(e) => setBypassReason(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-[#0F172A] text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={onBackToWorkbench}
              className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#475569] text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!readiness.is_ready && !bypass)}
              className="px-6 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {(!readiness.is_ready && !bypass) ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {submitting 
                ? 'Escalating to Engineering...' 
                : (!readiness.is_ready && !bypass) 
                ? `Escalation Locked (${readiness.readiness_score}% Score)` 
                : 'Submit Escalation Package'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
