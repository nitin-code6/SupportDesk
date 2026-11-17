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
  AlertTriangle
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-brand-teal" />
            <h1 className="text-2xl font-black text-brand-text tracking-tight">
              Multi-Provider AI Observability & Health
            </h1>
          </div>
          <p className="text-xs text-brand-textMuted mt-1">
            Real-time telemetry, failure detection, rotation & fallback across Google Gemini and Groq.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadHealth}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleTestRotation}
            disabled={testing}
            className="px-4 py-2.5 rounded-xl bg-brand-teal hover:bg-brand-tealDark text-white font-bold text-xs transition flex items-center gap-2 shadow-xs"
          >
            <Zap className="w-4 h-4 fill-current" />
            {testing ? 'Executing Live Call...' : 'Test Rotation & Fallback'}
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-4 rounded-xl bg-white border border-brand-teal/40 text-brand-tealDark text-xs font-mono font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Top Architecture Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-brand-border shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Rotation Strategy</span>
            <RotateCw className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-xl font-black font-mono text-brand-text capitalize">
            {health?.active_strategy.replace('_', ' ')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Requests rotate atomically across concurrent sessions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-brand-border shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Failover & Fallback</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black font-mono text-emerald-700">
            {health?.fallback_enabled ? 'Active & Enforced' : 'Disabled'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Fails over automatically on 5xx, 429, or timeouts
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-brand-border shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Healthy Providers</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black font-mono text-blue-700">
            {health?.healthy_providers_count} / {health ? Object.keys(health.providers).length : 2} Online
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            High-availability fault-tolerant routing
          </p>
        </div>
      </div>

      {/* Individual Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {health && Object.entries(health.providers).map(([key, provider]) => {
          const isGemini = key === 'gemini';
          const successRate = provider.total_requests > 0 
            ? ((provider.successful_requests / provider.total_requests) * 100).toFixed(1) 
            : '100.0';

          return (
            <div 
              key={key} 
              className={`p-6 rounded-2xl border bg-white shadow-xs space-y-5 transition ${
                provider.is_available 
                  ? 'border-brand-border' 
                  : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-brand-text capitalize">
                      {isGemini ? 'Google Gemini' : 'Groq API'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      ({isGemini ? 'gemini-3.8-flash' : 'openai/gpt-oss-120b'})
                    </span>
                  </div>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    {isGemini ? 'Interactions API / v1beta' : 'OpenAI-Compatible Chat Completions'}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  provider.is_available 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : provider.is_configured 
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    provider.is_available ? 'bg-emerald-500' : provider.is_configured ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                  }`}></span>
                  {provider.is_available ? 'Available' : provider.is_configured ? 'Temporary Cooldown' : 'Not Configured'}
                </span>
              </div>

              {/* Stats Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 text-xs font-medium">
                <div>
                  <div className="text-slate-400 text-[11px]">Total Requests</div>
                  <div className="text-base font-black font-mono text-brand-text mt-0.5">{provider.total_requests}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Success Rate</div>
                  <div className="text-base font-black font-mono text-emerald-700 mt-0.5">{successRate}%</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Fallbacks</div>
                  <div className="text-base font-black font-mono text-amber-600 mt-0.5">{provider.fallback_count}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Avg Latency</div>
                  <div className="text-base font-black font-mono text-brand-tealDark mt-0.5">{provider.avg_latency_ms} ms</div>
                </div>
              </div>

              {/* Cooldown Timer Alert */}
              {provider.cooldown_seconds_remaining > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 animate-spin text-amber-600" />
                  <span>
                    Temporary service cooldown active: <strong>{provider.cooldown_seconds_remaining}s remaining</strong>. Traffic seamlessly failed over to peer provider.
                  </span>
                </div>
              )}

              {provider.last_error && (
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
