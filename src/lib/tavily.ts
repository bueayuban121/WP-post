const TAVILY_API_KEY =
  process.env.TAVILY_API_KEY ?? "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";

export type TavilySearchResult = {
  title?: string;
  url?: string;
  favicon?: string;
  content?: string;
  raw_content?: string;
};

export type TavilySearchResponse = {
  answer?: string;
  results?: TavilySearchResult[];
};

export async function tavilySearch(
  query: string,
  options?: {
    country?: string;
    maxResults?: number;
    includeAnswer?: boolean;
    includeRawContent?: boolean;
    searchDepth?: "basic" | "advanced";
  }
): Promise<TavilySearchResponse> {
  if (!TAVILY_API_KEY) {
    return { answer: "", results: [] };
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TAVILY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      topic: "general",
      country: options?.country ?? "thailand",
      max_results: options?.maxResults ?? 6,
      search_depth: options?.searchDepth ?? "advanced",
      include_answer: options?.includeAnswer ? "advanced" : false,
      include_raw_content: options?.includeRawContent ? "text" : false
    })
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed with status ${response.status}`);
  }

  return (await response.json()) as TavilySearchResponse;
}
