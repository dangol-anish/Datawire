import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { canEditPipeline, canViewPipeline, isPipelineOwner } from "@/lib/pipelineAccess";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";

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

  const [owner, canEdit, canView] = await Promise.all([
    isPipelineOwner({ pipelineId: params.id, userId: session.user.id }),
    canEditPipeline({ pipelineId: params.id, userId: session.user.id }),
    canViewPipeline({ pipelineId: params.id, userId: session.user.id }),
  ]);

  return NextResponse.json({
    userId: session.user.id,
    isOwner: owner,
    canEdit,
    canView,
  });
}
