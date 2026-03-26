import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/ui/AuthPanel";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <AuthPanel />
    </div>
  );
}
