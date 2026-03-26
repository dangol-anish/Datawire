// app/api/pipelines/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { graph_json } = body;

  if (!graph_json) {
    return NextResponse.json({ error: "Missing graph_json" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("pipelines")
    .update({ graph_json, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
