export type ClientPlan = "normal" | "premium" | "pro";

export function normalizeClientPlan(value?: string | null): ClientPlan {
  if (value === "premium" || value === "pro") {
    return value;
  }

  return "normal";
}

export function getClientPlanFeatures(plan: ClientPlan) {
  return {
    normal: {
      keywordResearchDepth: "standard",
      imageTextQuality: "fast",
      serpEnrichment: "core"
    },
    premium: {
      keywordResearchDepth: "expanded",
      imageTextQuality: "premium",
      serpEnrichment: "enhanced"
    },
    pro: {
      keywordResearchDepth: "full",
      imageTextQuality: "premium",
      serpEnrichment: "full"
    }
  }[plan];
}
