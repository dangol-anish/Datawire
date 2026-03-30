import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { canViewPipeline, getPipelineByIdForUser } from "@/lib/pipelineAccess";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json(
      { error: "Invalid session user id (expected UUID)" },
      { status: 400 },
    );
  }

  const ok = await canViewPipeline({ pipelineId: params.id, userId });
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const source = await getPipelineByIdForUser({
    pipelineId: params.id,
    userId,
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = supabaseServer;
  const { data, error } = await supabase
    .from("pipelines")
    .insert({
      user_id: userId,
      name: `${source.name} (Fork)`,
      graph_json: JSON.stringify(source.graph_json),
      is_public: false,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
