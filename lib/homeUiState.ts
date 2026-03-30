"use client";

type RecentPipeline = {
  id: string;
  name: string;
  href: string;
  accessedAt: number;
};

const RECENT_KEY = "dw_recent_pipelines";
const PINNED_KEY = "dw_pinned_pipeline_ids";

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readRecentPipelines(): RecentPipeline[] {
  try {
    const parsed = safeParseJson<unknown>(window.localStorage.getItem(RECENT_KEY));
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

  const existing = readRecentPipelines().filter((p) => p.id !== input.id);
  const next = [nextEntry, ...existing].slice(0, 5);

  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  return next;
}

export function readPinnedPipelineIds(): string[] {
  try {
    const parsed = safeParseJson<unknown>(window.localStorage.getItem(PINNED_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string") as string[];
  } catch {
    return [];
  }
}

export function setPinnedPipelineIds(ids: string[]): void {
  try {
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

