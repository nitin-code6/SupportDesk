# SupportDesk — Key Technical Decisions & Trade-Offs

## 1. Primary User Persona Selection
- **Decision:** Built SupportDesk specifically for the **L1 Support Agent** (empowered by an intelligent workbench) with secondary executive views for **Meera (Support Lead)** and **Ritika (Head of Ops)**.
- **Why?** The quantitative analysis proved that **56.6% of escalations are avoidable or returned** due to missing L1 preliminary checks or client configuration errors. Intervening at the L1 investigation stage stops the 142-hour bounce loop before tickets ever reach engineering.
- **What Was Deliberately Left Out:** We did not build a complex Jira clone for engineers or an external customer-facing ticketing portal. Engineering already has issue tracking; the bottleneck is the quality of tickets entering engineering.

---

## 2. Multi-Provider AI Architecture (Gemini + Groq)
- **Decision:** Integrated both Google Gemini (`gemini-3.8-flash`) and Groq (`openai/gpt-oss-120b`) in a unified, rotating failover architecture.
- **Why?** Frontier AI providers experience demand spikes and occasional 503 service outages (demonstrated during live smoke testing where Gemini returned 503 and Groq smoothly took over).
- **Trade-Offs:**
  - AI is used strictly as an **engineering multiplier** (summaries, missing-info alerts, escalation briefs) rather than making automated, black-box ticket decisions.
  - Core application independence: SupportDesk functions 100% deterministically even if neither API key is configured.

---

## 3. Database & Persistence Strategy
- **Decision:** Relational schema supporting SQLite for local zero-dependency testing and PostgreSQL for production deployments.
- **Why?** Support ticket workflows require transactional consistency, referential integrity for checklists and audit timelines, and fast relational aggregation for live operational analytics.

---

## 4. Diagnostic Checklist Extensibility
- **Decision:** Rules-driven category checklists stored in database rows linked to tickets upon opening.
- **Why?** Hardcoding checklists in React state would lose auditability. Storing checks as relational entities allows tracking who answered each check, when findings were entered, and provides quantitative compliance metrics.
