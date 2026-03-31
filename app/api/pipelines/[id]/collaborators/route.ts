import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { isPipelineOwner } from "@/lib/pipelineAccess";
import { supabaseServer } from "@/lib/supabaseServer";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";

type UserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
};

async function hydrateUserSummaries(userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter((id) => isUuid(id))));
  if (unique.length === 0) return new Map<string, UserSummary>();

  const results = await Promise.all(
    unique.map(async (id) => {
      const { data, error } = await supabaseServer.auth.admin.getUserById(id);
      if (error || !data?.user) return [id, null] as const;
      const meta = (data.user as any)?.user_metadata as
        | Record<string, unknown>
        | undefined;
      const name =
        (typeof meta?.name === "string" ? meta?.name : null) ??
        (typeof meta?.full_name === "string" ? meta?.full_name : null) ??
        null;
      const avatarUrl =
        (typeof meta?.avatar_url === "string" ? meta?.avatar_url : null) ?? null;
      return [
        id,
        {
          id,
          email: typeof data.user.email === "string" ? data.user.email : null,
          name,
          avatar_url: avatarUrl,
        } satisfies UserSummary,
      ] as const;
    }),
  );

  const map = new Map<string, UserSummary>();
  for (const [id, summary] of results) {
    if (summary) map.set(id, summary);
  }
  return map;
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
    .from("pipeline_collaborators")
    .select("user_id, role, created_at")
    .eq("pipeline_id", params.id)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    const rows = primary.data ?? [];
    const users = await hydrateUserSummaries(rows.map((r) => r.user_id));
    const hydrated = rows.map((r) => ({
      ...r,
      user: users.get(r.user_id) ?? null,
    }));
    return NextResponse.json({ collaborators: hydrated });
  }

  // Be tolerant of schemas that omit timestamp columns.
  if (primary.error.message.toLowerCase().includes("created_at")) {
    const fallback = await supabase
      .from("pipeline_collaborators")
      .select("user_id, role")
      .eq("pipeline_id", params.id);
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    const rows = fallback.data ?? [];
    const users = await hydrateUserSummaries(rows.map((r) => r.user_id));
    const hydrated = rows.map((r) => ({
      ...r,
      user: users.get(r.user_id) ?? null,
    }));
    return NextResponse.json({ collaborators: hydrated });
  }

  return NextResponse.json({ error: primary.error.message }, { status: 500 });
}

export async function PATCH(
  req: Request,
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

  const body = await req.json().catch(() => ({}));
  const userId = body?.userId as string | undefined;
  const action = body?.action as string | undefined; // "setRole" | "remove"
  const role = body?.role as string | undefined; // viewer|editor

  if (!userId || !action) {
    return NextResponse.json({ error: "Missing userId/action" }, { status: 400 });
  }
  if (!isUuid(userId)) {
    return NextResponse.json(
      { error: "Invalid userId (expected UUID)" },
      { status: 400 },
    );
  }

  if (action === "remove") {
    const { error } = await supabase
      .from("pipeline_collaborators")
      .delete()
      .eq("pipeline_id", params.id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "setRole") {
    const nextRole = role === "editor" ? "editor" : "viewer";
    const { error } = await supabase.from("pipeline_collaborators").upsert(
      {
        pipeline_id: params.id,
        user_id: userId,
        role: nextRole,
      },
      { onConflict: "pipeline_id,user_id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
