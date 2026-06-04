# Signal Desk

AI-powered investment research workspace for Substack subscriptions. Signal Desk summarizes articles with Gemini, extracts stock pitches into a watchlist, generates stock research, tracks alerts, and serves everything through a web dashboard.

## Current status

- Product direction has moved from a simple Substack digest into an investment research workspace.
- Frontend, API, Postgres, migrations, stock profile endpoints, research endpoints, watchlist endpoints, and job progress streaming are working locally.
- Digest generation starts correctly and reports progress/failure through Server-Sent Events.
- If digest generation fails with Substack authentication, refresh `SUBSTACK_SID` from your browser cookies and restart the API container.
- Current known limitation: Substack cookie auth is fragile because `substack.sid` expires or can be rejected by Substack. The app now surfaces this clearly instead of appearing stuck.

## Structure

```
apps/
  api/          Python backend — FastAPI, SQLAlchemy, Postgres
  web/          React + TypeScript + Tailwind frontend
```

Turborepo monorepo with Bun workspaces. Python tooling via `uv` and `ruff`.

## Prerequisites

- [Bun](https://bun.sh), [Python 3.12+](https://www.python.org/), [uv](https://docs.astral.sh/uv/), [Docker](https://docs.docker.com/get-docker/)
- [Substack](https://substack.com) account with subscriptions
- [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)

## Environment

Create `.env` at the repo root:

```bash
cp .env.example .env
```

Required values:

```env
SUBSTACK_SID=your_substack_sid_cookie_value
GEMINI_API_KEY=your_gemini_api_key
FMP_API_KEY=your_fmp_api_key
POSTGRES_PASSWORD=postgres
```

### Getting your Substack session cookie

Log into [substack.com](https://substack.com) → DevTools (`F12`) → **Application** → **Cookies** → copy `substack.sid`.

If digest generation returns a Substack authentication error, repeat this step, update `.env`, and restart the API container:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart api
```

## Running everything together

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- Frontend: http://localhost:5173
- API: http://localhost:8000
- Postgres: localhost:5432

The dev compose setup runs migrations before starting the API.

Run in the background:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Stop everything:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Reset the local database:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

View logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

Useful health checks:

```bash
curl http://localhost:8000/api/health
curl http://localhost:5173/api/health
```

Expected health response:

```json
{"status":"ok","service":"signal-desk","version":"0.3.0"}
```

## Local development

```bash
bun install                     # root deps (turbo, workspace deps)
cd apps/api && uv sync && cd -  # python deps

docker compose up db -d         # start Postgres
bun run db:migrate              # run migrations
bun run dev                     # start API + frontend (hot reload via Turbo)
```

Frontend runs on http://localhost:5173 and proxies `/api` to http://localhost:8000.

Or start services individually:

```bash
# API
cd apps/api && uv run uvicorn app.main:app --reload

# Frontend
cd apps/web && bun run dev
```

### Docker dev mode via package scripts

```bash
bun run docker:dev
```

## Linting & type checking

```bash
bun run lint        # ESLint (frontend) via Turbo
bun run typecheck   # TypeScript via Turbo

# Python (from apps/api/)
uv run ruff check .
uv run ruff format .
```

If Bun is not installed locally, frontend checks can be run with npm:

```bash
npm run typecheck --workspace apps/web
npm run lint --workspace apps/web
npm run build --workspace apps/web
```

Backend tests:

```bash
cd apps/api
uv run pytest tests -q
```

## CLI (no Docker needed)

```bash
cd apps/api
uv run substack-digest --list-subs     # verify auth
uv run substack-digest --dry-run       # fetch + summarize, print to console
uv run substack-digest                 # full run
uv run substack-digest --hours 72      # custom time window
uv run substack-digest --dry-run --all # include free subscriptions
```

## API

```
GET    /api/health
GET    /api/setup/status
GET    /api/digests
GET    /api/digests/latest
GET    /api/digests/{id}
GET    /api/digests/search?q=AAPL
GET    /api/watchlist
PATCH  /api/watchlist/{ticker}
GET    /api/watchlist/alerts
POST   /api/watchlist/alerts/mark-read
GET    /api/jobs
POST   /api/jobs/digest
POST   /api/jobs/watchlist?weeks=4
POST   /api/jobs/price-refresh
GET    /api/jobs/{job_id}/progress
GET    /api/research
GET    /api/research/{ticker}
POST   /api/research/{ticker}/refresh
GET    /api/stock/dashboard/summary
GET    /api/stock/unified/search?q=AAPL
GET    /api/stock/search/tickers?q=AAPL
GET    /api/stock/{ticker}
GET    /api/stock/{ticker}/quarterly
GET    /api/stock/{ticker}/articles
GET    /api/stock/{ticker}/ai-analysis
POST   /api/stock/{ticker}/ai-analysis
POST   /api/stock/watchlist
DELETE /api/stock/watchlist/{ticker}
```

## Local smoke tests performed

The following have been verified locally against a clean Docker database:

- Frontend serves at http://localhost:5173
- API serves at http://localhost:8000
- Vite proxy works through http://localhost:5173/api/health
- Alembic migrations run from `001` through `006` on a clean database
- Core digest, watchlist, jobs, research, stock search, stock profile, and dashboard endpoints return successful responses
- Watchlist add, update, and remove flow works
- Digest job progress stream emits `running` and then either `completed` or `failed`

Current digest failure mode with stale cookies:

```txt
Substack authentication failed. Refresh SUBSTACK_SID from your browser cookies, update .env, and restart the API container.
```

## Scheduled jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Digest | 7:00 AM UTC | Digest from last 24h of posts |
| Weekly Watchlist | Weekly | Extract new stock pitches |
| Weekly Prices | Monday, 9:00 AM UTC | Refresh watchlist prices |

## License

[MIT](LICENSE)
