# SupportDesk Architecture & System Design

SupportDesk is designed as a modular, high-throughput triage and operational intelligence system built with FastAPI, PostgreSQL/SQLite, React 18, and rotated multi-provider LLM infrastructure.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Presentation Layer (React 18 + Vite + TailwindCSS)"]
        Dashboard["My Dashboard (Personal & Team Workload)"]
        Queue["All Tickets Queue (Multi-Filter Workspace)"]
        Workbench["Investigate Ticket (Category Checklists & Notes)"]
        QualityGate["Escalation Review (Readiness Gate & Handoff Package)"]
        Intelligence["Team Insights (Real-Time Database Analytics)"]
        AIHealth["AI Status (Telemetry, Circuit Breakers & Latency)"]
    end

    subgraph APILayer ["Backend Application Layer (FastAPI 0.115 + Python 3.11/3.13)"]
        RouterTickets["/api/tickets (CRUD, Lifecycle, Notes)"]
        RouterInvestigate["/api/investigation (Category Protocols & Checklist Items)"]
        RouterEscalate["/api/escalations (Quality Gate, Handoffs, Supervisor Bypass)"]
        RouterAnalytics["/api/analytics (Dynamic Overview, Categories, Agents, Trends)"]
        RouterAI["/api/v1/ai (Summarization, Root Cause, Escalation Briefs)"]
    end

    subgraph ServiceLayer ["Core Service & Business Logic Layer"]
        MetricsSvc["MetricsService / AnalyticsService (Dynamic SQL & Aggregation)"]
        TriageSvc["TriageService (State Validation & Checklist Initialization)"]
        AISvc["ProviderManager (Gemini + Groq Round-Robin & Fallback)"]
    end

    subgraph DataLayer ["Data & External AI Infrastructure"]
        DB[(PostgreSQL / SQLite Storage Engine)]
        GeminiAPI["Google Gemini 2.0 / 1.5 Flash"]
        GroqAPI["Groq Llama 3.3 70B / 8B Cloud"]
    end

    Dashboard --> RouterTickets
    Queue --> RouterTickets
    Workbench --> RouterInvestigate
    Workbench --> RouterTickets
    QualityGate --> RouterEscalate
    Intelligence --> RouterAnalytics
    AIHealth --> RouterAI

    RouterTickets --> TriageSvc
    RouterInvestigate --> TriageSvc
    RouterEscalate --> TriageSvc
    RouterAnalytics --> MetricsSvc
    RouterAI --> AISvc

    TriageSvc --> DB
    MetricsSvc --> DB
    AISvc --> GeminiAPI
    AISvc --> GroqAPI
    AISvc --> DB
```

---

## 2. Smart Ticket Resolution Workflow

The resolution workflow reuses all facts, checklist outcomes, and notes recorded during investigation to avoid re-keying data:

```mermaid
sequenceDiagram
    autonumber
    actor Agent as L1 Support Agent
    participant UI as Investigation Workbench
    participant API as /api/tickets/{id}
    participant DB as Database Engine

    Agent->>UI: Selects Open Ticket (SUP-11444)
    UI->>API: GET /api/tickets/SUP-11444
    API->>DB: Query Ticket + Checks + Timeline + Resolution
    DB-->>API: Return Ticket Record
    API-->>UI: Populate Workbench (Metadata, Checklist, Notes)

    Agent->>UI: Executes Checklist (Marks Passed, Failed, or NA)
    Agent->>UI: Enters Diagnostic Evidence & Internal Notes
    UI->>API: PATCH /api/investigation/SUP-11444/checks/{id}
    API->>DB: Persist Check Status & Findings

    Agent->>UI: Clicks "Resolve Ticket"
    UI->>API: GET /api/tickets/SUP-11444/resolution-draft
    API->>DB: Read saved notes, passed/failed checks, client history
    API-->>UI: Return ResolutionDraft (suggested_type, prefilled summary, checklist facts)
    UI-->>Agent: Render Modal (Investigation facts prefilled, no re-typing)

    Agent->>UI: Reviews draft, selects confirmation, clicks "Confirm & Resolve Ticket"
    UI->>API: POST /api/tickets/SUP-11444/resolve
    API->>DB: Insert TicketResolution, update Ticket.status = 'Closed'
    API->>DB: Insert TicketTimeline('RESOLVED')
    API-->>UI: HTTP 200 (Resolution Created)
    UI-->>Agent: Display Green Resolution Details Card & Lock Controls
```

---

## 3. Escalation State Machine & Quality Gate Verification

```mermaid
stateDiagram-v2
    [*] --> Open_with_L1: Ingested via Portal/Email/Phone
    
    Open_with_L1 --> Diagnostic_Triage: Agent executes Category Checklist
    Diagnostic_Triage --> Diagnostic_Triage: Update Check (Passed / Failed / NA)
    
    Diagnostic_Triage --> Resolved_Direct: Resolve Ticket (Checks & Notes reused)
    Resolved_Direct --> Open_with_L1: Reopen Ticket (Client report recurred)
    
    Diagnostic_Triage --> Quality_Gate_Evaluation: Attempt Escalation
    
    state Quality_Gate_Evaluation {
        [*] --> Check_Score
        Check_Score --> 100_Percent_Ready: All required checks passed/NA
        Check_Score --> Incomplete_Blocked: Missing required diagnostic checks
    }
    
    100_Percent_Ready --> Open_with_Engineering: Standard Escalation Handoff
    Incomplete_Blocked --> Open_with_Engineering: Supervisor Override (Authorized Lead + 20-char justification)
    Incomplete_Blocked --> Diagnostic_Triage: Return to Workbench to complete checks
    
    Open_with_Engineering --> Returned_to_L1: Engineering Rejection (Config error or Insufficient Info)
    Returned_to_L1 --> Diagnostic_Triage: Re-investigate with Engineering feedback
    
    Open_with_Engineering --> Resolved_Engineering: Engineering Fix Deployed
    Resolved_Engineering --> [*]
    Resolved_Direct --> [*]
