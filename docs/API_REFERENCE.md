# SupportDesk API Reference

SupportDesk exposes a clean, typed RESTful API built on **FastAPI**. All requests and responses are encoded in JSON. Standard HTTP response codes are used throughout.

---

## 1. Base URLs & Environments

- **Production (Render):** `https://supportdesk-backend-ypdr.onrender.com/api`
- **Interactive OpenAPI Docs:** `https://supportdesk-backend-ypdr.onrender.com/docs`
- **Local Development:** `http://127.0.0.1:8000/api`

---

## 2. Global Headers & Error Responses

### Request Headers
| Header | Description | Required |
| :--- | :--- | :---: |
| `Content-Type` | `application/json` | Yes (for POST/PUT requests) |
| `Accept` | `application/json` | Yes |

### Error Response Schema
When a request fails, the API returns a structured JSON payload:
```json
{
  "detail": "Descriptive error message explaining the rejection reason."
}
```

Common status codes:
- `200 OK`: Request succeeded.
- `400 Bad Request`: Validation failure (e.g., attempting an invalid status transition).
- `404 Not Found`: Ticket or resource does not exist.
- `409 Conflict`: Concurrency conflict (optimistic lock failure or ticket locked by Engineering).
- `422 Unprocessable Entity`: Request body failed Pydantic schema validation.
- `500 Internal Server Error`: Unexpected server exception.

---

## 3. System & Health Endpoints

