import { WorkflowDashboard } from "@/components/workflow-dashboard";
import { listManagedUsers, requirePageSession } from "@/lib/auth";

export default async function KeywordsPage({
  searchParams
}: {
  searchParams: Promise<{ job?: string; tab?: "expand" | "research" | "queue" | "article" | "images" }>;
}) {
  const currentUser = await requirePageSession();
  const managedUsers = currentUser.role === "admin" ? await listManagedUsers() : [];
  const params = await searchParams;
  return (
    <WorkflowDashboard
      currentUser={currentUser}
      initialJobId={params.job ?? ""}
      initialTab={params.tab ?? "expand"}
      managedUsers={managedUsers}
    />
  );
}
