# n8n Research Workflow

This project already sends a webhook from the app to:

- `${N8N_WEBHOOK_BASE_URL}/research`

It expects n8n to call back to:

- `POST ${APP_BASE_URL}/api/n8n/callback`

## Incoming payload from the app

The trigger payload includes:

- `eventId`
- `jobId`
- `type`
- `client`
- `seedKeyword`
- `selectedIdeaId`
- `job`
- `callbackUrl`
- `callbackSecret`

The selected topic is available inside:

- `job.ideas`
- `job.selectedIdeaId`

## Recommended n8n node flow

1. `Webhook`
   Path: `seo-content/research`

2. `Code`
   Find the selected idea from `job.ideas` using `selectedIdeaId`

3. `Set`
   Build a compact object for prompting:
   - client
   - seedKeyword
   - selectedIdea.title
   - selectedIdea.angle
   - selectedIdea.relatedKeywords

4. `LLM / OpenAI`
   Use the prompt template from:
   - [src/lib/n8n-research-template.ts](C:\Users\bueay\Documents\New%20project\src\lib\n8n-research-template.ts)

5. `Structured Output Parser`
   Normalize the LLM result to:
   - `objective`
   - `audience`
   - `gaps`
   - `sources[]`

6. `HTTP Request`
   POST back to `callbackUrl`
   Headers:
   - `Content-Type: application/json`
   - `x-callback-secret: {{ $json.callbackSecret }}`

7. Callback body:

```json
{
  "eventId": "{{ $json.eventId }}",
  "jobId": "{{ $json.jobId }}",
  "type": "research",
  "status": "succeeded",
  "workflowRunId": "{{ $execution.id }}",
  "message": "Research workflow completed in n8n.",
  "stage": "researching",
  "payload": {
    "provider": "n8n",
    "executionId": "{{ $execution.id }}"
  },
  "research": {
    "objective": "string",
    "audience": "string",
    "gaps": ["string"],
    "sources": [
      {
        "region": "TH",
        "title": "string",
        "source": "string",
        "insight": "string"
      }
    ]
  }
}
```

## Failure callback

If the workflow fails after the webhook starts, send:

```json
{
  "eventId": "{{ $json.eventId }}",
  "jobId": "{{ $json.jobId }}",
  "type": "research",
  "status": "failed",
  "workflowRunId": "{{ $execution.id }}",
  "message": "Research workflow failed in n8n."
}
```
