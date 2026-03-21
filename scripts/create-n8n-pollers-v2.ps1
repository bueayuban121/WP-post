param(
  [string]$ApiKey
)

$ErrorActionPreference = "Stop"

$apiKey = if ($ApiKey) { $ApiKey } elseif ($env:N8N_API_KEY) { $env:N8N_API_KEY } else { throw "Missing ApiKey" }
$headers = @{
  "X-N8N-API-KEY" = $apiKey
  "Content-Type"  = "application/json"
}

$baseUrl = "https://n8n-ncdn.srv1455358.hstgr.cloud/api/v1/workflows"

function New-PollerJson {
  param(
    [string]$Name,
    [string]$ClaimUrl,
    [string]$BridgeUrl,
    [string]$ScheduleId,
    [string]$ScheduleName,
    [string]$ClaimId,
    [string]$ClaimName,
    [string]$PrepId,
    [string]$PrepName,
    [string]$TriggerId,
    [string]$TriggerName
  )

  @"
{
  "name": "$Name",
  "nodes": [
    {
      "id": "$ScheduleId",
      "name": "$ScheduleName",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [260, 300],
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 1
            }
          ]
        }
      }
    },
    {
      "id": "$ClaimId",
      "name": "$ClaimName",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [560, 300],
      "parameters": {
        "url": "$ClaimUrl",
        "method": "POST",
        "options": {
          "timeout": 60000
        }
      }
    },
    {
      "id": "$PrepId",
      "name": "$PrepName",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [860, 300],
      "parameters": {
        "jsCode": "const input = \$input.first().json;\nif (!input.job || !input.event) {\n  return [];\n}\nreturn [{ json: input }];"
      }
    },
    {
      "id": "$TriggerId",
      "name": "$TriggerName",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1160, 300],
      "parameters": {
        "url": "$BridgeUrl",
        "method": "POST",
        "contentType": "json",
        "specifyBody": "json",
        "sendBody": true,
        "jsonBody": "={{ \$json }}",
        "options": {
          "timeout": 120000
        }
      }
    }
  ],
  "connections": {
    "$ScheduleName": {
      "main": [
        [
          {
            "node": "$ClaimName",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "$ClaimName": {
      "main": [
        [
          {
            "node": "$PrepName",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "$PrepName": {
      "main": [
        [
          {
            "node": "$TriggerName",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "availableInMCP": false,
    "saveExecutionProgress": true,
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "saveDataSuccessExecution": "all",
    "callerPolicy": "workflowsFromSameOwner",
    "saveDataErrorExecution": "all"
  }
}
"@
}

$payloads = @(
  (New-PollerJson -Name "SEO Content Research Poller V2" -ClaimUrl "https://wp-post.srv1455358.hstgr.cloud/api/n8n/claim/research" -BridgeUrl "https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content/research" -ScheduleId "schedule_research_v2" -ScheduleName "Research Queue Poller V2" -ClaimId "claim_research_job_v2" -ClaimName "Claim Research Job V2" -PrepId "prepare_research_payload_v2" -PrepName "Prepare Research Payload V2" -TriggerId "trigger_research_bridge_v2" -TriggerName "Trigger Research Bridge V2"),
  (New-PollerJson -Name "SEO Content Brief Poller V2" -ClaimUrl "https://wp-post.srv1455358.hstgr.cloud/api/n8n/claim/brief" -BridgeUrl "https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content/brief" -ScheduleId "schedule_brief_v2" -ScheduleName "Brief Queue Poller V2" -ClaimId "claim_brief_job_v2" -ClaimName "Claim Brief Job V2" -PrepId "prepare_brief_payload_v2" -PrepName "Prepare Brief Payload V2" -TriggerId "trigger_brief_bridge_v2" -TriggerName "Trigger Brief Bridge V2"),
  (New-PollerJson -Name "SEO Content Draft Poller V2" -ClaimUrl "https://wp-post.srv1455358.hstgr.cloud/api/n8n/claim/draft" -BridgeUrl "https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content/draft" -ScheduleId "schedule_draft_v2" -ScheduleName "Draft Queue Poller V2" -ClaimId "claim_draft_job_v2" -ClaimName "Claim Draft Job V2" -PrepId "prepare_draft_payload_v2" -PrepName "Prepare Draft Payload V2" -TriggerId "trigger_draft_bridge_v2" -TriggerName "Trigger Draft Bridge V2")
)

foreach ($payload in $payloads) {
  $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $payload
  Write-Output "$($response.id)|$($response.name)"
}
