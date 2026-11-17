from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Ticket, EscalationRecord, InvestigationCheck, TicketTimeline, utc_now
from ..schemas import EscalationCreate, EscalationResponse
from ..services.triage_service import TriageService

router = APIRouter(prefix="/api/escalations", tags=["escalations"])

@router.post("/{ticket_id}", response_model=EscalationResponse)
def submit_escalation(
    ticket_id: str,
    payload: EscalationCreate,
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    checks = TriageService.initialize_ticket_checks(db, ticket)
    readiness = TriageService.evaluate_escalation_readiness(ticket, checks)

    if not readiness["is_ready"] and not payload.bypass_quality_gate:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Escalation Quality Gate Failed",
                "missing_requirements": readiness["missing_requirements"],
                "recommendation": readiness["recommendation"],
                "hint": "Complete preliminary checks or provide an explicit urgent bypass reason if authorized."
            }
        )

    escalation_dict = payload.model_dump()
    if payload.bypass_quality_gate and not readiness["is_ready"]:
        escalation_dict["escalation_reason"] += f" [BYPASSED QUALITY GATE: {payload.bypass_reason}]"

    record = TriageService.process_escalation(
        db=db,
        ticket=ticket,
        escalation_data=escalation_dict,
        is_ready=readiness["is_ready"]
    )
    return record

@router.get("/{ticket_id}", response_model=EscalationResponse)
def get_escalation(ticket_id: str, db: Session = Depends(get_db)):
    record = db.query(EscalationRecord).filter(EscalationRecord.ticket_id == ticket_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No escalation record found for this ticket")
    return record
