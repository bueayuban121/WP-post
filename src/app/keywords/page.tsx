import { WorkflowDashboard } from "@/components/workflow-dashboard";
import { requirePageSession } from "@/lib/auth";

export default async function KeywordsPage({
  searchParams
}: {
  searchParams: Promise<{ job?: string; tab?: "expand" | "research" | "queue" | "article" | "images" }>;
}) {
  await requirePageSession();
  const params = await searchParams;
  return <WorkflowDashboard initialJobId={params.job ?? ""} initialTab={params.tab ?? "expand"} />;
}
