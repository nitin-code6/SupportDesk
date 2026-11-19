# Project Overview — SupportDesk for RideOps

SupportDesk is an enterprise-grade support operations and diagnostic intelligence platform custom-built for **RideOps**, a corporate employee transportation SaaS serving over 200 corporate clients across high-density enterprise corridors.

---

## 1. Business Problem & Leadership Conflict

Between July and September 2026, RideOps leadership confronted a severe operational crisis:

> *"Support is drowning. Open tickets are up about 60% since July and our clients are noticing. Bring that number down."*  
> — **Ritika, Head of Operations** (Zero budget for new headcount; requires operational optimization this quarter).

Key departmental stakeholders presented conflicting narratives:
- **Meera (Support Team Lead):** Contended that engineering was the fundamental bottleneck. Handoffs took over 4 days, resulting in frustrated clients, repeated status follow-ups, and ballooning backlog. She requested 3 additional L1 support agents.
- **Sandeep (Engineering Manager):** Contended that support agents were using engineering as a "dumping ground" for issues they had not properly investigated, escalating basic configuration errors and lacking basic reproduction steps or diagnostic evidence.

---

## 2. Empirical Ground-Truth Findings (1,444 Ticket Dataset)

Rather than taking sides, we conducted an exhaustive empirical reconciliation across all **1,444 ticket records** logged between **2 July 2026** and **30 September 2026**:

| Metric | Empirical Ground-Truth | Operational Analysis |
| :--- | :--- | :--- |
| **Total Inflow Growth** | **+51.79%** (390 in July → 592 in Sept) | Organic client onboarding surged intake by more than half without staffing changes. |
| **Open Backlog Growth** | **+60.0%** (30 at Jul month-end → 48 at Sep month-end) | Confirms Ritika's exact observation: active queue increased from 30 to 48 tickets. |
| **Engineering Escalation Rate** | **33.66%** (486 of 1,444 tickets) | 1 out of every 3 tickets was escalated directly to engineering. |
| **Return-to-L1 Bounce Rate** | **35.60%** (173 of 486 escalations) | **Sandeep was correct:** More than 1 in 3 escalated tickets were rejected by engineering (*89 Insufficient Info*, *84 Client Config Errors*). |
| **Avoidable Escalation Rate** | **56.58%** (275 of 486 escalations) | 56.6% of escalations were non-code issues (*Config*, *Insufficient Info*, *Duplicates*, *How-tos*, *Non-reproducible*). |
| **Direct L1 Resolution Time** | **19.96 hours** (median 12.57h) | When L1 resolves tickets directly, turnaround is swift and sustainable. |
| **Escalated Resolution Time** | **99.79 hours** (~4.1 days) | Valid escalations take ~4.1 days from initial triage to release. |
| **Bounced Ticket Resolution Time** | **141.45 hours** (~5.9 days) | **Meera was correct:** Tickets bounced back and forth take **7x longer** than direct L1 resolution. |
| **Customer Satisfaction (CSAT)** | Direct L1: **4.01 / 5** → Bounced: **2.43 – 2.55 / 5** | Premature escalations and ping-pong handoffs destroy client trust. |
| **Agent Escalation Disparity** | **16.1% to 61.6%** across 8 agents | Severe triage inconsistency: Karan B escalates 16.1%, while Rahul T escalates 61.6%. |
| **Category Concentration** | Top 3 = **77.98% of all escalations** | *Roster & Booking Sync* (175), *Live Cab Tracking & GPS* (127), and *Billing & Invoicing* (77). |

### The Root Cause: The Escalation-Rejection Doom Loop
```
   Inflow Spikes (+51.8%)
          │
          ▼
   L1 Lacks Category Checklists & Evidence Capture
          │
          ▼
   Premature Engineering Escalation (33.7%)
          │
          ▼
   Engineering Rejection & Bounce-Back (35.6%)
          │
          ▼
   Resolution Time Blows Out to 141.5 Hours (CSAT drops to 2.55)
          │
          ▼
   Client Chasers & Re-opened Tickets Fill the Backlog (48 Open)
```

---

## 3. The Core Persona: L1 Support Agent

The primary operator of SupportDesk is the **L1 Support Agent** (e.g. Vikram S, Ananya R, Rahul T).

### Primary Responsibilities:
1. **Rapid Triage:** Quickly inspect incoming corporate transportation issues from portal, email, and phone channels.
2. **Category Protocol Execution:** Follow standardized diagnostic checklists (*Roster format, GPS latency, OTP sync, Billing rounding*) without guessing.
3. **First-Contact Resolution:** Use collected diagnostic evidence to resolve customer guidance, access lockouts, and configuration discrepancies immediately.
4. **Structured Escalation:** When a true backend defect or platform outage is proven, hand off complete, structured evidence packages with 100% checklist completion to Engineering.

---

## 4. How SupportDesk Solves the Problem

1. **Standardized Diagnostic Protocols:** Replaces tribal knowledge with category-specific checklists, ensuring junior agents perform the same checks as senior agents.
2. **Smart Ticket Resolution Workflow:** Automatically synthesizes saved investigation facts, completed checks, and ticket history into a one-click resolution draft.
3. **Escalation Quality Gate:** Enforces 100% diagnostic verification before handoff. Incomplete escalations are blocked, eliminating the 173 avoidable bounce-backs.
4. **Audit Trail & Governance:** Authorized supervisor overrides with mandatory justification and immutable audit logging for emergency escalations.
5. **Dynamic Operational Intelligence:** Real-time visibility into bounce rates, agent triage disparity, and category risks directly calculated from database queries.
