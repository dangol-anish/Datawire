import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getJwtSecretBytes() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Missing SUPABASE_JWT_SECRET. This is required to run Supabase with RLS using NextAuth sessions.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function mintSupabaseAccessToken(userId: string) {
  // Short-lived token for server-to-Supabase queries.
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 10; // 10 min

  return await new SignJWT({
    role: "authenticated",
    aud: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getJwtSecretBytes());
}

export async function createSupabaseRlsClientForUser(
  userId: string,
): Promise<SupabaseClient> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const token = await mintSupabaseAccessToken(userId);

  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export function createSupabaseRlsPublicClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

