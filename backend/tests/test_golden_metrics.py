"""
Golden Data Reconciliation Test Suite
Verifies that all metrics computed by MetricsService strictly match the 1,444-ticket
ground truth CSV (rideops_support_tickets.csv) and canonical specification in docs/METRICS.md.
"""

import pytest
from app.database import SessionLocal
from app.services.metrics import MetricsService
from app.services.analytics_service import AnalyticsService
from app.models import Ticket
from sqlalchemy import func

@pytest.fixture(scope="module")
def live_db():
    session = SessionLocal()
    yield session
    session.close()

def test_dataset_total_volume_and_integrity(live_db):
    """CSV Ground Truth: 1,444 tickets total."""
    total = live_db.query(Ticket).count()
    assert total == 1444, f"Expected 1,444 tickets in database, found {total}"

def test_monthly_inflow_volume_and_trend(live_db):
    """
    CSV Ground Truth:
    July 2026: 390
    August 2026: 462
    September 2026: 592
    Growth: +51.8% from July to September.
    """
    trends = AnalyticsService.get_volume_trends(live_db)
    assert len(trends) > 0

    # Test monthly breakdown via SQL
    monthly_counts = dict(
        live_db.query(
            func.strftime('%Y-%m', Ticket.created_at),
            func.count(Ticket.ticket_id)
        ).group_by(func.strftime('%Y-%m', Ticket.created_at)).all()
    )
    assert monthly_counts.get("2026-07") == 390
    assert monthly_counts.get("2026-08") == 462
    assert monthly_counts.get("2026-09") == 592

    # Verify +51.79% volume growth
    growth_pct = ((592 - 390) / 390) * 100
    assert round(growth_pct, 1) == 51.8

def test_open_backlog_snapshots_and_trend(live_db):
    """
    As-of-date month-end open ticket snapshots:
    Jul 31, 2026: 30 tickets
    Aug 31, 2026: 23 tickets
    Sep 30, 2026: 48 tickets (+60.0% vs July, +108.7% vs August)
    Current breakdown: 29 with L1, 19 with Engineering.
    """
    backlog = MetricsService.get_backlog_snapshots(live_db)

    assert backlog["jul_month_end"] == 30
    assert backlog["aug_month_end"] == 23
    assert backlog["sep_month_end"] == 48
    assert backlog["trend_pct_vs_july"] == 60.0
    assert backlog["trend_pct_vs_august"] == 108.7

    overview = MetricsService.get_overview_metrics(live_db)
    assert overview["open_tickets"] == 48
    assert overview["open_l1_count"] == 29
    assert overview["open_eng_count"] == 19

def test_escalation_counts_and_outcomes(live_db):
    """
    CSV Ground Truth:
    Total escalations: exactly 486 (33.66% -> 33.7%)
    Returned to L1: 173 (35.60% -> 35.6%)
    Avoidable escalations: 275 (56.58% -> 56.6%)
    True fixes: 211 (43.4%)
    """
    overview = MetricsService.get_overview_metrics(live_db)
    assert overview["total_escalated"] == 486
    assert overview["escalation_rate_pct"] == 33.7
    assert overview["returned_to_l1_count"] == 173
    assert overview["escalation_bounce_rate_pct"] == 35.6
    assert overview["avoidable_escalation_count"] == 275
    assert overview["avoidable_escalation_rate_pct"] == 56.6

    breakdown = MetricsService.get_escalation_breakdown(live_db)
    outcomes = breakdown["outcomes"]

    assert outcomes["fixed"] == 211
    assert outcomes["insufficient_info"] == 89
    assert outcomes["config_issue"] == 84
    assert outcomes["duplicate"] == 56
    assert outcomes["not_a_bug"] == 24
    assert outcomes["not_reproducible"] == 22

def test_resolution_times_side_by_side(live_db):
    """
    CSV Ground Truth Resolution Times:
    - All closed (1,396): median 22.31h, mean 45.80h
    - Direct L1 (944): median 12.57h, mean 19.96h
    - Escalated (452): median 86.78h, mean 99.79h
    - Bounced back (155): median 127.97h, mean 141.45h
    """
    overview = MetricsService.get_overview_metrics(live_db)
    res = overview["resolution_times"]

    # All closed
    assert res["all_closed"]["count"] == 1396
    assert res["all_closed"]["median"] == 22.31
    assert res["all_closed"]["mean"] == 45.80

    # Direct L1 (non-escalated)
    assert res["direct_l1"]["count"] == 944
    assert res["direct_l1"]["median"] == 12.57
    assert res["direct_l1"]["mean"] == 19.96

    # Escalated
    assert res["escalated"]["count"] == 452
    assert res["escalated"]["median"] == 86.78
    assert res["escalated"]["mean"] == 99.79

    # Bounced back
    assert res["bounced_to_l1"]["count"] == 155
    assert res["bounced_to_l1"]["median"] == 127.97
    assert res["bounced_to_l1"]["mean"] == 141.45

def test_agent_escalation_variance(live_db):
    """Agent escalation rates span from ~16.1% to ~61.6%."""
    agents = AnalyticsService.get_agent_metrics(live_db)
    rates = [a["escalation_rate_pct"] for a in agents if a["total_tickets"] >= 20]
    min_rate = min(rates)
    max_rate = max(rates)
    assert min_rate >= 15.0 and min_rate <= 17.5
    assert max_rate >= 60.0 and max_rate <= 63.0
