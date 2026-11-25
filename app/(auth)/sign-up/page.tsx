import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export default async function SignUpPage() {
  if (await getSessionUser()) redirect("/app");
  return (
    <Suspense>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}
