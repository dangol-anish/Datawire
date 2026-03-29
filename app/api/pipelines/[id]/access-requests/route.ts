import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { supabaseServer } from "@/lib/supabaseServer";
import { canViewPipeline, isPipelineOwner } from "@/lib/pipelineAccess";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Must at least be able to view to request.
  const ok = await canViewPipeline({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabaseServer.from("pipeline_access_requests").upsert(
    {
      pipeline_id: params.id,
      user_id: session.user.id,
      requested_role: "editor",
      status: "pending",
    },
    { onConflict: "pipeline_id,user_id,status" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await isPipelineOwner({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const primary = await supabaseServer
    .from("pipeline_access_requests")
    .select("id, user_id, status, created_at")
    .eq("pipeline_id", params.id)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return NextResponse.json({ requests: primary.data ?? [] });
  }

  // Be tolerant of schemas that omit timestamp columns.
  if (primary.error.message.toLowerCase().includes("created_at")) {
    const fallback = await supabaseServer
      .from("pipeline_access_requests")
      .select("id, user_id, status")
      .eq("pipeline_id", params.id);
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    return NextResponse.json({ requests: fallback.data ?? [] });
  }

  return NextResponse.json({ error: primary.error.message }, { status: 500 });
}
