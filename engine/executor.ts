import type { GraphAdjacency, DataTable, NodeDefinition } from "@/types";
import { NODE_REGISTRY } from "@/nodes";

export type ExecutionResultMap = Record<string, DataTable | Error>;

export async function execute(
  sortedNodeIds: string[],
  adjacency: GraphAdjacency,
  configs: Record<string, Record<string, unknown>>,
  onNodeStart: (nodeId: string) => void,
  onNodeComplete: (nodeId: string, result: DataTable) => void,
  onNodeError: (nodeId: string, error: string) => void,
): Promise<ExecutionResultMap> {
  const results: ExecutionResultMap = {};

  for (const nodeId of sortedNodeIds) {
    onNodeStart(nodeId);

    // Collect DataTable outputs from all input nodes
    const inputTables: DataTable[] = adjacency[nodeId].inputs
      .map((inputId) => results[inputId])
      .filter(
        (r): r is DataTable => r instanceof Error === false,
      ) as DataTable[];

    // Find the node definition from registry
    const nodeType = configs[nodeId]?.__type as string;
    const definition: NodeDefinition | undefined = NODE_REGISTRY[nodeType];

    if (!definition) {
      const err = `Unknown node type: ${nodeType}`;
      results[nodeId] = new Error(err);
      onNodeError(nodeId, err);
      continue;
    }

    try {
      const result = await definition.execute(
        inputTables,
        configs[nodeId] ?? {},
      );
      results[nodeId] = result;
      onNodeComplete(nodeId, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[nodeId] = new Error(message);
      onNodeError(nodeId, message);
    }
  }

  return results;
}
