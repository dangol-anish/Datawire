import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { supabaseServer } from "@/lib/supabaseServer";
import { generateInviteToken, hashInviteToken } from "@/lib/inviteTokens";
import { isPipelineOwner } from "@/lib/pipelineAccess";
import { getRequestOrigin } from "@/lib/requestOrigin";

type InviteRole = "viewer" | "editor";

export async function POST(
  req: NextRequest,
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
  const role: InviteRole = body?.role === "editor" ? "editor" : "viewer";
  const expiresAt: string | null = body?.expiresAt ?? null;

  const token = generateInviteToken();
  const token_hash = hashInviteToken(token);

  const { error } = await supabaseServer.from("pipeline_invites").insert({
    pipeline_id: params.id,
    created_by: session.user.id,
    role,
    token_hash,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inviteUrl = `${getRequestOrigin(req)}/invite/${token}`;
  return NextResponse.json({ inviteUrl, role, expiresAt });
}
