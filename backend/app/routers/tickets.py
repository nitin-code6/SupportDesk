from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from ..database import get_db
from ..models import Ticket, TicketTimeline, InvestigationCheck, TicketResolution, utc_now
from ..schemas import (
    TicketResponse, TicketListResponse, TicketListItem, 
    TicketStatusUpdate, TicketNotesUpdate, TimelineItemResponse,
    TicketResolutionCreate, TicketResolutionUpdate, TicketResolutionResponse,
    TicketReopenRequest, ResolutionDraftResponse
)
from ..services.triage_service import TriageService
from ..demo_user import resolve_agent_name, DEFAULT_DEMO_L1_OPERATOR

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

SNAPSHOT_DATE = datetime(2026, 9, 30, 23, 59, 59, tzinfo=timezone.utc)

def compute_ticket_metrics(ticket: Ticket):
    age_days = None
    res_hours = None
    created = ticket.created_at
    if created and created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    if ticket.status.startswith("Open"):
        now_or_snap = datetime.now(timezone.utc)
        # Use snapshot date if older than snapshot, else real-time
        ref_time = now_or_snap if created > SNAPSHOT_DATE else SNAPSHOT_DATE
        age_days = round((ref_time - created).total_seconds() / 86400.0, 2)
    elif ticket.status == "Closed" and ticket.final_closed_at:
        closed = ticket.final_closed_at
        if closed.tzinfo is None:
            closed = closed.replace(tzinfo=timezone.utc)
        res_hours = round((closed - created).total_seconds() / 3600.0, 2)
    
    return age_days, res_hours

