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
  const isCustomTone = !tonePresets.includes(tone as any)

  return (
    <GlassPanel id="settings-section" className="flex flex-col gap-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">Core Settings</span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">Content Defaults</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Tone</span>
          <small className="text-muted text-xs">โทนหลักของบทความ</small>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={isCustomTone ? "__custom__" : tone}
            onChange={(event) => setTone(event.target.value === "__custom__" ? "" : event.target.value)}
          >
            {tonePresets.map((preset) => (
              <option key={preset} value={preset} className="bg-background text-foreground">
                {preset}
              </option>
            ))}
            <option value="__custom__" className="bg-background text-foreground">Custom tone</option>
          </select>
          {isCustomTone && (
            <Input 
              placeholder="Define a custom tone for this client" 
              value={tone} 
              onChange={(event) => setTone(event.target.value)} 
              className="mt-2 bg-background/50"
            />
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Restricted words</span>
          <small className="text-muted text-xs">คำต้องห้ามหรือคำที่ไม่ต้องการให้ใช้</small>
          <Input 
            value={bannedWords} 
            onChange={(event) => setBannedWords(event.target.value)} 
            className="bg-background/50"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Target length</span>
          <small className="text-muted text-xs">จำนวนคำเป้าหมายของบทความ</small>
          <Input 
            value={articleLength} 
            onChange={(event) => setArticleLength(event.target.value)} 
            className="bg-background/50"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">Image count</span>
          <small className="text-muted text-xs">จำนวนรูปทั้งหมดในบทความ (รวม featured image)</small>
          <select 
            value={imageCount} 
            onChange={(event) => setImageCount(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="1" className="bg-background">1 image</option>
            <option value="2" className="bg-background">2 images</option>
            <option value="3" className="bg-background">3 images</option>
            <option value="4" className="bg-background">4 images</option>
          </select>
        </label>
      </div>
    </GlassPanel>
  )
}
