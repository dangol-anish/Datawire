// app/p/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { SharedViewClient } from "./SharedViewClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import {
  canEditPipeline,
  canViewPipeline,
  getPipelineByIdForUser,
  getPipelineByIdPublic,
} from "@/lib/pipelineAccess";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

export default async function SharedViewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  // If the user has edit access, prefer the editor route over the shared view.
  if (session?.user?.id && isUuid(session.user.id) && isUuid(params.id)) {
    const canEdit = await canEditPipeline({
      pipelineId: params.id,
      userId: session.user.id,
    });
    if (canEdit) redirect(`/editor/${params.id}`);
  }

  // Public pipelines can be viewed without auth.
  const publicPipeline = await getPipelineByIdPublic(params.id);
  if (publicPipeline) {
    return <SharedViewClient pipeline={publicPipeline} />;
  }

  // Private pipelines require collaborator access.
  if (!session) notFound();
  if (!isUuid(session.user.id)) notFound();
  if (!isUuid(params.id)) notFound();

  const ok = await canViewPipeline({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!ok) notFound();

  // If private, load the full pipeline row for the viewer/editor.
  const authedPipeline = await getPipelineByIdForUser({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!authedPipeline) notFound();

  return <SharedViewClient pipeline={authedPipeline} />;
}
