# RideOps Support Operations — In-Depth Data Analysis

**Dataset Scope:** 1,444 tickets logged between 2 July 2026 and 30 September 2026.  
**Snapshot Date:** 30 September 2026 23:59:59 IST.  
**Analyzed By:** Autonomous Senior Product & Data Engineering Team.

---

## 1. Executive Summary: The Anatomy of the Support Crisis

Leadership reported that "open tickets are up about 60% since July." Our rigorous quantitative analysis confirms the underlying operational crisis, but invalidates the simplistic explanations offered by leadership and department leads:

1. **Volume Growth (+51.8%):** Ticket creation surged from **390 tickets in July** to **462 in August (+18.5%)** and **592 in September (+28.1% MoM, +51.8% vs July)**.
2. **The Escalation Bottleneck:** **486 out of 1,444 tickets (33.66%)** were escalated to engineering.
3. **The Escalation Quality Failure (Sandeep's Insight Validated):**
   - Only **43.42% (211 tickets)** of escalated issues were genuine bugs that required code fixes.
   - **35.59% (173 tickets)** were bounced back to L1 by engineering:
     - **89 tickets (18.31%)** returned for *Insufficient info - returned to L1*
     - **84 tickets (17.28%)** returned for *Config issue - returned to L1*
   - Another **11.52% (56 tickets)** were *Duplicate of known issue*, and **4.94% (24 tickets)** were *Not a bug - how-to*.
   - In total, **56.58% (275 out of 486 escalations)** were avoidable or rejected.
4. **The Resolution Penalty (Meera's Frustration Explained):**
   - Non-escalated tickets resolve in an average of **19.96 hours** (median **12.57 hours**).
   - Escalated tickets skyrocket to an average of **99.79 hours (~4.1 days)** (median **86.78 hours**).
   - **Bounced tickets suffer catastrophic delays:**
     - *Insufficient info*: Average **142.27 hours (~5.9 days)**
     - *Config issue*: Average **140.60 hours (~5.9 days)**
   - Tickets with 3 handoffs average **181.80 hours (~7.6 days)**.
5. **Customer Satisfaction Destruction:**
   - Unescalated tickets maintain a healthy mean CSAT of **4.01 / 5.0**.
   - Escalated tickets drop to **3.11 / 5.0**.
   - Bounced tickets suffer severe dissatisfaction: *Config issue returns* average **2.43 / 5.0**, and *Insufficient info returns* average **2.66 / 5.0**.

---

## 2. Detailed Ticket Volume & Growth Dynamics

### Monthly Creation Trend
| Month | Tickets Created | Share of Total | MoM Growth |
| :--- | :--- | :--- | :--- |
| **2026-07** | 390 | 27.01% | Baseline |
| **2026-08** | 462 | 31.99% | +18.46% |
| **2026-09** | 592 | 41.00% | +28.14% (+51.79% vs July) |
| **Total** | **1,444** | **100.0%** | |

### Incoming Channel Distribution
- **Portal:** 588 (40.72%)
- **Email:** 434 (30.06%)
- **Phone:** 272 (18.84%)
- **WhatsApp:** 150 (10.39%)

---

## 3. Category Concentration & Risk Profiling

The dataset contains 10 distinct issue categories. Concentration is heavily skewed toward three core functional domains:

| Category | Total Tickets | Escalated | Escalation Rate | Reopens | Closed Median Res (hrs) | Mean CSAT |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Roster / booking not syncing** | 344 (23.8%) | 175 | 50.87% | 59 (17.2%) | 42.1 | 3.42 |
| **Live tracking / GPS incorrect** | 228 (15.8%) | 127 | 55.70% | 41 (18.0%) | 51.3 | 3.32 |
| **Report export failing** | 206 (14.3%) | 77 | 37.38% | 23 (11.2%) | 19.8 | 3.75 |
| **Cab delay / no-show complaint** | 147 (10.2%) | 14 | 9.52% | 9 (6.1%) | 10.4 | 4.19 |
| **How-to / feature request** | 104 (7.2%) | 12 | 11.54% | 2 (1.9%) | 8.8 | 4.10 |
| **Login / access issue** | 100 (6.9%) | 8 | 8.00% | 2 (2.0%) | 7.6 | 4.07 |
| **OTP / boarding issue** | 95 (6.6%) | 34 | 35.79% | 11 (11.6%) | 18.2 | 3.68 |
| **Billing / invoice discrepancy** | 88 (6.1%) | 26 | 29.55% | 8 (9.1%) | 17.5 | 3.62 |
| **Employee address / geocode change** | 75 (5.2%) | 11 | 14.67% | 10 (13.3%) | 12.9 | 3.85 |
| **Driver / vehicle compliance docs** | 57 (3.9%) | 2 | 3.51% | 4 (7.0%) | 8.9 | 4.08 |

### Critical Takeaway: The "Big Three" Heavy-Load Categories
1. **Roster / booking not syncing** (344)
2. **Live tracking / GPS incorrect** (228)
3. **Report export failing** (206)

These top 3 categories account for **53.88% of all tickets (778 / 1,444)** and **77.98% of all engineering escalations (379 / 486)**. They also suffer from the lowest customer satisfaction (3.32 – 3.75) and the highest reopen rates (11% – 18%).

---

## 4. Engineering Handoff & Outcome Breakdown

Out of 486 escalated tickets:

| Engineering Outcome | Count | % of Escalated | Mean Res (Hours) | Median Res (Hours) | Mean CSAT |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fixed (True Bug)** | 211 | 43.42% | 78.64 | 64.83 | 3.41 |
| **Insufficient info - returned to L1** | 89 | 18.31% | 142.27 | 121.12 | 2.66 |
| **Config issue - returned to L1** | 84 | 17.28% | 140.60 | 128.57 | 2.43 |
| **Duplicate of known issue** | 56 | 11.52% | 80.09 | 67.49 | 3.47 |
| **Not a bug - how-to** | 24 | 4.94% | 75.46 | 68.67 | 3.20 |
| **Not reproducible** | 22 | 4.53% | 69.93 | 62.30 | 3.40 |

### Impact of Bounced Tickets
When a ticket is returned to L1, resolution time jumps by **+63.6 hours (+80.9%)** over a normal engineering fix and **+122.3 hours (+612.8%)** over a ticket resolved at L1.

---

## 5. Agent Variance and Lack of Standardized Triage

Support agents exhibit dramatic variance in escalation behavior and outcomes:

| Agent | Total Tickets | Open | Escalated | Escalation Rate % | Mean CSAT |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rahul T** | 151 | 6 | 93 | **61.59%** | 3.52 |
| **Ananya R** | 189 | 7 | 76 | 40.21% | 3.84 |
| **Sneha M** | 176 | 6 | 61 | 34.66% | 3.72 |
| **Priya D** | 186 | 6 | 61 | 32.80% | 3.78 |
| **Arjun K** | 178 | 5 | 58 | 32.58% | 3.85 |
| **Vikram S** | 176 | 6 | 53 | 30.11% | 3.92 |
| **Neha P** | 171 | 3 | 49 | 28.65% | 3.94 |
| **Karan B** | 217 | 9 | 35 | **16.13%** | 3.13 |

- **Rahul T escalates 61.6%** of his tickets, while **Karan B escalates only 16.1%**.
- However, Karan B's low escalation rate coincides with a low CSAT of 3.13, suggesting under-escalation or premature closure.
- This variance proves the absence of systematic tooling and uniform diagnostic criteria across the support organization.

---

## 6. Open Backlog & Ageing Snapshot (as of 30 Sept 2026)

Total open tickets: **48** (3.32% of total, all from September).
- **Status:** 29 Open with L1, 19 Open with Engineering.
- **Priority:** P1 (3), P2 (7), P3 (17), P4 (21).
- **Escalated status:** 34 of the 48 open tickets (70.8%) are currently escalated or in engineering workflow.
- **Age in days:** Mean = 2.66 days, Median = 2.15 days, Max = 9.28 days.
- **Category breakdown:** Roster sync (17), Live tracking (13), Report export (5) comprise 35 out of 48 open tickets (72.9%).

---

## 7. Conclusions for Product Design

1. **Root Cause:** The support team lacks structured diagnostic workflows at L1. When volume spiked +51.8%, agents began escalating blindly, causing a 35.6% return rate from engineering, dragging mean resolution to 142 hours and collapsing CSAT.
2. **Product Opportunity:** Build **SupportDesk** centered around:
   - A **Category-Guided Investigation Workbench** to empower L1 agents to diagnose and verify configuration issues before escalating.
   - An **Escalation Quality Gate** that prevents incomplete handoffs and packages clean engineering tickets.
   - An **Operational Intelligence Dashboard** for Meera and Ritika to track true bottlenecks (escalation return rate, handoff counts, resolution time distribution).
