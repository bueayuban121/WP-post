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
      <div className="flex flex-row justify-between items-start">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Step 1</span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">Create Project</h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          {statusMessage}
        </span>
      </div>

      <form className="flex flex-col gap-6" onSubmit={createProject}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Client account</span>
            <small className="text-muted text-xs">ชื่อโปรเจกต์หรือเว็บไซต์ปลายทาง</small>
            {currentUser.role === "client" ? (
              <Input disabled value={selectedClientAccount?.name ?? ""} className="bg-background/50 disabled:opacity-75" />
            ) : (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                {availableClientAccounts.length > 0 ? (
                  availableClientAccounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-background text-foreground">
                      {account.name}
                    </option>
                  ))
                ) : (
                  <option value="" className="bg-background text-foreground">No client accounts found</option>
                )}
              </select>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Seed keyword</span>
            <small className="text-muted text-xs">คีย์เวิร์ดตั้งต้นที่ใช้แตกคำ</small>
            <Input 
              value={seedKeyword} 
              onChange={(event) => setSeedKeyword(event.target.value)} 
              className="bg-background/50"
            />
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
