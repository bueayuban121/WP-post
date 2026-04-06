import * as React from "react"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Button } from "@/components/ui/button"
import type { WorkflowAutomationEvent } from "@/types/workflow"

interface QueueTabProps {
  queueCount: number
  queueEvents: WorkflowAutomationEvent[]
  automationLabels: Record<WorkflowAutomationEvent["status"], string>
  downloadDeliverable: (format: "markdown" | "json") => void
}

export function QueueTab({
  queueCount,
  queueEvents,
  automationLabels,
  downloadDeliverable
}: QueueTabProps) {
  return (
    <GlassPanel className="flex flex-col gap-6">
      <div className="flex flex-row justify-between items-start">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Step 4</span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">Queue & Logs</h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          {queueCount} active jobs
        </span>
      </div>

      <div className="border border-white/10 rounded-md overflow-hidden bg-background/30">
        <div className="grid grid-cols-4 px-4 py-3 bg-white/5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-white/10">
          <span>Action</span>
          <span>Status</span>
          <span>Source</span>
          <span>Updated</span>
        </div>
        <div className="flex flex-col divide-y divide-white/5">
          {queueEvents.length > 0 ? (
            queueEvents.map((event) => (
              <div key={event.id} className="grid grid-cols-4 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                <strong className="text-foreground capitalize">{event.type}</strong>
                <span className={
                  event.status === "succeeded" ? "text-success" : 
                  event.status === "failed" ? "text-destructive" : "text-accent"
                }>
                  {automationLabels[event.status]}
                </span>
                <span className="text-muted-foreground">{event.source.toUpperCase()}</span>
                <span className="text-muted-foreground">{new Date(event.updatedAt).toLocaleString("th-TH")}</span>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              ยังไม่มี queue event ในโปรเจกต์นี้
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Recent Event Logs</h3>
        <div className="flex flex-col gap-3">
          {queueEvents.slice(0, 4).map((event) => (
            <article key={`${event.id}-log`} className="flex flex-col gap-2 p-4 rounded-md bg-background/40 border border-white/5">
              <div className="flex flex-row justify-between items-center">
                <strong className="text-foreground text-sm uppercase tracking-wider">{event.type}</strong>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  event.status === "succeeded" ? "bg-success/10 text-success" : 
                  event.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                }`}>
                  {automationLabels[event.status]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.message || "ระบบยังไม่มีข้อความอธิบายเพิ่มเติมสำหรับงานนี้"}
              </p>
            </article>
          ))}
        </div>
      </div>
      
      <div className="flex flex-row gap-2 pt-2 border-t border-white/10">
        <Button variant="ghost" onClick={() => downloadDeliverable("markdown")}>
          Export MD
        </Button>
        <Button variant="ghost" onClick={() => downloadDeliverable("json")}>
          Export JSON
        </Button>
      </div>
    </GlassPanel>
  )
}
