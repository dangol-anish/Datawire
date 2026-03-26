import type { GraphJSON } from "./graph";

export interface Pipeline {
  id: string;
  user_id: string;
  name: string;
  graph_json: GraphJSON;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineCollaborator {
  pipeline_id: string;
  user_id: string;
  role: "editor" | "viewer";
}

export interface PipelineSummary {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  node_count: number;
}
