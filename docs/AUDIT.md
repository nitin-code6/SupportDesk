# SupportDesk v1 — System & Data Audit

**Date:** 19 November 2026  
**Auditor:** Senior Full-Stack Engineer & Product Architect  
**Scope:** Full-stack codebase audit across `data/`, `backend/`, and `frontend/` against the RideOps 1,444 ticket dataset (`rideops_support_tickets.csv`, `rideops_data_dictionary.csv`).

---

## 1. Executive Summary & Audit Findings

An exhaustive audit of the raw dataset, database ingestion, backend logic, and frontend components revealed critical discrepancies between the raw ground truth and the UI presentation. While the application foundations are functional (18 passing backend tests, FastAPI backend, React/Vite/Tailwind frontend), several metrics were mislabeled, hardcoded, or distorted by mutable state mutations.

### Key Audit Matrix

| Component | Reported in Current UI | Ground Truth (from CSV) | Discrepancy & Root Cause | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Open Backlog Trend** | `48, ▼ -18.6%` | Jul: 30, Aug: 23, Sep: 48 (**+60.0%** vs Jul, **+108.7%** vs Aug) | Hardcoded delta label contradicts the leadership headline. Month-end backlog was never computed as an as-of snapshot. | **CRITICAL** |
| **Median Resolution** | `19.9 hrs (▼ -28.4%)` / `22.31 hrs` labeled "non-escalated" | All closed median: **22.31 hrs**; Non-escalated median: **12.57 hrs** (mean 19.96 hrs) | 22.31 hrs is the median of *all* closed tickets, but was labeled as non-escalated. True non-escalated median is 12.57 hrs. | **HIGH** |
| **Escalations Count** | `487` in card subtitle, `486` elsewhere | Exactly **486** (33.7%) in raw dataset | Submitting test escalations in SQLite mutated the database to 487 without idempotent reset. | **HIGH** |
| **Returned to L1 Rate** | `35.52%` in one place, `35.6%` in another | Exactly **35.60%** (173 / 486) | Floating-point rounding varied between endpoints; when count was 487, 173 / 487 gave 35.52%. Must be single source. | **HIGH** |
| **SUP-11444 Quality Gate** | "4 pending" checks, 50% score, blocked gate | Ticket is already `Open - with Engineering` (1 handoff) | 1) `InvestigationCheck` records were duplicated (IDs 9-12 and 13-16). 2) Tickets already with engineering should not show an active pre-escalation gate. | **CRITICAL** |
| **SUP-11444 Portal Check** | Passed in Workbench, Pending in Gate | Two duplicate rows in DB: one passed, one pending | No unique constraint on `(ticket_id, check_key)`. Workbench and Gate read differing records. | **CRITICAL** |
| **Ticket Queue** | "Showing 15 of 1444" without clear page controls | 1,444 tickets | Pagination exists in code but lacks URL filter persistence, sort controls, and keyboard navigation. | **MEDIUM** |
| **AI Provider Health** | Fixed status string "Upstream 503 (Failover Active)" | Gemini hits 503, Groq handles request | Status string is hardcoded conditionally instead of backed by a true rolling circuit breaker window. | **MEDIUM** |

---

## 2. Detailed Findings

### A. Data & Metrics Reconciled Against Raw CSV

1. **Volume & Creation Dynamics:**
   - July 2026: **390 tickets**
   - August 2026: **462 tickets**
   - September 2026: **592 tickets**
   - Total Volume: **1,444 tickets** (+51.8% surge from July to September).
2. **Backlog As-Of-Date Snapshots:**
   - Condition: `created_at <= date AND (final_closed_at IS NULL OR final_closed_at > date)`
   - As of 2026-07-31 23:59:59: **30 tickets**
   - As of 2026-08-31 23:59:59: **23 tickets**
   - As of 2026-09-30 23:59:59: **48 tickets** (29 with L1, 19 with Engineering)
   - **Trend Reality:** Backlog surged **+60.0%** compared to July month-end (30 $\rightarrow$ 48) and more than doubled August month-end (23 $\rightarrow$ 48, **+108.7%**). The current dashboard card displaying `▼ -18.6%` was completely bogus.
