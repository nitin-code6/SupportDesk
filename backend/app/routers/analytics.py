from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    OverviewMetrics, CategoryMetric, EscalationOutcomeMetric, AgentMetric, VolumeTrendMetric, AnalyticsFilterOptions
)
from ..services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/filters", response_model=AnalyticsFilterOptions)
def get_analytics_filters(db: Session = Depends(get_db)):
    return AnalyticsService.get_filter_options(db)

@router.get("/overview", response_model=OverviewMetrics)
def get_overview_metrics(
    client_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_overview_metrics(
        db, client_name=client_name, category=category, status=status,
        priority=priority, agent=agent, start_date=start_date, end_date=end_date
    )

@router.get("/categories", response_model=list[CategoryMetric])
def get_category_metrics(
    client_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_category_metrics(
        db, client_name=client_name, category=category, status=status,
        priority=priority, agent=agent, start_date=start_date, end_date=end_date
    )

@router.get("/escalation-outcomes", response_model=list[EscalationOutcomeMetric])
def get_escalation_outcome_metrics(
    client_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_escalation_outcome_metrics(
        db, client_name=client_name, category=category, status=status,
        priority=priority, agent=agent, start_date=start_date, end_date=end_date
    )

@router.get("/agents", response_model=list[AgentMetric])
def get_agent_metrics(
    client_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_agent_metrics(
        db, client_name=client_name, category=category, status=status,
        priority=priority, agent=agent, start_date=start_date, end_date=end_date
    )

@router.get("/trends", response_model=list[VolumeTrendMetric])
def get_volume_trends(
    client_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_volume_trends(
        db, client_name=client_name, category=category, status=status,
        priority=priority, agent=agent, start_date=start_date, end_date=end_date
    )
