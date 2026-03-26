import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

interface Props {
  params: { id: string };
}

export default async function EditorPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { data: pipeline } = await supabaseServer
    .from("pipelines")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!pipeline) notFound();

  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <p className="text-white">Editor coming soon for pipeline: {params.id}</p>
    </div>
  );
}
