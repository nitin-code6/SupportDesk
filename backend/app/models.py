from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id = Column(String(32), primary_key=True, index=True)
    created_at = Column(DateTime, nullable=False, index=True)
    channel = Column(String(32), nullable=False)
    client_id = Column(String(32), nullable=False, index=True)
    client_name = Column(String(128), nullable=False, index=True)
    client_tier = Column(String(32), nullable=False, index=True)
    category = Column(String(128), nullable=False, index=True)
    priority = Column(String(8), nullable=False, index=True)
    description = Column(Text, nullable=False)
    assigned_agent = Column(String(64), nullable=False, index=True)
    first_response_at = Column(DateTime, nullable=True)
    escalated_to_eng = Column(Boolean, default=False, nullable=False, index=True)
    eng_ticket_id = Column(String(32), nullable=True, index=True)
    eng_handoffs = Column(Integer, default=0, nullable=False)
    eng_outcome = Column(String(64), nullable=True, index=True)
    status = Column(String(32), nullable=False, index=True) # Closed, Open - with L1, Open - with Engineering, Ready to Escalate, Reopened
    first_closed_at = Column(DateTime, nullable=True)
    final_closed_at = Column(DateTime, nullable=True)
    reopen_count = Column(Integer, default=0, nullable=False)
    csat_score = Column(Float, nullable=True)
    
    # SupportDesk Workflow extensions
    internal_notes = Column(Text, nullable=True)
    investigation_completed = Column(Boolean, default=False)
    escalation_ready = Column(Boolean, default=False)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking
    
    # Relationships
    checks = relationship("InvestigationCheck", back_populates="ticket", cascade="all, delete-orphan")
    escalations = relationship("EscalationRecord", back_populates="ticket", cascade="all, delete-orphan")
    timeline = relationship("TicketTimeline", back_populates="ticket", cascade="all, delete-orphan")
    audit_logs = relationship("EscalationAuditLog", back_populates="ticket", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tickets_cat_status", "category", "status"),
        Index("ix_tickets_agent_status", "assigned_agent", "status"),
        Index("ix_tickets_esc_outcome", "escalated_to_eng", "eng_outcome"),
    )

class InvestigationCheck(Base):
    __tablename__ = "investigation_checks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(32), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    check_key = Column(String(64), nullable=False)
    label = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=True)
    status = Column(String(32), default="pending")  # pending, passed, failed, not_applicable
    findings = Column(Text, nullable=True)
    na_reason = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    ticket = relationship("Ticket", back_populates="checks")

    __table_args__ = (
        UniqueConstraint("ticket_id", "check_key", name="uq_ticket_check_key"),
    )

class EscalationRecord(Base):
    __tablename__ = "escalation_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(32), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    eng_ticket_id = Column(String(32), nullable=False)
    escalated_by = Column(String(64), nullable=False)
    escalation_reason = Column(String(128), nullable=False)
    steps_to_reproduce = Column(Text, nullable=False)
    expected_behavior = Column(Text, nullable=False)
    actual_behavior = Column(Text, nullable=False)
    client_impact = Column(Text, nullable=True)
    logs_evidence = Column(Text, nullable=True)
    quality_gate_passed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    ticket = relationship("Ticket", back_populates="escalations")

class EscalationAuditLog(Base):
    __tablename__ = "escalation_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(32), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    actor = Column(String(64), nullable=False)
    actor_role = Column(String(32), nullable=False)  # agent, manager, engineer
    action = Column(String(32), nullable=False)  # ESCALATE, BYPASS_ESCALATE, RETURN, REOPEN
    readiness_score = Column(Integer, nullable=False)
    missing_checks = Column(Text, nullable=True)  # JSON or comma-separated list
    bypass_reason = Column(Text, nullable=True)
    reason_category = Column(String(64), nullable=True)  # fleet_emergency, client_sla, other
    created_at = Column(DateTime, default=utc_now)

    ticket = relationship("Ticket", back_populates="audit_logs")

class TicketTimeline(Base):
    __tablename__ = "ticket_timeline"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(32), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    actor = Column(String(64), nullable=False)
    event_type = Column(String(64), nullable=False) # STATUS_CHANGE, NOTE_ADDED, CHECK_PASSED, ESCALATED, RETURNED, RESOLVED
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    ticket = relationship("Ticket", back_populates="timeline")
