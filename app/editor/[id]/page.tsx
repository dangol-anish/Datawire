import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect, notFound } from "next/navigation";
import { canEditPipeline, canViewPipeline, getPipelineByIdForUser } from "@/lib/pipelineAccess";
import { EditorClient } from "./EditorClient";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const pipeline = await getPipelineByIdForUser({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!pipeline) notFound();

  const canEdit = await canEditPipeline({
    pipelineId: params.id,
    userId: session.user.id,
  });

  if (!canEdit) {
    const canView = await canViewPipeline({
      pipelineId: params.id,
      userId: session.user.id,
    });
    if (canView) redirect(`/p/${params.id}`);
    notFound();
  }

  return <EditorClient pipeline={pipeline} />;
}
