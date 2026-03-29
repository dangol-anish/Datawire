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

export const dynamic = "force-dynamic";

export default async function SharedViewPage({
  params,
}: {
  params: { id: string };
}) {
  // Public pipelines can be viewed without auth. Private pipelines require collaborator access.
  const pipeline = await getPipelineByIdPublic(params.id);
  if (!pipeline) notFound();

  const session = await getServerSession(authOptions);

  // If the user has edit access, prefer the editor route over the shared view.
  if (session?.user?.id) {
    const canEdit = await canEditPipeline({
      pipelineId: params.id,
      userId: session.user.id,
    });
    if (canEdit) redirect(`/editor/${params.id}`);
  }

  if (pipeline.is_public) {
    return <SharedViewClient pipeline={pipeline} />;
  }

  if (!session) notFound();

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
