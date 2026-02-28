import argparse
import logging
import sys

from app.client import SubstackClient
from app.config import get_settings
from app.core import generate_digest, generate_watchlist


def main():
    parser = argparse.ArgumentParser(description="Substack Digest")
    parser.add_argument("--list-subs", action="store_true", help="List your Substack subscriptions")
    parser.add_argument("--all", action="store_true", help="Fetch articles from all subscriptions (default: paid only)")
    parser.add_argument("--hours", type=int, default=24, help="Fetch articles from the last N hours (default: 24)")

    parser.add_argument("--build-watchlist", action="store_true", help="Extract a stock pitch watchlist from paid subscriptions")
    parser.add_argument("--months", type=int, default=12, help="Months of history to screen for the watchlist (default: 12)")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    if args.list_subs:
        client = SubstackClient(get_settings().substack_sid)
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

    if args.build_watchlist:
        generate_watchlist(months=args.months)
    else:
        generate_digest(since_hours=args.hours, all_subs=args.all)
