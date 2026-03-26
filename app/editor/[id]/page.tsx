import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { EditorClient } from "./EditorClient";

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
    .eq("user_id", session.user.id)
    .single();

  if (!pipeline) notFound();

  return <EditorClient pipeline={pipeline} />;
}
