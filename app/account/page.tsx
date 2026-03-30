import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { redirect } from "next/navigation";
import { AccountClient } from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AccountClient
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }}
    />
  );
}

