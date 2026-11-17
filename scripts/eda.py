"""
RideOps Support Tickets - Exploratory Data Analysis
Analyzes 1,444 tickets from reference/rideops_support_tickets.csv
"""

import sys
import pandas as pd
import numpy as np

def run_eda(csv_path="reference/rideops_support_tickets.csv"):
    df = pd.read_csv(csv_path)
    print(f"Total rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    print("\n--- INFO & MISSING VALUES ---")
    print(df.isnull().sum())
    
    # Parse dates
    date_cols = ['created_at', 'first_response_at', 'first_closed_at', 'final_closed_at']
    for col in date_cols:
        df[col] = pd.to_datetime(df[col], errors='coerce')
        
    df['created_month'] = df['created_at'].dt.to_period('M')
    df['created_week'] = df['created_at'].dt.to_period('W')
    df['created_date'] = df['created_at'].dt.date
    
    print("\n--- TICKET VOLUME BY MONTH ---")
    print(df['created_month'].value_counts().sort_index())
    
    print("\n--- STATUS DISTRIBUTION ---")
    print(df['status'].value_counts())
    print(df['status'].value_counts(normalize=True) * 100)

    print("\n--- STATUS BY MONTH CREATED ---")
    print(pd.crosstab(df['created_month'], df['status'], margins=True))

    # Clean boolean columns
    print("\n--- ESCALATED_TO_ENG VALUES ---")
    print(df['escalated_to_eng'].value_counts(dropna=False))
    df['is_escalated'] = df['escalated_to_eng'].astype(str).str.lower().isin(['true', 'yes', '1'])
    esc_total = df['is_escalated'].sum()
    print(f"Total escalated: {esc_total} ({esc_total/len(df)*100:.2f}%)")
    
    print("\n--- STATUS VALUES ---")
    print(df['status'].value_counts(dropna=False))
    df['is_open'] = df['status'].str.startswith('Open')

    print("\n--- CATEGORY BREAKDOWN ---")
    cat_df = df.groupby('category').agg(
        total=('ticket_id', 'count'),
        open_count=('is_open', 'sum'),
        escalated_count=('is_escalated', 'sum'),
    )
    cat_df['escalation_rate_%'] = (cat_df['escalated_count'] / cat_df['total']) * 100
    cat_df['open_rate_%'] = (cat_df['open_count'] / cat_df['total']) * 100
    print(cat_df.sort_values(by='total', ascending=False))
    
    print("\n--- ENGINEERING OUTCOMES ---")
    print(df['eng_outcome'].value_counts(dropna=False))
    print(df[df['is_escalated']]['eng_outcome'].value_counts(dropna=False, normalize=True) * 100)

    print("\n--- ENG OUTCOME BY CATEGORY ---")
    print(pd.crosstab(df['category'], df['eng_outcome'], margins=True))

    print("\n--- ENG HANDOFFS DISTRIBUTION ---")
    print(df['eng_handoffs'].value_counts().sort_index())

    print("\n--- RESOLUTION TIMES (HOURS) FOR CLOSED TICKETS ---")
    closed = df[df['status'] == 'Closed'].copy()
    closed['resolution_hours'] = (closed['final_closed_at'] - closed['created_at']).dt.total_seconds() / 3600.0
    closed['first_response_hours'] = (closed['first_response_at'] - closed['created_at']).dt.total_seconds() / 3600.0
    
    print("Resolution hours overall:")
    print(closed['resolution_hours'].describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95]))

    print("\nResolution hours by escalation status:")
    print(closed.groupby('is_escalated')['resolution_hours'].agg(['count', 'mean', 'median', lambda x: np.percentile(x, 90)]))

    print("\nResolution hours by category:")
    print(closed.groupby('category')['resolution_hours'].agg(['count', 'mean', 'median']).sort_values(by='median', ascending=False))

    print("\n--- REOPENS ---")
    print(df['reopen_count'].value_counts().sort_index())
    print("Reopen by category:")
    print(df.groupby('category')['reopen_count'].agg(['count', 'sum', lambda x: (x > 0).mean() * 100]))

    print("\n--- CSAT SCORES ---")
    print(df['csat_score'].describe())
    print("CSAT by category:")
    print(df.groupby('category')['csat_score'].agg(['count', 'mean', 'median']))
    print("CSAT by is_escalated:")
    print(df.groupby('is_escalated')['csat_score'].agg(['count', 'mean', 'median']))
    print("CSAT by eng_outcome:")
    print(df.groupby('eng_outcome')['csat_score'].agg(['count', 'mean', 'median']))

    print("\n--- AGENT PERFORMANCE ---")
    agent_df = df.groupby('assigned_agent').agg(
        total=('ticket_id', 'count'),
        open_count=('is_open', 'sum'),
        escalated=('is_escalated', 'sum'),
        mean_csat=('csat_score', 'mean'),
    )
    agent_df['escalation_rate_%'] = agent_df['escalated'] / agent_df['total'] * 100
    print(agent_df.sort_values(by='total', ascending=False))

    print("\n--- CLIENT TIER & CONCENTRATION ---")
    print(df['client_tier'].value_counts())
    print("\nTop 10 Clients by Ticket Volume:")
    print(df['client_name'].value_counts().head(10))

    print("\n--- OPEN TICKETS AGEING (SNAPSHOT 2026-09-30 23:59:59) ---")
    open_tickets = df[df['is_open']].copy()
    snapshot_date = pd.to_datetime('2026-09-30 23:59:59')
    open_tickets['age_days'] = (snapshot_date - open_tickets['created_at']).dt.total_seconds() / (24*3600.0)
    print("Open tickets count:", len(open_tickets))
    print("Open tickets age in days:")
    print(open_tickets['age_days'].describe(percentiles=[0.25, 0.5, 0.75, 0.9]))
    print("\nOpen tickets by status:")
    print(open_tickets['status'].value_counts())
    print("\nOpen tickets by priority:")
    print(open_tickets['priority'].value_counts())
    print("\nOpen tickets by is_escalated:")
    print(open_tickets['is_escalated'].value_counts())
    print("\nOpen tickets by category:")
    print(open_tickets['category'].value_counts())

if __name__ == '__main__':
    run_eda()
