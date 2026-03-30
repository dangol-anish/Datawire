import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const SIGNUP_ENABLED = process.env.ENABLE_PASSWORD_SIGNUP === "true";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }
  if (existing.count >= limit) {
    return { ok: false as const, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  if (!SIGNUP_ENABLED) {
    // Hide the endpoint when disabled (safer default for production deploys).
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 },
    );
  }

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
    // Safer default: require email confirmation (or use OAuth).
    email_confirm: false,
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
