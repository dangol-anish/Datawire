import type { NodeDefinition, DataTable } from "@/types";
import Papa from "papaparse";

function parseJsonToTable(text: string): DataTable {
  const parsed = JSON.parse(text);

  // Accept DataTable-ish input
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as any).columns) &&
    Array.isArray((parsed as any).rows)
  ) {
    return {
      columns: (parsed as any).columns as string[],
      rows: (parsed as any).rows as Record<string, unknown>[],
    };
  }

  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const first = rows[0];
  const columns =
    first && typeof first === "object" ? Object.keys(first as object) : [];
  return { columns, rows: rows as Record<string, unknown>[] };
}

export const fileInputNode: NodeDefinition = {
  type: "FileInput",
  label: "File Input",
  description: "Load CSV or JSON from a local file (upload per run)",
  color: "#10b981",
  inputs: 0,
  outputs: 1,
  configSchema: [
    {
      key: "format",
      label: "Format",
      type: "select",
      options: ["csv", "json"],
      required: true,
    },
    {
      key: "fileName",
      label: "File",
      type: "text",
      placeholder: "Upload a file…",
      required: true,
    },
  ],
  execute: async (_inputs, config): Promise<DataTable> => {
    const format = (config.format as string) || "csv";
    const fileText = config.__fileText as string | undefined;
    if (!fileText) {
      throw new Error("No file uploaded for this node. Select a file and run.");
    }

    if (format === "json") {
      return parseJsonToTable(fileText);
    }

    const result = Papa.parse(fileText, { header: true, skipEmptyLines: true });
    return {
      columns: result.meta.fields ?? [],
      rows: result.data as Record<string, unknown>[],
    };
  },
};

