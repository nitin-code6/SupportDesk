"""
SupportDesk - Real API Smoke Test Script
Executes live requests against Google Gemini and Groq when API keys are configured.
"""

import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.ai import (
    ai_manager,
    TicketSummarizationInput,
    InvestigationAssistantInput,
    EscalationSummaryInput
)

def run_smoke_test():
    print("=" * 60)
    print("SupportDesk - Multi-Provider AI Smoke Test")
    print("=" * 60)
    
    health = ai_manager.get_health_status()
    print(f"Active Strategy: {health.active_strategy}")
    print(f"Fallback Enabled: {health.fallback_enabled}")
    for name, p in health.providers.items():
        print(f"  - Provider [{name}]: Configured={p.is_configured}, Available={p.is_available}")

    sample_input = TicketSummarizationInput(
        ticket_id="SUP-SMOKE-1",
        client_name="Apex Logistics",
        client_tier="Enterprise",
        category="Roster / booking not syncing",
        priority="P1",
        description="Shift roster failed to sync cabs for morning pickup; 40 employees stranded.",
        internal_notes="Client confirmed CSV was uploaded at 06:00 IST."
    )

    print("\n[TEST 1] Testing Ticket Summarization (Initial Provider Selection)...")
    try:
        res1 = ai_manager.summarize_ticket(sample_input)
        print(f"-> SUCCESS via Provider: [{res1.provider_used}] in {res1.latency_ms} ms")
        print(f"   Summary: {res1.issue_summary}")
        print(f"   Symptoms: {res1.reported_symptoms}")
        print(f"   Missing Info: {res1.missing_information}")
    except Exception as e:
        print(f"-> FAILED: {str(e)[:150]}")

    print("\n[TEST 2] Testing Second Request (Validating Provider Rotation)...")
    try:
        res2 = ai_manager.summarize_ticket(sample_input)
        print(f"-> SUCCESS via Provider: [{res2.provider_used}] in {res2.latency_ms} ms")
        print(f"   Summary: {res2.issue_summary}")
    except Exception as e:
        print(f"-> FAILED: {str(e)[:150]}")

    print("\n[TEST 3] Testing AI Observability & Health Endpoint...")
    updated_health = ai_manager.get_health_status()
    for name, p in updated_health.providers.items():
        print(f"  - [{name}]: Total={p.total_requests}, Success={p.successful_requests}, Failed={p.failed_requests}, AvgLatency={p.avg_latency_ms}ms")

    print("\nSmoke test complete.")

if __name__ == "__main__":
    run_smoke_test()
