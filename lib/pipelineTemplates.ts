import type { GraphJSON, PipelineNode, PipelineEdge } from "@/types";

export type PipelineTemplate = {
  id: string;
  name: string;
  description: string;
  graph_json: GraphJSON;
};

function n(args: {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}): PipelineNode {
  return {
    id: args.id,
    type: args.type,
    position: args.position,
    data: {
      type: args.type,
      label: args.label,
      config: args.config,
    },
  };
}

function e(args: { id: string; source: string; target: string }): PipelineEdge {
  return {
    id: args.id,
    source: args.source,
    target: args.target,
    animated: true,
  } as any;
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: "csv-to-chart",
    name: "CSV → Chart",
    description: "Upload a CSV and render a bar/line/pie chart.",
    graph_json: {
      nodes: [
        n({
          id: "file",
          type: "FileInput",
          label: "File Input",
          position: { x: 120, y: 160 },
          config: { format: "csv", fileName: "data.csv" },
        }),
        n({
          id: "viz",
          type: "Visualise",
          label: "Visualise",
          position: { x: 460, y: 160 },
          config: { chartType: "bar", xColumn: "category", yColumn: "value" },
        }),
      ],
      edges: [e({ id: "e1", source: "file", target: "viz" })],
    },
  },
  {
    id: "fetch-filter-chart",
    name: "Fetch URL → Filter → Chart",
    description: "Fetch CSV/JSON from a URL, filter rows, then chart.",
    graph_json: {
      nodes: [
        n({
          id: "fetch",
          type: "FetchURL",
          label: "Fetch URL",
          position: { x: 100, y: 160 },
          config: { url: "https://example.com/data.csv", format: "csv" },
        }),
        n({
          id: "filter",
          type: "FilterRows",
          label: "Filter Rows",
          position: { x: 440, y: 160 },
          config: { column: "status", operator: "==", value: "active" },
        }),
        n({
          id: "viz",
          type: "Visualise",
          label: "Visualise",
          position: { x: 780, y: 160 },
          config: { chartType: "bar", xColumn: "category", yColumn: "value" },
        }),
      ],
      edges: [
        e({ id: "e1", source: "fetch", target: "filter" }),
        e({ id: "e2", source: "filter", target: "viz" }),
      ],
    },
  },
];

export function getTemplateById(templateId: string) {
  return PIPELINE_TEMPLATES.find((t) => t.id === templateId) ?? null;
}

