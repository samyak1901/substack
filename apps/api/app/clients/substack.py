import asyncio
import logging
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BASE_URL = "https://substack.com/api/v1"
REQUEST_DELAY = 0.5


class SubstackClient:
    def __init__(self, session_token: str):
        self._token = session_token
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                cookies={"substack.sid": self._token},
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                    ),
                    "Accept": "application/json",
                },
                timeout=30.0,
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self.close()

    async def get_subscriptions(self) -> dict:
        client = await self._get_client()
        resp = await client.get(f"{BASE_URL}/subscriptions")
        resp.raise_for_status()
        return resp.json()

    async def get_recent_posts(
        self, since_hours: int = 24, all_subs: bool = False
    ) -> list[dict]:
        cutoff = datetime.now(UTC) - timedelta(hours=since_hours)
        data = await self.get_subscriptions()

        subscriptions = data.get("subscriptions", [])
        publications = {p["id"]: p for p in data.get("publications", [])}

        all_posts: list[dict] = []
        client = await self._get_client()

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
                await asyncio.sleep(REQUEST_DELAY)
                try:
                    resp = await client.get(
                        url, params={"sort": "new", "offset": offset, "limit": limit}
                    )
                    resp.raise_for_status()
                    posts = resp.json()

                    if not isinstance(posts, list):
                        posts = posts.get("posts", posts.get("items", []))

                    if not posts:
                        break

                    added_in_batch = 0
                    oldest_in_batch = datetime.now(UTC)

                    for post in posts:
                        post_date = parse_date(
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

                    if oldest_in_batch < cutoff or len(posts) < limit:
                        break

                    offset += limit
                except httpx.HTTPError as e:
                    logger.warning(f"  {pub_name}: failed to fetch archive offset {offset} ({e})")
                    break

            if count > 0:
                logger.info(f"  {pub_name}: {count} new post(s) found")

        all_posts.sort(
            key=lambda p: parse_date(p.get("post_date", ""))
            or datetime.min.replace(tzinfo=UTC),
            reverse=True,
        )
        return all_posts

    async def get_post_content(self, post: dict) -> str | None:
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
                client = await self._get_client()
                await asyncio.sleep(REQUEST_DELAY)
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                body_html = data.get("body_html", "")
                if body_html:
                    return html_to_text(body_html)
                truncated = data.get("truncated_body_text", "")
                if truncated:
                    return truncated
            except httpx.HTTPError as e:
                logger.warning(f"Failed to fetch post content from {url}: {e}")

        body_html = post.get("body_html", "")
        if body_html:
            return html_to_text(body_html)

        return post.get("truncated_body_text") or post.get("description")


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    lines = [line for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def parse_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        logger.warning(f"Could not parse date: {date_str}")
        return None


def extract_author(post: dict) -> str:
    bylines = post.get("publishedBylines") or post.get("bylines") or []
    if bylines:
        return bylines[0].get("name", "Unknown")
    return "Unknown"
