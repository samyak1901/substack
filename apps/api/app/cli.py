import argparse
import asyncio
import logging
import sys

from app.clients.substack import SubstackClient
from app.config import get_settings
from app.services.summarizer import Summarizer


async def _run_digest(since_hours: int, all_subs: bool) -> bool:
    s = get_settings()
    async with SubstackClient(s.substack_sid) as client:
        summarizer = Summarizer()

        logging.info(f"Fetching posts from subscriptions (last {since_hours}h)...")
        posts = await client.get_recent_posts(since_hours=since_hours, all_subs=all_subs)

        if not posts:
            logging.info("No new articles found.")
            return False

        logging.info(f"Found {len(posts)} articles. Summarizing...")

        article_summaries = []
        for i, post in enumerate(posts, 1):
            title = post.get("title", "Untitled")
            bylines = post.get("publishedBylines") or post.get("bylines") or []
            author = bylines[0].get("name", "Unknown") if bylines else "Unknown"
            publication = post.get("_publication_name", "")

            logging.info(f"  [{i}/{len(posts)}] {title} — {author} ({publication})")

            content = await client.get_post_content(post)
            summary = summarizer.summarize_article(title, author, content or "")

            article_summaries.append({
                "title": title,
                "author": author,
                "publication": publication,
                "url": post.get("canonical_url", ""),
                "raw_summary": summary,
            })

        logging.info("Generating daily overview...")
        overview = summarizer.generate_daily_overview(article_summaries)

        print(f"\n{'=' * 60}")
        print(f"  DIGEST — {len(article_summaries)} articles")
        print(f"{'=' * 60}\n")
        print(f"OVERVIEW: {overview}\n")
        for a in article_summaries:
            print(f"---\n{a['title']} — {a['author']}")
            if a["publication"]:
                print(f"  ({a['publication']})")
            print(f"  {a['url']}")
            print(f"\n{a['raw_summary']}\n")
        return True


async def _list_subs() -> None:
    s = get_settings()
    async with SubstackClient(s.substack_sid) as client:
        data = await client.get_subscriptions()

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


def main():
    parser = argparse.ArgumentParser(description="Substack Digest")
    parser.add_argument(
        "--list-subs", action="store_true", help="List your Substack subscriptions"
    )
    parser.add_argument(
        "--all", action="store_true", help="Include free subscriptions (default: paid only)"
    )
    parser.add_argument(
        "--hours", type=int, default=24, help="Fetch articles from the last N hours (default: 24)"
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    if args.list_subs:
        asyncio.run(_list_subs())
    else:
        asyncio.run(_run_digest(since_hours=args.hours, all_subs=args.all))
