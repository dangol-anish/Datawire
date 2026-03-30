import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { canViewPipeline, isPipelineOwner } from "@/lib/pipelineAccess";
import { supabaseServer } from "@/lib/supabaseServer";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isUuid(session.user.id)) {
    return NextResponse.json(
      { error: "Invalid session user id (expected UUID)" },
      { status: 400 },
    );
  }
  if (!isUuid(params.id)) {
    return NextResponse.json(
      { error: "Invalid pipeline id (expected UUID)" },
      { status: 400 },
    );
  }

  // Must at least be able to view to request.
  const ok = await canViewPipeline({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseServer;
  const { error } = await supabase.from("pipeline_access_requests").upsert(
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
  if (!isUuid(session.user.id)) {
    return NextResponse.json(
      { error: "Invalid session user id (expected UUID)" },
      { status: 400 },
    );
  }
  if (!isUuid(params.id)) {
    return NextResponse.json(
      { error: "Invalid pipeline id (expected UUID)" },
      { status: 400 },
    );
  }

  const owner = await isPipelineOwner({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseServer;
  const primary = await supabase
    .from("pipeline_access_requests")
    .select("id, user_id, status, created_at")
    .eq("pipeline_id", params.id)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return NextResponse.json({ requests: primary.data ?? [] });
  }

  // Be tolerant of schemas that omit timestamp columns.
  if (primary.error.message.toLowerCase().includes("created_at")) {
    const fallback = await supabase
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
