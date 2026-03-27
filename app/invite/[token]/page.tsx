import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { hashInviteToken } from "@/lib/inviteTokens";

export default async function InviteAcceptPage({
  params,
}: {
  params: { token: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${params.token}`)}`);
  }

  const tokenHash = hashInviteToken(params.token);

  const { data: invite, error } = await supabaseServer
    .from("pipeline_invites")
    .select("pipeline_id, role, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !invite) notFound();

  if (invite.revoked_at) notFound();
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    notFound();
  }

  // Upsert collaborator, do not downgrade editor->viewer.
  const { data: existing } = await supabaseServer
    .from("pipeline_collaborators")
    .select("role")
    .eq("pipeline_id", invite.pipeline_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  const existingRole = existing?.role === "editor" ? "editor" : existing?.role === "viewer" ? "viewer" : null;
  const desiredRole = invite.role === "editor" ? "editor" : "viewer";
  const finalRole = existingRole === "editor" ? "editor" : desiredRole;

  await supabaseServer.from("pipeline_collaborators").upsert(
    {
      pipeline_id: invite.pipeline_id,
      user_id: session.user.id,
      role: finalRole,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pipeline_id,user_id" },
  );

  redirect(finalRole === "editor" ? `/editor/${invite.pipeline_id}` : `/p/${invite.pipeline_id}`);
}

