from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    OverviewMetrics, CategoryMetric, EscalationOutcomeMetric, AgentMetric, VolumeTrendMetric
)
from ..services.analytics_service import AnalyticsService
from ..services.metrics import MetricsService

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/overview", response_model=OverviewMetrics)
def get_overview_metrics(
    client_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return MetricsService.get_overview_metrics(db, client_id=client_id, category=category)

@router.get("/categories", response_model=list[CategoryMetric])
def get_category_metrics(db: Session = Depends(get_db)):
    return AnalyticsService.get_category_metrics(db)

@router.get("/escalation-outcomes", response_model=list[EscalationOutcomeMetric])
def get_escalation_outcome_metrics(db: Session = Depends(get_db)):
    return AnalyticsService.get_escalation_outcome_metrics(db)

@router.get("/agents", response_model=list[AgentMetric])
def get_agent_metrics(db: Session = Depends(get_db)):
    return AnalyticsService.get_agent_metrics(db)

@router.get("/trends", response_model=list[VolumeTrendMetric])
def get_volume_trends(db: Session = Depends(get_db)):
    return AnalyticsService.get_volume_trends(db)
