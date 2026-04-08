"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SerpSnapshot, TopicIdea, WorkflowJob } from "@/types/workflow"

interface KeywordExpansionTabProps {
  inKeywordVariantPhase: boolean
  job: WorkflowJob
  activeIdea: TopicIdea | null
  pendingAction: string
  selectKeyword: (idea: TopicIdea) => void
  saveSelectedKeyword: () => void
  selectedIdeaTitle: string
  setSelectedIdeaTitle: (val: string) => void
  selectedIdeaAngle: string
  setSelectedIdeaAngle: (val: string) => void
}

function uniqueSearchIntents(job: WorkflowJob) {
  return job.ideas
    .map((idea) => idea.searchIntent)
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter(Boolean)
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function scoreTone(score: number) {
  if (score >= 90) {
    return "border-emerald-300/20 bg-emerald-400/12 text-emerald-100"
  }

  if (score >= 80) {
    return "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
  }

  if (score >= 72) {
    return "border-amber-300/20 bg-amber-300/12 text-amber-100"
  }

  return "border-white/10 bg-white/[0.06] text-slate-200"
}

function serpFeatureLabel(value: string) {
  return value.replace(/\s+/g, " ").trim() || "Feature"
}

export function KeywordExpansionTab({
  inKeywordVariantPhase,
  job,
  activeIdea,
  pendingAction,
  selectKeyword,
  saveSelectedKeyword,
  selectedIdeaTitle,
  setSelectedIdeaTitle,
  selectedIdeaAngle,
  setSelectedIdeaAngle
}: KeywordExpansionTabProps) {
  const intentMix = uniqueSearchIntents(job)
  const [showAllRecommendations, setShowAllRecommendations] = React.useState(false)
  const exportBaseName = `${job.seedKeyword || "keyword-expansion"}`
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase()

  const exportKeywordVariantsAsTxt = React.useCallback(() => {
    const lines = [
      `Seed keyword: ${job.seedKeyword}`,
      "",
      "Expanded keyword variants:",
      ...job.ideas.map((idea, index) => `${index + 1}. ${idea.title}`)
    ]

    downloadBlob(`${exportBaseName}-variants.txt`, lines.join("\n"), "text/plain;charset=utf-8")
  }, [exportBaseName, job.ideas, job.seedKeyword])

  const exportKeywordVariantsAsCsv = React.useCallback(() => {
    const rows = [
      ["seed_keyword", "variant_keyword", "difficulty", "confidence", "search_intent"],
      ...job.ideas.map((idea) => [
        job.seedKeyword,
        idea.title,
        idea.difficulty,
        String(idea.confidence),
        idea.searchIntent
      ])
    ]

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n")

    downloadBlob(`${exportBaseName}-variants.csv`, csv, "text/csv;charset=utf-8")
  }, [exportBaseName, job.ideas, job.seedKeyword])

  const visibleIdeas = inKeywordVariantPhase
    ? showAllRecommendations
      ? job.ideas
      : job.ideas.slice(0, 15)
    : job.ideas
  const hiddenRecommendationCount = inKeywordVariantPhase ? Math.max(job.ideas.length - 15, 0) : 0
  const serpSnapshot: SerpSnapshot | null = job.serpSnapshot ?? null

  return (
    <GlassPanel className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,28,0.98),rgba(10,16,24,0.94))] p-0 shadow-[0_28px_80px_rgba(5,10,18,0.38)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(58,115,201,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,118,110,0.16),transparent_28%)]" />

      <div className="relative flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                {inKeywordVariantPhase ? "Discovery" : "Topics"}
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-50 md:text-[2.2rem]">
                {inKeywordVariantPhase ? "Recommended keywords, ranked and ready." : "Turn the chosen keyword into a sharper angle."}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">
                {inKeywordVariantPhase
                  ? "Start with the top-ranked keyword variants from DataForSEO. We surface the strongest 15 first, then let you expand to the full top 30 if you want more options."
                  : "The keyword is already chosen. Now we shape it into article-ready directions and prepare the strongest topic before research begins."}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                {job.ideas.length} {inKeywordVariantPhase ? "ranked variants" : "topics"}
              </span>
              {inKeywordVariantPhase && job.ideas.length > 0 ? (
                <>
                  <Button
                    variant="outline"
                    onClick={exportKeywordVariantsAsTxt}
                    className="h-10 rounded-full border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-slate-100 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    Download TXT
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportKeywordVariantsAsCsv}
                    className="h-10 rounded-full border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-slate-100 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    Download CSV
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 rounded-full border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-slate-100 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    <a href={`/api/jobs/${job.id}/keyword-report?format=doc`}>DataForSEO DOC</a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 rounded-full border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-slate-100 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    <a href={`/api/jobs/${job.id}/keyword-report?format=json`}>Raw JSON</a>
                  </Button>
                  {hiddenRecommendationCount > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllRecommendations((value) => !value)}
                      className="h-10 rounded-full border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-slate-100 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                    >
                      {showAllRecommendations ? "Show top 15" : `Show more (${hiddenRecommendationCount})`}
                    </Button>
                  ) : null}
                </>
              ) : null}
              {intentMix.length > 0 && !inKeywordVariantPhase ? (
                <span className="inline-flex items-center rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">
                  {intentMix.join(" · ")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {inKeywordVariantPhase ? "Seed" : "Keyword"}
              </span>
              <strong className="mt-2 block text-base font-semibold text-slate-50">{job.seedKeyword}</strong>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {inKeywordVariantPhase ? "Next" : "Topic"}
              </span>
              <strong className="mt-2 block text-base font-semibold text-slate-50">
                {inKeywordVariantPhase ? "Pick one recommended keyword" : activeIdea?.title ?? "Waiting"}
              </strong>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {inKeywordVariantPhase ? "Source" : "Intent"}
              </span>
              <strong className="mt-2 block text-base font-semibold text-slate-50">
                {inKeywordVariantPhase ? "Ranked by DataForSEO + app scoring" : intentMix.join(" · ") || "Balanced mix"}
              </strong>
            </div>
          </div>
        </div>

        {!inKeywordVariantPhase && serpSnapshot ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_48px_rgba(5,10,18,0.26)]"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="inline-flex rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-100">
                    SERP Snapshot
                  </span>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-50">
                    Search landscape for &ldquo;{serpSnapshot.keyword}&rdquo;
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{serpSnapshot.intentSummary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-200">
                    {serpSnapshot.topResults.length} top results
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-200">
                    PAA {serpSnapshot.peopleAlsoAsk.length}
                  </span>
                  {serpSnapshot.hasLocalPack ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100">
                      Local pack present
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Top results</p>
                  <div className="mt-3 flex flex-col gap-3">
                    {serpSnapshot.topResults.slice(0, 4).map((result, index) => (
                      <div key={`${result.url}-${index}`} className="rounded-[18px] border border-white/8 bg-black/10 p-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {serpFeatureLabel(result.type)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-100">{result.title}</p>
                        {result.description ? (
                          <p className="mt-1 text-xs leading-6 text-slate-400">{result.description}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {serpSnapshot.featuredSnippet ? (
                    <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/10 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Featured snippet</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-50">{serpSnapshot.featuredSnippet.title}</p>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">People also ask</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {serpSnapshot.peopleAlsoAsk.length > 0 ? (
                        serpSnapshot.peopleAlsoAsk.slice(0, 6).map((question) => (
                          <span key={question} className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs leading-5 text-slate-200">
                            {question}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">No related questions surfaced.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">SERP features</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {serpSnapshot.serpFeatures.map((feature) => (
                        <span key={feature} className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200">
                          {serpFeatureLabel(feature)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {!inKeywordVariantPhase && activeIdea ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_48px_rgba(5,10,18,0.26)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                  Topic
                </span>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-50">Refine before research</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                  Fine-tune the final title and angle so research starts from the clearest direction.
                </p>
              </div>

              <Button
                variant="secondary"
                disabled={Boolean(pendingAction)}
                onClick={() => saveSelectedKeyword()}
                className="h-11 rounded-full border border-white/10 bg-white/6 px-5 text-slate-100 shadow-[0_14px_30px_rgba(5,10,18,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              >
                {pendingAction === "save-keyword" ? "Saving..." : "Save details"}
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-100">Title</span>
                <small className="text-xs leading-6 text-slate-400">Adjust the wording before sending this topic into research.</small>
                <Input
                  value={selectedIdeaTitle}
                  onChange={(event) => setSelectedIdeaTitle(event.target.value)}
                  className="h-12 rounded-[18px] border-white/10 bg-white/[0.05] px-4 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:ring-cyan-400/60"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-100">Angle</span>
                <small className="text-xs leading-6 text-slate-400">Describe the exact angle or perspective the article should emphasize.</small>
                <textarea
                  rows={4}
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/40"
                  value={selectedIdeaAngle}
                  onChange={(event) => setSelectedIdeaAngle(event.target.value)}
                />
              </label>
            </div>
          </motion.div>
        ) : null}

        {inKeywordVariantPhase ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">Top 15 recommended</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The first set is ranked for direct relevance, demand, opportunity, Thai market fit, and keyword cleanliness.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-200">
                Showing {visibleIdeas.length}/{job.ideas.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-2 text-xs font-medium text-cyan-100">
                Ranked keywords
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4">
          {visibleIdeas.map((idea, index) => {
            const isSelectedTopic = !inKeywordVariantPhase && job.selectedIdeaId === idea.id
            const isRecommendedKeyword = inKeywordVariantPhase && index < 15
            const buttonLabel =
              pendingAction === "select-keyword" && (!inKeywordVariantPhase && job.selectedIdeaId !== idea.id)
                ? "Selecting..."
                : isSelectedTopic
                  ? "Selected"
                  : inKeywordVariantPhase
                    ? "Use this keyword"
                    : "Select topic"

            return (
              <motion.article
                key={idea.id}
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.34, delay: index * 0.05 }}
                className={`group relative overflow-hidden rounded-[28px] border p-5 shadow-[0_22px_48px_rgba(5,10,18,0.24)] transition-all duration-300 ${
                  isSelectedTopic
                    ? "border-cyan-400/30 bg-[linear-gradient(135deg,rgba(15,118,110,0.18),rgba(18,26,36,0.92))]"
                    : "border-white/10 bg-[linear-gradient(180deg,rgba(17,25,35,0.96),rgba(12,19,27,0.94))] hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_28px_56px_rgba(5,10,18,0.34)]"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                  <div className="absolute inset-y-0 -left-1/4 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                </div>

                <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {inKeywordVariantPhase ? "Variant" : "Topic"}
                      </span>
                      {inKeywordVariantPhase ? (
                        <>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${scoreTone(
                              idea.confidence
                            )}`}
                          >
                            Score {idea.confidence}
                          </span>
                          {isRecommendedKeyword ? (
                            <span className="inline-flex rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                              Recommended
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="inline-flex rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                          {idea.searchIntent}
                        </span>
                      )}
                    </div>

                    <strong className="block text-lg font-semibold tracking-[-0.025em] text-slate-50 md:text-[1.15rem]">
                      {idea.title}
                    </strong>

                    {inKeywordVariantPhase ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm leading-7 text-slate-300">{idea.whyItMatters}</p>
                        <p className="text-xs leading-6 text-slate-400">{idea.globalSignal}</p>
                      </div>
                    ) : (
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{idea.angle}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-stretch gap-3 md:min-w-[210px]">
                    <Button
                      variant={isSelectedTopic ? "outline" : "default"}
                      disabled={Boolean(pendingAction)}
                      onClick={() => selectKeyword(idea)}
                      className={`h-12 rounded-full px-5 text-sm font-semibold transition-all duration-200 ${
                        isSelectedTopic
                          ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/14"
                          : "bg-[linear-gradient(135deg,#0f766e,#1ba092)] text-white shadow-[0_18px_36px_rgba(15,118,110,0.22)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,118,110,0.28)]"
                      }`}
                    >
                      {buttonLabel}
                    </Button>

                    <span className="text-center text-xs leading-6 text-slate-400">
                      {inKeywordVariantPhase
                        ? "Choose one keyword first, then the system expands article topics next."
                        : "The next step runs research and drafting."}
                    </span>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </GlassPanel>
  )
}
