# RideOps Data Dictionary

This document provides complete technical specifications for the RideOps support ticket dataset (`reference/rideops_support_tickets.csv`).

---

## Field Specifications

| Column Name | Data Type | Nullable | Example Values | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- |
| `ticket_id` | `VARCHAR(32)` | No | `SUP-10001` | Unique support ticket identifier. Standard format `SUP-xxxxx`. Primary key. |
| `created_at` | `TIMESTAMP` | No | `2026-07-02 09:14:22` | Timestamp when the corporate client raised the ticket (IST). |
| `channel` | `VARCHAR(32)` | No | `Portal`, `Email`, `Phone`, `WhatsApp` | Ingestion channel through which the issue was reported. |
| `client_id` | `VARCHAR(32)` | No | `CLT-0042` | Unique identifier for corporate client organization (~200 clients). |
| `client_name` | `VARCHAR(128)` | No | `Meridian Labs` | Name of the corporate organization. |
| `client_tier` | `VARCHAR(32)` | No | `Enterprise`, `Mid-market`, `SMB` | Commercial tier determining business criticality and priority routing. |
| `category` | `VARCHAR(128)` | No | `Roster / booking not syncing` | Issue category assigned/verified by L1 support (10 unique categories). |
| `priority` | `VARCHAR(8)` | No | `P1`, `P2`, `P3`, `P4` | Priority level: P1 (Critical), P2 (High), P3 (Medium), P4 (Low). |
| `description` | `TEXT` | No | `Cab not showing on map for route 14` | One-line problem statement submitted by client or logged by agent. |
| `assigned_agent` | `VARCHAR(64)` | No | `Rahul T`, `Ananya R` | L1 support agent assigned as owner of ticket (8 distinct agents). |
| `first_response_at` | `TIMESTAMP` | Yes | `2026-07-02 09:28:10` | Timestamp of first L1 agent reply or contact (5 missing in dataset). |
| `escalated_to_eng` | `VARCHAR(8)` / `BOOLEAN` | No | `Yes`, `No` | Flag indicating whether L1 escalated the ticket to engineering. |
| `eng_ticket_id` | `VARCHAR(32)` | Yes | `ENG-4091` | Linked engineering JIRA/issue tracker ticket ID. Null if unescalated. |
| `eng_handoffs` | `INTEGER` | No | `0`, `1`, `2`, `3` | Number of times ticket moved to engineering (bounces and re-escalations). |
| `eng_outcome` | `VARCHAR(64)` | Yes | `Fixed`, `Insufficient info - returned to L1` | Engineering final resolution verdict. Null if not escalated. |
| `status` | `VARCHAR(32)` | No | `Closed`, `Open - with L1`, `Open - with Engineering` | Ticket state as of snapshot date (30 September 2026). |
| `first_closed_at` | `TIMESTAMP` | Yes | `2026-07-02 14:10:00` | Timestamp when ticket was first marked closed. Null if never closed. |
| `final_closed_at` | `TIMESTAMP` | Yes | `2026-07-03 11:20:00` | Timestamp when ticket reached final closure after reopens. Null if open. |
| `reopen_count` | `INTEGER` | No | `0`, `1`, `2`, `3` | Number of times the client reopened the ticket after closure. |
| `csat_score` | `FLOAT` | Yes | `1.0` - `5.0` | Customer satisfaction rating (1 = Poor, 5 = Excellent). Null if unrated. |

---

## Derived Metrics & Calculations

1. **Resolution Time (Hours):**
   $$\text{Resolution Hours} = \frac{\text{final\_closed\_at} - \text{created\_at}}{3600}$$
   *Applicable only to tickets with `status == 'Closed'` and valid timestamps.*

2. **First Response Time (Hours):**
   $$\text{First Response Hours} = \frac{\text{first\_response\_at} - \text{created\_at}}{3600}$$

3. **Escalation Bounce Rate (%):**
   $$\text{Bounce Rate} = \frac{\text{Tickets returned to L1 (Insufficient info + Config issue)}}{\text{Total Escalated Tickets}} \times 100$$
   *Baseline value: 35.59% (173 / 486).*

4. **Avoidable Escalation Rate (%):**
   $$\text{Avoidable Rate} = \frac{\text{Escalated tickets with outcome } \neq \text{ 'Fixed'}}{\text{Total Escalated Tickets}} \times 100$$
   *Baseline value: 56.58% (275 / 486).*

5. **Ticket Age (Days for Open Tickets):**
   $$\text{Age (Days)} = \frac{\text{Snapshot Date (2026-09-30 23:59:59)} - \text{created\_at}}{86400}$$