```

---

## 4. Multi-Provider AI Fallback & Observability

```mermaid
flowchart TD
    Req[Incoming AI Request: Summarize / Investigate / Brief] --> PII[PII Scrubber: Redact Emails, Phones, OTPs, GPS]
    PII --> Manager[ProviderManager: Strategy Evaluation]

    subgraph FallbackCircuit ["Dual-Provider Circuit Breaker"]
        Manager -->|Attempt 1| Primary[Google Gemini 2.0 / 1.5 Flash]
        Primary -->|Success: Clean JSON| Resp[Return Validated Schema]
        Primary -->|Timeout / 429 / 5xx| Trip1{Circuit Breaker Trip}
        Trip1 -->|Log Telemetry & Fallback| Secondary[Groq Llama 3.3 70B / 8B]
        Secondary -->|Success: Clean JSON| Resp
        Secondary -->|Timeout / Rate Limit| Trip2{Both LLMs Unavailable}
        Trip2 -->|Deterministic Rule Engine| Fallback[Heuristic Deterministic Fallback]
        Fallback --> Resp
    end

    Resp --> Telemetry[(AI Audit Log: Latency, Tokens, Provider Used)]
```

---

## 5. Entity-Relationship Data Model (ERD)

```mermaid
erDiagram
    TICKETS ||--o{ INVESTIGATION_CHECKS : "has"
    TICKETS ||--o{ ESCALATION_RECORDS : "has"
    TICKETS ||--o{ TICKET_TIMELINE : "logs"
    TICKETS ||--o{ ESCALATION_AUDIT_LOGS : "tracks"
    TICKETS ||--o| TICKET_RESOLUTIONS : "resolved_by"

    TICKETS {
        string ticket_id PK "SUP-xxxxx"
        datetime created_at "Indexed timestamp"
        string channel "Portal, Email, Phone"
        string client_id "CL-xxxxx"
        string client_name "Indexed"
        string client_tier "Enterprise, Mid-Market, SMB"
        string category "Indexed triage category"
        string priority "P1, P2, P3, P4"
        text description "Raw client report"
        string assigned_agent "Indexed agent name"
        datetime first_response_at
        boolean escalated_to_eng "Default false"
        string eng_ticket_id "ENG-xxxxx"
        int eng_handoffs "Handoff count"
        string eng_outcome "Fixed, Config, etc."
        string status "Open - with L1, Open - with Eng, Closed"
        datetime first_closed_at
        datetime final_closed_at
        int reopen_count "Default 0"
        float csat_score "1.0 to 5.0"
        text internal_notes "Investigation log"
        boolean investigation_completed
        boolean escalation_ready
        int version "Optimistic lock counter"
    }

    INVESTIGATION_CHECKS {
        int id PK "Autoincrement"
        string ticket_id FK "References tickets"
        string check_key "e.g. roster_format_validation"
        string label "Display label"
        text description "Diagnostic instructions"
        boolean is_required "Default true"
        string status "pending, passed, failed, not_applicable"
        text findings "Observed evidence"
        text na_reason "Reason if not applicable"
        datetime updated_at
    }

    ESCALATION_RECORDS {
        int id PK "Autoincrement"
        string ticket_id FK "References tickets"
        string eng_ticket_id "ENG-xxxxx"
        string escalated_by "Agent name"
        text escalation_reason "Root cause defect hypothesis"
        text steps_to_reproduce "Repro steps"
        text expected_behavior "Expected outcome"
        text actual_behavior "Observed outcome"
        text client_impact "Business impact"
        text logs_evidence "Diagnostics log"
        boolean quality_gate_passed
        datetime created_at
    }

    TICKET_RESOLUTIONS {
        int id PK "Autoincrement"
        string ticket_id FK "Unique foreign key"
        string resolution_type "configuration_corrected, etc."
        text resolution_summary "Operational summary"
        string customer_confirmation "confirmed, unconfirmed, waiting"
        string resolved_by "Agent name"
        datetime resolved_at
        string last_edited_by
        datetime last_edited_at
        int edit_count "Default 0"
    }

    TICKET_TIMELINE {
        int id PK "Autoincrement"
        string ticket_id FK "References tickets"
        string actor "Agent / Supervisor / System"
        string event_type "INGESTED, NOTE_ADDED, STATUS_CHANGED, RESOLVED, REOPENED"
        text message "Audit detail"
        datetime created_at
    }

    ESCALATION_AUDIT_LOGS {
        int id PK "Autoincrement"
        string ticket_id FK "References tickets"
        string actor "Agent / Supervisor"
        string actor_role "agent, manager, engineer"
        string action "ESCALATE, BYPASS_ESCALATE, RETURN, REOPEN"
        int readiness_score "0 to 100"
        text missing_checks "JSON array"
        text bypass_reason "Supervisor justification"
        string reason_category "fleet_emergency, client_sla, other"
        datetime created_at
    }
```
