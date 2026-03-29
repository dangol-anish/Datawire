import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { HomeClient } from "./HomeClient";
import { PIPELINE_TEMPLATES } from "@/lib/pipelineTemplates";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const supabase = supabaseServer;

  const ownedPrimary = await supabase
    .from("pipelines")
    .select("id, name, is_public, created_at, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  const owned =
    !ownedPrimary.error
      ? ownedPrimary.data ?? []
      : ownedPrimary.error.message.toLowerCase().includes("updated_at")
        ? (
            await supabase
              .from("pipelines")
              .select("id, name, is_public, created_at")
              .eq("user_id", session.user.id)
              .order("created_at", { ascending: false })
          ).data ?? []
        : [];

  // Pipelines shared with me (best-effort if the collaborators table exists).
  let shared: any[] = [];
  const collabRows = await supabase
    .from("pipeline_collaborators")
    .select("pipeline_id, role")
    .eq("user_id", session.user.id);

  if (!collabRows.error && (collabRows.data?.length ?? 0) > 0) {
    const ids = Array.from(new Set(collabRows.data!.map((r) => r.pipeline_id)));
    const sharedPipelines = await supabase
      .from("pipelines")
      .select("id, name, is_public, created_at, updated_at, user_id")
      .in("id", ids);

    if (!sharedPipelines.error) {
      const roleById = new Map(
        collabRows.data!.map((r) => [r.pipeline_id, r.role]),
      );
      shared = (sharedPipelines.data ?? []).map((p) => ({
        ...p,
        role: roleById.get(p.id) ?? "viewer",
      }));
    }
  }

  return (
    <HomeClient
      pipelines={owned as any}
      sharedPipelines={shared as any}
      templates={PIPELINE_TEMPLATES}
      user={{
        name: session.user?.name,
        email: session.user?.email,
        image: session.user?.image,
      }}
    />
  );
}
