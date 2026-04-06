import * as React from "react"
import Image from "next/image"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WorkflowJob, TopicIdea, ArticleImageAsset } from "@/types/workflow"

interface ArticleStudioTabProps {
  job: WorkflowJob
  activeIdea: TopicIdea | null
  pendingAction: string
  hasDraft: boolean
  hasResearch: boolean
  briefTitle: string
  setBriefTitle: (val: string) => void
  briefMetaTitle: string
  setBriefMetaTitle: (val: string) => void
  briefMetaDescription: string
  setBriefMetaDescription: (val: string) => void
  briefSlug: string
  setBriefSlug: (val: string) => void
  briefFeaturedImageUrl: string
  setBriefFeaturedImageUrl: (val: string) => void
  draftIntro: string
  setDraftIntro: (val: string) => void
  draftConclusion: string
  setDraftConclusion: (val: string) => void
  draftSections: Array<{ heading: string; body: string }>
  updateDraftSection: (index: number, field: "heading" | "body", value: string) => void
  articleSections: Array<{ heading: string; body: string }>
  articleImages: ArticleImageAsset[]
  saveDraft: () => void
  regenerateArticleWithAnotherPattern: () => void
  featuredImageSrc: string
  selectedKeywordLabel: string
  imageCount: string
  articleLength: string
  stageLabels: Record<string, string>
}

const splitParagraphs = (text: string) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)

