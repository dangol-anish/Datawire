import { supabaseServer } from "@/lib/supabaseServer";

export type CollaboratorRole = "viewer" | "editor";

function normalisePipelineRow<T extends { graph_json?: unknown }>(row: T | null) {
  if (!row) return row;
  const raw = (row as any).graph_json;
  if (typeof raw === "string") {
    try {
      (row as any).graph_json = JSON.parse(raw);
    } catch {
      // Leave as-is; callers will treat it as missing/invalid graph.
    }
  }
  return row;
}

async function getPipelineMetaById(pipelineId: string) {
  const { data, error } = await supabaseServer
    .from("pipelines")
    .select("id, user_id, is_public")
    .eq("id", pipelineId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getPipelineByIdPublic(pipelineId: string) {
  const { data, error } = await supabaseServer
    .from("pipelines")
    .select("*")
    .eq("id", pipelineId)
    .eq("is_public", true)
    .maybeSingle();
  if (error) return null;
  return normalisePipelineRow(data);
}

export async function getPipelineByIdForUser(args: {
  pipelineId: string;
  userId: string;
}) {
  const meta = await getPipelineMetaById(args.pipelineId);
  if (!meta) return null;

  if (meta.is_public || meta.user_id === args.userId) {
    const { data, error } = await supabaseServer
      .from("pipelines")
      .select("*")
      .eq("id", args.pipelineId)
      .maybeSingle();
    if (error) return null;
    return normalisePipelineRow(data);
  }

  const role = await getCollaboratorRole(args);
  if (!role) return null;

  const { data, error } = await supabaseServer
    .from("pipelines")
    .select("*")
    .eq("id", args.pipelineId)
    .maybeSingle();
  if (error) return null;
  return normalisePipelineRow(data);
}

export async function isPipelineOwner(args: {
  pipelineId: string;
  userId: string;
}) {
  const meta = await getPipelineMetaById(args.pipelineId);
  return meta?.user_id === args.userId;
}

export async function getCollaboratorRole(args: {
  pipelineId: string;
  userId: string;
}): Promise<CollaboratorRole | null> {
  const { data, error } = await supabaseServer
    .from("pipeline_collaborators")
    .select("role")
    .eq("pipeline_id", args.pipelineId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (error) return null;

  const role = data?.role;
  return role === "viewer" || role === "editor" ? role : null;
}

export async function canViewPipeline(args: {
  pipelineId: string;
  userId: string;
}) {
  const meta = await getPipelineMetaById(args.pipelineId);
  if (!meta) return false;
  if (meta.is_public) return true;
  if (meta.user_id === args.userId) return true;
  const role = await getCollaboratorRole(args);
  return role === "viewer" || role === "editor";
}

export async function canEditPipeline(args: {
  pipelineId: string;
  userId: string;
}) {
  const meta = await getPipelineMetaById(args.pipelineId);
  if (!meta) return false;
  if (meta.user_id === args.userId) return true;
  const role = await getCollaboratorRole(args);
  return role === "editor";
}