3. **Escalations & Outcomes:**
   - Escalated to Engineering: **486** (33.66% $\rightarrow$ **33.7%**)
   - Non-escalated: **958** (66.3%)
   - Engineering Outcomes Breakdown (486 total):
     - `Fixed`: **211** (43.4%)
     - `Insufficient info - returned to L1`: **89** (18.3%)
     - `Config issue - returned to L1`: **84** (17.3%)
     - `Duplicate of known issue`: **56** (11.5%)
     - `Not a bug - how-to`: **24** (4.9%)
     - `Not reproducible`: **22** (4.5%)
   - Total Returned to L1: $89 + 84 =$ **173** (35.60% $\rightarrow$ **35.6%**).
   - Total Avoidable Escalations: $173 + 56 + 24 + 22 =$ **275** (56.58% $\rightarrow$ **56.6%**).
4. **Resolution Times (Hours):**
   - **All Closed Tickets (1,396):** Median = **22.31 hrs**, Mean = **45.80 hrs**.
   - **Direct Non-Escalated (944 closed):** Median = **12.57 hrs**, Mean = **19.96 hrs**.
   - **Escalated (452 closed):** Median = **86.78 hrs**, Mean = **99.79 hrs**.
   - **Bounced / Returned (155 closed):** Median = **127.97 hrs**, Mean = **141.45 hrs**.
   - *Error Identified:* The dashboard displayed "22.31 hrs" under the card labeled "Median resolution (time to resolve non-escalated tickets)". 22.31 hrs is the median of *all* closed tickets, not non-escalated tickets. Non-escalated median is 12.57 hrs.

---

### B. State Machine & Quality Gate Vulnerabilities

1. **Duplicate Check Records (Seen on SUP-11444):**
   - In SQLite, ticket `SUP-11444` had 8 checks instead of 4:
     - Check 9: `client_config_verification` (status: `passed`)
     - Check 10: `reproduction_in_staging` (status: `pending`)
     - Check 11: `error_payload_and_screenshots` (status: `pending`)
     - Check 12: `known_issues_incident_board` (status: `passed`)
     - Check 13: `client_config_verification` (status: `pending`)
     - Check 14: `reproduction_in_staging` (status: `pending`)
     - Check 15: `error_payload_and_screenshots` (status: `passed`)
     - Check 16: `known_issues_incident_board` (status: `passed`)
   - *Cause:* `TriageService.initialize_ticket_checks` was called multiple times without a unique constraint on `(ticket_id, check_key)`.
   - *Impact:* The workbench displayed Check 9 as `passed`, while the gate evaluated Check 13 as `pending`. "Issue Reproduction Attempt" appeared twice in the pending list.
2. **Absence of Ticket State Machine:**
   - The ticket status was treated as a loose string (`Open - with L1`, `Open - with Engineering`, `Closed`).
   - When a ticket is already `Open - with Engineering`, the UI still rendered a pre-escalation quality gate claiming "ESCALATION BLOCKED (4 pending checks)".
   - No optimistic concurrency control (`version` column missing), allowing race conditions between concurrent agents.

---

### C. AI Provider & Observability Layer

1. **Model Name Verification:**
   - `gemini-3.8-flash` is configured in `.env`, but is currently returning `HTTP 503 Service Unavailable` ("model is currently experiencing high demand").
   - The system must verify model names at startup via provider model-list endpoints, falling back gracefully and warning operators.
2. **Circuit Breaker & Fallback Accounting:**
   - Current health status tracked cumulative counts across process lifetime without rolling time windows.
   - Provider "fallbacks" conflated two distinct metrics:
     1. How many times *this* provider failed and caused a fallback.
     2. How many times *this* provider served as the secondary fallback for a peer.
3. **Data Protection:**
   - PII (emails, phone numbers, employee IDs) must be sanitized before sending prompts to external LLMs.

---

### D. UI/UX & Emotional Ergonomics

1. **Visual Noise:**
   - High-contrast alert boxes (e.g. bright rose and neon ambers) appeared on idle states, inducing panic for L1 agents.
   - Headers used uppercase tracked text (`TICKET`, `ISSUE`, `PRIORITY`) which felt robotic.
2. **Plain Language Needed:**
   - Technical statuses like `Open - with L1` and `Open - with Engineering` should be replaced with warm, human equivalents: `"With you"` and `"Waiting on engineering"`.
   - Quality gate feedback should be reassuring: `"Nice, all checks are done. You can send this to engineering."`

---

## 3. Next Steps: Phased Implementation Plan

See accompanying plan artifact for execution details across Phases 1 through 5.
