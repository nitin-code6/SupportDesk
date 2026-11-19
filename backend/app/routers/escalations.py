from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Ticket, EscalationRecord, InvestigationCheck, TicketTimeline, EscalationAuditLog, utc_now
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

    # State machine check
    if ticket.status in ["Closed", "Resolved"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot escalate a resolved/closed ticket. Please reopen the ticket first."
        )

    # Idempotent escalation check: if already with engineering
    existing_esc = db.query(EscalationRecord).filter(EscalationRecord.ticket_id == ticket_id).order_by(EscalationRecord.id.desc()).first()
    if ticket.status == "Open - with Engineering":
        if existing_esc and existing_esc.escalation_reason == payload.escalation_reason:
            return existing_esc
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ticket {ticket_id} is already with Engineering ({ticket.eng_ticket_id})."
        )

    # Optimistic locking check
    if payload.version is not None and ticket.version != payload.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Concurrent modification conflict: The ticket has been updated by another user. Please reload."
        )

    checks = TriageService.initialize_ticket_checks(db, ticket)
    readiness = TriageService.evaluate_escalation_readiness(ticket, checks)

    # Validate Quality Gate & Manager Bypass
    if not readiness["is_ready"]:
        if not payload.bypass_quality_gate:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Escalation Quality Gate Incomplete: Required diagnostic checks missing.",
                    "missing_requirements": readiness["missing_requirements"],
                    "readiness_score": readiness["readiness_score"],
                    "recommendation": readiness["recommendation"],
                    "hint": "Complete all mandatory checks or request a manager bypass."
                }
            )
        
        # Validate Manager Bypass Requirements
        if payload.actor_role.lower() != "manager":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager bypass requires manager role permissions."
            )
        
        if not payload.bypass_reason or len(payload.bypass_reason.strip()) < 20:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Manager bypass requires a detailed business justification of at least 20 characters."
            )

        allowed_categories = ["fleet_emergency", "client_sla", "other"]
        if not payload.reason_category or payload.reason_category not in allowed_categories:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Manager bypass requires a valid reason_category: {allowed_categories}."
            )

    escalation_dict = payload.model_dump()
    escalation_dict["readiness_score"] = readiness["readiness_score"]
    escalation_dict["missing_requirements"] = readiness["missing_requirements"]

    if payload.bypass_quality_gate and not readiness["is_ready"]:
        escalation_dict["escalation_reason"] += f" [MANAGER BYPASS ({payload.reason_category}): {payload.bypass_reason}]"

    record = TriageService.process_escalation(
        db=db,
        ticket=ticket,
        escalation_data=escalation_dict,
        is_ready=readiness["is_ready"]
    )
    return record

@router.get("/{ticket_id}", response_model=EscalationResponse)
def get_escalation(ticket_id: str, db: Session = Depends(get_db)):
    record = db.query(EscalationRecord).filter(EscalationRecord.ticket_id == ticket_id).order_by(EscalationRecord.id.desc()).first()
    if not record:
        raise HTTPException(status_code=404, detail="No escalation record found for this ticket")
    return record
