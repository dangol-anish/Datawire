import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect, notFound } from "next/navigation";
import { canEditPipeline, canViewPipeline, getPipelineById } from "@/lib/pipelineAccess";
import { EditorClient } from "./EditorClient";

interface Props {
  params: { id: string };
}

export default async function EditorPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const pipeline = await getPipelineById(params.id).catch(() => null);
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
