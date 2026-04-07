import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getDataForSeoKeywordVariantResult } from "@/lib/dataforseo";
import { buildDownloadFilename } from "@/lib/download-filename";
import { getJob } from "@/lib/job-store";
import { NextResponse } from "next/server";

function buildKeywordVariantDoc(result: Awaited<ReturnType<typeof getDataForSeoKeywordVariantResult>>) {
  const generatedAt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(result.generatedAt));

  const rows = result.suggestions
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.keyword}</td>
          <td>${item.competition ?? "-"}</td>
          <td>${typeof item.competitionIndex === "number" ? item.competitionIndex : "-"}</td>
          <td>${typeof item.searchVolume === "number" ? item.searchVolume.toLocaleString() : "-"}</td>
          <td>${typeof item.cpc === "number" ? `$${item.cpc.toFixed(2)}` : "-"}</td>
        </tr>
      `
    )
    .join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>DataForSEO Keyword Variants</title>
        <style>
          body { font-family: Arial, Tahoma, sans-serif; color: #0f172a; margin: 32px; line-height: 1.6; }
          h1 { margin: 0 0 8px; font-size: 26px; }
          p { margin: 6px 0; }
          .meta { color: #475569; font-size: 12px; }
          .seed { margin-top: 16px; padding: 14px 16px; border: 1px solid #cbd5e1; border-radius: 12px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; font-weight: 700; }
          tr:nth-child(even) td { background: #f8fafc; }
          pre { margin-top: 20px; padding: 14px; background: #020617; color: #e2e8f0; border-radius: 12px; white-space: pre-wrap; word-break: break-word; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>DataForSEO Keyword Variant Export</h1>
        <p class="meta">Downloaded from DataForSEO at export time</p>
        <p class="meta">Created at: ${generatedAt}</p>
        <p class="meta">Location code: ${result.locationCode} | Language code: ${result.languageCode}</p>

        <div class="seed">
          <strong>Seed keyword:</strong> ${result.seedKeyword}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 56px;">#</th>
              <th>Keyword</th>
              <th style="width: 120px;">Competition</th>
              <th style="width: 140px;">Competition Index</th>
              <th style="width: 120px;">Search Volume</th>
              <th style="width: 120px;">CPC</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <h2 style="margin-top:28px;font-size:18px;">Raw DataForSEO payload</h2>
        <pre>${JSON.stringify(result.rawResponse, null, 2)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>
      </body>
    </html>
  `;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const session = await requireRouteSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { jobId } = await context.params;
  const job = await getJob(jobId, getJobScopeForUser(session.user));

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.researchProvider !== "dataforseo") {
    return NextResponse.json({ error: "This export is only available for DataForSEO jobs." }, { status: 400 });
  }

  const result = await getDataForSeoKeywordVariantResult(job.seedKeyword);
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "doc";

  if (format === "json") {
    const filename = buildDownloadFilename(
      job.seedKeyword,
      `${job.id}-dataforseo-keywords`,
      "json"
    );

    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  }

  const filename = buildDownloadFilename(
    job.seedKeyword,
    `${job.id}-dataforseo-keywords`,
    "doc"
  );

  return new NextResponse(buildKeywordVariantDoc(result), {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
