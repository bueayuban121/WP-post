import * as React from "react"
import Image from "next/image"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ArticleImageAsset } from "@/types/workflow"

interface ArticleImagesTabProps {
  hasDraft: boolean
  pendingAction: string
  runPrimaryAction: (step: string) => void
  saveImages: () => void
  refreshActiveJob: () => void
  articleImages: ArticleImageAsset[]
  imageStatusLabel: string
  imageErrorCount: number
  updateImageAsset: (index: number, field: "caption" | "alt" | "placement" | "src" | "prompt", value: string) => void
  replaceImageFromFile: (index: number, file: File) => Promise<void>
  downloadImageAsset: (image: ArticleImageAsset, index: number) => Promise<void>
  removeImageAsset: (index: number) => void
  restoreImageAsset: (index: number) => void
  regenerateSingleImage: (index: number) => Promise<void>
}

export function ArticleImagesTab({
  hasDraft,
  pendingAction,
  runPrimaryAction,
  saveImages,
  refreshActiveJob,
  articleImages,
  imageStatusLabel,
  imageErrorCount,
  updateImageAsset,
  replaceImageFromFile,
  downloadImageAsset,
  removeImageAsset,
  restoreImageAsset,
  regenerateSingleImage
}: ArticleImagesTabProps) {
  return (
    <GlassPanel className="flex flex-col gap-6 overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Visual Layer</span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">AI Article Images</h2>
          <div className="flex items-center mt-2">
            <span className="inline-flex items-center rounded-full bg-background/50 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground mr-2">
              {imageStatusLabel}
            </span>
            {imageErrorCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 border border-destructive/20 text-destructive px-2.5 py-0.5 text-xs font-medium">
                {imageErrorCount} issues
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            disabled={!hasDraft || Boolean(pendingAction)}
            onClick={() => runPrimaryAction("images")}
          >
            {pendingAction === "generate-images" ? "Generating Images..." : "Generate Images"}
          </Button>
          <Button
            variant="secondary"
            disabled={!hasDraft || Boolean(pendingAction)}
            onClick={() => saveImages()}
          >
            {pendingAction === "save-images" ? "Saving Images..." : "Save Image Edits"}
          </Button>
          <Button
            variant="outline"
            disabled={Boolean(pendingAction)}
            onClick={() => refreshActiveJob()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-8">
        {articleImages.map((image, index) => (
          <article
            key={image.id}
            className="group relative grid grid-cols-1 gap-6 overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,25,35,0.96),rgba(12,19,27,0.94))] p-5 shadow-[0_22px_48px_rgba(5,10,18,0.22)] xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]"
          >
            <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/6 bg-background/50 aspect-[16/9] xl:sticky xl:top-6">
              {image.src.trim() ? (
                <Image 
                  alt={image.alt} 
                  fill 
                  src={image.src} 
                  unoptimized 
                  className="object-cover"
                />
              ) : (
                <div className="text-muted-foreground/50 text-sm flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  <span>Image removed from this slot</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Frame {index + 1}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300">
                    16:9 canvas
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300">
                    Horizontal preview
                  </span>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Caption / text under image</span>
                <Input
                  value={image.caption}
                  onChange={(event) => updateImageAsset(index, "caption", event.target.value)}
                  className="bg-background/50"
                />
              </label>
              
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Alt text</span>
                <textarea
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 custom-scroll"
                  value={image.alt}
                  onChange={(event) => updateImageAsset(index, "alt", event.target.value)}
                />
              </label>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Placement note</span>
                  <Input
                    value={image.placement}
                    onChange={(event) => updateImageAsset(index, "placement", event.target.value)}
                    className="bg-background/50 text-xs"
                  />
                </label>
                
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Upload Manual Image</span>
                  <Input
                    accept="image/*"
                    type="file"
                    className="bg-background/50 text-xs py-1.5 cursor-pointer"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void replaceImageFromFile(index, file);
                      }
                    }}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Image source URL</span>
                <Input
                  value={image.src}
                  onChange={(event) => updateImageAsset(index, "src", event.target.value)}
                  className="bg-background/50 text-xs"
                />
              </label>
              
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">AI prompt</span>
                <textarea
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 custom-scroll leading-relaxed"
                  value={image.prompt}
                  onChange={(event) => updateImageAsset(index, "prompt", event.target.value)}
                  placeholder="Describe the exact visual you want. You can include Thai or English text directions here if needed."
                />
                <span className="text-xs text-muted-foreground">
                  You can request exact Thai or English text overlays here when needed. Regenerate will use this prompt.
                </span>
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/5 pt-4 sm:grid-cols-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 text-xs whitespace-nowrap"
                  disabled={!image.src.trim() || Boolean(pendingAction)}
                  onClick={() => downloadImageAsset(image, index)}
                >
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="px-2 text-xs text-destructive whitespace-nowrap hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeImageAsset(index)} 
                >
                  Remove
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="px-2 text-xs whitespace-nowrap"
                  onClick={() => restoreImageAsset(index)} 
                >
                  Restore
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="px-2 text-xs whitespace-nowrap"
                  disabled={Boolean(pendingAction)}
                  onClick={() => regenerateSingleImage(index)}
                >
                  {pendingAction === "regenerate-image" ? "Generating..." : "Regenerate"}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </GlassPanel>
  )
}
