from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from ..models import Ticket, InvestigationCheck, EscalationRecord, TicketTimeline, utc_now
from .diagnostic_rules import get_checklist_for_category

class TriageService:

    @staticmethod
    def initialize_ticket_checks(db: Session, ticket: Ticket) -> List[InvestigationCheck]:
        """Ensure ticket has category-specific checklist rows in database."""
        existing = db.query(InvestigationCheck).filter(InvestigationCheck.ticket_id == ticket.ticket_id).all()
        if existing:
            return existing

        rules = get_checklist_for_category(ticket.category)
        checks = []
        for rule in rules:
            check = InvestigationCheck(
                ticket_id=ticket.ticket_id,
                check_key=rule["check_key"],
                label=rule["label"],
                description=rule.get("description", ""),
                is_required=rule.get("is_required", True),
                status="pending",
                findings=None
            )
            db.add(check)
            checks.append(check)
        
        db.commit()
        for c in checks:
            db.refresh(c)
        return checks

    @staticmethod
    def evaluate_escalation_readiness(ticket: Ticket, checks: List[InvestigationCheck]) -> Dict[str, Any]:
        """
        Evaluates whether a ticket satisfies the Escalation Quality Gate.
        Prevents incomplete handoffs (which accounted for 35.6% of returned tickets at RideOps).
        """
        total_checks = len(checks)
        if total_checks == 0:
            return {
                "ticket_id": ticket.ticket_id,
                "is_ready": False,
                "readiness_score": 0,
                "missing_requirements": ["No diagnostic checks initialized."],
                "completed_checks": 0,
                "total_checks": 0,
                "recommendation": "Initialize diagnostic checklist for ticket category.",
                "suggested_escalation_summary": None
            }

        answered_checks = [c for c in checks if c.status != "pending"]
        completed_count = len(answered_checks)
        required_checks = [c for c in checks if c.is_required]
        unanswered_required = [c for c in required_checks if c.status == "pending"]

        # Missing requirements list
        missing = [f"Incomplete check: {c.label}" for c in unanswered_required]

        # Calculate score: weighted by required checks
        required_answered = len([c for c in required_checks if c.status != "pending"])
        score = int((completed_count / total_checks) * 100) if total_checks > 0 else 0

        # Check for config-resolvable patterns
        # e.g., if roster format check failed or shift cutoff failed, it's an L1 client config fix, NOT an engineering bug!
        config_fails = [c for c in checks if c.status == "failed" and any(k in c.check_key for k in ["format", "cutoff", "permission", "lockout", "range"])]
        
        is_ready = (len(unanswered_required) == 0) and (score >= 75)
        
        if config_fails:
            recommendation = (
                f"ACTION RECOMMENDED: Direct L1 Resolution. One or more preliminary checks ({', '.join(c.label for c in config_fails)}) "
                "indicate a client configuration or input format mismatch. Do not escalate to Engineering; guide client on correct settings."
            )
        elif not is_ready:
            recommendation = (
                f"ESCALATION BLOCKED BY QUALITY GATE: {len(unanswered_required)} required diagnostic checks are pending. "
                "Complete preliminary investigation checks to prevent ticket bounce."
            )
        else:
            recommendation = (
                "READY FOR ENGINEERING ESCALATION: All mandatory preliminary diagnostic checks completed with verified findings. "
                "Quality gate passed."
            )

        # Generate structured escalation summary
        checklist_summary = "\n".join(
            [f"- [{c.status.upper()}] {c.label}: {c.findings or 'No findings logged'}" for c in checks]
        )
        
        summary_text = (
            f"=== ESCALATION PACKAGE FOR {ticket.ticket_id} ===\n"
            f"Client: {ticket.client_name} (Tier: {ticket.client_tier})\n"
            f"Category: {ticket.category} | Priority: {ticket.priority}\n"
            f"Description: {ticket.description}\n\n"
            f"--- PRELIMINARY DIAGNOSTIC RESULTS ---\n"
            f"{checklist_summary}\n\n"
            f"Expected Behavior: Normal system operation as per {ticket.client_tier} SLA.\n"
            f"Actual Behavior: Reported failure confirmed after preliminary L1 triage.\n"
        )

        return {
            "ticket_id": ticket.ticket_id,
            "is_ready": is_ready,
            "readiness_score": score,
            "missing_requirements": missing,
            "completed_checks": completed_count,
            "total_checks": total_checks,
            "recommendation": recommendation,
            "suggested_escalation_summary": summary_text
        }

    @staticmethod
    def process_escalation(
        db: Session, 
        ticket: Ticket, 
        escalation_data: Dict[str, Any],
        is_ready: bool
    ) -> EscalationRecord:
        """Processes the escalation, creating an official record and updating ticket status."""
        eng_ticket_id = f"ENG-{ticket.ticket_id.replace('SUP-', '')}"
        
        record = EscalationRecord(
            ticket_id=ticket.ticket_id,
            eng_ticket_id=eng_ticket_id,
            escalated_by=escalation_data["escalated_by"],
            escalation_reason=escalation_data["escalation_reason"],
            steps_to_reproduce=escalation_data["steps_to_reproduce"],
            expected_behavior=escalation_data["expected_behavior"],
            actual_behavior=escalation_data["actual_behavior"],
            client_impact=escalation_data.get("client_impact", ""),
            logs_evidence=escalation_data.get("logs_evidence", ""),
            quality_gate_passed=is_ready,
            created_at=utc_now()
        )
        db.add(record)

        # Update Ticket
        ticket.escalated_to_eng = True
        ticket.eng_ticket_id = eng_ticket_id
        ticket.eng_handoffs = (ticket.eng_handoffs or 0) + 1
        ticket.status = "Open - with Engineering"
        ticket.escalation_ready = is_ready

        # Add Timeline Event
        timeline_entry = TicketTimeline(
            ticket_id=ticket.ticket_id,
            actor=escalation_data["escalated_by"],
            event_type="ESCALATED",
            message=f"Escalated to Engineering as {eng_ticket_id}. Quality Gate Passed: {is_ready}. Reason: {escalation_data['escalation_reason']}",
            created_at=utc_now()
        )
        db.add(timeline_entry)

        db.commit()
        db.refresh(record)
        return record
