# SupportDesk v1 — Next 4 Weeks Implementation Roadmap

This roadmap outlines the operational rollout, telemetry refinements, and feature enhancements to drive the engineering bounce rate below 15% and stabilize open backlog growth at RideOps.

---

## Week 1: Production Deployment & Agent Onboarding
- **Objectives:**
  - Deploy SupportDesk v1 to staging and production ops environments.
  - Run the 5-minute usability script (`docs/USER_TEST.md`) with 5 lead L1 triage agents.
  - Calibrate category diagnostic rules for peak shift hours (07:00–10:00 and 17:00–20:00 IST).
- **Key Milestones:**
  - All L1 agents active on SupportDesk v1.
  - Zero unhandled exceptions in AI rotation and fallback layers.
  - Quality gate prevents 100% of unverified ticket escalations.

---

## Week 2: Telemetry Calibration & Metric Tracking
- **Objectives:**
  - Reconcile first 7 days of live production escalations against baseline.
  - Track real-time bounce-back rates by category.
  - Review all manager bypass logs in `escalation_audit_logs` to identify recurring operational bottlenecks.
- **Key Milestones:**
  - Baseline comparison: escalation bounce rate reduced from 35.6% toward 22%.
  - Zero bypasses granted without verifiable business justification.
  - AI circuit breaker uptime $> 99.9\%$ across Gemini and Groq.

---

## Week 3: Protocol Refinement & Knowledge Base Integration
- **Objectives:**
  - Integrate diagnostic protocols with RideOps client runbooks (e.g. self-serve SFTP sync restart).
  - Add client-specific override rules (e.g. custom cutoff times for Tier 1 enterprise contracts).
  - Implement automated duplicate ticket detection during queue ingestion.
- **Key Milestones:**
  - Direct L1 resolution rate increased by $+15\%$.
  - "Duplicate" and "Not a bug" avoidable escalations reduced by half.

---

## Week 4: Target Verification & Engineering Review
- **Objectives:**
  - Joint operational review between Support Operations and Sandeep's Engineering team.
  - Evaluate the core business metric: **Engineering Escalation Bounce Rate $< 15\%$**.
  - Measure open backlog trend stabilization: eliminate the $+60\%$ backlog surge.
- **Key Milestones:**
  - Final bounce rate validated below $15\%$.
  - Median resolution time for non-escalated tickets stabilized under 12 hours.
  - Formal executive report delivered to RideOps leadership.
