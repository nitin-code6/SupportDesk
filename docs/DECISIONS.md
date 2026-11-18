# SupportDesk — Architectural & Product Decisions

This document records the foundational technical and design decisions made for SupportDesk v1, including trade-offs, rationale, and deliberate non-goals.

---

## 1. Ground Truth & Metrics Governance

### Context
Previous iterations of the dashboard displayed misleading and contradictory metrics (e.g., "-18.6% backlog trend" when actual open backlog rose +60.0% from July to September, and a single median resolution time labeled as "non-escalated" that actually averaged all closed tickets).

### Decision
- **Single Source of Truth (`backend/app/services/metrics.py`):** All operational calculations are executed directly in pure SQL/SQLAlchemy functions rather than ad-hoc frontend aggregations.
- **As-of-Date Backlog Snapshots:** Backlog is calculated as an as-of-date point-in-time snapshot:
  `created_at <= as_of_date AND (final_closed_at IS NULL OR final_closed_at > as_of_date)`
  This gives 30 tickets at July 31, 23 at August 31, and 48 at September 30 (+60.0% vs July, +108.7% vs August).
- **Side-by-Side Resolution Distributions:** We distinctly publish both median and mean for all four operating populations (Direct L1: 12.6h median, Escalated: 86.8h median, Bounced back to L1: 128.0h median, Overall closed: 22.3h median).

---

## 2. Server-Enforced Ticket State Machine

### Context
Tickets were occasionally transitioned directly into engineering without checks, or modified after resolution, causing data corruption and uncontrolled handoffs.

### Decision
- The server (`backend/app/routers/tickets.py`) strictly enforces allowable transitions:
  - `Open - with L1` $\rightarrow$ `Ready to Escalate`, `Closed`, `Open - with Engineering` (via gate)
  - `Ready to Escalate` $\rightarrow$ `Open - with Engineering`, `Open - with L1`, `Closed`
  - `Open - with Engineering` $\rightarrow$ `Open - with L1` (bounced back), `Closed`
  - `Closed` $\rightarrow$ `Reopened`
- Any illegal transition is rejected with **HTTP 409 Conflict**.

---

## 3. Server-Side Quality Gate & Audited Manager Bypass

### Context
35.6% of engineering escalations bounced back to L1 because preliminary diagnostic checks were skipped.

### Decision
- **Server Recalculates Readiness:** The client cannot spoof an escalation. `POST /api/tickets/{id}/escalate` computes the checklist completion score directly from the database.
- **Strict Readiness Formula:**
  $$\text{Readiness Score} = \frac{\text{Completed Required Checks}}{\text{Total Required Checks}} \times 100$$
  - Checks marked "Failed" count as completed diagnostics (they provide the exact failure evidence engineering needs).
  - Checks marked "N/A" count as completed only if a justification ($\ge 5$ characters) is recorded.
- **Manager Bypass Control:**
  - Non-manager users attempting a bypass receive **HTTP 403 Forbidden**.
  - A bypass requires an explicit business reason ($\ge 20$ characters) and an audited category (`fleet_emergency`, `client_sla`, or `other`).
  - An immutable row is logged into `escalation_audit_logs`.

---

## 4. Multi-Provider AI Architecture & Rolling Circuit Breaker

### Context
External LLM APIs experience rate limits (HTTP 429), temporary outages (HTTP 503), or network latency spikes.

### Decision
- **Atomic Rotation & Failover:** Requests rotate between Google Gemini (`gemini-3.8-flash`) and Groq (`openai/gpt-oss-120b`).
- **Telemetry Distinction:** We distinctly track:
  - `triggered_fallbacks`: Outages originating on this provider that forced a failover.
  - `served_fallbacks`: Requests successfully handled on behalf of a failing peer.
- **Rolling Circuit Breaker:** After 3 consecutive failures or 503 errors, a provider enters an `open` circuit state with an automatic cooldown timer. When the cooldown expires, it enters `half-open` to test a single probe before resuming full traffic.
- **PII Scrubbing:** All input descriptions and internal notes pass through `scrub_text()` before leaving the system, redacting emails, phone numbers, employee IDs, credit card numbers, and OTPs.
- **Deterministic Rule Fallback:** If all external AI providers fail, `deterministic_brief.py` produces a structured engineering package directly from checklist findings, ensuring agents are never blocked.

---

## 5. Deliberate Non-Goals for v1

1. **No External Headcount Automation:** Rather than replacing human L1 agents, the tool empowers agents to make high-confidence triage decisions under pressure.
2. **No Black-Box Autonomous Escalation:** AI assists in summarizing symptoms and drafting handoff packages, but human agent sign-off is mandatory.
3. **No Direct Production Database Writes from Frontend:** All mutations pass through validated FastAPI REST endpoints with SQLite/Postgres compatibility.
