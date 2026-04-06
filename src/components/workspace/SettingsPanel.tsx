import * as React from "react"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Input } from "@/components/ui/input"

export const tonePresets = [
  "Calm expert",
  "Premium editorial",
  "Friendly educator",
  "Confident conversion",
  "Luxury minimal",
  "Technical authority",
  "Warm lifestyle",
  "Bold campaign"
] as const

interface SettingsPanelProps {
  tone: string
  setTone: (val: string) => void
  bannedWords: string
  setBannedWords: (val: string) => void
  articleLength: string
  setArticleLength: (val: string) => void
  imageCount: string
  setImageCount: (val: string) => void
}

const selectClassName =
  "flex h-11 w-full rounded-[18px] border border-white/10 bg-[#0f1722]/88 px-4 py-2 text-sm text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_34px_rgba(2,6,23,0.18)] backdrop-blur-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 focus-visible:ring-offset-0"

export function SettingsPanel({
  tone,
  setTone,
  bannedWords,
  setBannedWords,
  articleLength,
  setArticleLength,
  imageCount,
  setImageCount
}: SettingsPanelProps) {
  const isCustomTone = !tonePresets.includes(tone as (typeof tonePresets)[number])

  return (
    <GlassPanel id="settings-section" className="flex flex-col gap-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">Core Settings</span>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Content Defaults</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Tone</span>
          <small className="text-xs text-muted">Main editorial tone for the article.</small>
          <select
            className={selectClassName}
            style={{ colorScheme: "dark" }}
            value={isCustomTone ? "__custom__" : tone}
            onChange={(event) => setTone(event.target.value === "__custom__" ? "" : event.target.value)}
          >
            {tonePresets.map((preset) => (
              <option key={preset} value={preset} className="bg-slate-950 text-slate-100">
                {preset}
              </option>
            ))}
            <option value="__custom__" className="bg-slate-950 text-slate-100">
              Custom tone
            </option>
          </select>
          {isCustomTone ? (
            <Input
              placeholder="Define a custom tone for this client"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              className="mt-2 bg-background/50"
            />
          ) : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Restricted words</span>
          <small className="text-xs text-muted">Words or phrases the article should avoid.</small>
          <Input value={bannedWords} onChange={(event) => setBannedWords(event.target.value)} className="bg-background/50" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Target length</span>
          <small className="text-xs text-muted">Target word count for each article.</small>
          <Input
            value={articleLength}
            onChange={(event) => setArticleLength(event.target.value)}
            className="bg-background/50"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Image count</span>
          <small className="text-xs text-muted">Total images inside the article, including the featured image.</small>
          <select
            value={imageCount}
            onChange={(event) => setImageCount(event.target.value)}
            className={selectClassName}
            style={{ colorScheme: "dark" }}
          >
            <option value="1" className="bg-slate-950 text-slate-100">
              1 image
            </option>
            <option value="2" className="bg-slate-950 text-slate-100">
              2 images
            </option>
            <option value="3" className="bg-slate-950 text-slate-100">
              3 images
            </option>
            <option value="4" className="bg-slate-950 text-slate-100">
              4 images
            </option>
          </select>
        </label>
      </div>
    </GlassPanel>
  )
}
