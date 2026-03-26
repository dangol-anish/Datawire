import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { data: pipelines } = await supabaseServer
    .from("pipelines")
    .select("id, name, is_public, created_at, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  return (
    <main className="min-h-screen bg-canvas p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Your Pipelines</h1>
        <pre className="text-white text-sm">
          {JSON.stringify(pipelines, null, 2)}
        </pre>
      </div>
    </main>
  );
}
