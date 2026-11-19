from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Ticket, InvestigationCheck, TicketTimeline, utc_now
from ..schemas import (
    InvestigationCheckResponse, InvestigationCheckUpdate, EscalationReadinessResponse
)
from ..services.triage_service import TriageService

router = APIRouter(prefix="/api/investigation", tags=["investigation"])

@router.get("/{ticket_id}/checks", response_model=list[InvestigationCheckResponse])
def get_ticket_checks(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    checks = TriageService.initialize_ticket_checks(db, ticket)
    return checks

@router.patch("/{ticket_id}/checks/{check_id}", response_model=InvestigationCheckResponse)
def update_check(
    ticket_id: str,
    check_id: int,
    payload: InvestigationCheckUpdate,
    db: Session = Depends(get_db)
):
    check = db.query(InvestigationCheck).filter(
        InvestigationCheck.id == check_id,
        InvestigationCheck.ticket_id == ticket_id
    ).first()
    if not check:
        raise HTTPException(status_code=404, detail="Check not found")

    old_status = check.status
    check.status = payload.status
    if payload.findings is not None:
        check.findings = payload.findings
    if payload.na_reason is not None:
        check.na_reason = payload.na_reason
    check.updated_at = utc_now()

    # Timeline event
    timeline_entry = TicketTimeline(
        ticket_id=ticket_id,
        actor=payload.actor or "Support Agent",
        event_type="CHECK_UPDATED",
        message=f"Check '{check.label}' updated from '{old_status}' to '{payload.status}'. Findings: {payload.findings or 'None'}",
        created_at=utc_now()
    )
    db.add(timeline_entry)
    db.commit()
    db.refresh(check)
    return check

@router.get("/{ticket_id}/readiness", response_model=EscalationReadinessResponse)
def get_escalation_readiness(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    checks = TriageService.initialize_ticket_checks(db, ticket)
    eval_result = TriageService.evaluate_escalation_readiness(ticket, checks)
    return EscalationReadinessResponse(**eval_result)
