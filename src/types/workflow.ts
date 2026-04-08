export type WorkflowStage =
  | "idea_pool"
  | "selected"
  | "researching"
  | "brief_ready"
  | "drafting"
  | "review"
  | "approved"
  | "published";

export type ResearchProvider = "tavily" | "dataforseo";

export type SerpResult = {
  type: string;
  title: string;
  url?: string;
  description?: string;
};

export type SerpSnapshot = {
  keyword: string;
  intentSummary: string;
  topResults: SerpResult[];
  featuredSnippet?: SerpResult | null;
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  hasLocalPack: boolean;
  serpFeatures: string[];
  generatedAt: string;
};

export type CompetitiveKeywordGap = {
  keyword: string;
  overlapScore?: number;
  searchVolume?: number;
  competition?: number;
  ourRank?: number | null;
  competitorRank?: number | null;
};

export type CompetitorDomainInsight = {
  domain: string;
  overlapKeywords: number;
  visibilityHint: string;
};

export type PositionTrackingEntry = {
  keyword: string;
  url?: string;
  title?: string;
  rankGroup?: number | null;
  rankAbsolute?: number | null;
  estimatedTraffic?: number | null;
};

export type CompetitiveSnapshot = {
  siteDomain: string;
  competitorDomains: string[];
  discoveredCompetitors: CompetitorDomainInsight[];
  overlapKeywords: CompetitiveKeywordGap[];
  positionTracking: PositionTrackingEntry[];
  competitorPositions: Array<{
    domain: string;
    keywords: PositionTrackingEntry[];
  }>;
  summary: string;
  generatedAt: string;
};

export type TopicIdea = {
  id: string;
  title: string;
  angle: string;
  searchIntent: "informational" | "commercial" | "problem-solving";
  difficulty: "low" | "medium" | "high";
  confidence: number;
  whyItMatters: string;
  thaiSignal: string;
  globalSignal: string;
  relatedKeywords: string[];
};

export type ResearchSource = {
  region: "TH" | "Global";
  title: string;
  source: string;
  insight: string;
};

export type ResearchPack = {
  objective: string;
  audience: string;
  gaps: string[];
  sources: ResearchSource[];
};

export type ContentBrief = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  audience: string;
  angle: string;
  publishStatus: "draft" | "publish";
  categoryIds: string[];
  tagIds: string[];
  featuredImageUrl: string;
  outline: string[];
  faqs: string[];
  internalLinks: string[];
};

export type ArticleDraft = {
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  conclusion: string;
};

export type ArticleImageAsset = {
  id: string;
  kind: "featured" | "inline";
  src: string;
  alt: string;
  caption: string;
  placement: string;
  prompt: string;
  sectionHeading?: string;
};

export type WorkflowGenerationSettings = {
  imageCount: number;
  sectionCount: number;
  wordsPerSection: string;
  editorialPattern?: string;
};

export type FacebookPostDraft = {
  caption: string;
  hashtags: string[];
  selectedImageId: string;
  status: "draft" | "queued" | "posted";
};

export type WorkflowAutomationType = "research" | "brief" | "draft" | "images" | "publish" | "facebook";

export type WorkflowAutomationStatus = "queued" | "running" | "succeeded" | "failed";

export type WorkflowAutomationEvent = {
  id: string;
  jobId: string;
  type: WorkflowAutomationType;
  status: WorkflowAutomationStatus;
  source: "app" | "n8n";
  workflowRunId?: string;
  message?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowJob = {
  id: string;
  client: string;
  seedKeyword: string;
  researchProvider: ResearchProvider;
  stage: WorkflowStage;
  selectedIdeaId: string;
  ideas: TopicIdea[];
  serpSnapshot?: SerpSnapshot | null;
  competitiveSnapshot?: CompetitiveSnapshot | null;
  research: ResearchPack;
  brief: ContentBrief;
  draft: ArticleDraft;
  images: ArticleImageAsset[];
  facebook: FacebookPostDraft;
  automationEvents?: WorkflowAutomationEvent[];
};
