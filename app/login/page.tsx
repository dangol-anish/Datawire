import { signIn } from "next-auth/react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/ui/LoginButton";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <div className="rounded-xl border border-border bg-surface p-10 flex flex-col items-center gap-6 w-80">
        <h1 className="text-2xl font-bold">Pipeline Builder</h1>
        <p className="text-sm text-gray-400 text-center">
          Build visual data pipelines that run entirely in your browser.
        </p>
        <LoginButton />
      </div>
    </div>
  );
}

// Separate client component just for the button since signIn is client-side
