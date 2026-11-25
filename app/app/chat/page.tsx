import { redirect } from "next/navigation";

// `/app/chat/<id>` is the conversation route; `/app/chat` itself has no UI.
// Keep it a real page so the link prefix can never 404 — send people home.
export default function ChatIndex() {
  redirect("/app");
}
