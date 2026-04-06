import * as React from "react"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface AppUserSession {
  role: "admin" | "user" | "client"
  id: string
  clientId?: string
  clientName?: string
}

interface ProjectCreateFormProps {
  createProject: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  currentUser: any
  selectedClientId: string
  setSelectedClientId: (id: string) => void
  availableClientAccounts: Array<{ id: string; name: string }>
  selectedClientAccount: { id: string; name: string } | null
  seedKeyword: string
  setSeedKeyword: (val: string) => void
  isPending: boolean
  statusMessage: string
}

const selectClassName =
  "flex h-11 w-full rounded-[18px] border border-white/10 bg-[#0f1722]/88 px-4 py-2 text-sm text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_34px_rgba(2,6,23,0.18)] backdrop-blur-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 focus-visible:ring-offset-0"

export function ProjectCreateForm({
  createProject,
  currentUser,
  selectedClientId,
  setSelectedClientId,
  availableClientAccounts,
  selectedClientAccount,
  seedKeyword,
  setSeedKeyword,
  isPending,
  statusMessage
}: ProjectCreateFormProps) {
  return (
    <GlassPanel className="flex flex-col gap-6">
      <div className="flex flex-row items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Step 1</span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Create Project</h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          {statusMessage}
        </span>
      </div>

      <form className="flex flex-col gap-6" onSubmit={createProject}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Client account</span>
            <small className="text-xs text-muted">Choose the client or destination site for this workflow.</small>
            {currentUser.role === "client" ? (
              <Input disabled value={selectedClientAccount?.name ?? ""} className="bg-background/50 disabled:opacity-75" />
            ) : (
              <select
                className={selectClassName}
                style={{ colorScheme: "dark" }}
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                {availableClientAccounts.length > 0 ? (
                  availableClientAccounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-slate-950 text-slate-100">
                      {account.name}
                    </option>
                  ))
                ) : (
                  <option value="" className="bg-slate-950 text-slate-100">
                    No client accounts found
                  </option>
                )}
              </select>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Seed keyword</span>
            <small className="text-xs text-muted">Start with the main phrase you want the system to expand.</small>
            <Input value={seedKeyword} onChange={(event) => setSeedKeyword(event.target.value)} className="bg-background/50" />
          </label>
        </div>

        <div>
          <Button disabled={isPending} type="submit" variant="default">
            {isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </GlassPanel>
  )
}
