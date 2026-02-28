import logging
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BASE_URL = "https://substack.com/api/v1"
REQUEST_DELAY = 0.5  # seconds between requests to avoid throttling


class SubstackClient:
    def __init__(self, session_token: str):
        self.session = requests.Session()
        self.session.cookies.set("substack.sid", session_token, domain=".substack.com")
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json",
        })

    def get_subscriptions(self) -> dict:
        """Fetch the authenticated user's subscription list."""
        resp = self.session.get(f"{BASE_URL}/subscriptions")
        resp.raise_for_status()
        return resp.json()

    def get_recent_posts(self, since_hours: int = 24, all_subs: bool = False) -> list[dict]:
        """Fetch recent posts from subscribed publications.

        Iterates each subscription's archive endpoint for reliable results.
        If all_subs is False, only fetches from paid subscriptions.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
        data = self.get_subscriptions()

        subscriptions = data.get("subscriptions", [])
        publications = {p["id"]: p for p in data.get("publications", [])}

        all_posts = []
        for sub in subscriptions:
            is_paid = sub.get("membership_state", "") not in ("free_signup", "")
            if not all_subs and not is_paid:
                continue

            pub = publications.get(sub.get("publication_id"))
            if not pub:
                continue

            subdomain = pub.get("subdomain", "")
            custom_domain = pub.get("custom_domain")
            pub_name = pub.get("name", "Unknown")

            if not subdomain:
                continue

            host = custom_domain or f"{subdomain}.substack.com"
            url = f"https://{host}/api/v1/archive"

            offset = 0
            limit = 50
            count = 0
            while True:
                time.sleep(REQUEST_DELAY)
                try:
                    resp = self.session.get(url, params={"sort": "new", "offset": offset, "limit": limit})
                    resp.raise_for_status()
                    posts = resp.json()

                    if not isinstance(posts, list):
                        posts = posts.get("posts", posts.get("items", []))

                    if not posts:
                        break # No more posts

                    added_in_batch = 0
                    oldest_in_batch = datetime.now(timezone.utc)

                    for post in posts:
                        post_date = self._parse_date(
                            post.get("post_date") or post.get("published_at", "")
                        )
                        if post_date:
                            oldest_in_batch = min(oldest_in_batch, post_date)
                            if post_date >= cutoff:
                                post["_publication_name"] = pub_name
                                post["_publication_host"] = host
                                all_posts.append(post)
                                added_in_batch += 1

                    count += added_in_batch

                    # If the oldest post in this batch is older than our cutoff,
                    # or we didn't add any new ones, we can stop paginating this pub.
                    if oldest_in_batch < cutoff or len(posts) < limit:
                        break

                    offset += limit
                except requests.RequestException as e:
                    logger.warning(f"  {pub_name}: failed to fetch archive offset {offset} ({e})")
                    break

            if count > 0:
                logger.info(f"  {pub_name}: {count} new post(s) found")

        # Sort by date, newest first
        all_posts.sort(
            key=lambda p: self._parse_date(p.get("post_date", "")) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        return all_posts

    def get_post_content(self, post: dict) -> str | None:
        """Fetch full article content for a post and return as plain text."""
        slug = post.get("slug")
        host = post.get("_publication_host", "")
        canonical_url = post.get("canonical_url", "")

        if not host and canonical_url:
            parsed = urlparse(canonical_url)
            host = parsed.hostname or ""

        if not slug:
            logger.warning(f"Post missing slug: {post.get('title', 'unknown')}")
            return post.get("truncated_body_text") or post.get("description")

        if host:
            url = f"https://{host}/api/v1/posts/{slug}"
            try:
                time.sleep(REQUEST_DELAY)
                resp = self.session.get(url)
                resp.raise_for_status()
                data = resp.json()
                body_html = data.get("body_html", "")
                if body_html:
                    return self._html_to_text(body_html)
                truncated = data.get("truncated_body_text", "")
                if truncated:
                    return truncated
            except requests.RequestException as e:
                logger.warning(f"Failed to fetch post content from {url}: {e}")

        # Fallback: use whatever is in the archive item
        body_html = post.get("body_html", "")
        if body_html:
            return self._html_to_text(body_html)

        return post.get("truncated_body_text") or post.get("description")

    @staticmethod
    def _html_to_text(html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        lines = [line for line in text.splitlines() if line.strip()]
        return "\n".join(lines)

    @staticmethod
    def _parse_date(date_str: str) -> datetime | None:
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            logger.warning(f"Could not parse date: {date_str}")
            return None
