import { supabaseServer } from "@/lib/supabaseServer";

export type CollaboratorRole = "viewer" | "editor";

export async function getPipelineById(pipelineId: string) {
  const { data, error } = await supabaseServer
    .from("pipelines")
    .select("*")
    .eq("id", pipelineId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function isPipelineOwner(args: {
  pipelineId: string;
  userId: string;
}) {
  const pipeline = await getPipelineById(args.pipelineId);
  return pipeline?.user_id === args.userId;
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

  if (error) {
    // If the table isn't set up yet, treat as no access rather than crashing.
    return null;
  }

  const role = data?.role;
  return role === "viewer" || role === "editor" ? role : null;
}

export async function canViewPipeline(args: {
  pipelineId: string;
  userId: string;
}) {
  const pipeline = await getPipelineById(args.pipelineId);
  if (!pipeline) return false;
  if (pipeline.is_public) return true;
  if (pipeline.user_id === args.userId) return true;
  const role = await getCollaboratorRole(args);
  return role === "viewer" || role === "editor";
}

export async function canEditPipeline(args: {
  pipelineId: string;
  userId: string;
}) {
  const pipeline = await getPipelineById(args.pipelineId);
  if (!pipeline) return false;
  if (pipeline.user_id === args.userId) return true;
  const role = await getCollaboratorRole(args);
  return role === "editor";
}

