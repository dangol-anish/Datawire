// app/p/[id]/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import { SharedViewClient } from "./SharedViewClient";

export default async function SharedViewPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: pipeline } = await supabaseServer
    .from("pipelines")
    .select("*")
    .eq("id", params.id)
    .eq("is_public", true)
    .single();

  if (!pipeline) notFound();
  return <SharedViewClient pipeline={pipeline} />;
}
