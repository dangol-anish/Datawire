import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/ui/AuthPanel";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-56 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.55), rgba(99,102,241,0) 60%)",
          }}
        />
        <div
          className="absolute -bottom-56 left-0 h-[520px] w-[520px] rounded-full blur-3xl opacity-25"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(34,197,94,0.45), rgba(34,197,94,0) 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <AuthPanel />
      </div>
    </div>
  );
}
