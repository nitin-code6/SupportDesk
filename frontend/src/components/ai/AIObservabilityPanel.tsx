import React, { useEffect, useState } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Clock, 
  RotateCw,
  Activity,
  Layers
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
      // Run AI summary on a known sample ticket
      const res = await api.summarizeTicketAI('SUP-10001');
      setTestResult(`Success! Completed via [${res.provider_used.toUpperCase()}] in ${res.latency_ms} ms.`);
      await loadHealth();
    } catch (err: any) {
      setTestResult(`Test failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading && !health) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
          <p className="text-sm text-slate-400">Loading AI provider health telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Multi-Provider AI Observability & Resilience
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, failure detection, rotation & fallback across Google Gemini and Groq.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHealth}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleTestRotation}
            disabled={testing}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            {testing ? 'Executing Test Call...' : 'Test Provider Rotation & Fallback'}
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-3 rounded-lg bg-slate-800/80 border border-indigo-500/30 text-indigo-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Top Config Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Rotation Strategy</span>
            <RotateCw className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white capitalize">
            {health?.active_strategy.replace('_', ' ')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Requests rotate atomically across concurrent sessions
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Failover & Fallback</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {health?.fallback_enabled ? 'Active & Enforced' : 'Disabled'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Auto-fails over on 5xx, 429, timeouts, or invalid JSON
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Healthy Providers Online</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-bold font-mono text-indigo-300">
            {health?.healthy_providers_count} / {health ? Object.keys(health.providers).length : 2} Active
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Zero downtime architecture
          </div>
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
              className={`p-6 rounded-xl border bg-slate-900 shadow-sm transition space-y-4 ${
                provider.is_available 
                  ? 'border-slate-800' 
                  : 'border-amber-500/40 bg-amber-500/5'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white capitalize">
                      {isGemini ? 'Google Gemini' : 'Groq API'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({isGemini ? 'gemini-3.8-flash' : 'openai/gpt-oss-120b'})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isGemini ? 'Interactions API / v1beta' : 'OpenAI-Compatible Chat Completions'}
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  provider.is_available 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${provider.is_available ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
                  {provider.is_available ? 'Available' : 'Temporary Cooldown'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-800 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">Total Calls</div>
                  <div className="text-base font-bold font-mono text-white mt-0.5">{provider.total_requests}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Success Rate</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{successRate}%</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Fallbacks</div>
                  <div className="text-base font-bold font-mono text-amber-300 mt-0.5">{provider.fallback_count}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Avg Latency</div>
                  <div className="text-base font-bold font-mono text-sky-400 mt-0.5">{provider.avg_latency_ms} ms</div>
                </div>
              </div>

              {/* Cooldown or Error Message */}
              {provider.cooldown_seconds_remaining > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 animate-spin" />
                  <span>
                    Temporary service cooldown active: <strong>{provider.cooldown_seconds_remaining}s remaining</strong>. Traffic automatically directed to peer provider.
                  </span>
                </div>
              )}

              {provider.last_error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <span className="font-semibold block mb-0.5">Last Observed Issue (Masked):</span>
                  <span className="font-mono text-[11px] text-slate-300">{provider.last_error}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
