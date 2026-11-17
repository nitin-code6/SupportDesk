from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from ..models import Ticket

class AnalyticsService:

    @staticmethod
    def get_overview_metrics(db: Session, client_id: str = None, category: str = None) -> dict:
        query = db.query(Ticket)
        if client_id:
            query = query.filter(Ticket.client_id == client_id)
        if category:
            query = query.filter(Ticket.category == category)
        
        tickets = query.all()
        if not tickets:
            return {
                "total_tickets": 0, "open_tickets": 0, "closed_tickets": 0,
                "open_l1_count": 0, "open_eng_count": 0, "high_priority_open": 0,
                "total_escalated": 0, "escalation_rate_pct": 0.0,
                "escalation_bounce_rate_pct": 0.0, "avoidable_escalation_rate_pct": 0.0,
                "avg_resolution_hours_overall": 0.0, "median_resolution_hours_overall": 0.0,
                "avg_resolution_hours_unescalated": 0.0, "avg_resolution_hours_escalated": 0.0,
                "avg_resolution_hours_bounced": 0.0, "reopened_tickets_count": 0,
                "reopen_rate_pct": 0.0, "avg_csat_overall": None,
                "avg_csat_unescalated": None, "avg_csat_escalated": None,
                "avg_csat_bounced": None
            }

        data = [{
            "ticket_id": t.ticket_id,
            "created_at": t.created_at,
            "status": t.status,
            "priority": t.priority,
            "category": t.category,
            "escalated_to_eng": t.escalated_to_eng,
            "eng_outcome": t.eng_outcome,
            "eng_handoffs": t.eng_handoffs,
            "final_closed_at": t.final_closed_at,
            "reopen_count": t.reopen_count,
            "csat_score": t.csat_score
        } for t in tickets]

        df = pd.DataFrame(data)
        total_tickets = len(df)
        
        # Status counts
        is_open = df['status'].str.startswith('Open')
        open_tickets = int(is_open.sum())
        closed_tickets = int((df['status'] == 'Closed').sum())
        open_l1_count = int((df['status'] == 'Open - with L1').sum())
        open_eng_count = int((df['status'] == 'Open - with Engineering').sum())
        high_priority_open = int((is_open & df['priority'].isin(['P1', 'P2'])).sum())

        # Escalation metrics
        escalated_df = df[df['escalated_to_eng'] == True]
        total_escalated = len(escalated_df)
        esc_rate = (total_escalated / total_tickets * 100.0) if total_tickets > 0 else 0.0

        bounced_mask = escalated_df['eng_outcome'].isin([
            'Insufficient info - returned to L1',
            'Config issue - returned to L1'
        ])
        bounced_count = int(bounced_mask.sum())
        bounce_rate = (bounced_count / total_escalated * 100.0) if total_escalated > 0 else 0.0

        avoidable_mask = escalated_df['eng_outcome'] != 'Fixed'
        avoidable_count = int(avoidable_mask.sum())
        avoidable_rate = (avoidable_count / total_escalated * 100.0) if total_escalated > 0 else 0.0

        # Resolution calculations on closed tickets with valid dates
        closed_df = df[df['status'] == 'Closed'].copy()
        closed_df['final_closed_at'] = pd.to_datetime(closed_df['final_closed_at'])
        closed_df['created_at'] = pd.to_datetime(closed_df['created_at'])
        valid_closed = closed_df.dropna(subset=['final_closed_at', 'created_at']).copy()
        
        valid_closed['res_hours'] = (
            valid_closed['final_closed_at'] - valid_closed['created_at']
        ).dt.total_seconds() / 3600.0

        avg_res_overall = float(valid_closed['res_hours'].mean()) if len(valid_closed) > 0 else 0.0
        med_res_overall = float(valid_closed['res_hours'].median()) if len(valid_closed) > 0 else 0.0

        unesc_closed = valid_closed[valid_closed['escalated_to_eng'] == False]
        avg_res_unesc = float(unesc_closed['res_hours'].mean()) if len(unesc_closed) > 0 else 0.0

        esc_closed = valid_closed[valid_closed['escalated_to_eng'] == True]
        avg_res_esc = float(esc_closed['res_hours'].mean()) if len(esc_closed) > 0 else 0.0

        bounced_closed = esc_closed[esc_closed['eng_outcome'].isin([
            'Insufficient info - returned to L1',
            'Config issue - returned to L1'
        ])]
        avg_res_bounced = float(bounced_closed['res_hours'].mean()) if len(bounced_closed) > 0 else 0.0

        # Reopen metrics
        reopened_count = int((df['reopen_count'] > 0).sum())
        reopen_rate = (reopened_count / total_tickets * 100.0) if total_tickets > 0 else 0.0

        # CSAT
        csat_series = df['csat_score'].dropna()
        avg_csat_overall = float(csat_series.mean()) if len(csat_series) > 0 else None
        
        unesc_csat = df[df['escalated_to_eng'] == False]['csat_score'].dropna()
        avg_csat_unesc = float(unesc_csat.mean()) if len(unesc_csat) > 0 else None

        esc_csat = df[df['escalated_to_eng'] == True]['csat_score'].dropna()
        avg_csat_esc = float(esc_csat.mean()) if len(esc_csat) > 0 else None

        bounced_csat = df[df['eng_outcome'].isin([
            'Insufficient info - returned to L1',
            'Config issue - returned to L1'
        ])]['csat_score'].dropna()
        avg_csat_bounced = float(bounced_csat.mean()) if len(bounced_csat) > 0 else None

        return {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "closed_tickets": closed_tickets,
            "open_l1_count": open_l1_count,
            "open_eng_count": open_eng_count,
            "high_priority_open": high_priority_open,
            "total_escalated": total_escalated,
            "escalation_rate_pct": round(esc_rate, 2),
            "escalation_bounce_rate_pct": round(bounce_rate, 2),
            "avoidable_escalation_rate_pct": round(avoidable_rate, 2),
            "avg_resolution_hours_overall": round(avg_res_overall, 2),
            "median_resolution_hours_overall": round(med_res_overall, 2),
            "avg_resolution_hours_unescalated": round(avg_res_unesc, 2),
            "avg_resolution_hours_escalated": round(avg_res_esc, 2),
            "avg_resolution_hours_bounced": round(avg_res_bounced, 2),
            "reopened_tickets_count": reopened_count,
            "reopen_rate_pct": round(reopen_rate, 2),
            "avg_csat_overall": round(avg_csat_overall, 2) if avg_csat_overall is not None else None,
            "avg_csat_unescalated": round(avg_csat_unesc, 2) if avg_csat_unesc is not None else None,
            "avg_csat_escalated": round(avg_csat_esc, 2) if avg_csat_esc is not None else None,
            "avg_csat_bounced": round(avg_csat_bounced, 2) if avg_csat_bounced is not None else None,
        }

    @staticmethod
    def get_category_metrics(db: Session) -> list:
        tickets = db.query(Ticket).all()
        if not tickets:
            return []
        
        data = [{
            "category": t.category,
            "status": t.status,
            "escalated_to_eng": t.escalated_to_eng,
            "created_at": t.created_at,
            "final_closed_at": t.final_closed_at,
            "reopen_count": t.reopen_count,
            "csat_score": t.csat_score
        } for t in tickets]
        
        df = pd.DataFrame(data)
        df['is_open'] = df['status'].str.startswith('Open')
        df['is_closed'] = df['status'] == 'Closed'
        df['final_closed_at'] = pd.to_datetime(df['final_closed_at'])
        df['created_at'] = pd.to_datetime(df['created_at'])
        df['res_hours'] = np.where(
            df['is_closed'] & df['final_closed_at'].notnull(),
            (df['final_closed_at'] - df['created_at']).dt.total_seconds() / 3600.0,
            np.nan
        )

        records = []
        for cat, group in df.groupby('category'):
            total = len(group)
            open_count = int(group['is_open'].sum())
            esc_count = int(group['escalated_to_eng'].sum())
            esc_rate = (esc_count / total * 100.0) if total > 0 else 0.0
            
            res_series = group['res_hours'].dropna()
            avg_res = float(res_series.mean()) if len(res_series) > 0 else 0.0
            med_res = float(res_series.median()) if len(res_series) > 0 else 0.0
            reopens = int(group['reopen_count'].sum())
            
            csat_s = group['csat_score'].dropna()
            avg_csat = float(csat_s.mean()) if len(csat_s) > 0 else None

            records.append({
                "category": cat,
                "total_tickets": total,
                "open_tickets": open_count,
                "escalated_tickets": esc_count,
                "escalation_rate_pct": round(esc_rate, 2),
                "avg_resolution_hours": round(avg_res, 2),
                "median_resolution_hours": round(med_res, 2),
                "reopen_count": reopens,
                "avg_csat": round(avg_csat, 2) if avg_csat is not None else None
            })

        return sorted(records, key=lambda x: x["total_tickets"], reverse=True)

    @staticmethod
    def get_escalation_outcome_metrics(db: Session) -> list:
        escalated_tickets = db.query(Ticket).filter(Ticket.escalated_to_eng == True).all()
        if not escalated_tickets:
            return []
        
        data = [{
            "eng_outcome": t.eng_outcome or "Pending Engineering Review",
            "created_at": t.created_at,
            "final_closed_at": t.final_closed_at,
            "status": t.status,
            "csat_score": t.csat_score
        } for t in escalated_tickets]
        
        df = pd.DataFrame(data)
        total_esc = len(df)
        df['final_closed_at'] = pd.to_datetime(df['final_closed_at'])
        df['created_at'] = pd.to_datetime(df['created_at'])
        df['res_hours'] = np.where(
            (df['status'] == 'Closed') & df['final_closed_at'].notnull(),
            (df['final_closed_at'] - df['created_at']).dt.total_seconds() / 3600.0,
            np.nan
        )

        records = []
        for outcome, group in df.groupby('eng_outcome'):
            count = len(group)
            pct = (count / total_esc * 100.0) if total_esc > 0 else 0.0
            res_series = group['res_hours'].dropna()
            avg_res = float(res_series.mean()) if len(res_series) > 0 else 0.0
            
            csat_s = group['csat_score'].dropna()
            avg_csat = float(csat_s.mean()) if len(csat_s) > 0 else None

            records.append({
                "outcome": outcome,
                "count": count,
                "percentage": round(pct, 2),
                "avg_resolution_hours": round(avg_res, 2),
                "avg_csat": round(avg_csat, 2) if avg_csat is not None else None
            })

        return sorted(records, key=lambda x: x["count"], reverse=True)

    @staticmethod
    def get_agent_metrics(db: Session) -> list:
        tickets = db.query(Ticket).all()
        if not tickets:
            return []

        data = [{
            "agent": t.assigned_agent,
            "status": t.status,
            "escalated_to_eng": t.escalated_to_eng,
            "created_at": t.created_at,
            "final_closed_at": t.final_closed_at,
            "csat_score": t.csat_score
        } for t in tickets]

        df = pd.DataFrame(data)
        df['is_open'] = df['status'].str.startswith('Open')
        df['final_closed_at'] = pd.to_datetime(df['final_closed_at'])
        df['created_at'] = pd.to_datetime(df['created_at'])
        df['res_hours'] = np.where(
            (df['status'] == 'Closed') & df['final_closed_at'].notnull(),
            (df['final_closed_at'] - df['created_at']).dt.total_seconds() / 3600.0,
            np.nan
        )

        records = []
        for agent, group in df.groupby('agent'):
            total = len(group)
            open_count = int(group['is_open'].sum())
            esc_count = int(group['escalated_to_eng'].sum())
            esc_rate = (esc_count / total * 100.0) if total > 0 else 0.0
            
            res_series = group['res_hours'].dropna()
            avg_res = float(res_series.mean()) if len(res_series) > 0 else 0.0
            
            csat_s = group['csat_score'].dropna()
            avg_csat = float(csat_s.mean()) if len(csat_s) > 0 else None

            records.append({
                "agent": agent,
                "total_tickets": total,
                "open_tickets": open_count,
                "escalated_tickets": esc_count,
                "escalation_rate_pct": round(esc_rate, 2),
                "avg_resolution_hours": round(avg_res, 2),
                "avg_csat": round(avg_csat, 2) if avg_csat is not None else None
            })

        return sorted(records, key=lambda x: x["total_tickets"], reverse=True)

    @staticmethod
    def get_volume_trends(db: Session) -> list:
        tickets = db.query(Ticket).all()
        if not tickets:
            return []

        data = [{
            "created_at": t.created_at,
            "escalated_to_eng": t.escalated_to_eng,
            "status": t.status
        } for t in tickets]

        df = pd.DataFrame(data)
        df['created_at'] = pd.to_datetime(df['created_at'])
        df['period'] = df['created_at'].dt.to_period('W').astype(str)
        df['is_open'] = df['status'].str.startswith('Open')

        records = []
        for period, group in df.groupby('period'):
            records.append({
                "period": period,
                "total_tickets": len(group),
                "escalated_tickets": int(group['escalated_to_eng'].sum()),
                "open_tickets": int(group['is_open'].sum())
            })

        return sorted(records, key=lambda x: x["period"])
