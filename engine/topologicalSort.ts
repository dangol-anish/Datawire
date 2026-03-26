import type { GraphAdjacency } from "@/types";

export interface SortResult {
  sorted: string[];
  cycleDetected: boolean;
  cycleNodes: string[];
}

export function topologicalSort(adjacency: GraphAdjacency): SortResult {
  const nodeIds = Object.keys(adjacency);
  const inDegree: Record<string, number> = {};

  for (const id of nodeIds) {
    inDegree[id] = adjacency[id].inputs.length;
  }

  // Queue starts with all nodes that have no dependencies
  const queue: string[] = nodeIds.filter((id) => inDegree[id] === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbour of adjacency[current].outputs) {
      inDegree[neighbour]--;
      if (inDegree[neighbour] === 0) {
        queue.push(neighbour);
      }
    }
  }

  // If sorted list is shorter than total nodes, a cycle exists
  if (sorted.length < nodeIds.length) {
    const cycleNodes = nodeIds.filter((id) => !sorted.includes(id));
    return { sorted: [], cycleDetected: true, cycleNodes };
  }

  return { sorted, cycleDetected: false, cycleNodes: [] };
}
