import { WorkflowDashboard } from "@/components/workflow-dashboard";

export default async function ArticlesPage({
  searchParams
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const params = await searchParams;
  return <WorkflowDashboard initialJobId={params.job ?? ""} initialTab="article" />;
}