@router.get("", response_model=TicketListResponse)
def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assigned_agent: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    client_tier: Optional[str] = Query(None),
    escalated_only: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)

    if search:
        search_filter = or_(
            Ticket.ticket_id.ilike(f"%{search}%"),
            Ticket.client_name.ilike(f"%{search}%"),
            Ticket.description.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    if category:
        query = query.filter(Ticket.category == category)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if status:
        query = query.filter(Ticket.status == status)
    
    # Resolve agent filter by agent_id or assigned_agent
    target_agent = agent_id if (isinstance(agent_id, str) and agent_id) else (assigned_agent if (isinstance(assigned_agent, str) and assigned_agent) else None)
    if target_agent and target_agent != "ALL":
        resolved_name = resolve_agent_name(target_agent)
        if resolved_name:
            query = query.filter(Ticket.assigned_agent == resolved_name)

    if client_tier:
        query = query.filter(Ticket.client_tier == client_tier)
    if escalated_only is not None:
        query = query.filter(Ticket.escalated_to_eng == escalated_only)

    total = query.count()

    # Sorting
    sort_col = getattr(Ticket, sort_by, Ticket.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    offset = (page - 1) * page_size
    tickets = query.offset(offset).limit(page_size).all()

    items = []
    for t in tickets:
        age_days, res_hours = compute_ticket_metrics(t)
        items.append(TicketListItem(
            ticket_id=t.ticket_id,
            created_at=t.created_at,
            client_name=t.client_name,
            client_tier=t.client_tier,
            category=t.category,
            priority=t.priority,
            description=t.description,
            assigned_agent=t.assigned_agent,
            status=t.status,
            escalated_to_eng=t.escalated_to_eng,
            eng_handoffs=t.eng_handoffs,
            eng_outcome=t.eng_outcome,
            reopen_count=t.reopen_count,
            csat_score=t.csat_score,
            age_days=age_days,
            resolution_hours=res_hours
        ))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return TicketListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    # Automatically initialize diagnostic checks if empty
    TriageService.initialize_ticket_checks(db, ticket)

    age_days, res_hours = compute_ticket_metrics(ticket)

    # Reload relationships
    checks = db.query(InvestigationCheck).filter(InvestigationCheck.ticket_id == ticket_id).all()
    timeline = db.query(TicketTimeline).filter(TicketTimeline.ticket_id == ticket_id).order_by(desc(TicketTimeline.created_at)).all()
    resolution = db.query(TicketResolution).filter(TicketResolution.ticket_id == ticket_id).first()

    resp = TicketResponse.model_validate(ticket)
    resp.age_days = age_days
    resp.resolution_hours = res_hours
    resp.checks = checks
    resp.timeline = timeline
    resp.resolution = resolution
    return resp

ALLOWED_TRANSITIONS = {
    "Open - with L1": ["Ready to Escalate", "Closed", "Open - with Engineering"],
    "Ready to Escalate": ["Open - with L1", "Open - with Engineering", "Closed"],
    "Open - with Engineering": ["Closed", "Open - with L1"],
    "Closed": ["Reopened", "Open - with L1"],
    "Reopened": ["Open - with L1", "Closed", "Ready to Escalate"]
}

@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: str, 
    update_data: TicketStatusUpdate, 
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    old_status = ticket.status
    new_status = update_data.status

    if old_status != new_status:
        allowed = ALLOWED_TRANSITIONS.get(old_status, ["Open - with L1", "Closed"])
        if new_status not in allowed:
            raise HTTPException(
                status_code=409,
                detail=f"Illegal status transition from '{old_status}' to '{new_status}'. Allowed transitions: {allowed}"
            )

    ticket.status = new_status
    ticket.version = (ticket.version or 1) + 1
    
    now = utc_now()
    if update_data.status == "Closed":
        if not ticket.first_closed_at:
            ticket.first_closed_at = now
        ticket.final_closed_at = now
    elif (update_data.status.startswith("Open") or update_data.status == "Reopened") and old_status == "Closed":
        # Reopening
        ticket.reopen_count = (ticket.reopen_count or 0) + 1
        ticket.final_closed_at = None

    timeline_entry = TicketTimeline(
        ticket_id=ticket.ticket_id,
        actor=update_data.actor,
        event_type="STATUS_CHANGE",
        message=f"Status changed from '{old_status}' to '{update_data.status}'. Note: {update_data.notes or 'None'}",
        created_at=now
    )
    db.add(timeline_entry)
    db.commit()
    db.refresh(ticket)
    
    return get_ticket(ticket_id, db)

@router.patch("/{ticket_id}/notes", response_model=TicketResponse)
def update_ticket_notes(
    ticket_id: str,
    update_data: TicketNotesUpdate,
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    if ticket.status in ["Closed", "Resolved"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify notes on a resolved ticket. Please reopen the ticket first."
        )

    ticket.internal_notes = update_data.notes

    timeline_entry = TicketTimeline(
        ticket_id=ticket.ticket_id,
        actor=update_data.actor,
        event_type="NOTE_ADDED",
        message=f"Updated investigation notes: {update_data.notes[:100]}...",
        created_at=utc_now()
    )
    db.add(timeline_entry)
    db.commit()
    db.refresh(ticket)

    return get_ticket(ticket_id, db)

@router.get("/{ticket_id}/resolution-draft", response_model=ResolutionDraftResponse)
def get_resolution_draft(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    checks = db.query(InvestigationCheck).filter(InvestigationCheck.ticket_id == ticket_id).all()
    
    completed_checks = []
    failed_checks = []
    for c in checks:
        item = {
            "check_key": c.check_key,
            "label": c.label,
            "status": c.status,
            "findings": c.findings,
            "na_reason": c.na_reason,
            "is_required": c.is_required
        }
        if c.status in ["passed", "failed", "not_applicable"]:
            completed_checks.append(item)
        if c.status == "failed":
            failed_checks.append(item)

    # Determine suggested resolution type
    notes_lower = (ticket.internal_notes or "").lower()
    category_lower = ticket.category.lower()

    if ticket.eng_outcome == "Fixed" or ticket.status == "Open - with Engineering":
        suggested_type = "engineering_verified"
    elif any(k in category_lower for k in ["login", "access", "otp", "password"]):
        suggested_type = "access_fixed"
    elif any(k in category_lower for k in ["roster", "booking", "report", "geocode", "address"]) or "config" in notes_lower:
        suggested_type = "configuration_corrected"
    elif any(k in category_lower for k in ["how-to", "training", "feature"]):
        suggested_type = "customer_guidance_provided"
    else:
        suggested_type = "configuration_corrected"

    # Build draft text reusing all saved investigation data
    summary_parts = [f"Issue investigated for {ticket.client_name} ({ticket.category})."]
    
    if completed_checks:
        check_lines = []
        for c in completed_checks:
            detail = f"- {c['label']}: [{c['status'].upper()}]"
            if c.get("findings"):
                detail += f" — {c['findings']}"
            elif c.get("na_reason"):
                detail += f" — N/A: {c['na_reason']}"
            check_lines.append(detail)
        summary_parts.append("Diagnostic Check Results:\n" + "\n".join(check_lines))

    if ticket.internal_notes:
        summary_parts.append(f"Investigation Notes:\n{ticket.internal_notes.strip()}")

    if ticket.eng_outcome:
        summary_parts.append(f"Engineering Outcome: {ticket.eng_outcome}")

    # Resolution conclusion based on suggested type
    if suggested_type == "configuration_corrected":
        conclusion = "Resolution: Corrected client operational configuration, verified parameters, and confirmed successful processing."
    elif suggested_type == "customer_guidance_provided":
        conclusion = "Resolution: Guided customer transport team on standard operational procedure and resolved question."
    elif suggested_type == "access_fixed":
        conclusion = "Resolution: Verified user identity credentials, cleared access blocker, and confirmed successful login."
    elif suggested_type == "engineering_verified":
        conclusion = "Resolution: Verified deployed engineering fix in production environment."
    else:
        conclusion = "Resolution: Verified diagnostic protocol and completed resolution actions."

    summary_parts.append(conclusion)
    draft_summary = "\n\n".join(summary_parts)

    return ResolutionDraftResponse(
        ticket_id=ticket.ticket_id,
        category=ticket.category,
        client_name=ticket.client_name,
        completed_checks=completed_checks,
        failed_checks=failed_checks,
        internal_notes=ticket.internal_notes,
        eng_outcome=ticket.eng_outcome,
        suggested_type=suggested_type,
        draft_summary=draft_summary
    )

@router.post("/{ticket_id}/resolve", response_model=TicketResponse)
def resolve_ticket(
    ticket_id: str,
    payload: TicketResolutionCreate,
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    existing_res = db.query(TicketResolution).filter(TicketResolution.ticket_id == ticket_id).first()
    if ticket.status in ["Closed", "Resolved"] and existing_res:
        raise HTTPException(
            status_code=409,
            detail=f"Ticket {ticket_id} is already resolved. To update resolution notes, use Edit Resolution."
        )

    valid_types = [
        "configuration_corrected", 
        "customer_guidance_provided", 
        "access_fixed", 
        "engineering_verified", 
        "other"
    ]
    if payload.resolution_type not in valid_types:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid resolution type '{payload.resolution_type}'. Allowed types: {valid_types}"
        )

    valid_confirmations = ["confirmed", "unconfirmed", "waiting"]
    if payload.customer_confirmation not in valid_confirmations:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid customer confirmation status '{payload.customer_confirmation}'. Allowed: {valid_confirmations}"
        )

    now = utc_now()
    try:
        if existing_res:
            existing_res.resolution_type = payload.resolution_type
            existing_res.resolution_summary = payload.resolution_summary
            existing_res.customer_confirmation = payload.customer_confirmation
            existing_res.resolved_by = payload.actor
            existing_res.resolved_at = now
        else:
            new_res = TicketResolution(
                ticket_id=ticket.ticket_id,
                resolution_type=payload.resolution_type,
                resolution_summary=payload.resolution_summary,
                customer_confirmation=payload.customer_confirmation,
                resolved_by=payload.actor,
                resolved_at=now
            )
            db.add(new_res)

        ticket.status = "Closed"
        ticket.final_closed_at = now
        if not ticket.first_closed_at:
            ticket.first_closed_at = now
        ticket.investigation_completed = True
        ticket.version = (ticket.version or 1) + 1

        timeline_entry = TicketTimeline(
            ticket_id=ticket.ticket_id,
            actor=payload.actor,
            event_type="RESOLVED",
            message=f"Ticket resolved with outcome '{payload.resolution_type}'. Customer confirmation: '{payload.customer_confirmation}'. Summary: {payload.resolution_summary}",
            created_at=now
        )
        db.add(timeline_entry)

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to permanently commit ticket resolution: {str(e)}"
        )

    return get_ticket(ticket_id, db)

@router.patch("/{ticket_id}/resolution", response_model=TicketResolutionResponse)
def update_ticket_resolution(
    ticket_id: str,
    payload: TicketResolutionUpdate,
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    res = db.query(TicketResolution).filter(TicketResolution.ticket_id == ticket_id).first()
    if not res:
        raise HTTPException(status_code=404, detail=f"No saved resolution found for ticket {ticket_id}")

    old_summary = res.resolution_summary
    old_type = res.resolution_type
    old_confirmation = res.customer_confirmation

    changed = False
    if payload.resolution_type and payload.resolution_type != res.resolution_type:
        res.resolution_type = payload.resolution_type
        changed = True
    if payload.resolution_summary and payload.resolution_summary != res.resolution_summary:
        res.resolution_summary = payload.resolution_summary
        changed = True
    if payload.customer_confirmation and payload.customer_confirmation != res.customer_confirmation:
        res.customer_confirmation = payload.customer_confirmation
        changed = True

    if not changed:
        return res

    now = utc_now()
    res.last_edited_by = payload.actor
    res.last_edited_at = now
    res.edit_count = (res.edit_count or 0) + 1

    timeline_entry = TicketTimeline(
        ticket_id=ticket.ticket_id,
        actor=payload.actor,
        event_type="RESOLUTION_EDITED",
        message=(
            f"Resolution revised (Revision #{res.edit_count}). "
            f"Previous Type: '{old_type}' | Previous Confirmation: '{old_confirmation}' | "
            f"Previous Summary: {old_summary}"
        ),
        created_at=now
    )
    db.add(timeline_entry)
    db.commit()
    db.refresh(res)
    return res

@router.post("/{ticket_id}/reopen", response_model=TicketResponse)
def reopen_ticket(
    ticket_id: str,
    payload: TicketReopenRequest,
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    if ticket.status not in ["Closed", "Resolved"]:
        raise HTTPException(
            status_code=400,
            detail=f"Ticket {ticket_id} cannot be reopened because it is currently '{ticket.status}'."
        )

    now = utc_now()
    old_status = ticket.status
    ticket.status = "Open - with L1"
    ticket.reopen_count = (ticket.reopen_count or 0) + 1
    ticket.final_closed_at = None
    ticket.version = (ticket.version or 1) + 1

    timeline_entry = TicketTimeline(
        ticket_id=ticket.ticket_id,
        actor=payload.actor,
        event_type="REOPENED",
        message=f"Ticket reopened from '{old_status}' to 'Open - with L1'. Reason: {payload.reason}",
        created_at=now
    )
    db.add(timeline_entry)
    db.commit()

    return get_ticket(ticket_id, db)

@router.get("/{ticket_id}/timeline", response_model=list[TimelineItemResponse])
def get_ticket_timeline(ticket_id: str, db: Session = Depends(get_db)):
    timeline = db.query(TicketTimeline).filter(TicketTimeline.ticket_id == ticket_id).order_by(desc(TicketTimeline.created_at)).all()
    return timeline
