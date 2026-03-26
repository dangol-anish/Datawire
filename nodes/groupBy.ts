import type { NodeDefinition, DataTable } from "@/types";

export const groupByNode: NodeDefinition = {
  type: "GroupBy",
  label: "Group By",
  description: "Group rows and aggregate a column",
  color: "#16a34a",
  inputs: 1,
  outputs: 1,
  configSchema: [
    {
      key: "groupColumn",
      label: "Group By Column",
      type: "text",
      required: true,
    },
    {
      key: "aggColumn",
      label: "Aggregate Column",
      type: "text",
      required: true,
    },
    {
      key: "aggFunc",
      label: "Function",
      type: "select",
      options: ["sum", "avg", "count", "min", "max"],
      required: true,
    },
  ],
  execute: async ([input], config): Promise<DataTable> => {
    const { groupColumn, aggColumn, aggFunc } = config as Record<
      string,
      string
    >;
    const groups: Record<string, number[]> = {};

    for (const row of input.rows) {
      const key = String(row[groupColumn]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(Number(row[aggColumn]));
    }

    const rows = Object.entries(groups).map(([key, values]) => {
      let agg: number;
      switch (aggFunc) {
        case "sum":
          agg = values.reduce((a, b) => a + b, 0);
          break;
        case "avg":
          agg = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case "count":
          agg = values.length;
          break;
        case "min":
          agg = Math.min(...values);
          break;
        case "max":
          agg = Math.max(...values);
          break;
        default:
          agg = 0;
      }
      return { [groupColumn]: key, [`${aggFunc}(${aggColumn})`]: agg };
    });

    return {
      columns: [groupColumn, `${aggFunc}(${aggColumn})`],
      rows,
    };
  },
};
