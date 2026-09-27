import argparse
import os
import sys
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.backend.database import SessionLocal
from src.backend.services.recruitment_retention import purge_expired_recruitment_data


def main():
    parser = argparse.ArgumentParser(description="Purge expired recruitment data according to organization policy.")
    parser.add_argument("--organization-id", required=True, help="Organization ID to purge data for.")
    parser.add_argument("--now", required=False, default=None, help="Optional ISO-8601 timestamp to use as 'now'.")
    args = parser.parse_args()

    now = None
    if args.now:
        try:
            now = datetime.fromisoformat(args.now)
            if now.tzinfo is None:
                now = now.replace(tzinfo=timezone.utc)
        except ValueError as e:
            print(f"Invalid --now timestamp format: {e}", file=sys.stderr)
            sys.exit(1)

    db = SessionLocal()
    try:
        result = purge_expired_recruitment_data(db, organization_id=args.organization_id, now=now)
        print(f"Redacted applications: {result.redacted_applications}")
        print(f"Deleted segments: {result.deleted_segments}")
        print(f"Candidate PII cleared: {result.candidate_pii_cleared}")
    except Exception as e:
        print(f"Error purging recruitment data: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
