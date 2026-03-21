import { WorkflowDashboard } from "@/components/workflow-dashboard";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ job?: string; tab?: "expand" | "research" | "queue" | "article" | "images" }>;
}) {
  const params = await searchParams;
  return <WorkflowDashboard initialJobId={params.job ?? ""} initialTab={params.tab ?? "expand"} />;
}
