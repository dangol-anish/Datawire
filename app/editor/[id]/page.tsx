import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect, notFound } from "next/navigation";
import { canEditPipeline, getPipelineById } from "@/lib/pipelineAccess";
import { EditorClient } from "./EditorClient";

interface Props {
  params: { id: string };
}

export default async function EditorPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const canEdit = await canEditPipeline({
    pipelineId: params.id,
    userId: session.user.id,
  });

  if (!canEdit) notFound();

  const pipeline = await getPipelineById(params.id);
  if (!pipeline) notFound();

  return <EditorClient pipeline={pipeline} />;
}
