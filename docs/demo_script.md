# SupportDesk — 15-Minute Evaluator Demo Script & Q&A Defense

**Target Audience:** Evaluators, Engineering Leaders, and Operations Executives.  
**Total Time:** 25 minutes (15 min walkthrough, 10 min Q&A).

---

## 1. 15-Minute Demo Narrative Walkthrough

### Part 1: The Strategic Diagnosis (3 Minutes)
- **Open on the Command Center (`OperationsDashboard`):**
  - "Leadership asked us to reduce open tickets by 60% without hiring. Meera blamed engineering delays; Sandeep blamed lazy support escalations. What does the data actually prove?"
  - **Show the Numbers:**
    - Volume surged **+51.8%** from July to September (390 → 592 tickets).
    - Support escalated **33.7%** of all tickets (486 tickets).
    - **35.6% of escalations (173 tickets) bounced back from engineering** due to missing preliminary info (89) or basic config errors (84).
    - Normal L1 tickets resolve in **20 hours**. Bounced tickets take **142 hours (~5.9 days)**, dragging CSAT down to **2.43**!
  - "The bottleneck is not engineering capacity alone—it is the lack of a structured diagnostic quality gate at L1."

### Part 2: Working Ticket Triage (`TicketWorkspace`) (3 Minutes)
- **Navigate to Ticket Queue:**
  - Demonstrate search by ticket ID, corporate client name, or description.
  - Filter by `Category: Roster / booking not syncing` and `Priority: P1`.
  - Notice the handoff indicators: tickets bouncing 2x or 3x between L1 and Engineering.
  - Select ticket **`SUP-10001`** (or another active issue) and click **"Open in Workbench"**.

### Part 3: The Core Differentiator — Investigation Workbench (5 Minutes)
- **Show the Diagnostic Protocol:**
  - Notice how the workbench dynamically loads the **Roster Diagnostic Protocol** (Format validation, Shift cutoff window, SFTP sync status).
  - Walk through an interactive check:
    - Mark "Client Roster Format & Header Validation" as `Passed` and enter finding: *"Verified column names conform to v2 template."*
    - Mark "Shift Booking Cutoff Verification" as `Failed` and log finding: *"Booking uploaded at 07:45 IST for 08:00 shift (T-15 min, violating 120-min cutoff)."*
  - **Point out the Recommendation Banner:**
    - SupportDesk immediately detects the config/cutoff mismatch and advises:  
      *"ACTION RECOMMENDED: Direct L1 Resolution. Guide client on cutoff policy. Do NOT escalate to Engineering."*
    - This single action prevents a 142-hour engineering bounce!

- **Demonstrate Multi-Provider AI Assistant:**
  - Click **"Generate AI Ticket Summary"**.
  - Show the live response: extracted symptoms, missing preliminary details, and affected services.
  - Point out the provider badge (`GROQ` or `GEMINI`) and response latency.

### Part 4: The Escalation Quality Gate (3 Minutes)
- **Click "Escalation Quality Gate":**
  - Show how the Quality Gate calculates the readiness score.
  - Attempt to submit an incomplete ticket: SupportDesk **blocks the submission** to protect engineering from incomplete handoffs.
  - Show the **"Auto-Fill with AI Brief"** button: instantly formats reproduction steps, expected vs actual behavior, and client impact.
  - Demonstrate the **Audited Manager Bypass** with mandatory justification for critical emergencies.

### Part 5: Multi-Provider AI Observability (1 Minute)
- **Navigate to AI Provider Health (`AIObservabilityPanel`):**
  - Show live metrics for Google Gemini and Groq: atomic round-robin rotation, automatic failover detection, cooldown timers, and masked credentials.

---

## 2. 10-Minute Evaluator Q&A Defense

**Q1: Why build for L1 Support instead of building an automated triage bot or an engineering Jira plugin?**
> **Answer:** "The data shows that 35.6% of escalated tickets were returned by engineering because basic configuration and preliminary checks were missed. Automating ticket assignment with a bot wouldn't verify whether an employee missed a shift cutoff or uploaded an invalid CSV header. Empowering the L1 human agent with guided diagnostic protocols directly cuts avoidable escalations by 56.6% without risking false-positive automated decisions."

**Q2: What happens if both Gemini and Groq API keys expire or fail?**
> **Answer:** "SupportDesk is architected with complete core independence. All diagnostic checklists, readiness calculations, ticket lifecycle management, and operational analytics run entirely on deterministic backend business logic and database queries. If both AI providers fail, only AI summarization is disabled; the triage workflow continues without disruption."

**Q3: How do you prevent support agents from simply bypassing the Quality Gate on every ticket?**
> **Answer:** "Every bypass is explicitly recorded in the immutable audit timeline (`ticket_timeline` table) with the agent's name, timestamp, and mandatory justification. In addition, the Operational Intelligence view highlights bypass rates by agent, giving Meera clear coaching visibility."
