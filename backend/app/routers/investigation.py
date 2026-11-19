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
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status in ["Closed", "Resolved"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify diagnostic checks on a resolved ticket. Please reopen the ticket first."
        )

    check = db.query(InvestigationCheck).filter(
        InvestigationCheck.id == check_id,
        InvestigationCheck.ticket_id == ticket_id
    ).first()
    if not check:
        raise HTTPException(status_code=404, detail="Check not found")

    old_status = check.status
    old_findings = check.findings or ""
    old_na_reason = check.na_reason or ""

    new_findings = payload.findings if payload.findings is not None else old_findings
    new_na_reason = payload.na_reason if payload.na_reason is not None else old_na_reason

    # Idempotency check: if status, findings, and na_reason didn't change, do not duplicate timeline log
    if old_status == payload.status and old_findings == new_findings and old_na_reason == new_na_reason:
        return check

    check.status = payload.status
    if payload.findings is not None:
        check.findings = payload.findings
    if payload.na_reason is not None:
        check.na_reason = payload.na_reason
    check.updated_at = utc_now()

    # Timeline event only when state actually changed
    if old_status != payload.status:
        msg = f"Check '{check.label}' updated from '{old_status}' to '{payload.status}'"
        if payload.findings:
            msg += f". Findings: {payload.findings}"
    else:
        msg = f"Check '{check.label}' findings updated: {payload.findings or 'None'}"

    timeline_entry = TicketTimeline(
        ticket_id=ticket_id,
        actor=payload.actor or "Support Agent",
        event_type="CHECK_UPDATED",
        message=msg,
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
