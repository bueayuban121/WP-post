# OpenClaw Bridge

Use this namespace when OpenClaw needs to drive the same `wp-post` pipeline as the webapp without using cookie-session routes.

Base rule:

- Human users use `/api/jobs/...`
- OpenClaw uses `/api/openclaw/...`
- Both reuse the same underlying engine in [`job-store.ts`](C:\Users\bueay\Documents\New%20project\src\lib\job-store.ts)

## Authentication

Send one of:

```http
Authorization: Bearer <OPENCLAW_BRIDGE_TOKEN>
```

or

```http
x-openclaw-token: <OPENCLAW_BRIDGE_TOKEN>
```

## Flow

1. Create job
2. Read ideas from the job
3. Select or edit one idea
4. Run `research`
5. Run `brief`
6. Run `draft`
7. Run `images`
8. Run `publish`

## Endpoints

### Create job

`POST /api/openclaw/jobs`

```json
{
  "client": "Noxxe",
  "seedKeyword": "วิธีเลือกทำเลร้านกาแฟในประเทศไทย"
}
```

### List jobs

`GET /api/openclaw/jobs?client=Noxxe&limit=10`

### Get job

`GET /api/openclaw/jobs/:jobId`

### Select or edit selected idea

`POST /api/openclaw/jobs/:jobId/ideas/select`

```json
{
  "ideaId": "idea_xxx",
  "title": "วิธีเลือกทำเลร้านกาแฟในประเทศไทยให้เหมาะกับลูกค้าเป้าหมาย",
  "angle": "เน้นการประเมินทราฟฟิก กลุ่มลูกค้า และความคุ้มค่าระยะยาว"
}
```

If `title` and `angle` are omitted, the route just selects the idea.

### Run pipeline steps

`POST /api/openclaw/jobs/:jobId/automation/research`

`POST /api/openclaw/jobs/:jobId/automation/brief`

`POST /api/openclaw/jobs/:jobId/automation/draft`

`POST /api/openclaw/jobs/:jobId/automation/images`

`POST /api/openclaw/jobs/:jobId/automation/publish`

## Response shape

Most bridge routes return:

```json
{
  "job": {},
  "event": {},
  "automation": {
    "mode": "webhook",
    "accepted": true,
    "message": "..."
  }
}
```

When a step is synchronous, the response still returns the updated `job` so OpenClaw can continue without asking the human UI.

## Separation rule

This bridge exists so OpenClaw does not:

- reuse browser session auth
- invent a second article/research pipeline
- drift away from the webapp result format

OpenClaw should orchestrate. `wp-post` should remain the source-of-truth engine.
