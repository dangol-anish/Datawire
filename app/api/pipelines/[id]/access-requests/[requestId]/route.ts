import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { isPipelineOwner } from "@/lib/pipelineAccess";
import { createSupabaseRlsClientForUser } from "@/lib/supabaseRlsServer";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; requestId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await isPipelineOwner({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createSupabaseRlsClientForUser(session.user.id);

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string | undefined; // approve|deny
  if (action !== "approve" && action !== "deny") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const nextStatus = action === "approve" ? "approved" : "denied";

  const { data: requestRow, error: reqErr } = await supabase
    .from("pipeline_access_requests")
    .select("id, user_id, status")
    .eq("pipeline_id", params.id)
    .eq("id", params.requestId)
    .single();

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
  if (!requestRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error: updErr } = await supabase
    .from("pipeline_access_requests")
    .update({ status: nextStatus })
    .eq("id", params.requestId);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (action === "approve") {
    const { error: collabErr } = await supabase
      .from("pipeline_collaborators")
      .upsert(
        {
          pipeline_id: params.id,
          user_id: requestRow.user_id,
          role: "editor",
        },
        { onConflict: "pipeline_id,user_id" },
      );
    if (collabErr) return NextResponse.json({ error: collabErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
