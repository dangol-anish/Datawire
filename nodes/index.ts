import { fetchUrlNode } from "./fetchUrl";
import { filterRowsNode } from "./filterRows";
import { selectColumnsNode } from "./selectColumns";
import { groupByNode } from "./groupBy";
import { joinDatasetsNode } from "./joinDatasets";
import { sortRowsNode } from "./sortRows";
import { visualiseNode } from "./visualise";
import { fileInputNode } from "./fileInput";
import type { NodeDefinition } from "@/types";

export const NODE_REGISTRY: Record<string, NodeDefinition> = {
  FileInput: fileInputNode,
  FetchURL: fetchUrlNode,
  FilterRows: filterRowsNode,
  SelectColumns: selectColumnsNode,
  GroupBy: groupByNode,
  JoinDatasets: joinDatasetsNode,
  SortRows: sortRowsNode,
  Visualise: visualiseNode,
};

// List used by NodePalette to render the drag-and-drop menu
export const NODE_LIST = Object.values(NODE_REGISTRY);
