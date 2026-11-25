"use client";

import { PrivacyChoicesCard } from "@/components/privacy-footer";

export default function PrivacyChoicesPage() {
  return (
    <div className="min-h-dvh bg-pane flex items-start justify-center py-10 px-4">
      <PrivacyChoicesCard onClose={() => history.back()} />
    </div>
  );
}
