import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import type { TopicIdea, WorkflowJob } from "@/types/workflow";

interface ResearchTabProps {
  job: WorkflowJob;
  activeIdea: TopicIdea | null;
  hasSelectedIdea: boolean;
  pendingAction: string;
  runResearch: () => void;
  hasResearch: boolean;
  createArticle: () => void;
  downloadResearchReport: (format: "doc" | "html") => void;
  selectedKeywordLabel: string;
  researchSummary: string;
}

function isLink(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function renderTextWithLinks(value: string) {
  const lines = value.split("\n");
  const urlPattern = /(https?:\/\/[^\s]+)/g;

  return lines.map((line, lineIndex) => {
    const parts = line.split(urlPattern);

    return (
      <span key={`${line}-${lineIndex}`}>
        {parts.map((part, partIndex) =>
          isLink(part) ? (
            <a
              key={`${part}-${partIndex}`}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="break-all text-accent underline-offset-4 hover:underline"
            >
              {part}
            </a>
          ) : (
            <span key={`${part}-${partIndex}`}>{part}</span>
          )
        )}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

export function ResearchTab({
  job,
  activeIdea,
  hasSelectedIdea,
  pendingAction,
  runResearch,
  hasResearch,
  createArticle,
  downloadResearchReport,
  selectedKeywordLabel,
  researchSummary
}: ResearchTabProps) {
  return (
    <GlassPanel className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Step 3</span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Research Document</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            A research-first working document for the writer: structured evidence, deeper explanation, source context,
            and ready-to-use content blocks before the final article is drafted.
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            variant="secondary"
            disabled={!hasSelectedIdea || Boolean(pendingAction)}
            onClick={() => runResearch()}
          >
            {pendingAction === "run-research" ? "Running Research..." : "Run Research"}
          </Button>
          <Button
            variant="default"
            disabled={!hasResearch || Boolean(pendingAction)}
            onClick={() => createArticle()}
          >
            {pendingAction === "create-article" ? "Creating Article..." : "Create Article"}
          </Button>
        </div>
      </div>

      <div className="flex flex-row gap-2 border-b border-white/10 pb-2">
        <Button variant="ghost" size="sm" onClick={() => downloadResearchReport("doc")}>
          Download DOC
        </Button>
        <Button variant="ghost" size="sm" onClick={() => downloadResearchReport("html")}>
          Download HTML
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="md:col-span-2 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-foreground">{activeIdea?.title ?? "Select an article topic first"}</h3>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-background/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Keyword: {selectedKeywordLabel || "Waiting for keyword"}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-background/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Sources: {job.research.sources.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-background/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Gaps: {job.research.gaps.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-background/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Audience: {job.research.audience || "Waiting for synthesis"}
            </span>
            {job.serpSnapshot ? (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-background/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                SERP features: {job.serpSnapshot.serpFeatures.slice(0, 3).join(" · ") || "Loaded"}
              </span>
            ) : null}
          </div>

          {job.serpSnapshot ? (
            <div className="rounded-xl border border-white/10 bg-background/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">SERP Snapshot</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{job.serpSnapshot.intentSummary}</p>
              {job.serpSnapshot.peopleAlsoAsk.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.serpSnapshot.peopleAlsoAsk.slice(0, 4).map((question) => (
                    <span
                      key={question}
                      className="inline-flex items-center rounded-full border border-white/10 bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {question}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="prose prose-invert mt-2 max-w-none rounded-md border border-white/5 bg-background/30 p-4 text-sm leading-relaxed text-muted-foreground">
            {researchSummary ? (
              <div className="whitespace-pre-wrap">{renderTextWithLinks(researchSummary)}</div>
            ) : (
              <span className="italic">ยังไม่มีข้อมูลรีเซิร์ตในงานนี้</span>
            )}
          </div>
        </article>

        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">Sources</span>
            <div className="max-h-[400px] overflow-y-auto pr-2 flex flex-col gap-3">
              {job.research.sources.map((source) => (
                <div
                  key={`${source.region}-${source.title}`}
                  className="flex flex-col gap-1 rounded-md border border-white/5 bg-background/50 p-3"
                >
                  <strong className="text-sm leading-tight text-foreground">{source.title}</strong>
                  {isLink(source.source) ? (
                    <a
                      href={source.source}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-xs text-accent underline-offset-4 hover:underline"
                    >
                      {source.source}
                    </a>
                  ) : (
                    <p className="text-xs text-accent">{source.source}</p>
                  )}
                  <small className="mt-1 line-clamp-3 text-xs leading-snug text-muted-foreground">{source.insight}</small>
                </div>
              ))}
              {job.research.sources.length === 0 && (
                <div className="py-2 text-center text-xs text-muted-foreground">No sources yet</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">Research gaps</span>
            <ul className="flex list-disc flex-col gap-2 list-inside text-sm text-muted-foreground">
              {job.research.gaps.map((gap) => (
                <li key={gap} className="leading-snug">
                  {gap}
                </li>
              ))}
              {job.research.gaps.length === 0 && (
                <li className="list-none py-2 text-center text-xs">No gaps identified</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
