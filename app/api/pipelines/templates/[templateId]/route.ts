import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { getTemplateById } from "@/lib/pipelineTemplates";
import { supabaseServer } from "@/lib/supabaseServer";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { templateId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  if (!isUuid(userId)) {
    return NextResponse.json(
      { error: "Invalid session user id (expected UUID)" },
      { status: 400 },
    );
  }

  const template = getTemplateById(params.templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const name = `${template.name}`;
  const supabase = supabaseServer;
  const { data, error } = await supabase
    .from("pipelines")
    .insert({
      user_id: userId,
      name,
      graph_json: JSON.stringify(template.graph_json),
      is_public: false,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
