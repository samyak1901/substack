# Substack Digest

AI-powered daily digest of your Substack subscriptions. Summarizes articles with Gemini, extracts stock pitches into a watchlist, and serves everything through a web dashboard.

## Structure

```
apps/
  api/          Python backend — FastAPI, SQLAlchemy, Postgres
  web/          React + TypeScript + Tailwind frontend
```

Turborepo monorepo with Bun workspaces. Python tooling via uv + ruff.

## Prerequisites

- [Bun](https://bun.sh), [Python 3.12+](https://www.python.org/), [uv](https://docs.astral.sh/uv/), [Docker](https://docs.docker.com/get-docker/)
- [Substack](https://substack.com) account with subscriptions
- [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)

## Getting your Substack session cookie

Log into [substack.com](https://substack.com) → DevTools (`F12`) → **Application** → **Cookies** → copy `substack.sid`.

## Running with Docker

```bash
bun install
cp .env.example .env   # fill in your keys
bun run docker:up      # starts Postgres + API + frontend
```

- Frontend: http://localhost:3000
- API: http://localhost:8000

Go to [Settings](http://localhost:3000/settings), enter your API keys, and trigger a digest or watchlist build.

To stop: `bun run docker:down`

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

### Docker dev mode (hot reload in containers)

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
GET    /api/digests
GET    /api/digests/latest
GET    /api/digests/{id}
GET    /api/watchlist
POST   /api/watchlist/refresh
POST   /api/jobs/digest
POST   /api/jobs/watchlist?months=12
GET    /api/settings
PUT    /api/settings
```

## Scheduled jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Digest | 7:00 AM UTC | Digest from last 24h of posts |
| Monthly Watchlist | 1st of month, 8:00 AM UTC | Extract new stock pitches |
| Weekly Prices | Monday, 9:00 AM UTC | Refresh watchlist prices |

## License

[MIT](LICENSE)
