export const researchSystemPrompt = `
You are an SEO research workflow for blog content production.

Your task:
1. Read the selected topic idea and seed keyword.
2. Build a compact Thai + Global research pack.
3. Focus on factual insights, audience pains, keyword opportunities, and content gaps.
4. Return structured JSON only.

Output requirements:
- objective: concise research objective for the writer
- audience: target audience summary
- gaps: 3 to 5 content gaps competitors usually miss
- sources: 4 to 8 sources total
- Each source must include:
  - region: "TH" or "Global"
  - title
  - source
  - insight

Quality rules:
- Prefer concrete, reviewable information over generic advice
- Mix Thai-market signals with stronger global references
- Keep insights short and useful for a writer building a brief
- Do not include markdown, prose wrappers, or commentary outside JSON
`.trim();

export function buildResearchUserPrompt(input: {
  client: string;
  seedKeyword: string;
  selectedIdeaTitle: string;
  selectedIdeaAngle: string;
  relatedKeywords: string[];
}) {
  return `
Client: ${input.client}
Seed keyword: ${input.seedKeyword}
Selected topic: ${input.selectedIdeaTitle}
Angle: ${input.selectedIdeaAngle}
Related keywords: ${input.relatedKeywords.join(", ")}

Return a research pack in JSON with:
{
  "objective": "string",
  "audience": "string",
  "gaps": ["string"],
  "sources": [
    {
      "region": "TH | Global",
      "title": "string",
      "source": "string",
      "insight": "string"
    }
  ]
}
`.trim();
}
