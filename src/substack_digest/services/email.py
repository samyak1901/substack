import logging
from pathlib import Path

import resend
from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def render_digest_html(date: str, overview: str, articles: list[dict]) -> str:
    """Render the digest email HTML from the Jinja2 template."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)
    template = env.get_template("digest_email.html")
    return template.render(date=date, overview=overview, articles=articles)


def send_digest_email(
    api_key: str,
    from_email: str,
    to_emails: list[str],
    date: str,
    html: str,
) -> bool:
    """Send the digest email via Resend. Returns True on success."""
    resend.api_key = api_key

    try:
        resend.Emails.send({
            "from": from_email,
            "to": to_emails,
            "subject": f"Your Substack Digest — {date}",
            "html": html,
        })
        logger.info(f"Digest email sent to {', '.join(to_emails)}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False
