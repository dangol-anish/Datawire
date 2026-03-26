import type { NodeDefinition, DataTable } from "@/types";

export const sortRowsNode: NodeDefinition = {
  type: "SortRows",
  label: "Sort Rows",
  description: "Sort rows by a column",
  color: "#db2777",
  inputs: 1,
  outputs: 1,
  configSchema: [
    { key: "column", label: "Column", type: "text", required: true },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: ["asc", "desc"],
      required: true,
    },
  ],
  execute: async ([input], config): Promise<DataTable> => {
    const { column, direction } = config as Record<string, string>;

    const sorted = [...input.rows].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      const isNumeric = !isNaN(aNum) && !isNaN(bNum);

      if (isNumeric) {
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      return direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return { columns: input.columns, rows: sorted };
  },
};
