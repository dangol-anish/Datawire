import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { supabaseServer } from "@/lib/supabaseServer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json(
      { error: "Invalid session user id (expected UUID)" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseServer
    .from("pipelines")
    .insert({
      user_id: userId,
      name: "Untitled pipeline",
      graph_json: { nodes: [], edges: [] },
      is_public: false,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

