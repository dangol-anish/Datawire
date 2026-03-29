import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function base64UrlToBytes(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  // eslint-disable-next-line no-undef
  return new Uint8Array(Buffer.from(b64 + pad, "base64"));
}

let cachedSigningKey: Uint8Array | null = null;

async function getSupabaseJwtSigningKey() {
  if (cachedSigningKey) return cachedSigningKey;

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Missing SUPABASE_JWT_SECRET. Set it from Supabase Project Settings → API → JWT Secret.",
    );
  }

  // Supabase sometimes displays the JWT secret as `sb_secret_<base64url>`.
  // In that case, the signing key is the decoded bytes of the suffix.
  if (secret.startsWith("sb_secret_")) {
    const rest = secret.slice("sb_secret_".length);
    try {
      cachedSigningKey = base64UrlToBytes(rest);
      return cachedSigningKey;
    } catch {
      // fall through
    }
  }

  // Default: treat as a raw string secret.
  cachedSigningKey = new TextEncoder().encode(secret);
  return cachedSigningKey;
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
    .sign(await getSupabaseJwtSigningKey());
}

export async function createSupabaseRlsClientForUser(
  userId: string,
): Promise<SupabaseClient> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  let token: string | null = null;
  try {
    token = await mintSupabaseAccessToken(userId);
  } catch (e: any) {
    // Developer experience fallback:
    // If local env vars are mismatched (common after rotating JWT secret), keep the app usable in dev by
    // falling back to the service role key (bypasses RLS). Production should NOT do this.
    const isProd = process.env.NODE_ENV === "production";
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isProd && svc) {
      // eslint-disable-next-line no-console
      console.warn(
        "[datawire] Supabase RLS JWT mint failed; falling back to service role for local dev only:",
        typeof e?.message === "string" ? e.message : e,
      );
      return createClient(url, svc, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    }
    throw e;
  }

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
