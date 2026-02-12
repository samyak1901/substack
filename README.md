# Substack Digest

AI-powered daily digest of your Substack subscriptions. Fetches articles from all newsletters you follow, summarizes them with Gemini, and delivers a clean email digest.

## How it works

1. Authenticates with Substack using your session cookie
2. Fetches the latest posts from every newsletter you subscribe to
3. Retrieves full article content (including paid posts you have access to)
4. Summarizes each article into bullet points using Google Gemini
5. Sends a formatted HTML email digest via Resend

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (package manager)
- [direnv](https://direnv.net/) (environment variable management)
- A [Substack](https://substack.com) account with subscriptions
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)
- A [Resend](https://resend.com) API key + verified domain (for sending emails)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/substack-digest.git
cd substack-digest
uv sync
```

### 2. Configure environment

```bash
cp .envrc.template .envrc
```

Edit `.envrc` with your values:

```bash
export SUBSTACK_SID=your_substack_sid_cookie_value
export GEMINI_API_KEY=your_gemini_api_key
export RESEND_API_KEY=your_resend_api_key
export EMAIL_FROM=digest@yourdomain.com
export EMAIL_TO=you@example.com,friend@example.com
```

Then allow direnv to load it:

```bash
direnv allow
```

### 3. Get your Substack session cookie

1. Log into [substack.com](https://substack.com) in your browser
2. Open DevTools (`F12`) → **Application** → **Cookies** → `https://substack.com`
3. Copy the value of `substack.sid`

## Usage

```bash
# Verify your auth works
uv run substack-digest --list-subs

# Dry run — fetch + summarize, print to console (no email sent)
uv run substack-digest --dry-run

# Full run — fetch, summarize, and send email
uv run substack-digest

# Custom time window (e.g. last 3 days)
uv run substack-digest --hours 72
```

You can also run it as a module:

```bash
uv run python -m substack_digest --list-subs
```

## Automate with cron

Run daily at 8 AM:

```bash
crontab -e
```

```cron
0 8 * * * cd /home/samyak/Personal/substack && direnv exec . /home/samyak/.local/bin/uv run substack-digest >> /tmp/substack-digest.log 2>&1
```

## License

[MIT](LICENSE)
