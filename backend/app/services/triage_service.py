from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from ..models import Ticket, InvestigationCheck, EscalationRecord, TicketTimeline, utc_now
from .diagnostic_rules import get_checklist_for_category

class TriageService:

    @staticmethod
    def initialize_ticket_checks(db: Session, ticket: Ticket) -> List[InvestigationCheck]:
        """Ensure ticket has category-specific checklist rows in database without duplicates."""
        existing = db.query(InvestigationCheck).filter(InvestigationCheck.ticket_id == ticket.ticket_id).all()
        
        # Deduplicate existing checks by check_key
        seen: Dict[str, InvestigationCheck] = {}
        duplicates_to_delete = []
        for c in existing:
            if c.check_key not in seen:
                seen[c.check_key] = c
            else:
                prev = seen[c.check_key]
                # Keep whichever record has already been answered
                if prev.status == "pending" and c.status != "pending":
                    duplicates_to_delete.append(prev)
                    seen[c.check_key] = c
                else:
                    duplicates_to_delete.append(c)

        if duplicates_to_delete:
            for d in duplicates_to_delete:
                db.delete(d)
            db.commit()

        rules = get_checklist_for_category(ticket.category)
        checks_to_add = []
        for rule in rules:
            if rule["check_key"] not in seen:
                check = InvestigationCheck(
                    ticket_id=ticket.ticket_id,
                    check_key=rule["check_key"],
                    label=rule["label"],
                    description=rule.get("description", ""),
                    is_required=rule.get("is_required", True),
                    status="pending",
                    findings=None,
                    na_reason=None
                )
                db.add(check)
                checks_to_add.append(check)
        
        if checks_to_add:
            db.commit()
            for c in checks_to_add:
                db.refresh(c)
                seen[c.check_key] = c

        return list(seen.values())

    @staticmethod
    def evaluate_escalation_readiness(ticket: Ticket, checks: List[InvestigationCheck]) -> Dict[str, Any]:
        """
        Evaluates whether a ticket satisfies the Escalation Quality Gate.
        Readiness = completed required checks / total required checks.
        'N/A' counts as complete only when a valid reason is written.
        'Failed' counts as complete (evidence of bug or config error).
        """
        # Deduplicate checks by check_key to prevent double-counting
        unique_checks: Dict[str, InvestigationCheck] = {}
        for c in checks:
            if c.check_key not in unique_checks or (unique_checks[c.check_key].status == "pending" and c.status != "pending"):
                unique_checks[c.check_key] = c

        checklist = list(unique_checks.values())
        required_checks = [c for c in checklist if c.is_required]
        total_required = len(required_checks)

        completed_required = []
        unanswered_required = []

        for c in required_checks:
            if c.status in ["passed", "failed"]:
                completed_required.append(c)
            elif c.status == "not_applicable":
                # N/A requires a reason or findings of at least 5 characters
                has_reason = bool((c.na_reason and len(c.na_reason.strip()) >= 5) or (c.findings and len(c.findings.strip()) >= 5))
                if has_reason:
                    completed_required.append(c)
                else:
                    unanswered_required.append((c, "N/A requires written justification"))
            else:
                unanswered_required.append((c, "Pending verification"))

        score = int((len(completed_required) / total_required) * 100) if total_required > 0 else 100
        is_ready = (len(unanswered_required) == 0)

        # State machine awareness
        if ticket.status == "Open - with Engineering":
            return {
                "ticket_id": ticket.ticket_id,
                "is_ready": True,
                "readiness_score": score,
                "missing_requirements": [],
                "completed_checks": len(completed_required),
                "total_checks": total_required,
                "recommendation": f"TICKET DISPATCHED TO ENGINEERING: Handed off as {ticket.eng_ticket_id or 'ENG-active'}. Awaiting engineering resolution.",
                "state": "with_engineering",
                "suggested_escalation_summary": None
            }
        elif ticket.status == "Closed":
            return {
                "ticket_id": ticket.ticket_id,
                "is_ready": True,
                "readiness_score": score,
                "missing_requirements": [],
                "completed_checks": len(completed_required),
                "total_checks": total_required,
                "recommendation": "TICKET RESOLVED: Closed successfully.",
                "state": "closed",
                "suggested_escalation_summary": None
            }

        # Check for client-side configuration error patterns
        config_fails = [
            c for c in checklist 
            if c.status == "failed" and any(k in c.check_key for k in ["format", "cutoff", "permission", "lockout", "range"])
        ]
        
        missing_labels = [f"{c.label} ({reason})" for c, reason in unanswered_required]

        if config_fails:
            recommendation = (
                f"ACTION RECOMMENDED: Direct L1 Resolution. One or more preliminary checks ({', '.join(c.label for c in config_fails)}) "
                "indicate a client configuration or input format mismatch. Do not escalate to Engineering; guide client on correct settings."
            )
        elif not is_ready:
            recommendation = (
                f"ESCALATION BLOCKED BY QUALITY GATE: {len(unanswered_required)} required diagnostic checks are incomplete. "
                "Complete preliminary investigation checks to prevent ticket bounce."
            )
        else:
            recommendation = (
                "READY FOR ENGINEERING ESCALATION: All mandatory preliminary diagnostic checks completed with verified findings. "
                "Quality gate passed."
            )

        checklist_summary = "\n".join(
            [f"- [{c.status.upper()}] {c.label}: {c.findings or c.na_reason or 'No findings logged'}" for c in checklist]
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
            "missing_requirements": missing_labels,
            "completed_checks": len(completed_required),
            "total_checks": total_required,
            "recommendation": recommendation,
            "state": "open_l1" if not is_ready else "ready_to_escalate",
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
        ticket.version = (ticket.version or 1) + 1

        # Add Audit Log
        from ..models import EscalationAuditLog
        import json
        is_bypass = bool(escalation_data.get("bypass_quality_gate", False) and not is_ready)
        audit_log = EscalationAuditLog(
            ticket_id=ticket.ticket_id,
            actor=escalation_data.get("escalated_by", "Support Agent"),
            actor_role=escalation_data.get("actor_role", "agent"),
            action="BYPASS_ESCALATE" if is_bypass else "ESCALATE",
            readiness_score=int(escalation_data.get("readiness_score", 100 if is_ready else 0)),
            missing_checks=json.dumps(escalation_data.get("missing_requirements", [])),
            bypass_reason=escalation_data.get("bypass_reason") if is_bypass else None,
            reason_category=escalation_data.get("reason_category") if is_bypass else None,
            created_at=utc_now()
        )
        db.add(audit_log)

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
