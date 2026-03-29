import type { NextRequest } from "next/server";

function firstHeaderValue(v: string | null) {
  if (!v) return null;
  // Vercel/Proxies can provide comma-separated values.
  return v.split(",")[0]?.trim() || null;
}

export function getRequestOrigin(req: NextRequest) {
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"));

  const proto =
    forwardedProto ||
    (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "https");
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;

  return `${proto}://${host}`;
}

