import { getBootstrapState, getCurrentSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const bootstrap = await getBootstrapState();
  return <LoginForm requiresSetup={bootstrap.requiresSetup} />;
}
