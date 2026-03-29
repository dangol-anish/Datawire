import {
  createSupabaseRlsClientForUser,
  createSupabaseRlsPublicClient,
} from "@/lib/supabaseRlsServer";

export type CollaboratorRole = "viewer" | "editor";

export async function getPipelineByIdPublic(pipelineId: string) {
  const supabase = createSupabaseRlsPublicClient();
  const { data, error } = await supabase
    .from("pipelines")
    .select("*")
    .eq("id", pipelineId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getPipelineByIdForUser(args: {
  pipelineId: string;
  userId: string;
}) {
  const supabase = await createSupabaseRlsClientForUser(args.userId);
  const { data, error } = await supabase
    .from("pipelines")
    .select("*")
    .eq("id", args.pipelineId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function isPipelineOwner(args: {
  pipelineId: string;
  userId: string;
}) {
  const pipeline = await getPipelineByIdForUser(args);
  return pipeline?.user_id === args.userId;
}

export async function getCollaboratorRole(args: {
  pipelineId: string;
  userId: string;
}): Promise<CollaboratorRole | null> {
  const supabase = await createSupabaseRlsClientForUser(args.userId);
  const { data, error } = await supabase
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
  // With RLS, a user can view if they can SELECT the pipeline row.
  const pipeline = await getPipelineByIdForUser(args);
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
  const pipeline = await getPipelineByIdForUser(args);
  if (!pipeline) return false;
  if (pipeline.user_id === args.userId) return true;
  const role = await getCollaboratorRole(args);
  return role === "editor";
}
