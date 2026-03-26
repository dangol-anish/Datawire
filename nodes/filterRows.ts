import type { NodeDefinition, DataTable } from "@/types";

export const filterRowsNode: NodeDefinition = {
  type: "FilterRows",
  label: "Filter Rows",
  description: "Keep rows matching a condition",
  color: "bg-yellow-600",
  inputs: 1,
  outputs: 1,
  configSchema: [
    { key: "column", label: "Column", type: "text", required: true },
    {
      key: "operator",
      label: "Operator",
      type: "select",
      options: ["==", "!=", ">", "<", ">=", "<=", "contains"],
      required: true,
    },
    { key: "value", label: "Value", type: "text", required: true },
  ],
  execute: async ([input], config): Promise<DataTable> => {
    const { column, operator, value } = config as Record<string, string>;

    const filtered = input.rows.filter((row) => {
      const cell = row[column];
      const cellStr = String(cell);
      const num = Number(cell);
      const valNum = Number(value);

      switch (operator) {
        case "==":
          return cellStr === value;
        case "!=":
          return cellStr !== value;
        case ">":
          return num > valNum;
        case "<":
          return num < valNum;
        case ">=":
          return num >= valNum;
        case "<=":
          return num <= valNum;
        case "contains":
          return cellStr.toLowerCase().includes(value.toLowerCase());
        default:
          return true;
      }
    });

    return { columns: input.columns, rows: filtered };
  },
};
