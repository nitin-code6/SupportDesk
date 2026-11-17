# RideOps SupportDesk — Problem Framing & Strategic Alignment

## 1. The Core Problem Statement

**RideOps is caught in an Escalation-Rejection Doom Loop:**
Ticket intake surged by **+51.8%** between July and September 2026 without any increase in support headcount. Lacking structured diagnostic tooling and validation standards, L1 support agents began escalating **1 in 3 incoming tickets (33.7%)** to engineering. 

Engineering was swamped by incomplete tickets and returned **35.6% (173 tickets)** back to L1 due to missing preliminary information (89 tickets) or basic customer configuration issues (84 tickets). 

This handoff ping-pong inflated resolution times from **20 hours (L1 direct)** to **141–142 hours (bounced escalations)**, drove customer CSAT down from **4.01 to 2.43**, and caused open tickets to accumulate.

---

## 2. Deconstructing the Stakeholder Perspectives

| Stakeholder | Stated Perception | Objective Data Finding | Alignment Verdict |
| :--- | :--- | :--- | :--- |
| **Meera** *(Support Lead)* | "Engineering turnaround is the bottleneck; tickets disappear for days." | Escalated tickets do take 5x longer (99.8h vs 20.0h). However, 56.6% of escalations are returned or non-bug issues caused by inadequate L1 triage. | **Partially Correct:** Symptom identified, but root cause misattributed. |
| **Sandeep** *(Engineering Lead)* | "Support escalates without preliminary checks; engineers spend hours figuring out what the problem is." | Exactly 173 tickets (35.6% of escalations) were returned specifically for missing info or config errors. Avoidable escalations total 56.6%. | **Highly Accurate:** Directly corroborated by engineering outcome records. |
| **Ritika** *(Head of Ops)* | "Open tickets keep growing; reduce the backlog this quarter with zero budget for new hires." | Volume surged +51.8%. Open tickets cannot be cleared simply by working faster without fixing the 142h bounce loop. | **Strategic Mandate:** Efficiency tooling is the only mathematically viable solution. |

---

## 3. Product Vision & Target Persona

### Chosen Primary Persona: The L1 Support Agent
- **Why?** The L1 agent sits at the critical pivot point where a ticket is either resolved cleanly in < 20 hours or pushed into a multi-day escalation spiral.
- **Goal:** Empower the L1 agent with standard diagnostic checklists, missing-information prompts, and automated escalation packaging so they can resolve config issues independently and produce high-quality escalations when genuine bugs occur.

### Secondary Persona: Support Lead & Operations Head (Meera & Ritika)
- **Goal:** Real-time visibility into the escalation gate, handoff metrics, category trends, and agent coaching opportunities.

---

## 4. Measurable Success Framework

### Primary North Star Metric
- **Escalation Bounce Rate:** Reduce from **35.6% to < 10%** in 4 weeks.

### Supporting Weekly Operational Metrics
1. **Average Resolution Time (Hours):** Reduce overall mean resolution from 45.8h to < 30h.
2. **First-Time Escalation Quality:** Ensure > 80% of escalated tickets result in `Fixed`.
3. **Avoidable Escalation Volume:** Decrease non-bug/config escalations by at least 50%.
4. **Customer Satisfaction (CSAT):** Lift escalated ticket CSAT from 3.11 back toward 3.80+.
5. **Backlog Clearance Velocity:** Clear unresolved P1/P2 tickets within 24 hours.
