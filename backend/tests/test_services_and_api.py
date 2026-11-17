"""
Direct Functional Integration & Business Logic Tests for SupportDesk
Tests database operations, diagnostic triage, quality gates, and analytics calculations.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

from app.database import Base
from app.models import Ticket, utc_now
from app.schemas import (
    TicketStatusUpdate, TicketNotesUpdate, InvestigationCheckUpdate, EscalationCreate
)
from app.routers.tickets import list_tickets, get_ticket, update_ticket_status, update_ticket_notes
from app.routers.investigation import get_ticket_checks, update_check, get_escalation_readiness
from app.routers.escalations import submit_escalation
from app.services.analytics_service import AnalyticsService
from fastapi import HTTPException

# In-memory SQLite for high-speed isolation
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Seed sample ticket
    ticket = Ticket(
        ticket_id="SUP-99001",
        created_at=datetime(2026, 9, 10, 10, 0, 0, tzinfo=timezone.utc),
        channel="Portal",
        client_id="CLT-TEST-01",
        client_name="Acme Corporation",
        client_tier="Enterprise",
        category="Roster / booking not syncing",
        priority="P1",
        description="Shift 2 employee roster failed to sync with cab allocations",
        assigned_agent="Rahul T",
        status="Open - with L1",
        escalated_to_eng=False,
        eng_handoffs=0
    )
    session.add(ticket)
    session.commit()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_ticket_listing_and_filtering(db):
    res = list_tickets(
        page=1, page_size=10, search="Acme", category=None, priority=None,
        status=None, assigned_agent=None, client_tier=None, escalated_only=None,
        sort_by="created_at", sort_order="desc", db=db
    )
    assert res.total == 1
    assert res.items[0].ticket_id == "SUP-99001"
    assert res.items[0].client_name == "Acme Corporation"

def test_ticket_detail_initializes_checklist(db):
    ticket_resp = get_ticket("SUP-99001", db=db)
    assert ticket_resp.ticket_id == "SUP-99001"
    assert len(ticket_resp.checks) > 0
    # Check that roster checklist keys exist
    keys = [c.check_key for c in ticket_resp.checks]
    assert "roster_format_validation" in keys
    assert "shift_cutoff_window" in keys

def test_ticket_status_update_and_timeline(db):
    update_data = TicketStatusUpdate(status="Closed", actor="Rahul T", notes="Resolved roster upload format error")
    ticket_resp = update_ticket_status("SUP-99001", update_data=update_data, db=db)
    assert ticket_resp.status == "Closed"
    assert ticket_resp.final_closed_at is not None
    assert len(ticket_resp.timeline) > 0
    assert any("Status changed" in t.message for t in ticket_resp.timeline)

def test_ticket_notes_update(db):
    notes_data = TicketNotesUpdate(notes="Client confirmed format issue in emp_id column.", actor="Rahul T")
    ticket_resp = update_ticket_notes("SUP-99001", update_data=notes_data, db=db)
    assert "Client confirmed format issue" in ticket_resp.internal_notes

def test_investigation_checklist_update(db):
    checks = get_ticket_checks("SUP-99001", db=db)
    target_check = checks[0]
    
    update_payload = InvestigationCheckUpdate(status="passed", findings="Header layout verified against v2 template")
    updated_check = update_check("SUP-99001", target_check.id, update_payload, db=db)
    assert updated_check.status == "passed"
    assert "verified against v2 template" in updated_check.findings

def test_escalation_readiness_blocks_incomplete(db):
    # Readiness should be false because not all required checks are done
    readiness = get_escalation_readiness("SUP-99001", db=db)
    assert readiness.is_ready is False
    assert readiness.readiness_score < 75
    assert len(readiness.missing_requirements) > 0

def test_escalation_quality_gate_prevents_handoff_without_bypass(db):
    payload = EscalationCreate(
        escalated_by="Rahul T",
        escalation_reason="Client is angry",
        steps_to_reproduce="Uploaded roster",
        expected_behavior="Sync cabs",
        actual_behavior="No cabs",
        bypass_quality_gate=False
    )
    with pytest.raises(HTTPException) as excinfo:
        submit_escalation("SUP-99001", payload, db=db)
    assert excinfo.value.status_code == 400
    assert "Escalation Quality Gate Failed" in excinfo.value.detail["message"]

def test_escalation_quality_gate_allows_bypass_with_audit_trail(db):
    payload = EscalationCreate(
        escalated_by="Rahul T",
        escalation_reason="Critical airport drop issue",
        steps_to_reproduce="Uploaded roster",
        expected_behavior="Sync cabs",
        actual_behavior="No cabs",
        bypass_quality_gate=True,
        bypass_reason="Executive approval by Ritika"
    )
    esc_record = submit_escalation("SUP-99001", payload, db=db)
    assert esc_record.eng_ticket_id == "ENG-99001"
    assert esc_record.quality_gate_passed is False
    assert "BYPASSED QUALITY GATE" in esc_record.escalation_reason

    # Verify ticket was updated
    ticket = get_ticket("SUP-99001", db=db)
    assert ticket.status == "Open - with Engineering"
    assert ticket.escalated_to_eng is True
    assert ticket.eng_handoffs == 1

def test_analytics_service_metrics(db):
    overview = AnalyticsService.get_overview_metrics(db)
    assert overview["total_tickets"] == 1
    assert overview["open_tickets"] == 1
    assert overview["open_l1_count"] == 1

    cats = AnalyticsService.get_category_metrics(db)
    assert len(cats) == 1
    assert cats[0]["category"] == "Roster / booking not syncing"
