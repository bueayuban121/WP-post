import { WorkflowDashboard } from "@/components/workflow-dashboard";
import { listManagedUsers, requirePageSession } from "@/lib/auth";

export default async function ArticlesPage({
  searchParams
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const currentUser = await requirePageSession();
  const managedUsers = currentUser.role === "admin" ? await listManagedUsers() : [];
  const params = await searchParams;
  return (
    <WorkflowDashboard
      currentUser={currentUser}
      initialJobId={params.job ?? ""}
      initialTab="article"
      managedUsers={managedUsers}
      pageMode="articles"
    />
  );
}
