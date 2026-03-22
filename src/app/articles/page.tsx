import { WorkflowDashboard } from "@/components/workflow-dashboard";
import { requirePageSession } from "@/lib/auth";

export default async function ArticlesPage({
  searchParams
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  await requirePageSession();
  const params = await searchParams;
  return <WorkflowDashboard initialJobId={params.job ?? ""} initialTab="article" />;
}
