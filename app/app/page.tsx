import { Suspense } from "react";
import { NewChatHome } from "@/components/chat-view";

export default function AppHome() {
  return (
    <Suspense>
      <NewChatHome />
    </Suspense>
  );
}
