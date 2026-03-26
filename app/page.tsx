import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { HomeClient } from "./HomeClient";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { data: pipelines } = await supabaseServer
    .from("pipelines")
    .select("id, name, is_public, created_at, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  return (
    <HomeClient
      pipelines={(pipelines ?? []) as any}
      user={{
        name: session.user?.name,
        email: session.user?.email,
        image: session.user?.image,
      }}
    />
  );
}
