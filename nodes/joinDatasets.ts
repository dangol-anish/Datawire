import type { NodeDefinition, DataTable } from "@/types";

export const joinDatasetsNode: NodeDefinition = {
  type: "JoinDatasets",
  label: "Join Datasets",
  description: "Join two tables on a key column",
  color: "bg-orange-600",
  inputs: 2,
  outputs: 1,
  configSchema: [
    { key: "leftKey", label: "Left Key Column", type: "text", required: true },
    {
      key: "rightKey",
      label: "Right Key Column",
      type: "text",
      required: true,
    },
    {
      key: "joinType",
      label: "Join Type",
      type: "select",
      options: ["inner", "left"],
      required: true,
    },
  ],
  execute: async ([left, right], config): Promise<DataTable> => {
    const { leftKey, rightKey, joinType } = config as Record<string, string>;
    const rightIndex: Record<string, Record<string, unknown>> = {};

    for (const row of right.rows) {
      rightIndex[String(row[rightKey])] = row;
    }

    const rows: Record<string, unknown>[] = [];

    for (const leftRow of left.rows) {
      const key = String(leftRow[leftKey]);
      const rightRow = rightIndex[key];

      if (rightRow) {
        rows.push({ ...leftRow, ...rightRow });
      } else if (joinType === "left") {
        rows.push({ ...leftRow });
      }
    }

    const rightCols = right.columns.filter((c) => c !== rightKey);
    const columns = [...left.columns, ...rightCols];

    return { columns, rows };
  },
};
