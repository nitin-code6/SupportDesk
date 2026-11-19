from datetime import datetime, timezone
import pytest
from app.database import SessionLocal
from app.models import Ticket, TicketResolution, TicketTimeline
from app.services.analytics_service import AnalyticsService
from app.routers.tickets import get_resolution_draft, resolve_ticket, update_ticket_resolution, reopen_ticket, update_ticket_notes
from app.schemas import TicketResolutionCreate, TicketResolutionUpdate, TicketReopenRequest, TicketNotesUpdate
from fastapi import HTTPException

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_analytics_filters_direct(db):
    data = AnalyticsService.get_filter_options(db=db)
    assert "categories" in data
    assert "statuses" in data
    assert "priorities" in data
    assert "agents" in data
    assert "clients" in data
    assert len(data["categories"]) > 0
    assert len(data["clients"]) > 0

def test_analytics_overview_dynamic_direct(db):
    data = AnalyticsService.get_overview_metrics(db=db)
    assert data["total_tickets"] >= 1444
    assert data["escalation_rate_pct"] > 0
    assert data["total_escalated"] > 0
    expected_bounce = round(data["returned_to_l1_count"] / data["total_escalated"] * 100.0, 2)
    assert abs(data["escalation_bounce_rate_pct"] - expected_bounce) < 0.1

def test_resolution_workflow_lifecycle_direct(db):
    test_ticket_id = "SUP-TEST-QA-001"
    existing = db.query(Ticket).filter(Ticket.ticket_id == test_ticket_id).first()
    if existing:
        db.query(TicketResolution).filter(TicketResolution.ticket_id == test_ticket_id).delete()
        db.query(TicketTimeline).filter(TicketTimeline.ticket_id == test_ticket_id).delete()
        db.delete(existing)
        db.commit()

    # Create test ticket
    test_ticket = Ticket(
        ticket_id=test_ticket_id,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        channel="Portal",
        client_id="CL-TEST-001",
        client_name="Test Enterprise Inc",
        client_tier="Enterprise",
        category="Login / Access Issue",
        priority="P2",
        description="Test ticket for resolution workflow QA",
        assigned_agent="Ananya R",
        status="Open - with L1",
        internal_notes="Client confirmed SSO error code 401."
    )
    db.add(test_ticket)
    db.commit()

    try:
        # 1. Draft resolution
        draft = get_resolution_draft(test_ticket_id, db=db)
        assert hasattr(draft, "suggested_type") or "suggested_type" in draft
        assert "access_fixed" in (draft.suggested_type if hasattr(draft, "suggested_type") else draft["suggested_type"])

        # 2. Resolve ticket
        resolve_payload = TicketResolutionCreate(
            resolution_type="access_fixed",
            resolution_summary="Reset client SAML connection and verified login via portal.",
            customer_confirmation="confirmed",
            actor="Ananya R"
        )
        res = resolve_ticket(test_ticket_id, resolve_payload, db=db)
        assert res.status == "Closed"
        assert res.resolution.resolution_type == "access_fixed"
        assert res.resolution.customer_confirmation == "confirmed"

        # 3. Duplicate resolve should fail with 409 HTTPException
        with pytest.raises(HTTPException) as exc_info:
            resolve_ticket(test_ticket_id, resolve_payload, db=db)
        assert exc_info.value.status_code == 409

        # 4. Modify notes on resolved ticket should fail with 400 HTTPException
        notes_payload = TicketNotesUpdate(notes="new notes on closed", actor="Ananya R")
        with pytest.raises(HTTPException) as exc_notes:
            update_ticket_notes(test_ticket_id, notes_payload, db=db)
        assert exc_notes.value.status_code == 400

        # 5. Edit resolution without reopening
        edit_payload = TicketResolutionUpdate(
            resolution_summary="Updated: Reset client SAML connection and verified secondary backup IdP.",
            customer_confirmation="confirmed",
            actor="Rahul T"
        )
        edit_res = update_ticket_resolution(test_ticket_id, edit_payload, db=db)
        assert edit_res.edit_count == 1
        assert "secondary backup" in edit_res.resolution_summary

        # 6. Reopen ticket
        reopen_payload = TicketReopenRequest(
            reason="Client reported issue recurring after browser cache cleared",
            actor="Ananya R"
        )
        reopen_res = reopen_ticket(test_ticket_id, reopen_payload, db=db)
        assert reopen_res.status == "Open - with L1"
        assert reopen_res.reopen_count == 1

    finally:
        # Clean up test ticket to leave database pristine
        db.query(TicketResolution).filter(TicketResolution.ticket_id == test_ticket_id).delete()
        db.query(TicketTimeline).filter(TicketTimeline.ticket_id == test_ticket_id).delete()
        t = db.query(Ticket).filter(Ticket.ticket_id == test_ticket_id).first()
        if t:
            db.delete(t)
        db.commit()
