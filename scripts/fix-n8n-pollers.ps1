param(
  [string]$ApiKey
)

$ErrorActionPreference = "Stop"

$apiKey = if ($ApiKey) { $ApiKey } elseif ($env:N8N_API_KEY) { $env:N8N_API_KEY } else { throw "Missing ApiKey" }
$baseUrl = "https://n8n-ncdn.srv1455358.hstgr.cloud/api/v1/workflows"
$headers = @{
  "X-N8N-API-KEY" = $apiKey
  "Content-Type"  = "application/json"
}

function New-PollerBody {
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

  return @{
    name = $Name
    nodes = @(
      @{
        id = $ScheduleId
        name = $ScheduleName
        type = "n8n-nodes-base.scheduleTrigger"
        typeVersion = 1.2
        position = @(260, 300)
        parameters = @{
          rule = @{
            interval = @(
              @{
                field = "minutes"
                minutesInterval = 1
              }
            )
          }
        }
      },
      @{
        id = $ClaimId
        name = $ClaimName
        type = "n8n-nodes-base.httpRequest"
        typeVersion = 4.2
        position = @(560, 300)
        parameters = @{
          url = $ClaimUrl
          method = "POST"
          options = @{
            timeout = 60000
          }
        }
      },
      @{
        id = $PrepId
        name = $PrepName
        type = "n8n-nodes-base.code"
        typeVersion = 2
        position = @(860, 300)
        parameters = @{
          jsCode = @'
const input = $input.first().json;
if (!input.job || !input.event) {
  return [];
}
return [{ json: input }];
'@
        }
      },
      @{
        id = $TriggerId
        name = $TriggerName
        type = "n8n-nodes-base.httpRequest"
        typeVersion = 4.2
        position = @(1160, 300)
        parameters = @{
          url = $BridgeUrl
          method = "POST"
          contentType = "json"
          specifyBody = "json"
          sendBody = $true
          jsonBody = "={{ `$json }}"
          options = @{
            timeout = 120000
          }
        }
      }
    )
    connections = @{
      $ScheduleName = @{
        main = @(
          @(
            @{
              node = $ClaimName
              type = "main"
              index = 0
            }
          )
        )
      }
      $ClaimName = @{
        main = @(
          @(
            @{
              node = $PrepName
              type = "main"
              index = 0
            }
          )
        )
      }
      $PrepName = @{
        main = @(
          @(
            @{
              node = $TriggerName
              type = "main"
              index = 0
            }
          )
        )
      }
    }
    settings = @{
      availableInMCP = $false
      saveExecutionProgress = $true
      executionOrder = "v1"
      saveManualExecutions = $true
      saveDataSuccessExecution = "all"
      callerPolicy = "workflowsFromSameOwner"
      saveDataErrorExecution = "all"
    }
  }
}

$defs = @(
  @{
    id = "waSRQHcM2fH2KiMQ"
    body = New-PollerBody `
      -Name "SEO Content Research Poller" `
      -ClaimUrl "https://wp-post.srv1455358.hstgr.cloud/api/n8n/claim/research" `
      -BridgeUrl "https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content/research" `
      -ScheduleId "schedule_research" `
      -ScheduleName "Research Queue Poller" `
      -ClaimId "claim_research_job" `
      -ClaimName "Claim Research Job" `
      -PrepId "prepare_research_payload" `
      -PrepName "Prepare Research Payload" `
      -TriggerId "trigger_research_bridge" `
      -TriggerName "Trigger Research Bridge"
  },
  @{
    id = "KEMRbn1OgJAlXYlq"
    body = New-PollerBody `
      -Name "SEO Content Brief Poller" `
      -ClaimUrl "https://wp-post.srv1455358.hstgr.cloud/api/n8n/claim/brief" `
      -BridgeUrl "https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content/brief" `
      -ScheduleId "schedule_brief" `
      -ScheduleName "Brief Queue Poller" `
      -ClaimId "claim_brief_job" `
      -ClaimName "Claim Brief Job" `
      -PrepId "prepare_brief_payload" `
      -PrepName "Prepare Brief Payload" `
      -TriggerId "trigger_brief_bridge" `
      -TriggerName "Trigger Brief Bridge"
  },
  @{
    id = "InTXMajNqylKC4TU"
    body = New-PollerBody `
      -Name "SEO Content Draft Poller" `
      -ClaimUrl "https://wp-post.srv1455358.hstgr.cloud/api/n8n/claim/draft" `
      -BridgeUrl "https://n8n-ncdn.srv1455358.hstgr.cloud/webhook/seo-content/draft" `
      -ScheduleId "schedule_draft" `
      -ScheduleName "Draft Queue Poller" `
      -ClaimId "claim_draft_job" `
      -ClaimName "Claim Draft Job" `
      -PrepId "prepare_draft_payload" `
      -PrepName "Prepare Draft Payload" `
      -TriggerId "trigger_draft_bridge" `
      -TriggerName "Trigger Draft Bridge"
  }
)

foreach ($def in $defs) {
  $json = $def.body | ConvertTo-Json -Depth 20
  Invoke-RestMethod -Uri "$baseUrl/$($def.id)" -Method Put -Headers $headers -Body $json | Out-Null
  Write-Host "Updated $($def.id)"
}
