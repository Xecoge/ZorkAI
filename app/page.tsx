import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LandingHome } from "./landing-home";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/app");
  return <LandingHome />;
}
