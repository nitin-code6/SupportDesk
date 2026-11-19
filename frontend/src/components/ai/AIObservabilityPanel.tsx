import React, { useEffect, useState } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Clock, 
  RotateCw,
  Activity,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { api } from '../../services/api';
import { AIHealthStatus } from '../../types';

export const AIObservabilityPanel: React.FC = () => {
  const [health, setHealth] = useState<AIHealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function loadHealth() {
    try {
      setLoading(true);
      const res = await api.getAIHealth();
      setHealth(res);
    } catch (err) {
      console.error('Failed to load AI health:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTestRotation = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.summarizeTicketAI('SUP-10001');
      setTestResult(`Success! Completed via [${res.provider_used.toUpperCase()}] in ${res.latency_ms} ms.`);
      await loadHealth();
    } catch (err: any) {
      setTestResult(`Test error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading && !health) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[600px] bg-brand-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-brand-textMuted font-medium">Loading AI provider health telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen text-[#1E293B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#0D9488]" />
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Multi-Provider AI Observability & Health
            </h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time telemetry, failure detection, rotation & fallback across Google Gemini and Groq.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadHealth}
            className="p-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#64748B] transition cursor-pointer shadow-xs"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleTestRotation}
            disabled={testing}
            className="px-4 py-2.5 rounded-xl bg-[#104C47] hover:bg-[#0c3834] text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
            {testing ? 'Executing Live Call...' : 'Test Rotation & Fallback'}
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-4 rounded-xl bg-white border border-teal-200 text-[#104C47] text-xs font-mono font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Top Architecture Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Rotation Strategy</span>
            <RotateCw className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#0F172A] capitalize">
            {health?.active_strategy.replace('_', ' ')}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1 font-medium">
            Requests rotate atomically across concurrent sessions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Failover & Fallback</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {health?.fallback_enabled ? 'Active & Enforced' : 'Disabled'}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1 font-medium">
            Fails over automatically on 5xx, 429, timeouts, or circuit open
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Healthy Providers</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-700">
            {health?.healthy_providers_count} / {health ? Object.keys(health.providers).length : 2} Online
          </div>
          <p className="text-[11px] text-[#64748B] mt-1 font-medium">
            High-availability fault-tolerant routing with deterministic backup
          </p>
        </div>
      </div>

      {/* Individual Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {health && Object.entries(health.providers).map(([key, provider]) => {
          const isGemini = key === 'gemini';
          const successRateNum = provider.total_requests > 0 
            ? Math.round((provider.successful_requests / provider.total_requests) * 100) 
            : 100;
          const successRateStr = provider.total_requests > 0 
            ? ((provider.successful_requests / provider.total_requests) * 100).toFixed(1) 
            : '100.0';

          const hasRecent503 = Boolean(provider.last_error && (provider.last_error.includes('503') || provider.last_error.toLowerCase().includes('demand')));
          const inCooldown = (provider.cooldown_seconds_remaining ?? 0) > 0;
          const circuitOpen = provider.circuit_state === 'open' || inCooldown;
          const circuitHalfOpen = provider.circuit_state === 'half-open';

          let statusLabel = 'Available';
          let statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          let dotClass = 'bg-emerald-500';

          if (!provider.is_configured) {
            statusLabel = 'Not Configured';
            statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
            dotClass = 'bg-slate-400';
          } else if (circuitOpen) {
            statusLabel = `Circuit Open (${provider.cooldown_seconds_remaining}s)`;
            statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
            dotClass = 'bg-amber-500 animate-pulse';
          } else if (circuitHalfOpen) {
            statusLabel = 'Half-Open (Testing Probe)';
            statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
            dotClass = 'bg-blue-500';
          } else if (hasRecent503) {
            statusLabel = 'Upstream 503 (Failover Active)';
            statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
            dotClass = 'bg-amber-500';
          }

          const successRateColor = provider.total_requests === 0
            ? 'text-slate-500'
            : successRateNum >= 90
            ? 'text-emerald-700'
            : successRateNum >= 50
            ? 'text-amber-600'
            : 'text-rose-600';

          const triggered = provider.triggered_fallbacks ?? 0;
          const served = provider.served_fallbacks ?? 0;

          return (
            <div 
              key={key} 
              className={`p-6 rounded-2xl border bg-white shadow-xs space-y-5 transition ${
                circuitOpen || hasRecent503
                  ? 'border-amber-200 bg-amber-50/10'
                  : 'border-[#E2E8F0]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#0F172A] capitalize">
                      {isGemini ? 'Google Gemini' : 'Groq API'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      ({isGemini ? 'gemini-3.8-flash' : 'openai/gpt-oss-120b'})
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {isGemini ? 'Interactions API / v1beta' : 'OpenAI-Compatible Chat Completions'}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${statusBadgeClass}`}>
                  <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
                  {statusLabel}
                </span>
              </div>

              {/* Stats Metrics: Total, Success Rate, Triggered Fallbacks, Served as Fallback, Avg Latency */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 py-3 border-y border-[#F1F5F9] text-xs font-medium">
                <div>
                  <div className="text-slate-400 text-[10px]">Requests</div>
                  <div className="text-base font-bold font-mono text-[#0F172A] mt-0.5">{provider.total_requests}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Success Rate</div>
                  <div className={`text-base font-bold font-mono mt-0.5 ${successRateColor}`}>{successRateStr}%</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]" title="Failures on this provider that forced failover">Triggered</div>
                  <div className="text-base font-bold font-mono text-rose-600 mt-0.5">{triggered}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]" title="Requests served on behalf of failing peer">Served Fallback</div>
                  <div className="text-base font-bold font-mono text-[#0D9488] mt-0.5">{served}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Avg Latency</div>
                  <div className="text-base font-bold font-mono text-[#0F172A] mt-0.5">{provider.avg_latency_ms} ms</div>
                </div>
              </div>

              {/* Plain English Summary Sentence */}
              {provider.summary_sentence && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-700 flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span className="font-medium">{provider.summary_sentence}</span>
                </div>
              )}

              {/* Cooldown Timer Alert */}
              {provider.cooldown_seconds_remaining > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 animate-spin text-amber-600" />
                  <span>
                    Temporary circuit cooldown active: <strong>{provider.cooldown_seconds_remaining}s remaining</strong>. Requests seamlessly routed to peer.
                  </span>
                </div>
              )}

              {/* Live Upstream Failover Explanation */}
              {hasRecent503 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automatic Failover Engaged & Healthy</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Google Gemini is currently reporting temporary high demand on the <code className="font-mono bg-white/70 px-1 py-0.5 rounded">gemini-3.8-flash</code> endpoint. SupportDesk automatically reroutes all triage requests to Groq (<code className="font-mono bg-white/70 px-1 py-0.5 rounded">openai/gpt-oss-120b</code>) with zero disruption to support agents.
                  </p>
                </div>
              )}

              {provider.last_error && !hasRecent503 && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <span className="font-bold block mb-0.5">Last Observed Issue (Masked):</span>
                  <span className="font-mono text-[11px] text-slate-700">{provider.last_error}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
