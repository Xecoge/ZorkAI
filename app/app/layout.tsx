import { redirect } from "next/navigation";
import { getSessionUser, ensureSettings } from "@/lib/auth";
import { effectivePlan, roleOf } from "@/lib/admin";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const settings = (await ensureSettings(user.id))!;
  const plan = effectivePlan({ email: user.email, role: user.role, plan: user.plan });
  return (
    <AppShell user={{ ...user, plan, role: roleOf(user) }} initialSettings={settings}>
      {children}
    </AppShell>
  );
}
