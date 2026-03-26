import type { NodeDefinition, DataTable } from "@/types";

export const visualiseNode: NodeDefinition = {
  type: "Visualise",
  label: "Visualise",
  description: "Render a chart from the data",
  color: "bg-red-600",
  inputs: 1,
  outputs: 0,
  configSchema: [
    {
      key: "chartType",
      label: "Chart Type",
      type: "select",
      options: ["bar", "line", "scatter"],
      required: true,
    },
    { key: "xColumn", label: "X Axis Column", type: "text", required: true },
    { key: "yColumn", label: "Y Axis Column", type: "text", required: true },
  ],
  // Visualise node passes data through unchanged — rendering is handled
  // by the VisualiseNode UI component which reads from executionStore
  execute: async ([input]): Promise<DataTable> => input,
};
