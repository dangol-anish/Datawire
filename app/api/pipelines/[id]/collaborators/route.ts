import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { supabaseServer } from "@/lib/supabaseServer";
import { isPipelineOwner } from "@/lib/pipelineAccess";

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

  const { data, error } = await supabaseServer
    .from("pipeline_collaborators")
    .select("user_id, role, created_at, updated_at")
    .eq("pipeline_id", params.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collaborators: data ?? [] });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await isPipelineOwner({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = body?.userId as string | undefined;
  const action = body?.action as string | undefined; // "setRole" | "remove"
  const role = body?.role as string | undefined; // viewer|editor

  if (!userId || !action) {
    return NextResponse.json({ error: "Missing userId/action" }, { status: 400 });
  }

  if (action === "remove") {
    const { error } = await supabaseServer
      .from("pipeline_collaborators")
      .delete()
      .eq("pipeline_id", params.id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "setRole") {
    const nextRole = role === "editor" ? "editor" : "viewer";
    const { error } = await supabaseServer.from("pipeline_collaborators").upsert(
      {
        pipeline_id: params.id,
        user_id: userId,
        role: nextRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pipeline_id,user_id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

