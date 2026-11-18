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

interface QualityGateProps {
  ticketId: string;
  onBackToWorkbench: () => void;
  onEscalationSuccess: () => void;
  currentRole: UserRole;
}

export const EscalationQualityGate: React.FC<QualityGateProps> = ({ 
  ticketId, 
  onBackToWorkbench,
  onEscalationSuccess,
  currentRole
}) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [readiness, setReadiness] = useState<EscalationReadiness | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [escalatedBy, setEscalatedBy] = useState<string>('Rahul T');
  const [reason, setReason] = useState<string>('');
  const [reproductionSteps, setReproductionSteps] = useState<string>('');
  const [expectedBehavior, setExpectedBehavior] = useState<string>('');
  const [actualBehavior, setActualBehavior] = useState<string>('');
  const [clientImpact, setClientImpact] = useState<string>('');
  const [logsEvidence, setLogsEvidence] = useState<string>('');
  const [bypass, setBypass] = useState<boolean>(false);
  const [reasonCategory, setReasonCategory] = useState<string>('client_sla');
  const [bypassReason, setBypassReason] = useState<string>('');

  async function loadData() {
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
      setErrorMsg('Quality Gate Blocked: Please complete all mandatory diagnostic checks or authorize a manager bypass.');
      return;
    }

    if (bypass) {
      if (currentRole !== 'manager') {
        setErrorMsg('Permission Denied: Quality gate bypass requires Support Manager permissions. Please switch to Support Manager in the top-right role menu.');
        return;
      }
      if (!bypassReason.trim() || bypassReason.trim().length < 20) {
        setErrorMsg('Manager bypass requires a detailed business justification of at least 20 characters.');
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
        bypass_reason: bypass ? bypassReason : undefined,
        reason_category: bypass ? reasonCategory : undefined,
        actor_role: currentRole,
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

  if (loading || !ticket || !readiness) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-brand-textMuted font-medium">Loading escalation quality gate...</p>
        </div>
      </div>
    );
  }

  const isAlreadyWithEngineering = ticket.status === 'Open - with Engineering';

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-border pb-4">
        <div>
          <button
            onClick={onBackToWorkbench}
            className="text-xs font-bold text-brand-teal hover:text-brand-tealDark mb-1 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Investigation Workbench
          </button>
          <h1 className="text-2xl font-black text-brand-text tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-coral" />
            Engineering Escalation Quality Gate
          </h1>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Preventing premature handoffs and keeping bounce-back rate below 15%.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-brand-textMuted">Target Ticket</div>
          <div className="text-base font-black font-mono text-brand-text">{ticket.ticket_id}</div>
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
            className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100/60 transition"
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
                <h3 className="text-sm font-bold text-brand-text">
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
            className="px-4 py-2.5 rounded-xl bg-brand-teal hover:bg-brand-tealDark text-white font-bold text-xs flex items-center gap-2 shrink-0 shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
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
        <form onSubmit={handleSubmitEscalation} className="space-y-5 bg-white border border-brand-border p-8 rounded-2xl shadow-xs">
          <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider border-b border-slate-100 pb-3">
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
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-brand-text focus:outline-none focus:border-brand-teal focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Escalation Reason / Defect Class</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-brand-text focus:outline-none focus:border-brand-teal focus:bg-white"
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
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-text focus:outline-none focus:border-brand-teal focus:bg-white"
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
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-brand-text focus:outline-none focus:border-brand-teal focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Actual Observed Behavior</label>
              <textarea
                rows={2}
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-brand-text focus:outline-none focus:border-brand-teal focus:bg-white"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Client Impact & Fleet Criticality</label>
            <input
              type="text"
              value={clientImpact}
              onChange={(e) => setClientImpact(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-brand-text focus:outline-none focus:border-brand-teal focus:bg-white"
            />
          </div>

          {/* Manager Bypass Section */}
          {!readiness.is_ready && (
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">Audited Manager Bypass</span>
                </div>
                {currentRole === 'manager' ? (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                    <input
                      type="checkbox"
                      checked={bypass}
                      onChange={(e) => setBypass(e.target.checked)}
                      className="rounded border-amber-300 text-brand-coral focus:ring-0"
                    />
                    Enable Manager Bypass
                  </label>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" /> Manager Role Required
                  </span>
                )}
              </div>

              {currentRole !== 'manager' ? (
                <p className="text-xs text-amber-800 leading-relaxed">
                  Only users with the <strong>Support Manager</strong> role can authorize an escalation before all required diagnostic checks are complete. Switch your role in the top-right header to test the manager bypass workflow.
                </p>
              ) : (
                bypass && (
                  <div className="text-xs space-y-3 pt-2 border-t border-amber-200/60">
                    <div>
                      <label className="block font-bold text-amber-900 mb-1">Bypass Reason Category</label>
                      <select
                        value={reasonCategory}
                        onChange={(e) => setReasonCategory(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-brand-text text-xs focus:outline-none"
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
                        placeholder="e.g. Operations Director authorized direct engineering intervention for active shift outage."
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-brand-text text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onBackToWorkbench}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!readiness.is_ready && (!bypass || currentRole !== 'manager'))}
              className="px-6 py-2.5 rounded-xl bg-brand-coral hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Escalating to Engineering...' : 'Submit Escalation Package'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
