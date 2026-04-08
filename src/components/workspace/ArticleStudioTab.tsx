import * as React from "react"
import Image from "next/image"
import { motion } from "framer-motion"
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
  saveBrief: () => void
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

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 }
}

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
  saveBrief,
  saveDraft,
  regenerateArticleWithAnotherPattern,
  featuredImageSrc,
  selectedKeywordLabel,
  imageCount,
  articleLength,
  stageLabels
}: ArticleStudioTabProps) {
  const previewTitle = briefTitle || activeIdea?.title || "Untitled article"
  const previewSections = draftSections.length > 0 ? draftSections : articleSections
  const sectionAnchors = [
    { id: "intro", label: "Intro" },
    ...previewSections.map((section, index) => ({
      id: `section-${index + 1}`,
      label: section.heading || `Section ${index + 1}`
    })),
    { id: "outro", label: "Outro" }
  ]

  const scrollToAnchor = (anchorId: string) => {
    if (typeof document === "undefined") return
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(440px,0.98fr)_minmax(0,1.02fr)] xl:items-start">
      <motion.div
        className="order-2 xl:order-1"
        initial="hidden"
        animate="visible"
        variants={reveal}
        transition={{ duration: 0.38, ease: "easeOut" }}
      >
        <GlassPanel className="flex min-h-[calc(100vh-12rem)] flex-col gap-6 overflow-hidden xl:sticky xl:top-24">
          <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-white/8 bg-[linear-gradient(180deg,rgba(10,16,24,0.98),rgba(10,16,24,0.84))] px-6 pb-4 pt-6 backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-[#f2b487]/20 bg-[#f2b487]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6ba]">
                  Editorial Control
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Draft Studio</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                  Review the article structure, tune metadata, and edit every section before publish.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={Boolean(pendingAction)} onClick={() => saveBrief()}>
                  {pendingAction === "save-brief" ? "Saving Details..." : "Save Details"}
                </Button>
                <Button variant="default" disabled={Boolean(pendingAction)} onClick={() => saveDraft()}>
                  {pendingAction === "save-draft" ? "Saving Draft..." : "Save Draft"}
                </Button>
                <Button
                  variant="outline"
                  disabled={Boolean(pendingAction) || !hasResearch}
                  onClick={() => regenerateArticleWithAnotherPattern()}
                >
                  {pendingAction === "regenerate-pattern" ? "Regenerating..." : "New Pattern"}
                </Button>
              </div>
            </div>
          </div>

          <div className="custom-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</span>
                <strong className="mt-2 block text-sm text-slate-50">{stageLabels[job.stage]}</strong>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Keyword</span>
                <strong className="mt-2 block text-sm text-slate-50">{selectedKeywordLabel || "Not selected"}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">Title</span>
                <small className="text-xs text-slate-400">Main title used in the article body.</small>
                <Input value={briefTitle} onChange={(event) => setBriefTitle(event.target.value)} className="bg-background/50" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">Meta Title</span>
                <small className="text-xs text-slate-400">SEO title shown on search and browser tabs.</small>
                <Input value={briefMetaTitle} onChange={(event) => setBriefMetaTitle(event.target.value)} className="bg-background/50" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">Meta Description</span>
                <small className="text-xs text-slate-400">Short summary for search snippets and social previews.</small>
                <textarea
                  rows={4}
                  className="custom-scroll flex w-full rounded-[18px] border border-white/10 bg-background/50 px-4 py-3 text-sm text-slate-50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b487]/45"
                  value={briefMetaDescription}
                  onChange={(event) => setBriefMetaDescription(event.target.value)}
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Slug</span>
                  <small className="text-xs text-slate-400">Final URL path for WordPress.</small>
                  <Input value={briefSlug} onChange={(event) => setBriefSlug(event.target.value)} className="bg-background/50" />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Featured Image URL</span>
                  <small className="text-xs text-slate-400">Leave blank to use the first image from the AI set.</small>
                  <Input
                    value={briefFeaturedImageUrl}
                    onChange={(event) => setBriefFeaturedImageUrl(event.target.value)}
                    className="bg-background/50"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">Intro</span>
                <small className="text-xs text-slate-400">Opening paragraphs that frame the article.</small>
                <textarea
                  rows={7}
                  className="custom-scroll flex w-full rounded-[20px] border border-white/10 bg-background/50 px-4 py-3 text-sm text-slate-50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b487]/45"
                  value={draftIntro}
                  onChange={(event) => setDraftIntro(event.target.value)}
                />
              </label>

              <div className="flex flex-col gap-4 border-t border-white/8 pt-5">
                <div className="flex flex-col gap-1">
                  <strong className="text-lg text-foreground">Article Sections</strong>
                  <small className="text-xs text-slate-400">Edit the heading and body of each section before publish.</small>
                </div>

                {draftSections.map((section, index) => (
                  <motion.div
                    key={`section-editor-${index + 1}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: index * 0.05 }}
                    className="group relative flex flex-col gap-3 overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-4 shadow-[0_18px_34px_rgba(5,10,18,0.16)]"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f2b487]/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <strong className="text-[12px] uppercase tracking-[0.2em] text-[#ffd6ba]">Section {index + 1}</strong>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">Heading</span>
                      <Input
                        value={section.heading}
                        onChange={(event) => updateDraftSection(index, "heading", event.target.value)}
                        className="bg-background/60 font-semibold"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">Body</span>
                      <textarea
                        rows={9}
                        className="custom-scroll flex w-full rounded-[18px] border border-white/10 bg-background/60 px-4 py-3 text-sm text-slate-50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b487]/45"
                        value={section.body}
                        onChange={(event) => updateDraftSection(index, "body", event.target.value)}
                      />
                    </label>
                  </motion.div>
                ))}
              </div>

              <label className="flex flex-col gap-2 border-t border-white/8 pt-5">
                <span className="text-sm font-medium text-foreground">Conclusion</span>
                <small className="text-xs text-slate-400">Closing section that wraps the article clearly.</small>
                <textarea
                  rows={6}
                  className="custom-scroll flex w-full rounded-[20px] border border-white/10 bg-background/50 px-4 py-3 text-sm text-slate-50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b487]/45"
                  value={draftConclusion}
                  onChange={(event) => setDraftConclusion(event.target.value)}
                />
              </label>
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      <motion.div
        className="order-1 xl:order-2"
        initial="hidden"
        animate="visible"
        variants={reveal}
        transition={{ duration: 0.42, ease: "easeOut", delay: 0.06 }}
      >
        <GlassPanel className="overflow-hidden p-0">
          <div className="relative aspect-[16/9] min-h-[320px] w-full overflow-hidden border-b border-white/6 bg-muted md:min-h-[400px]">
            {featuredImageSrc ? (
              <Image alt={articleImages[0]?.alt ?? "Featured article image"} fill src={featuredImageSrc} unoptimized className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <span className="text-sm text-muted-foreground/60">No featured image</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b10] via-[#070b10]/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-6 md:px-8">
              <span className="inline-flex rounded-full border border-[#f2b487]/22 bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6ba] backdrop-blur-md">
                Draft Preview
              </span>
              <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-slate-50 md:text-[2.1rem]">
                {previewTitle}
              </h2>
              {briefMetaDescription ? (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">{briefMetaDescription}</p>
              ) : null}
            </div>
          </div>

          <div className="sticky top-0 z-20 border-b border-white/6 bg-[linear-gradient(180deg,rgba(8,12,18,0.96),rgba(8,12,18,0.82))] px-6 py-4 backdrop-blur-xl md:px-8">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#f2b487]/20 bg-[#f2b487]/10 px-3 py-2 text-xs font-medium text-[#ffd6ba]">
                Keyword: {selectedKeywordLabel || "Waiting"}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300">
                Status: {stageLabels[job.stage]}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300">
                Length: {articleLength} words
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300">
                Images: {imageCount}
              </span>
            </div>

            <div className="custom-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
              {sectionAnchors.map((anchor) => (
                <button
                  key={anchor.id}
                  type="button"
                  onClick={() => scrollToAnchor(anchor.id)}
                  className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f2b487]/25 hover:bg-[#f2b487]/10 hover:text-[#ffe4d0]"
                >
                  {anchor.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-10 pt-6 md:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.06
                  }
                }
              }}
              className="mx-auto max-w-[52rem]"
            >
              <motion.section
                id="intro"
                variants={reveal}
                transition={{ duration: 0.3 }}
                className="scroll-mt-36 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_48px_rgba(5,10,18,0.18)]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6ba]">Intro</span>
                <div className="mt-4 space-y-5 text-[1.02rem] leading-8 text-slate-200">
                  {splitParagraphs(draftIntro).map((paragraph) => (
                    <p key={`intro-${paragraph.slice(0, 36)}`}>{paragraph}</p>
                  ))}
                </div>
              </motion.section>

              {previewSections.map((section, index) => {
                const image = articleImages[index + 1]

                return (
                  <motion.section
                    key={`${section.heading}-${index}`}
                    id={`section-${index + 1}`}
                    variants={reveal}
                    transition={{ duration: 0.3 }}
                    className="scroll-mt-36 mt-8 rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-6 shadow-[0_22px_48px_rgba(5,10,18,0.18)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                        Section {index + 1}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-50">{section.heading}</h3>
                    <div className="mt-5 space-y-5 text-[1rem] leading-8 text-slate-200">
                      {splitParagraphs(section.body).map((paragraph) => (
                        <p key={`${section.heading}-${paragraph.slice(0, 36)}`}>{paragraph}</p>
                      ))}
                    </div>

                    {image?.src.trim() ? (
                      <figure className="mt-8 overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]">
                        <div className="relative aspect-[16/9] w-full">
                          <Image alt={image.alt} fill src={image.src} unoptimized className="object-cover" />
                        </div>
                        <figcaption className="flex flex-col gap-1 border-t border-white/8 bg-white/[0.04] px-5 py-4">
                          <span className="text-sm text-slate-100">{image.caption}</span>
                          <small className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{image.placement}</small>
                        </figcaption>
                      </figure>
                    ) : null}
                  </motion.section>
                )
              })}

              <motion.section
                id="outro"
                variants={reveal}
                transition={{ duration: 0.3 }}
                className="scroll-mt-36 mt-8 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_48px_rgba(5,10,18,0.18)]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6ba]">Conclusion</span>
                <div className="mt-4 space-y-5 text-[1rem] leading-8 text-slate-200">
                  {splitParagraphs(draftConclusion).map((paragraph) => (
                    <p key={`conclusion-${paragraph.slice(0, 36)}`}>{paragraph}</p>
                  ))}
                </div>
              </motion.section>
            </motion.div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  )
}
