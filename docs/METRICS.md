# SupportDesk v1 — Canonical Metrics Specification

**Date:** 19 November 2026  
**Dataset:** 1,444 Support Tickets (2 Jul 2026 – 30 Sep 2026)  
**Frozen Snapshot Date:** 30 September 2026, 23:59:59 UTC (`2026-09-30T23:59:59`)

---

## 1. Executive Summary of Core Operational Metrics

| Metric | Exact Value | Population | Baseline / Comparison |
| :--- | :--- | :--- | :--- |
| **Total Inflow Volume** | **1,444** | All ingested tickets | Jul: 390 $\rightarrow$ Aug: 462 $\rightarrow$ Sep: 592 (**+51.8%**) |
| **Current Open Backlog** | **48** | Open tickets as of 30 Sep 2026 | **+60.0%** vs Jul (30) / **+108.7%** vs Aug (23) |
| **Open with L1 Support** | **29** | Active with L1 agents | 60.4% of active backlog |
| **Open with Engineering** | **19** | Active in engineering triage | 39.6% of active backlog |
| **Total Escalations** | **486** (33.7%) | `escalated_to_eng == True` | Benchmark target: < 20.0% |
| **Returned to L1 (Bounced)** | **173** (35.6%) | Insufficient Info (89) + Config (84) | **Target: < 15.0%** |
| **Avoidable Escalations** | **275** (56.6%) | Bounced (173) + Dups (56) + How-to (24) + Not-Rep (22) | Target: < 20.0% |
| **Genuine Bug Fixes** | **211** (43.4%) | `eng_outcome == 'Fixed'` | Only code fixes justified for engineering |
| **Median Resolution (Direct L1)** | **12.57 hrs** | Closed without escalation (944) | Mean: **19.96 hrs** |
| **Median Resolution (Escalated)** | **86.78 hrs** | Closed with escalation (452) | Mean: **99.79 hrs** ($5\times$ longer than direct L1) |
| **Median Resolution (Bounced)** | **127.97 hrs** | Closed after return to L1 (155) | Mean: **141.45 hrs** (~5.9 days) |
| **Median Resolution (All Closed)**| **22.31 hrs** | All closed tickets (1,396) | Mean: **45.80 hrs** |
| **Mean CSAT (Direct L1)** | **4.01 / 5.0** | Non-escalated closed | Healthy enterprise benchmark |
| **Mean CSAT (Escalated)** | **3.11 / 5.0** | Escalated closed | Noticeable customer friction |
| **Mean CSAT (Bounced)** | **2.55 / 5.0** | Returned closed | Critical SLA breach & churn hazard |
| **Reopen Rate** | **10.46%** (151 tickets)| `reopen_count > 0` | Target: < 5.0% |

---

## 2. Mathematical Definitions & Pure SQL Logic

### 1. Open Backlog Snapshot (As-Of Date)
```sql
-- Computes the true active backlog at any point in time
SELECT COUNT(*) 
FROM tickets 
WHERE created_at <= :as_of_timestamp 
  AND (final_closed_at IS NULL OR final_closed_at > :as_of_timestamp);
```
- **Jul 31, 2026 Snapshot:** 30 tickets
- **Aug 31, 2026 Snapshot:** 23 tickets
- **Sep 30, 2026 Snapshot:** 48 tickets
- **Trend vs July:** $\frac{48 - 30}{30} \times 100 = +60.0\%$
- **Trend vs August:** $\frac{48 - 23}{23} \times 100 = +108.7\%$

### 2. Escalation Rate
$$\text{Escalation Rate} = \frac{\text{Tickets Escalated to Engineering}}{\text{Total Tickets Ingested}} = \frac{486}{1444} = 33.66\% \rightarrow \mathbf{33.7\%}$$

### 3. Escalation Bounce Rate (Returned to L1)
$$\text{Bounce Rate} = \frac{\text{Insufficient Info (89)} + \text{Config Issue (84)}}{\text{Total Escalated (486)}} = \frac{173}{486} = 35.596\% \rightarrow \mathbf{35.6\%}$$

### 4. Avoidable Escalation Rate
$$\text{Avoidable Rate} = \frac{\text{Returned (173)} + \text{Duplicates (56)} + \text{How-to (24)} + \text{Not Reproducible (22)}}{\text{Total Escalated (486)}} = \frac{275}{486} = 56.58\% \rightarrow \mathbf{56.6\%}$$

### 5. Resolution Time (Hours)
$$\text{Resolution Hours} = \frac{\text{final\_closed\_at} - \text{created\_at}}{3600}$$
- **Direct L1 (944 closed):** Median = **12.57 hrs**, Mean = **19.96 hrs**.
- **Escalated (452 closed):** Median = **86.78 hrs**, Mean = **99.79 hrs**.
- **Bounced back to L1 (155 closed):** Median = **127.97 hrs**, Mean = **141.45 hrs**.
- **All Closed (1,396 closed):** Median = **22.31 hrs**, Mean = **45.80 hrs**.

---

## 3. Single Formatting Standard

All numbers are computed with raw precision in the backend (`backend/app/services/metrics.py`) and formatted strictly at display time via `formatters.ts`:

- Percentages: `X.X%` (e.g. `35.6%`, `56.6%`, `33.7%`, `+60.0%`).
- Hours: `X.X hrs` (e.g. `12.6 hrs`, `86.8 hrs`, `141.5 hrs`, `22.3 hrs`).
- Counts: Integer formatting (e.g. `1,444`, `486`, `173`, `48`).
