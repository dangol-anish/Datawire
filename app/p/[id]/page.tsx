// app/p/[id]/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import { SharedViewClient } from "./SharedViewClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { canViewPipeline, getPipelineById } from "@/lib/pipelineAccess";

export default async function SharedViewPage({
  params,
}: {
  params: { id: string };
}) {
  // Public pipelines can be viewed without auth. Private pipelines require collaborator access.
  const pipeline = await getPipelineById(params.id).catch(() => null);
  if (!pipeline) notFound();

  if (pipeline.is_public) {
    return <SharedViewClient pipeline={pipeline} />;
  }

  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const ok = await canViewPipeline({
    pipelineId: params.id,
    userId: session.user.id,
  });
  if (!ok) notFound();

  return <SharedViewClient pipeline={pipeline} />;
}