export function ArticleStudioTab({
  job,
  activeIdea,
  pendingAction,
  hasDraft,
  hasResearch,
  briefTitle,
  setBriefTitle,
  briefMetaTitle,
  setBriefMetaTitle,
  briefMetaDescription,
  setBriefMetaDescription,
  briefSlug,
  setBriefSlug,
  briefFeaturedImageUrl,
  setBriefFeaturedImageUrl,
  draftIntro,
  setDraftIntro,
  draftConclusion,
  setDraftConclusion,
  draftSections,
  updateDraftSection,
  articleSections,
  articleImages,
  saveDraft,
  regenerateArticleWithAnotherPattern,
  featuredImageSrc,
  selectedKeywordLabel,
  imageCount,
  articleLength,
  stageLabels
}: ArticleStudioTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full items-start">
      <GlassPanel className="flex flex-col gap-6 w-full xl:sticky xl:top-24 max-h-[85vh] overflow-y-auto custom-scroll">
        <div className="flex flex-row justify-between items-start sticky top-0 bg-background/80 backdrop-blur pb-4 pt-2 z-10 border-b border-white/5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Editorial Control</span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">Article Studio</h2>
          </div>
          <Button
            variant="default"
            disabled={Boolean(pendingAction)}
            onClick={() => saveDraft()}
          >
            {pendingAction === "save-brief" ? "Saving Brief..." : pendingAction === "save-draft" ? "Saving Draft..." : "Save Draft"}
          </Button>
        </div>

        <div className="flex flex-col gap-5 pb-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Title</span>
            <small className="text-xs text-muted">หัวข้อหลักของบทความ</small>
            <Input value={briefTitle} onChange={(event) => setBriefTitle(event.target.value)} className="bg-background/40" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Meta Title</span>
            <small className="text-xs text-muted">ใช้ใน SEO title</small>
            <Input value={briefMetaTitle} onChange={(event) => setBriefMetaTitle(event.target.value)} className="bg-background/40" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Meta Description</span>
            <small className="text-xs text-muted">ข้อความสรุปสำหรับ search</small>
            <textarea
              rows={4}
              className="flex w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={briefMetaDescription}
              onChange={(event) => setBriefMetaDescription(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Slug</span>
            <small className="text-xs text-muted">URL ของโพสต์</small>
            <Input value={briefSlug} onChange={(event) => setBriefSlug(event.target.value)} className="bg-background/40" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Featured Image URL</span>
            <small className="text-xs text-muted">ถ้าไม่ใส่จะใช้รูปแรกจาก AI image set</small>
            <Input value={briefFeaturedImageUrl} onChange={(event) => setBriefFeaturedImageUrl(event.target.value)} className="bg-background/40" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Intro</span>
            <small className="text-xs text-muted">บทนำของบทความ</small>
            <textarea
              rows={5}
              className="flex w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={draftIntro}
              onChange={(event) => setDraftIntro(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Conclusion</span>
            <small className="text-xs text-muted">สรุปท้ายบทความ</small>
            <textarea
              rows={5}
              className="flex w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={draftConclusion}
              onChange={(event) => setDraftConclusion(event.target.value)}
            />
          </label>

          <div className="flex flex-col gap-4 mt-4 border-t border-white/10 pt-6">
            <div className="flex flex-col gap-1 mb-2">
              <strong className="text-lg text-foreground">Article Sections</strong>
              <small className="text-muted-foreground">แก้ไขหัวข้อและเนื้อหาแต่ละส่วนได้ก่อน publish</small>
            </div>
            {draftSections.map((section, index) => (
              <div key={`section-editor-${index + 1}`} className="flex flex-col gap-3 p-4 rounded-md bg-background/50 border border-white/5 relative group">
                <div className="absolute top-0 right-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-md"></div>
                <strong className="text-[13px] uppercase tracking-wider text-accent">Section {index + 1}</strong>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Heading</span>
                  <Input
                    value={section.heading}
                    onChange={(event) => updateDraftSection(index, "heading", event.target.value)}
                    className="bg-background/60 font-semibold"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Body</span>
                  <textarea
                    rows={10}
                    className="flex w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 custom-scroll"
                    value={section.body}
                    onChange={(event) => updateDraftSection(index, "body", event.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <Button
              variant="outline"
              disabled={Boolean(pendingAction) || !hasResearch}
              onClick={() => regenerateArticleWithAnotherPattern()}
              className="w-full"
            >
              {pendingAction === "regenerate-pattern"
                ? "Regenerating Pattern..."
                : "Regenerate With Another Editorial Pattern"}
            </Button>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="hidden xl:flex flex-col gap-0 p-0 overflow-hidden bg-background">
        <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
          {featuredImageSrc ? (
            <Image 
              alt={articleImages[0]?.alt ?? "Featured article image"} 
              fill
              src={featuredImageSrc} 
              unoptimized 
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <span className="text-muted-foreground/50 text-sm">No featured image</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>
        
        <div className="flex flex-wrap gap-2 px-8 py-4 border-b border-white/5 bg-background/80 relative z-20">
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">Keyword: {selectedKeywordLabel}</span>
          <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Status: {stageLabels[job.stage]}</span>
          <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Length target: {articleLength} words</span>
          <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Images: {imageCount}</span>
        </div>

        <div className="p-8 prose prose-invert prose-p:text-[#A1A1AA] prose-headings:text-foreground prose-h2:text-3xl prose-h2:font-bold prose-h3:text-xl prose-h3:font-semibold max-w-none w-full bg-background relative z-20 overflow-y-auto custom-scroll" style={{maxHeight: 'calc(85vh - 400px)'}}>
          <h2>{briefTitle || activeIdea?.title || "Untitled article"}</h2>
          <p className="text-lg text-muted-foreground italic border-l-2 border-accent pl-4 py-1 my-6">{briefMetaDescription}</p>
          
          {splitParagraphs(draftIntro).map((paragraph) => (
            <p key={`intro-${paragraph.slice(0, 36)}`} className="text-lg leading-relaxed">
              {paragraph}
            </p>
          ))}
          
          {articleSections.map((section, index) => {
            const image = articleImages[index + 1];
            return (
              <div key={`${section.heading}-${index}`} className="mt-10">
                <h3>{section.heading}</h3>
                {splitParagraphs(section.body).map((paragraph) => (
                  <p key={`${section.heading}-${paragraph.slice(0, 36)}`}>{paragraph}</p>
                ))}
                
                {image?.src.trim() ? (
                  <figure className="my-8 rounded-lg overflow-hidden border border-white/10 bg-background/50">
                    <div className="relative w-full aspect-[16/9]">
                      <Image alt={image.alt} fill src={image.src} unoptimized className="object-cover" />
                    </div>
                    <figcaption className="p-3 px-4 flex flex-col gap-1 bg-white/5">
                      <span className="text-sm text-foreground">{image.caption}</span>
                      <small className="text-xs text-muted-foreground uppercase opacity-70">{image.placement}</small>
                    </figcaption>
                  </figure>
                ) : null}
              </div>
            );
          })}
          
          <div className="mt-10 pt-6 border-t border-white/10">
            {splitParagraphs(draftConclusion).map((paragraph) => (
              <p key={`conclusion-${paragraph.slice(0, 36)}`}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