### `GET /api/health`
Returns backend service availability, database connectivity, and total ticket count.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected",
  "records_count": 1444,
  "environment": "production"
}
```

---

## 4. Tickets API (`/api/tickets`)

### `GET /api/tickets`
Retrieve paginated tickets matching multi-dimensional operational filters.

**Query Parameters:**
| Parameter | Type | Default | Description |
| :--- | :--- | :---: | :--- |
| `client` | `string` | optional | Filter by corporate client name (e.g. `Apex Logistics`). |
| `category` | `string` | optional | Filter by issue category (e.g. `Routing & Geofencing`). |
| `status` | `string` | optional | Filter by status (`Open - with L1`, `Open - with Engineering`, `Closed`, `Reopened`). |
| `priority` | `string` | optional | Filter by priority (`P1`, `P2`, `P3`, `P4`). |
| `agent` | `string` | optional | Filter by assigned L1 agent (e.g. `Ananya R`). |
| `tier` | `string` | optional | Filter by client tier (`Enterprise`, `Mid-Market`, `Standard`). |
| `start_date` | `string` | optional | ISO 8601 start date boundary (e.g. `2026-07-01`). |
| `end_date` | `string` | optional | ISO 8601 end date boundary (e.g. `2026-09-30`). |
| `search` | `string` | optional | Text search over ticket ID, client name, and description. |
| `page` | `integer` | `1` | Page number. |
| `limit` | `integer` | `20` | Results per page (max 100). |

**Response (200 OK):**
```json
{
  "total": 48,
  "page": 1,
  "limit": 20,
  "pages": 3,
  "items": [
    {
      "ticket_id": "SUP-11429",
      "created_at": "2026-09-28T14:22:00Z",
      "channel": "Portal",
      "client_id": "CL-104",
      "client_name": "Orion Financial",
      "client_tier": "Enterprise",
      "category": "Routing & Geofencing",
      "priority": "P2",
      "description": "Vehicle dispatched outside geofence boundary after shift update.",
      "assigned_agent": "Vikram S",
      "escalated_to_eng": false,
      "eng_ticket_id": null,
      "eng_handoffs": 0,
      "eng_outcome": null,
      "status": "Open - with L1",
      "reopen_count": 0,
      "csat_score": null,
      "investigation_completed": false,
      "escalation_ready": false,
      "version": 1
    }
  ]
}
```

---

### `GET /api/tickets/{ticket_id}`
Fetch complete ticket details, diagnostic checks, handoff records, timeline events, and resolution data.

**Path Parameters:**
- `ticket_id` (`string`): e.g. `SUP-11429`

**Response (200 OK):**
```json
{
  "ticket_id": "SUP-11429",
  "created_at": "2026-09-28T14:22:00Z",
  "client_name": "Orion Financial",
  "category": "Routing & Geofencing",
  "priority": "P2",
  "status": "Open - with L1",
  "description": "Vehicle dispatched outside geofence boundary after shift update.",
  "assigned_agent": "Vikram S",
  "internal_notes": "Checked admin logs. Client modified boundary polygon yesterday at 18:00.",
  "checks": [
    {
      "check_key": "verify_boundary_polygon",
      "label": "Verify Geofence Boundary Polygon",
      "is_required": true,
      "status": "passed",
      "findings": "Polygon coordinates match client master branch.",
      "na_reason": null
    }
  ],
  "timeline": [
    {
      "actor": "Vikram S",
      "event_type": "CHECK_PASSED",
      "message": "Passed checklist item: Verify Geofence Boundary Polygon",
      "created_at": "2026-09-29T10:15:00Z"
    }
  ],
  "resolution": null,
  "escalations": []
}
```

---

### `POST /api/tickets/{ticket_id}/assign`
Reassign ticket to another L1 support agent.

**Request Body:**
```json
{
  "agent": "Ananya R"
}
```

**Response (200 OK):**
```json
{
  "ticket_id": "SUP-11429",
  "assigned_agent": "Ananya R",
  "message": "Ticket reassigned to Ananya R"
}
```

---

### `POST /api/tickets/{ticket_id}/status`
Transition ticket operational status with state-machine validation.

**Request Body:**
```json
{
  "status": "Ready to Escalate",
  "actor": "Vikram S"
}
```

---

### `POST /api/tickets/{ticket_id}/notes`
Update agent diagnostic notes and scratchpad findings.

**Request Body:**
```json
{
  "notes": "Customer confirmed vehicle firmware is at version 4.2.1."
}
```

---

### `POST /api/tickets/{ticket_id}/resolve`
Directly resolve a ticket at Tier 1, recording structured resolution metadata and customer confirmation.

**Request Body:**
```json
{
  "resolution_type": "configuration_corrected",
  "resolution_summary": "Updated client dispatch geofence cache and cleared stale redis coordinates.",
  "customer_confirmation": "confirmed",
  "resolved_by": "Vikram S"
}
```

**Validation Rules:**
- Rejects resolution if ticket is currently in `Open - with Engineering` (HTTP 400).
- Updates ticket `status` to `Closed` and records `final_closed_at`.
- Creates or updates unique record in `ticket_resolutions`.
- Appends `RESOLVED` event to `ticket_timeline`.

---

## 5. Investigation Checklist API (`/api/investigation`)

### `GET /api/investigation/checks/{ticket_id}`
Returns all checklist items for a ticket. Automatically generates protocol items from category templates if not present.

---

### `POST /api/investigation/checks/{ticket_id}/{check_key}`
Update the status and findings of a diagnostic checklist item.

**Path Parameters:**
- `ticket_id`: Ticket ID (e.g. `SUP-11429`).
- `check_key`: Checklist identifier (e.g. `verify_boundary_polygon`).

**Request Body:**
```json
{
  "status": "passed",
  "findings": "Boundary vertices verified against administrative master.",
  "na_reason": null
}
```

---

### `GET /api/investigation/readiness/{ticket_id}`
Evaluate the Quality Gate readiness score for an escalation package.

**Response (200 OK):**
```json
{
  "ticket_id": "SUP-11429",
  "readiness_score": 100,
  "is_ready": true,
  "total_required": 4,
  "passed_required": 4,
  "missing_checks": []
}
```

---

## 6. Escalation Quality Gate API (`/api/escalations`)

### `GET /api/escalations/validate/{ticket_id}`
Validates readiness and returns gate evaluation details.

---

### `POST /api/escalations/submit`
Submit a formal Tier 2 handoff package to Engineering. Enforces Quality Gate clearance (`readiness_score == 100`).

**Request Body:**
```json
{
  "ticket_id": "SUP-11429",
  "escalated_by": "Vikram S",
  "escalation_reason": "Routing calculation failure due to caching bug in geofence engine.",
  "steps_to_reproduce": "1. Dispatch vehicle 402.\n2. Cross boundary polygon.\n3. Observe telemetry lag.",
  "expected_behavior": "Dispatch alerts trigger within 5 seconds.",
  "actual_behavior": "Dispatch alert triggers after 45 minutes or fails entirely.",
  "client_impact": "Impacting Orion Financial high-priority corporate shuttle fleet.",
  "logs_evidence": "Trace ID #8849-AF: Redis cache eviction TTL set to 0."
}
```

**Response (200 OK):**
```json
{
  "eng_ticket_id": "ENG-4022",
  "status": "Open - with Engineering",
  "message": "Escalation package successfully handed off to Engineering."
}
```

---

### `POST /api/escalations/bypass`
Support Manager override allowing urgent escalation even if readiness score is below 100.

**Request Body:**
```json
{
  "ticket_id": "SUP-11429",
  "actor": "Priya M",
  "actor_role": "manager",
  "bypass_reason": "P1 critical fleet outage affecting all executive transit routes.",
  "reason_category": "fleet_emergency",
  "escalation_package": { ... }
}
```

---

## 7. Operational Intelligence & Analytics API (`/api/analytics`)

### `GET /api/analytics/overview`
Computes real-time aggregate operational KPIs matching ground-truth dataset formulas.

**Query Parameters:** `start_date`, `end_date`, `client`, `category`, `agent`, `status`, `priority`.

**Response (200 OK):**
```json
{
  "total_tickets": 1444,
  "open_tickets": 48,
  "closed_tickets": 1396,
  "escalated_tickets": 486,
  "escalation_rate": 33.66,
  "returned_tickets": 173,
  "bounce_rate": 35.60,
  "avg_resolution_hours": 49.33,
  "avg_csat": 3.73
}
```

---

### `GET /api/analytics/historical`
Monthly trend series (July, August, September 2026) showing volume progression, escalation volume, and month-end backlog snapshots.

---

### `GET /api/analytics/root-causes`
Breakdown of Tier 2 engineering outcomes:
- `Fixed - Bug`: True engineering code defect.
- `Sent back - Configuration`: Avoidable L1 escalation (configuration oversight).
- `Sent back - Missing Info`: Incomplete triage handoff package.
- `No Defect Found`: Working as designed.

---

### `GET /api/analytics/agent-variance`
Per-agent triage metrics:
- Assigned tickets
- Escalated tickets & escalation rate %
- Bounce rate % (returned to L1)
- Average CSAT score

---

## 8. AI Provider Endpoints (`/api/v1/ai`)

### `POST /api/v1/ai/triage`
Executes automated diagnostic inference, root-cause probability scoring, and recommended resolution steps using Google Gemini and Groq with automatic fallback.

**Request Body:**
```json
{
  "ticket_id": "SUP-11429",
  "client_name": "Orion Financial",
  "category": "Routing & Geofencing",
  "priority": "P2",
  "description": "Vehicle dispatched outside geofence boundary after shift update."
}
```

**Response (200 OK):**
```json
{
  "recommended_action": "investigate_locally",
  "suggested_category": "Routing & Geofencing",
  "confidence_score": 0.92,
  "checklist_focus": [
    "Verify Geofence Boundary Polygon",
    "Inspect Dispatch Cache Sync"
  ],
  "draft_investigation_note": "Preliminary analysis suggests boundary coordinates were updated in admin portal but cache was not evicted.",
  "provider_used": "gemini-3.8-flash",
  "latency_ms": 782,
  "fallback_triggered": false
}
```

---

### `GET /api/v1/ai/health`
Checks live latency, error rates, and circuit breaker status for Gemini and Groq.
