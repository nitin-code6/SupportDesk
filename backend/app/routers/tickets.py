from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from ..database import get_db
from ..models import Ticket, TicketTimeline, InvestigationCheck, utc_now
from ..schemas import (
    TicketResponse, TicketListResponse, TicketListItem, 
    TicketStatusUpdate, TicketNotesUpdate, TimelineItemResponse
)
from ..services.triage_service import TriageService

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
    if assigned_agent:
        query = query.filter(Ticket.assigned_agent == assigned_agent)
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

    resp = TicketResponse.model_validate(ticket)
    resp.age_days = age_days
    resp.resolution_hours = res_hours
    resp.checks = checks
    resp.timeline = timeline
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

@router.get("/{ticket_id}/timeline", response_model=list[TimelineItemResponse])
def get_ticket_timeline(ticket_id: str, db: Session = Depends(get_db)):
    timeline = db.query(TicketTimeline).filter(TicketTimeline.ticket_id == ticket_id).order_by(desc(TicketTimeline.created_at)).all()
    return timeline
