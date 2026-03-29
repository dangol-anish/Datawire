// app/p/[id]/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import { notFound, redirect } from "next/navigation";
import { SharedViewClient } from "./SharedViewClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { canEditPipeline, canViewPipeline, getPipelineById } from "@/lib/pipelineAccess";

export default async function SharedViewPage({
  params,
}: {
  params: { id: string };
}) {
  // Public pipelines can be viewed without auth. Private pipelines require collaborator access.
  const pipeline = await getPipelineById(params.id).catch(() => null);
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

  return <SharedViewClient pipeline={pipeline} />;
}
