"""
SupportDesk - Secure Dataset Ingestion Script
Imports tickets from a validated CSV into the SupportDesk database.
Ensures zero data duplication and provides clean schema translation.
"""

import os
import sys
import argparse
from datetime import datetime
import pandas as pd

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, Base, SessionLocal
from app.models import Ticket, TicketTimeline, utc_now

EXPECTED_COLUMNS = [
    'ticket_id', 'created_at', 'channel', 'client_id', 'client_name',
    'client_tier', 'category', 'priority', 'description', 'assigned_agent',
    'first_response_at', 'escalated_to_eng', 'eng_ticket_id', 'eng_handoffs',
    'eng_outcome', 'status', 'first_closed_at', 'final_closed_at',
    'reopen_count', 'csat_score'
]

def parse_date(val):
    if pd.isna(val) or val is None or str(val).strip() == '':
        return None
    try:
        return pd.to_datetime(val).to_pydatetime()
    except Exception:
        return None

def import_tickets_from_csv(csv_path: str):
    if not os.path.exists(csv_path):
        print(f"[ERROR] Source file not found: {csv_path}")
        sys.exit(1)

    print(f"[INFO] Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    print(f"[INFO] Reading CSV file: {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"[INFO] Total rows in CSV: {len(df)}")

    # Verify required columns
    missing_cols = [c for c in EXPECTED_COLUMNS if c not in df.columns]
    if missing_cols:
        print(f"[ERROR] Missing required columns: {missing_cols}")
        sys.exit(1)

    db = SessionLocal()
    imported_count = 0
    updated_count = 0
    skipped_count = 0

    try:
        for idx, row in df.iterrows():
            ticket_id = str(row['ticket_id']).strip()
            if not ticket_id:
                skipped_count += 1
                continue

            created_at = parse_date(row['created_at'])
            if not created_at:
                skipped_count += 1
                continue

            # Standardize boolean
            raw_esc = str(row['escalated_to_eng']).strip().lower()
            escalated_to_eng = raw_esc in ['yes', 'true', '1']

            first_response = parse_date(row['first_response_at'])
            first_closed = parse_date(row['first_closed_at'])
            final_closed = parse_date(row['final_closed_at'])

            csat = None
            if not pd.isna(row['csat_score']) and str(row['csat_score']).strip() != '':
                try:
                    csat = float(row['csat_score'])
                except ValueError:
                    csat = None

            handoffs = 0
            if not pd.isna(row['eng_handoffs']):
                try:
                    handoffs = int(row['eng_handoffs'])
                except ValueError:
                    handoffs = 0

            reopens = 0
            if not pd.isna(row['reopen_count']):
                try:
                    reopens = int(row['reopen_count'])
                except ValueError:
                    reopens = 0

            eng_ticket_id = None if pd.isna(row['eng_ticket_id']) else str(row['eng_ticket_id']).strip()
            eng_outcome = None if pd.isna(row['eng_outcome']) else str(row['eng_outcome']).strip()

            existing_ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()

            if existing_ticket:
                # Update existing
                existing_ticket.channel = str(row['channel']).strip()
                existing_ticket.client_id = str(row['client_id']).strip()
                existing_ticket.client_name = str(row['client_name']).strip()
                existing_ticket.client_tier = str(row['client_tier']).strip()
                existing_ticket.category = str(row['category']).strip()
                existing_ticket.priority = str(row['priority']).strip()
                existing_ticket.description = str(row['description']).strip()
                existing_ticket.assigned_agent = str(row['assigned_agent']).strip()
                existing_ticket.first_response_at = first_response
                existing_ticket.escalated_to_eng = escalated_to_eng
                existing_ticket.eng_ticket_id = eng_ticket_id
                existing_ticket.eng_handoffs = handoffs
                existing_ticket.eng_outcome = eng_outcome
                existing_ticket.status = str(row['status']).strip()
                existing_ticket.first_closed_at = first_closed
                existing_ticket.final_closed_at = final_closed
                existing_ticket.reopen_count = reopens
                existing_ticket.csat_score = csat
                updated_count += 1
            else:
                new_ticket = Ticket(
                    ticket_id=ticket_id,
                    created_at=created_at,
                    channel=str(row['channel']).strip(),
                    client_id=str(row['client_id']).strip(),
                    client_name=str(row['client_name']).strip(),
                    client_tier=str(row['client_tier']).strip(),
                    category=str(row['category']).strip(),
                    priority=str(row['priority']).strip(),
                    description=str(row['description']).strip(),
                    assigned_agent=str(row['assigned_agent']).strip(),
                    first_response_at=first_response,
                    escalated_to_eng=escalated_to_eng,
                    eng_ticket_id=eng_ticket_id,
                    eng_handoffs=handoffs,
                    eng_outcome=eng_outcome,
                    status=str(row['status']).strip(),
                    first_closed_at=first_closed,
                    final_closed_at=final_closed,
                    reopen_count=reopens,
                    csat_score=csat,
                    internal_notes=None,
                    investigation_completed=False,
                    escalation_ready=False
                )
                db.add(new_ticket)
                
                # Add creation timeline event
                timeline_entry = TicketTimeline(
                    ticket_id=ticket_id,
                    actor="System Ingestion",
                    event_type="INGESTED",
                    message=f"Ticket {ticket_id} ingested via {new_ticket.channel} from client {new_ticket.client_name}.",
                    created_at=created_at
                )
                db.add(timeline_entry)
                imported_count += 1

            if (idx + 1) % 250 == 0:
                db.commit()
                print(f"[INFO] Processed {idx + 1} / {len(df)} records...")

        db.commit()
        print("\n=== INGESTION SUMMARY ===")
        print(f"Total Rows Processed: {len(df)}")
        print(f"New Tickets Imported: {imported_count}")
        print(f"Existing Tickets Updated: {updated_count}")
        print(f"Skipped / Invalid Rows: {skipped_count}")
        print(f"Database Total Tickets: {db.query(Ticket).count()}")
        print("=========================\n")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Ingestion failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest RideOps tickets CSV into SupportDesk database.")
    parser.add_argument(
        "--file", 
        type=str, 
        default="reference/rideops_support_tickets.csv",
        help="Path to the tickets CSV file"
    )
    args = parser.parse_args()
    import_tickets_from_csv(args.file)
