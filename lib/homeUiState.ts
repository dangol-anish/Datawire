"use client";

type RecentPipeline = {
  id: string;
  name: string;
  href: string;
  accessedAt: number;
};

const RECENT_KEY = "dw_recent_pipelines";
const PINNED_KEY = "dw_pinned_pipeline_ids";

function scopedKey(base: string, scope?: string | null) {
  const suffix = scope && typeof scope === "string" ? scope : "global";
  return `${base}:${suffix}`;
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readRecentPipelines(scope?: string | null): RecentPipeline[] {
  try {
    const parsed = safeParseJson<unknown>(
      window.localStorage.getItem(scopedKey(RECENT_KEY, scope)),
    );
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((v) => {
        if (!v || typeof v !== "object") return null;
        const o = v as any;
        if (
          typeof o.id !== "string" ||
          typeof o.name !== "string" ||
          typeof o.href !== "string" ||
          typeof o.accessedAt !== "number"
        ) {
          return null;
        }
        return { id: o.id, name: o.name, href: o.href, accessedAt: o.accessedAt };
      })
      .filter(Boolean) as RecentPipeline[];
  } catch {
    return [];
  }
}

export function recordRecentPipeline(input: {
  scope?: string | null;
  id: string;
  name: string;
  href: string;
}): RecentPipeline[] {
  const nextEntry: RecentPipeline = {
    id: input.id,
    name: input.name,
    href: input.href,
    accessedAt: Date.now(),
  };

  const key = scopedKey(RECENT_KEY, input.scope);
  const existing = readRecentPipelines(input.scope).filter((p) => p.id !== input.id);
  const next = [nextEntry, ...existing].slice(0, 5);

  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }

  return next;
}

export function clearRecentPipelines(scope?: string | null): void {
  try {
    window.localStorage.removeItem(scopedKey(RECENT_KEY, scope));
  } catch {
    // ignore
  }
}

export function readPinnedPipelineIds(scope?: string | null): string[] {
  try {
    const parsed = safeParseJson<unknown>(
      window.localStorage.getItem(scopedKey(PINNED_KEY, scope)),
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string") as string[];
  } catch {
    return [];
  }
}

export function setPinnedPipelineIds(scope: string | null | undefined, ids: string[]): void {
  try {
    window.localStorage.setItem(scopedKey(PINNED_KEY, scope), JSON.stringify(ids));
  } catch {
    // ignore
  }
}
