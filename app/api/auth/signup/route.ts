import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.trim()?.toLowerCase();
  const password = body?.password as string | undefined;
  const name = (body?.name as string | undefined)?.trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Missing email or password" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name ?? null,
    },
  });

  if (error || !data.user?.id) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create user" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

