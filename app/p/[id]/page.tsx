import { supabaseServer } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";

interface Props {
  params: { id: string };
}

export default async function SharedPipelinePage({ params }: Props) {
  const { data: pipeline } = await supabaseServer
    .from("pipelines")
    .select("*")
    .eq("id", params.id)
    .eq("is_public", true)
    .single();

  if (!pipeline) notFound();

  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <p className="text-white">Shared view: {pipeline.name}</p>
    </div>
  );
}
