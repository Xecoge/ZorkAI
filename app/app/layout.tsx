import { redirect } from "next/navigation";
import { getSessionUser, ensureSettings } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const settings = (await ensureSettings(user.id))!;
  return (
    <AppShell user={user} initialSettings={settings}>
      {children}
    </AppShell>
  );
}
