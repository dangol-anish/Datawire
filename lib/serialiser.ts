import type { GraphJSON } from "@/types";

export function serialiseGraph(graph: GraphJSON): string {
  return JSON.stringify(graph);
}

export function deserialiseGraph(raw: string): GraphJSON {
  const parsed = JSON.parse(raw);
  if (!parsed.nodes || !parsed.edges) {
    throw new Error("Invalid graph JSON: missing nodes or edges");
  }
  return parsed as GraphJSON;
}
