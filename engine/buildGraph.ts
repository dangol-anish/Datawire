import type { GraphJSON, GraphAdjacency } from "@/types";

export function buildGraph(graph: GraphJSON): GraphAdjacency {
  const adjacency: GraphAdjacency = {};

  // Initialise every node with empty input/output lists
  for (const node of graph.nodes) {
    adjacency[node.id] = { inputs: [], outputs: [] };
  }

  // Populate from edges
  for (const edge of graph.edges) {
    adjacency[edge.source].outputs.push(edge.target);
    adjacency[edge.target].inputs.push(edge.source);
  }

  return adjacency;
}
