import { DashboardClient } from "@/components/dashboard-client";

export default function DashboardPage() {
  return (
    <div className="max-w-[764px] mx-auto px-4 py-16">
      <h1 className="text-[26px] font-semibold tracking-tight mb-6">Dashboard</h1>
      <DashboardClient />
    </div>
  );
}
