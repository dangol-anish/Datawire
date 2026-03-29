import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { hashInviteToken } from "@/lib/inviteTokens";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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

  const supabase = supabaseServer;

  const { data: invite, error } = await supabase
    .from("pipeline_invites")
    .select("pipeline_id, role, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !invite) {
    return (
      <main className="min-h-screen bg-canvas text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6">
          <h1 className="text-lg font-semibold">Invite link not found</h1>
          <p className="text-sm text-slate-400 mt-2">
            This invite link is invalid, expired, or was created on a different
            environment.
          </p>
          {process.env.NODE_ENV !== "production" && error?.message && (
            <pre className="mt-4 text-xs text-slate-300 whitespace-pre-wrap">
              {error.message}
            </pre>
          )}
        </div>
      </main>
    );
  }

  if (invite.revoked_at) {
    return (
      <main className="min-h-screen bg-canvas text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6">
          <h1 className="text-lg font-semibold">Invite link revoked</h1>
          <p className="text-sm text-slate-400 mt-2">
            Ask the owner to create a new invite link.
          </p>
        </div>
      </main>
    );
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return (
      <main className="min-h-screen bg-canvas text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6">
          <h1 className="text-lg font-semibold">Invite link expired</h1>
          <p className="text-sm text-slate-400 mt-2">
            Ask the owner to create a new invite link.
          </p>
        </div>
      </main>
    );
  }

  // Upsert collaborator, do not downgrade editor->viewer.
  const { data: existing } = await supabase
    .from("pipeline_collaborators")
    .select("role")
    .eq("pipeline_id", invite.pipeline_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  const existingRole = existing?.role === "editor" ? "editor" : existing?.role === "viewer" ? "viewer" : null;
  const desiredRole = invite.role === "editor" ? "editor" : "viewer";
  const finalRole = existingRole === "editor" ? "editor" : desiredRole;

  const { error: upsertError } = await supabase
    .from("pipeline_collaborators")
    .upsert(
    {
      pipeline_id: invite.pipeline_id,
      user_id: session.user.id,
      role: finalRole,
    },
    { onConflict: "pipeline_id,user_id" },
  );

  if (upsertError) {
    return (
      <main className="min-h-screen bg-canvas text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6">
          <h1 className="text-lg font-semibold">Could not accept invite</h1>
          <p className="text-sm text-slate-400 mt-2">
            The invite was found, but we couldn’t grant access in the database.
            This usually means the required tables/columns weren’t created exactly.
          </p>
          <pre className="mt-4 text-xs text-slate-300 whitespace-pre-wrap">
            {upsertError.message}
          </pre>
          <p className="text-xs text-slate-500 mt-4 font-mono">
            pipeline_id={invite.pipeline_id} user_id={session.user.id} role={finalRole}
          </p>
        </div>
      </main>
    );
  }

  redirect(finalRole === "editor" ? `/editor/${invite.pipeline_id}` : `/p/${invite.pipeline_id}`);
}
