# SupportDesk Verification & Testing Strategy

SupportDesk incorporates automated testing across both backend and frontend layers to guarantee mathematical fidelity to the RideOps 1,444-ticket ground-truth dataset, lifecycle state machine integrity, and AI provider resilience.

---

## 1. Test Suite Architecture

The test suite is organized into distinct categories under `backend/tests/`:

| Test Module | Scope & Focus | Primary Assertions |
| :--- | :--- | :--- |
| `test_golden_metrics.py` | Ground-truth dataset invariants | Total tickets (1,444), Monthly volume (390, 462, 592), Backlog progression (30 $\rightarrow$ 48), Escalation counts (486), Bounce counts (173), Resolution durations, Agent variances. |
| `test_resolution_and_analytics.py` | Direct L1 resolutions & analytics filters | End-to-end resolution lifecycle, optimistic concurrency locking, multi-dimensional filtering, dynamic KPI recalculation. |
| `test_ai_providers.py` | AI routing & schema validation | Gemini & Groq response contracts, JSON schema enforcement, model fallback logic, confidence intervals. |
| `test_ai_resilience_and_chaos.py` | Fault tolerance & PII scrubbing | In-memory PII sanitization (emails, phones, IPs, tokens), circuit breaker activation under latency/timeouts, deterministic local fallback engine. |

---

## 2. Golden Dataset Invariant Verification

To ensure that no metrics are hardcoded and that database calculations match ground-truth reality, `test_golden_metrics.py` asserts:

1. **Volume Growth**:
   - July 2026: 390 tickets
   - August 2026: 462 tickets
   - September 2026: 592 tickets
   - *Growth Rate: +51.8% over the quarter.*
2. **Backlog Snapshots**:
   - 31 July 2026: 30 active tickets
   - 31 August 2026: 38 active tickets
   - 30 September 2026: 48 active tickets (29 with L1, 19 with Engineering)
   - *Backlog Growth: +60.0% increase.*
3. **Escalation & Bounce Counts**:
   - Total escalations: 486 (33.66% rate)
   - Returned by Engineering: 173 (35.60% bounce rate)
   - Avoidable escalations (Configuration + Missing Info): 275 (56.58% of all escalations)
4. **Turnaround Disparity**:
   - Direct L1 Resolution: ~19.96 hours
   - Escalated to Engineering: ~99.79 hours
   - Returned & Bounced: ~141.45 hours (over 7x longer than direct L1 fix)
5. **CSAT Impact**:
   - Direct L1 Resolution: 4.01 / 5.0
   - Bounced Escalations: 2.43 - 2.55 / 5.0

---

## 3. Chaos & Fault Injection Testing

`test_ai_resilience_and_chaos.py` tests failure scenarios:
- **Artificial Latency**: Delays exceeding `AI_REQUEST_TIMEOUT` (30s) abort cleanly without hanging the UI.
- **Provider Outages**: When Google Gemini returns HTTP 503 or 429, traffic shifts to Groq in under 50ms.
- **Full Disconnection**: When all cloud APIs are severed, the deterministic local heuristic rule engine produces actionable diagnostic checklists and root-cause suggestions with zero errors.
- **PII Scrubbing**: Injects synthetic customer records containing credit card numbers, phone numbers, and bearer tokens, verifying that payloads dispatched to external APIs have 0% leaked sensitive tokens.

---

## 4. Running the Tests Locally

### Backend Unit & Integration Tests:
```powershell
# Set PYTHONPATH to backend directory
$env:PYTHONPATH="backend"

# Execute full pytest suite with verbose output
python -m pytest backend/tests/ -v
```

### Frontend Typecheck & Build Verification:
```powershell
cd frontend

# Verify TypeScript compilation and Vite production bundle
npm run build
```
*(Ensures zero TypeScript compiler errors and produces optimized static assets in `frontend/dist/`)*
