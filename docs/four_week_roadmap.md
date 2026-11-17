# SupportDesk — Four-Week Operational Implementation Roadmap

**Goal:** Eliminate the Escalation-Rejection Doom Loop and clear the RideOps support backlog this quarter without additional headcount.

---

## Week 1: L1 Triage Standardization & Pilot Rollout
- **Objective:** Deploy SupportDesk v0 to top-escalating agents (e.g. Rahul T and Ananya R) on the top 2 problem categories: *Roster / booking not syncing* and *Live tracking / GPS incorrect*.
- **Key Actions:**
  - Enforce the mandatory Diagnostic Checklist for all roster and telematics tickets.
  - Implement L1-side configuration guides so agents resolve header/cutoff errors directly.
  - Activate the Escalation Quality Gate in warning mode (logging incomplete escalations).
- **Deliverables & KPIs:**
  - Escalation return rate for pilot categories reduced from 35.6% to < 20%.
  - Zero unverified escalations submitted without preliminary telematics ping checks.
- **What We Deliberately Do NOT Do:** Do not modify the Jira/Engineering ticketing system; keep the boundary clean.

---

## Week 2: Escalation Gate Hardening & Handoff Packaging
- **Objective:** Turn on strict Quality Gate enforcement across all 8 support agents and all 10 categories.
- **Key Actions:**
  - Block direct escalations that have pending required diagnostic checks.
  - Mandate structured escalation summaries with reproduction steps and actual vs expected logs.
  - Enable manager bypass override for genuine emergencies with mandatory audit reasons.
- **Deliverables & KPIs:**
  - Total engineering escalation volume reduced by 30% (saving ~50 engineering hours/week).
  - Escalation bounce rate dropped to < 10%.

---

## Week 3: Client Self-Service & Proactive Notifications
- **Objective:** Intercept recurring complaints at the client portal before tickets are raised.
- **Key Actions:**
  - Add client-side roster CSV template validator in the transport admin portal.
  - Display live vehicle GPS status directly to corporate admins when telematics are delayed.
  - Automate SMS notifications for driver arrival to reduce "Cab delay / no-show" tickets.
- **Deliverables & KPIs:**
  - Incoming ticket creation volume reduced by 15%.
  - P1/P2 open ticket backlog cleared within 12 hours of report.

---

## Week 4: Continuous Operational Intelligence & SLA Governance
- **Objective:** Establish weekly operational reviews with Meera, Sandeep, and Ritika powered by SupportDesk analytics.
- **Key Actions:**
  - Weekly automated report on avoidable escalation rates and agent diagnostic compliance.
  - Align engineering on 48-hour SLA for verified escalations passing the Quality Gate.
  - Transition SupportDesk from v0 pilot to permanent company-wide operations hub.
- **Target Outcomes:**
  - Overall mean resolution time reduced from **45.8 hours to < 24 hours**.
  - Escalated ticket CSAT lifted from **3.11 to > 4.0**.
  - Total open backlog reduced by > 50% without hiring a single additional employee.
