from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Ticket, InvestigationCheck
from ..ai import (
    ai_manager,
    TicketSummarizationInput, TicketSummaryResponse,
    InvestigationAssistantInput, InvestigationAssistantResponse,
    EscalationSummaryInput, EscalationSummaryResponse,
    AIHealthStatusResponse, AllAIProvidersFailedError
)

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

@router.get("/health", response_model=AIHealthStatusResponse)
def get_ai_health():
    """Returns safe health and observability status for configured AI providers."""
    return ai_manager.get_health_status()

@router.post("/summarize/{ticket_id}", response_model=TicketSummaryResponse)
def summarize_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    input_data = TicketSummarizationInput(
        ticket_id=ticket.ticket_id,
        client_name=ticket.client_name,
        client_tier=ticket.client_tier,
        category=ticket.category,
        priority=ticket.priority,
        description=ticket.description,
        internal_notes=ticket.internal_notes
    )

    try:
        return ai_manager.summarize_ticket(input_data)
    except AllAIProvidersFailedError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.post("/investigate/{ticket_id}", response_model=InvestigationAssistantResponse)
def assist_investigation(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    checks = db.query(InvestigationCheck).filter(InvestigationCheck.ticket_id == ticket_id).all()
    checks_data = [{
        "key": c.check_key,
        "label": c.label,
        "status": c.status,
        "findings": c.findings
    } for c in checks]

    input_data = InvestigationAssistantInput(
        ticket_id=ticket.ticket_id,
        category=ticket.category,
        priority=ticket.priority,
        description=ticket.description,
        completed_checks=checks_data,
        internal_notes=ticket.internal_notes
    )

    try:
        return ai_manager.assist_investigation(input_data)
    except AllAIProvidersFailedError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.post("/escalation-summary/{ticket_id}", response_model=EscalationSummaryResponse)
def generate_escalation_summary(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    checks = db.query(InvestigationCheck).filter(InvestigationCheck.ticket_id == ticket_id).all()
    checks_data = [{
        "key": c.check_key,
        "label": c.label,
        "status": c.status,
        "findings": c.findings
    } for c in checks]

    input_data = EscalationSummaryInput(
        ticket_id=ticket.ticket_id,
        client_name=ticket.client_name,
        client_tier=ticket.client_tier,
        category=ticket.category,
        priority=ticket.priority,
        description=ticket.description,
        investigation_results=checks_data,
        internal_notes=ticket.internal_notes
    )

    try:
        return ai_manager.generate_escalation_summary(input_data)
    except AllAIProvidersFailedError as e:
        raise HTTPException(status_code=503, detail=str(e))
