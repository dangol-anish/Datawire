import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { isUuid } from "@/lib/uuid";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";

const MAX_REDIRECTS = 3;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const TIMEOUT_MS = 15_000;

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
    return { ok: false as const };
  }
  existing.count += 1;
  return { ok: true as const };
}

function isPrivateIp(ip: string) {
  const ipType = net.isIP(ip);
  if (ipType === 4) {
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 127) return true;
    if (a === 10) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 255) return true;
    // Explicit metadata ip
    if (ip === "169.254.169.254") return true;
    return false;
  }

  if (ipType === 6) {
    const host = ip.toLowerCase();
    if (host === "::" || host === "::1") return true;
    if (host.startsWith("fe80:")) return true; // link-local
    if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique local (fc00::/7)
    // IPv4-mapped v6
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }

  // Not an IP string: treat as unsafe if we got here
  return true;
}

async function isHostSafeToFetch(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local")) return false;

  // If user supplied an IP directly, evaluate it.
  if (net.isIP(host) !== 0) {
    return !isPrivateIp(host);
  }

  // DNS rebinding mitigation: resolve and block any private/link-local results.
  // Note: this is best-effort; production-grade SSRF defense should include
  // egress restrictions at the network layer.
  const [a, aaaa] = await Promise.allSettled([
    dns.resolve4(host),
    dns.resolve6(host),
  ]);

  const ips: string[] = [];
  if (a.status === "fulfilled") ips.push(...a.value);
  if (aaaa.status === "fulfilled") ips.push(...aaaa.value);

  if (ips.length === 0) return false;
  return ips.every((ip) => !isPrivateIp(ip));
}

function isAllowedContentType(contentType: string | null) {
  if (!contentType) return false;
  const ct = contentType.toLowerCase().split(";")[0].trim();
  if (ct === "application/json") return true;
  if (ct.endsWith("+json")) return true;
  if (ct === "text/plain") return true;
  if (ct === "text/csv") return true;
  if (ct === "text/tab-separated-values") return true;
  return false;
}

async function readTextWithLimit(response: Response, maxBytes: number) {
  // Prefer stream reading so we can enforce a hard cap.
  const body: any = response.body;
  if (!body) return "";

  let received = 0;
  const chunks: Uint8Array[] = [];

  if (typeof body.getReader === "function") {
    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value as Uint8Array;
      received += chunk.byteLength;
      if (received > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        throw new Error("RESPONSE_TOO_LARGE");
      }
      chunks.push(chunk);
    }
  } else if (Symbol.asyncIterator in body) {
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      received += chunk.byteLength;
      if (received > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
      chunks.push(chunk);
    }
  } else {
    // Fallback: no way to enforce cap besides reading it (avoid).
    const text = await response.text();
    if (text.length > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
    return text;
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local")) return true;
  return false;
}

function isBlockedIp(hostname: string) {
  // IPv4 checks (only if hostname itself is an IP string)
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (a === 0 || a === 127) return true;
    if (a === 10) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // IPv6 checks (only if hostname itself is an IP string)
  const host = hostname.toLowerCase();
  if (host === "::1") return true;
  if (host.startsWith("fe80:")) return true; // link-local
  if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique local (fc00::/7)
  return false;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUuid(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Basic abuse prevention (in-memory, best-effort).
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(`proxy:${session.user.id}:${ip}`, 60, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 },
    );
  }

  try {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only http(s) URLs are allowed" },
        { status: 400 },
      );
    }

    if (parsed.username || parsed.password) {
      return NextResponse.json(
        { error: "URL credentials are not allowed" },
        { status: 400 },
      );
    }

    if (isBlockedHostname(parsed.hostname) || isBlockedIp(parsed.hostname)) {
      return NextResponse.json({ error: "Blocked host" }, { status: 400 });
    }

    const startedAt = Date.now();

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const remaining = TIMEOUT_MS - (Date.now() - startedAt);
      if (remaining <= 0) {
        return NextResponse.json({ error: "Fetch timed out" }, { status: 504 });
      }

      const safe = await isHostSafeToFetch(parsed.hostname);
      if (!safe) {
        return NextResponse.json({ error: "Blocked host" }, { status: 400 });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), remaining);

      let response: Response;
      try {
        response = await fetch(parsed.toString(), {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            // Avoid leaking cookies or auth headers.
            "User-Agent": "datawire-proxy/1.0",
            Accept: "text/csv, application/json, text/plain;q=0.9, */*;q=0.1",
          },
        });
      } finally {
        clearTimeout(timeout);
      }

      // Handle redirects manually to enforce max count and validate each hop.
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        const loc = response.headers.get("location")!;
        try {
          parsed = new URL(loc, parsed);
        } catch {
          return NextResponse.json({ error: "Invalid redirect" }, { status: 502 });
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json(
            { error: "Only http(s) URLs are allowed" },
            { status: 400 },
          );
        }
        if (parsed.username || parsed.password) {
          return NextResponse.json(
            { error: "URL credentials are not allowed" },
            { status: 400 },
          );
        }
        continue;
      }

      const contentType = response.headers.get("Content-Type");
      if (!isAllowedContentType(contentType)) {
        return NextResponse.json(
          {
            error:
              "Blocked content-type. Only CSV, JSON, and plain text responses are allowed.",
          },
          { status: 415 },
        );
      }

      let text: string;
      try {
        text = await readTextWithLimit(response, MAX_BYTES);
      } catch (e: any) {
        if (e?.message === "RESPONSE_TOO_LARGE") {
          return NextResponse.json(
            { error: `Response too large (max ${MAX_BYTES} bytes).` },
            { status: 413 },
          );
        }
        throw e;
      }

      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": contentType ?? "text/plain",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ error: "Too many redirects" }, { status: 508 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 });
  }
}
