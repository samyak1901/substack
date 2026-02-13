import argparse
import logging
import sys

from substack_digest.client import SubstackClient
from substack_digest.config import settings
from substack_digest.core import generate_digest


def main():
    parser = argparse.ArgumentParser(description="Substack Daily Digest")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and summarize but don't send email")
    parser.add_argument("--list-subs", action="store_true", help="List your Substack subscriptions")
    parser.add_argument("--hours", type=int, default=24, help="Fetch articles from the last N hours (default: 24)")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    if args.list_subs:
        client = SubstackClient(settings.substack_sid)
        data = client.get_subscriptions()

        subscriptions = data.get("subscriptions", [])
        publications = {p["id"]: p for p in data.get("publications", [])}

        if not subscriptions:
            print("No subscriptions found.")
            sys.exit(1)

        print(f"\nYou have {len(subscriptions)} subscriptions:\n")
        for sub in subscriptions:
            pub = publications.get(sub.get("publication_id"), {})
            name = pub.get("name", "Unknown")
            subdomain = pub.get("subdomain", "")
            is_paid = sub.get("membership_state", "") not in ("free_signup", "")
            badge = " [PAID]" if is_paid else ""
            print(f"  - {name}{badge} ({subdomain}.substack.com)")
        return

    generate_digest(dry_run=args.dry_run, since_hours=args.hours)
