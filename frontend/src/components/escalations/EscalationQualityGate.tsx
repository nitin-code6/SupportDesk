import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  Check, 
  ArrowLeft,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketDetail, EscalationReadiness } from '../../types';

interface QualityGateProps {
  ticketId: string;
  onBackToWorkbench: () => void;
  onEscalationSuccess: () => void;
}

export const EscalationQualityGate: React.FC<QualityGateProps> = ({ 
  ticketId, 
  onBackToWorkbench,
  onEscalationSuccess 
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
      setExpectedBehavior(`Normal operation according to ${t.client_tier} SLA.`);
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
      setErrorMsg('Quality Gate Failed: You must complete all required diagnostic checks or enable an audited manager bypass.');
      return;
    }

    if (bypass && !bypassReason.trim()) {
      setErrorMsg('Audited Manager Bypass requires an explicit business justification.');
      return;
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
        bypass_reason: bypass ? bypassReason : undefined
      });

      setSuccessMsg(`Ticket successfully escalated to Engineering as ${res.eng_ticket_id}!`);
      setTimeout(() => {
        onEscalationSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.detail?.message || err.message || 'Escalation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !ticket || !readiness) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading escalation quality gate for {ticketId}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <button
            onClick={onBackToWorkbench}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold mb-1 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Investigation Workbench
          </button>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
            Engineering Escalation Quality Gate
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Preventing incomplete handoffs to Sandeep's engineering team.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Target Ticket</div>
          <div className="text-base font-bold font-mono text-sky-400">{ticket.ticket_id}</div>
        </div>
      </div>

      {/* Quality Gate Status Indicator */}
      <div className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        readiness.is_ready 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : 'bg-rose-500/10 border-rose-500/30'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${
            readiness.is_ready ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {readiness.is_ready ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {readiness.is_ready ? 'Quality Gate Passed: Ready for Engineering' : 'Quality Gate Incomplete: Preliminary Checks Pending'}
              </h3>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                readiness.is_ready ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                Score: {readiness.readiness_score}%
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {readiness.recommendation}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateAIEscalationBrief}
          disabled={aiGenerating}
          className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {aiGenerating ? 'AI Generating Brief...' : 'Auto-Fill with AI Brief'}
        </button>
      </div>

      {/* Missing Requirements List */}
      {!readiness.is_ready && readiness.missing_requirements.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Pending Quality Gate Requirements
          </h4>
          <ul className="space-y-1 text-xs text-slate-300">
            {readiness.missing_requirements.map((req, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Escalation Submission Form */}
      <form onSubmit={handleSubmitEscalation} className="space-y-5 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
          Structured Engineering Handoff Package
        </h3>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Escalating Agent</label>
            <input
              type="text"
              value={escalatedBy}
              onChange={(e) => setEscalatedBy(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Escalation Reason / Problem Category</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-medium text-slate-300 mb-1">Steps to Reproduce Issue</label>
          <textarea
            rows={3}
            value={reproductionSteps}
            onChange={(e) => setReproductionSteps(e.target.value)}
            placeholder="1. Login to client portal as transport admin...&#10;2. Upload shift roster CSV...&#10;3. Observe 500 error on driver sync..."
            required
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Expected Behavior</label>
            <textarea
              rows={2}
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              required
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Actual Observed Behavior</label>
            <textarea
              rows={2}
              value={actualBehavior}
              onChange={(e) => setActualBehavior(e.target.value)}
              required
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-medium text-slate-300 mb-1">Client Impact & Fleet Criticality</label>
          <input
            type="text"
            value={clientImpact}
            onChange={(e) => setClientImpact(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Manager Bypass Section */}
        {!readiness.is_ready && (
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Audited Manager Bypass</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={bypass}
                  onChange={(e) => setBypass(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
                />
                Enable Urgent Escalation Bypass
              </label>
            </div>
            {bypass && (
              <div className="text-xs space-y-1">
                <label className="block font-medium text-amber-200">
                  Mandatory Bypass Justification (Audit Logged)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VP of Operations requested immediate engineering intervention for airport shift outage."
                  value={bypassReason}
                  onChange={(e) => setBypassReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-lg text-slate-200 text-xs focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onBackToWorkbench}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (!readiness.is_ready && !bypass)}
            className="px-5 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20 transition"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Escalating to Engineering...' : 'Submit Escalation Package'}
          </button>
        </div>
      </form>
    </div>
  );
};
