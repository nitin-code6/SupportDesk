# SupportDesk v1 — Human Usability & Verification Script

This document provides a 5-minute, unassisted triage test script to evaluate whether an L1 support agent or operations manager can complete high-priority workflows calmly and without errors.

---

## Persona & Setup
- **User Role:** L1 Support Specialist (default) or Operations Manager.
- **Application URL:** `http://127.0.0.1:5173/`
- **Backend API:** `http://127.0.0.1:8000/docs`

---

## Test Scenario 1: Command Center Situation Awareness (Time: 45 seconds)
1. **Goal:** Understand current backlog and operational priorities at a glance.
2. **Steps:**
   - Open Command Center.
   - Look at the top headline banner: confirm it shows **48 open backlog tickets (+60.0% vs July)** and **35.6% return rate**.
   - Check the 4 KPI cards:
     - Open Backlog: `48` (`▲ +60.0%`).
     - Engineering Escalations: `33.7%` (`486 tickets`).
     - Returned to L1: `35.6%` (`173 tickets`, avoidable `275 tickets`).
     - Median Resolution: `12.6h direct` vs `86.8h escalated`.
   - Review **What to Fix First**: confirm the top 3 categories causing bounces are highlighted (`Roster sync`, `Live tracking`, `Report export`).
3. **Success Criteria:** Agent understands without asking why reducing escalations is today's priority.

---

## Test Scenario 2: Ticket Queue Navigation & Filtering (Time: 60 seconds)
1. **Goal:** Locate an urgent shift roster ticket.
2. **Steps:**
   - Click **Ticket Queue** in the sidebar.
   - Observe URL: `http://localhost:5173/?page=1`.
   - Filter by Category: Select `Roster / booking not syncing`.
   - Filter by Priority: Select `P1 - Critical`.
   - Observe URL updates automatically with query parameters.
   - Use keyboard shortcuts:
     - Press <kbd>j</kbd> and <kbd>k</kbd> to move selection up and down the list.
     - Press <kbd>Enter</kbd> to open the selected ticket in the Investigation Workbench.
3. **Success Criteria:** Filters persist on page refresh, and keyboard navigation opens the workbench seamlessly.

---

## Test Scenario 3: Diagnostic Investigation & Quality Gate (Time: 90 seconds)
1. **Goal:** Perform preliminary triage on `SUP-10001` and verify quality gate blockage.
2. **Steps:**
   - On the Investigation Workbench, inspect the 4 category-specific checks under **Category Diagnostic Protocol**.
   - Click **Escalation Quality Gate** while checks are still pending.
   - Observe that the Quality Gate is **Incomplete** with score `0%` and clear missing requirements.
   - Attempt to click **Submit Escalation Package**: confirm the button is disabled.
   - Return to workbench:
     - Mark Check 1 (`Roster Format Validation`) as **Passed**.
     - Mark Check 2 (`Shift Booking Cutoff`) as **Failed** and type findings: `Client submitted roster at T-90 min, violating the T-120 min cutoff window.`
     - Mark Check 3 as **Passed**.
   - Notice the green "Saved" indicators auto-saving findings.
   - Return to Escalation Quality Gate:
     - Score is now `100% (Passed: Ready for Engineering)`.
     - Click **Auto-Fill with AI Brief** to generate structured handoff notes.
     - Click **Submit Escalation Package**.
3. **Success Criteria:** Gate blocks premature escalation when checks are missing and allows handoff once diagnostics are completed.

---

## Test Scenario 4: Manager Bypass Workflow (Time: 60 seconds)
1. **Goal:** Authorize an emergency bypass for an incomplete ticket.
2. **Steps:**
   - Open a new open ticket with incomplete checks (e.g. `SUP-10002`).
   - Open the **Escalation Quality Gate**.
   - Notice the **Audited Manager Bypass** section shows `Manager Role Required`.
   - In the top-right navbar menu, switch demo role to **Support Manager**.
   - The checkbox **Enable Manager Bypass** becomes active.
   - Check the box, select `Fleet Emergency`, and enter a business justification:
     `Operations Director approved urgent triage for active shift cab disruption.`
   - Click **Submit Escalation Package**.
   - Verify the ticket is escalated with an audited bypass entry in `escalation_audit_logs`.
3. **Success Criteria:** Agent role cannot bypass; manager role authorizes with audit trail.

---

## Test Scenario 5: Multi-Provider AI Observability & Failover (Time: 45 seconds)
1. **Goal:** Inspect multi-provider telemetry and simulate failover.
2. **Steps:**
   - Click **Gemini + Groq** in the top bar or select **AI Provider Health** in the sidebar.
   - Verify cards for **Google Gemini (`gemini-3.8-flash`)** and **Groq API (`openai/gpt-oss-120b`)**.
   - Check metric separation:
     - **Requests**, **Success Rate**, **Triggered Fallbacks**, **Served Fallback**, and **Avg Latency**.
   - Read the human summary sentence:
     - Confirms which provider is active and how failovers are handled.
   - Click **Test Rotation & Fallback** to test an end-to-end live round-robin call.
3. **Success Criteria:** Telemetry reports real requests with transparent failover explanation.
