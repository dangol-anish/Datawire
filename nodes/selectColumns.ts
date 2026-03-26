import type { NodeDefinition, DataTable } from "@/types";

export const selectColumnsNode: NodeDefinition = {
  type: "SelectColumns",
  label: "Select Columns",
  description: "Keep only specified columns",
  color: "#9333ea",
  inputs: 1,
  outputs: 1,
  configSchema: [
    {
      key: "columns",
      label: "Columns (comma separated)",
      type: "text",
      required: true,
    },
  ],
  execute: async ([input], config): Promise<DataTable> => {
    const selected = (config.columns as string).split(",").map((c) => c.trim());
    const rows = input.rows.map((row) => {
      const newRow: Record<string, unknown> = {};
      for (const col of selected) newRow[col] = row[col];
      return newRow;
    });
    return { columns: selected, rows };
  },
};
