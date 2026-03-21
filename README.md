# SEO Content Pipeline Studio

This repository is scaffolded as a production-oriented MVP for a client workflow like:

1. Receive a seed keyword from the client.
2. Expand it into topic opportunities.
3. Let the client choose which angle to pursue.
4. Research Thai and global sources.
5. Build a content brief.
6. Generate a draft article.
7. Hand off approval and publishing through `n8n`.

## Current MVP surface

- Next.js 16 App Router
- TypeScript
- Prisma 7 schema and generated client
- API routes for jobs, idea selection, research, brief generation, and draft generation
- One dashboard page with a live form and API-backed pipeline state
- Fallback in-memory repository for local development before PostgreSQL is connected
- UI cues for where `n8n` should be connected later

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Render deployment

This repo is prepared for `Render app + VPS n8n`.

Files:

- [render.yaml](C:\Users\bueay\Documents\New%20project\render.yaml)
- [.env.local.example](C:\Users\bueay\Documents\New%20project\.env.local.example)

Recommended Render env vars:

- `DATABASE_URL`
- `DIRECT_URL`
- `APP_BASE_URL`
- `N8N_WEBHOOK_BASE_URL=https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content`
- `N8N_WEBHOOK_SECRET`
- `N8N_CALLBACK_SECRET`
- `N8N_POLLING_TYPES=publish`

Render commands used by this repo:

```bash
npm run render:build
npm run render:start
```

`render:start` runs Prisma deploy before starting Next.js so production migrations are applied on boot.
For Neon, use:

- `DATABASE_URL` = pooled connection string
- `DIRECT_URL` = direct non-pooled connection string for Prisma migrations

## VPS deployment

This repo also supports `VPS + Docker`, which fits your current setup well because `n8n` is already on the VPS.

Files:

- [Dockerfile](C:\Users\bueay\Documents\New%20project\Dockerfile)
- [docker-compose.app.yml](C:\Users\bueay\Documents\New%20project\docker-compose.app.yml)

Basic flow on the VPS:

```bash
git clone https://github.com/bueayuban121/WP-post.git
cd WP-post
cp .env.local.example .env
docker compose -f docker-compose.app.yml up -d --build
```

Recommended VPS env values:

- `DATABASE_URL=<Neon pooled URL>`
- `DIRECT_URL=<Neon direct URL>`
- `APP_BASE_URL=<your public app domain>`
- `N8N_WEBHOOK_BASE_URL=https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content`
- `N8N_CALLBACK_SECRET=<random secret>`
- `N8N_POLLING_TYPES=publish`
- `WORDPRESS_BASE_URL=<your WordPress root url>`
- `WORDPRESS_USERNAME=<your WordPress username>`
- `WORDPRESS_APP_PASSWORD=<your WordPress application password>`

## Database setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` to your PostgreSQL instance
3. Generate or refresh the Prisma client:

```bash
npx prisma generate
```

Until `DATABASE_URL` is configured, the app will keep using the in-memory repository so the MVP can still run.

### Local Postgres with Docker

```bash
npm run db:up
npm run prisma:migrate
npm run prisma:seed
```

Useful checks:

- `GET /api/health/db` shows whether the app is on PostgreSQL or memory fallback
- `GET /api/health/n8n` shows whether the app can trigger n8n and receive callbacks
- `npm run prisma:validate` validates the schema and config

## n8n integration contract

Trigger endpoints from the app:

- `POST /api/jobs/:jobId/automation/research`
- `POST /api/jobs/:jobId/automation/brief`
- `POST /api/jobs/:jobId/automation/draft`
- `POST /api/jobs/:jobId/automation/publish`

Each trigger creates a workflow event, then posts to:

- `${N8N_WEBHOOK_BASE_URL}/research`
- `${N8N_WEBHOOK_BASE_URL}/brief`
- `${N8N_WEBHOOK_BASE_URL}/draft`
- `${N8N_WEBHOOK_BASE_URL}/publish`

If a type is listed in `N8N_POLLING_TYPES`, the app will queue it for an n8n poller instead of calling the webhook directly. By default only `publish` is queued.

Poller claim endpoints:

- `POST /api/n8n/publish/claim`
- `POST /api/n8n/claim/research`
- `POST /api/n8n/claim/brief`
- `POST /api/n8n/claim/draft`
- `POST /api/n8n/claim/publish`

Expected n8n callback target:

- `POST /api/n8n/callback`

Recommended callback body:

```json
{
  "eventId": "evt_123",
  "jobId": "job_123",
  "type": "research",
  "status": "succeeded",
  "workflowRunId": "n8n-run-001",
  "message": "Research workflow completed",
  "stage": "researching",
  "payload": {
    "sourcesCollected": 8
  },
  "research": {
    "objective": "Research pack objective",
    "audience": "Target audience",
    "gaps": ["gap 1"],
    "sources": [
      {
        "region": "TH",
        "title": "Source title",
        "source": "Source name",
        "insight": "Summary"
      }
    ]
  }
}
```

If `N8N_WEBHOOK_BASE_URL` is missing, the app stays in local mode and records a failed automation event instead of calling an external webhook.
If `APP_BASE_URL` is missing or only points to a non-public local URL, the app also stays in local mode because n8n would have nowhere valid to send the callback.

Reference files:

- [docs/n8n-research-workflow.md](C:\Users\bueay\Documents\New%20project\docs\n8n-research-workflow.md)
- [docs/n8n-research-workflow.sample.json](C:\Users\bueay\Documents\New%20project\docs\n8n-research-workflow.sample.json)
- [src/lib/n8n-research-template.ts](C:\Users\bueay\Documents\New%20project\src\lib\n8n-research-template.ts)

## Recommended next implementation steps

1. Add authentication and client/project ownership rules.
2. Replace generated placeholder content with AI service calls.
3. Trigger `n8n` only after explicit approval steps.
4. Expand direct WordPress publishing to map categories, tags, and featured media per client.
5. Add Telegram notifications through `n8n`.

## Suggested architecture

- `web app`: human workflow and approvals
- `backend/API`: job orchestration and AI calls
- `database`: jobs, ideas, sources, briefs, drafts, publish state
- `n8n`: automation and publishing layer

## Why this flow

The client requirement is not "write an article immediately". It is:

- start from a broad keyword
- split it into useful subtopics
- let the client choose
- research before writing
- then produce structured, reviewable content

That is why this MVP is built around:

- ideation
- research
- briefing
- drafting
- publishing
