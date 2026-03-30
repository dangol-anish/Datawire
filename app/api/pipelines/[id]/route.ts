// app/api/pipelines/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { canEditPipeline, isPipelineOwner } from "@/lib/pipelineAccess";
import { supabaseServer } from "@/lib/supabaseServer";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";

function normaliseGraphJson(raw: unknown) {
  if (typeof raw === "string") {
    // Ensure it's valid JSON and canonicalise.
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("nodes" in parsed) ||
      !("edges" in parsed)
    ) {
      throw new Error("Invalid graph_json");
    }
    return JSON.stringify(parsed);
  }

  if (raw && typeof raw === "object") {
    const parsed = raw as any;
    if (!("nodes" in parsed) || !("edges" in parsed)) {
      throw new Error("Invalid graph_json");
    }
    return JSON.stringify(parsed);
  }

  throw new Error("Invalid graph_json");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

  const body = await req.json().catch(() => ({}));
  const graph_json = body?.graph_json;
  const nameRaw = body?.name;
  const isPublicRaw = body?.is_public;

  const wantsGraph = typeof graph_json !== "undefined";
  const wantsName = typeof nameRaw !== "undefined";
  const wantsVisibility = typeof isPublicRaw !== "undefined";

  if (!wantsGraph && !wantsName && !wantsVisibility) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  if (wantsGraph) {
    const canEdit = await canEditPipeline({
      pipelineId: params.id,
      userId: session.user.id,
    });
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (wantsName || wantsVisibility) {
    const owner = await isPipelineOwner({
      pipelineId: params.id,
      userId: session.user.id,
    });
    if (!owner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const update: Record<string, unknown> = {};

  if (wantsGraph) {
    try {
      update.graph_json = normaliseGraphJson(graph_json);
    } catch (e: any) {
      return NextResponse.json(
        { error: typeof e?.message === "string" ? e.message : "Invalid graph_json" },
        { status: 400 },
      );
    }
  }

  if (wantsName) {
    if (typeof nameRaw !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    const name = nameRaw.trim();
    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    update.name = name.slice(0, 120);
  }

  if (wantsVisibility) {
    if (typeof isPublicRaw !== "boolean") {
      return NextResponse.json({ error: "Invalid is_public" }, { status: 400 });
    }
    update.is_public = isPublicRaw;
  }

  const supabase = supabaseServer;
  const { data, error } = await supabase
    .from("pipelines")
    .update(update)
    .eq("id", params.id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
