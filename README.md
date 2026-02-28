# Substack Digest

AI-powered daily digest of your Substack subscriptions. Fetches articles, summarizes them with Gemini, extracts stock pitches into a watchlist, and delivers everything through a web UI or email.

Runs as a **web app** (FastAPI + React + Postgres) or as a **standalone CLI**.

## How it works

1. Authenticates with Substack using your session cookie
2. Fetches the latest posts from every newsletter you subscribe to
3. Retrieves full article content (including paid posts you have access to)
4. Summarizes each article into bullet points using Google Gemini
5. Extracts stock pitches and tracks price performance over time
6. Serves everything through a web dashboard with scheduled background jobs

## Project structure

```
app/
  main.py              FastAPI entry point
  cli.py               CLI entry point
  config.py            Settings (env vars)
  database.py          Async SQLAlchemy
  models.py            ORM models
  scheduler.py         Background jobs (daily digest, monthly watchlist, weekly prices)
  client/              Substack API client
  services/            External service wrappers (Gemini, Resend, yfinance)
  core/                Standalone pipelines for CLI (digest, watchlist)
  api/
    routers/           FastAPI route handlers
    schemas/           Pydantic request/response models
    services/          DB-aware orchestration layer
  templates/           Email templates

web/                   React + TypeScript + Tailwind frontend
```

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (package manager)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (for the web app)
- A [Substack](https://substack.com) account with subscriptions
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)
- Optionally: a [Resend](https://resend.com) API key + verified domain (for email delivery via CLI)

## Getting your Substack session cookie

1. Log into [substack.com](https://substack.com) in your browser
2. Open DevTools (`F12`) > **Application** > **Cookies** > `https://substack.com`
3. Copy the value of `substack.sid`

---

## Option A: Web App (Docker Compose)

The full-stack app runs three containers: Postgres, FastAPI API, and an nginx-served React frontend.

### 1. Start the stack

```bash
docker compose up --build
```

This will:
- Start Postgres on port 5432
- Run Alembic migrations to create the database schema
- Start the FastAPI server on port 8000
- Build and serve the React frontend on port 5173

### 2. Configure settings

Open [http://localhost:5173/settings](http://localhost:5173/settings) and enter:

- **Substack Session ID** -- your `substack.sid` cookie value
- **Gemini API Key** -- from Google AI Studio
- **Resend API Key** -- (optional, only needed for email delivery)
- **Email From / To** -- (optional, only needed for email delivery)

Click **Save Settings**.

### 3. Generate your first digest

On the Settings page, click **Generate Digest**. The job runs in the background -- after a minute or two, navigate to [http://localhost:5173](http://localhost:5173) to see it.

### 4. Build the stock watchlist

On the Settings page, set the months field (e.g. `12` for a full year backfill) and click **Build Watchlist**. This screens all your paid subscription articles for stock pitches and looks up historical + current prices.

View results at [http://localhost:5173/watchlist](http://localhost:5173/watchlist).

### 5. Scheduled jobs (automatic)

Once configured, these jobs run automatically:

| Job | Schedule | What it does |
|-----|----------|--------------|
| Daily Digest | Every day at 7:00 AM UTC | Generates a digest from the last 24h of posts |
| Monthly Watchlist | 1st of each month at 8:00 AM UTC | Extracts new pitches from the last month |
| Weekly Price Refresh | Every Monday at 9:00 AM UTC | Updates current prices for all watchlist entries |

### API endpoints

All endpoints are available at `http://localhost:8000`:

```
GET    /api/health               Health check
GET    /api/digests               List digests (paginated)
GET    /api/digests/latest        Latest digest with articles
GET    /api/digests/{id}          Single digest with articles
GET    /api/watchlist             Watchlist entries (sortable)
POST   /api/watchlist/refresh     Trigger price refresh
POST   /api/jobs/digest           Trigger digest generation
POST   /api/jobs/watchlist?months=12  Trigger watchlist extraction
GET    /api/settings              Get settings (keys masked)
PUT    /api/settings              Update settings
```

---

## Option B: CLI (standalone, no Docker needed)

The CLI works without Postgres -- it reads credentials from environment variables and outputs to email or console.

### 1. Install

```bash
git clone <repo-url>
cd substack-digest
uv sync
```

### 2. Configure environment

Create a `.envrc` file (or export the variables however you prefer):

```bash
export SUBSTACK_SID=your_substack_sid_cookie_value
export GEMINI_API_KEY=your_gemini_api_key
export RESEND_API_KEY=your_resend_api_key
export EMAIL_FROM=digest@yourdomain.com
export EMAIL_TO=you@example.com
```

If using [direnv](https://direnv.net/):

```bash
direnv allow
```

### 3. Run

```bash
# Verify your auth works
uv run substack-digest --list-subs

# Dry run -- fetch + summarize, print to console (no email sent)
uv run substack-digest --dry-run

# Full run -- fetch, summarize, and send email
uv run substack-digest

# Custom time window (e.g. last 3 days)
uv run substack-digest --hours 72

# Include free subscriptions too (default: paid only)
uv run substack-digest --dry-run --all

# Build stock watchlist from last 12 months of paid articles
uv run substack-digest --build-watchlist --months 12
```

### 4. Automate with cron

Run daily at 8 AM:

```bash
crontab -e
```

```cron
0 8 * * * cd /path/to/substack-digest && direnv exec . uv run substack-digest >> /tmp/substack-digest.log 2>&1
```

---

## Development

### Run the API locally (without Docker)

You need a running Postgres instance. Set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/substack_digest
```

Run migrations and start the server:

```bash
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### Run the frontend locally

```bash
cd web
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:8000`.

### Testing the full stack locally

1. **Start Postgres** (use Docker or a local install):
   ```bash
   docker compose up db
   ```

2. **Run migrations + API** in one terminal:
   ```bash
   export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/substack_digest
   uv run alembic upgrade head
   uv run uvicorn app.main:app --reload
   ```

3. **Run the frontend** in another terminal:
   ```bash
   cd web && npm run dev
   ```

4. **Open** [http://localhost:5173](http://localhost:5173)

5. **Configure** settings at [http://localhost:5173/settings](http://localhost:5173/settings)

6. **Test the API directly** with curl:
   ```bash
   # Health check
   curl http://localhost:8000/api/health

   # Get settings
   curl http://localhost:8000/api/settings

   # Update settings
   curl -X PUT http://localhost:8000/api/settings \
     -H "Content-Type: application/json" \
     -d '{"substack_sid": "your_sid", "gemini_api_key": "your_key"}'

   # Trigger digest generation
   curl -X POST http://localhost:8000/api/jobs/digest

   # Trigger watchlist build (12-month backfill)
   curl -X POST "http://localhost:8000/api/jobs/watchlist?months=12"

   # List digests
   curl http://localhost:8000/api/digests

   # Get latest digest
   curl http://localhost:8000/api/digests/latest

   # List watchlist
   curl http://localhost:8000/api/watchlist

   # Refresh prices
   curl -X POST http://localhost:8000/api/watchlist/refresh
   ```

7. **Verify the CLI still works**:
   ```bash
   uv run substack-digest --help
   uv run substack-digest --list-subs
   uv run substack-digest --dry-run
   ```

---

## End-to-end verification checklist

- [ ] `docker compose up --build` starts all three services without errors
- [ ] Navigate to Settings, enter API keys, click Save
- [ ] Click "Generate Digest" -- digest appears on the home page after processing
- [ ] Click "Build Watchlist" with 12 months -- watchlist table populates
- [ ] Browse between past digests in the archive sidebar
- [ ] Click article links -- opens original Substack posts in a new tab
- [ ] Watchlist shows price changes with green/red color coding
- [ ] CLI still works: `uv run substack-digest --dry-run`

## License

[MIT](LICENSE)
