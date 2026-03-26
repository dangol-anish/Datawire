import type { NodeDefinition, DataTable } from "@/types";
import Papa from "papaparse";

export const fetchUrlNode: NodeDefinition = {
  type: "FetchURL",
  label: "Fetch URL",
  description: "Fetch CSV or JSON from a public URL",
  color: "#2563eb",
  inputs: 0,
  outputs: 1,
  configSchema: [
    {
      key: "url",
      label: "URL",
      type: "text",
      placeholder: "https://...",
      required: true,
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      options: ["csv", "json"],
      required: true,
    },
  ],
  execute: async (_inputs, config): Promise<DataTable> => {
    const url = config.url as string;
    const format = config.format as string;

    // Route through our Next.js proxy to avoid CORS issues
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const text = await response.text();

    if (format === "json") {
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return { columns, rows };
    }

    // CSV
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    return {
      columns: result.meta.fields ?? [],
      rows: result.data as Record<string, unknown>[],
    };
  },
};
