import type { Node, Edge } from "reactflow";

export interface NodeConfig {
  [key: string]: unknown;
}

export interface PipelineNode extends Node {
  data: {
    type: string;
    label: string;
    config: NodeConfig;
  };
}

export type PipelineEdge = Edge;

export interface GraphJSON {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface GraphAdjacency {
  [nodeId: string]: {
    inputs: string[];
    outputs: string[];
  };
}
