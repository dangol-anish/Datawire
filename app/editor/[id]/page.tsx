import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect, notFound } from "next/navigation";
import { canEditPipeline, canViewPipeline, getPipelineByIdForUser } from "@/lib/pipelineAccess";
import { EditorClient } from "./EditorClient";
import { createHmac } from "crypto";

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

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET (required for collaboration channel hardening)");
  }
  const collabRoom = createHmac("sha256", secret)
    .update(`pipeline:${pipeline.id}`)
    .digest("base64url")
    .slice(0, 32);

  return <EditorClient pipeline={pipeline} collabRoom={collabRoom} />;
}
