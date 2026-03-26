export interface DataTable {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface NodeExecutionError {
  nodeId: string;
  message: string;
}

export type NodeExecutionResult = DataTable | NodeExecutionError;

export function isExecutionError(
  result: NodeExecutionResult,
): result is NodeExecutionError {
  return "message" in result && "nodeId" in result;
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "select" | "multiselect" | "expression";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  color: string;
  inputs: number;
  outputs: number;
  configSchema: ConfigField[];
  execute: (
    inputs: DataTable[],
    config: Record<string, unknown>,
  ) => Promise<DataTable>;
}
