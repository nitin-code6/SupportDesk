import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models import Ticket, TicketResolution, TicketTimeline

client = TestClient(app)

def test_analytics_filters():
    res = client.get("/api/analytics/filters")
    assert res.status_code == 200
    data = res.json()
    assert "categories" in data
    assert "statuses" in data
    assert "priorities" in data
    assert "agents" in data
    assert "clients" in data
    assert len(data["categories"]) > 0
    assert len(data["clients"]) > 0

def test_analytics_overview_dynamic():
    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_tickets"] >= 1444
    assert data["escalation_rate_pct"] > 0
    # Check Return-to-L1 rate formula: returned_to_l1_count / total_escalated * 100
    assert data["total_escalated"] > 0
    expected_bounce = round(data["returned_to_l1_count"] / data["total_escalated"] * 100.0, 2)
    assert abs(data["escalation_bounce_rate_pct"] - expected_bounce) < 0.1

def test_resolution_workflow_lifecycle():
    db = SessionLocal()
    # Find an open ticket or create a dummy reversible ticket
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
    db.close()

    try:
        # 1. Draft resolution
        draft_res = client.get(f"/api/tickets/{test_ticket_id}/resolution-draft")
        assert draft_res.status_code == 200
        draft = draft_res.json()
        assert "suggested_type" in draft
        assert "draft_summary" in draft
        assert "SSO" in draft["draft_summary"] or "Test Enterprise" in draft["draft_summary"]

        # 2. Resolve ticket
        resolve_payload = {
            "resolution_type": "access_fixed",
            "resolution_summary": "Reset client SAML connection and verified login via portal.",
            "customer_confirmation": "confirmed",
            "actor": "Ananya R"
        }
        res = client.post(f"/api/tickets/{test_ticket_id}/resolve", json=resolve_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["ticket"]["status"] == "Closed"
        assert data["resolution"]["resolution_type"] == "access_fixed"
        assert data["resolution"]["customer_confirmation"] == "confirmed"

        # 3. Duplicate resolve should fail with 409
        dup_res = client.post(f"/api/tickets/{test_ticket_id}/resolve", json=resolve_payload)
        assert dup_res.status_code == 409

        # 4. Modify notes on resolved ticket should fail with 400
        notes_res = client.patch(f"/api/tickets/{test_ticket_id}/notes", json={"notes": "new notes", "actor": "Ananya R"})
        assert notes_res.status_code == 400

        # 5. Edit resolution without reopening
        edit_payload = {
            "resolution_summary": "Updated: Reset client SAML connection and verified secondary backup IdP.",
            "customer_confirmation": "confirmed",
            "actor": "Rahul T"
        }
        edit_res = client.patch(f"/api/tickets/{test_ticket_id}/resolution", json=edit_payload)
        assert edit_res.status_code == 200
        edit_data = edit_res.json()
        assert edit_data["resolution"]["edit_count"] == 1
        assert "secondary backup" in edit_data["resolution"]["resolution_summary"]

        # 6. Reopen ticket
        reopen_payload = {
            "reason": "Client reported issue recurring after browser cache cleared",
            "actor": "Ananya R"
        }
        reopen_res = client.post(f"/api/tickets/{test_ticket_id}/reopen", json=reopen_payload)
        assert reopen_res.status_code == 200
        reopen_data = reopen_res.json()
        assert reopen_data["ticket"]["status"] == "Open - with L1"
        assert reopen_data["ticket"]["reopen_count"] == 1

    finally:
        # Clean up test ticket to leave database pristine
        db = SessionLocal()
        db.query(TicketResolution).filter(TicketResolution.ticket_id == test_ticket_id).delete()
        db.query(TicketTimeline).filter(TicketTimeline.ticket_id == test_ticket_id).delete()
        t = db.query(Ticket).filter(Ticket.ticket_id == test_ticket_id).first()
        if t:
            db.delete(t)
        db.commit()
        db.close()
