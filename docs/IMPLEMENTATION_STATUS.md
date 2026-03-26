# Datawire — Implementation Status (What’s done so far)

This document is a **code-based status report**: it describes what is implemented in the current repo at `/Users/anishdangol/Documents/work/datawire`, mapped against your original architecture plan.

> Scope note: this is **not** the target architecture from the plan; it’s what the codebase actually does today.

---

## 1) System Architecture (as-built)

### Tech Stack (planned → actual)

- Frontend — **React + Vite** → **React + Next.js (App Router)**
  - Actual: Next.js `14.2.5`, React `18.x`.
- Backend — **None (all execution client-side)** → **Mixed**
  - Actual: the execution engine is designed for client-side (Worker), but the app currently uses **server components + route handlers** for auth/session and Supabase queries.
- Database + Auth + Realtime — **Supabase (Postgres, Auth, Realtime, Storage)** → **Supabase (Postgres) + NextAuth (GitHub OAuth)**
  - Actual: Supabase is used for database access.
  - Auth is **NextAuth** (GitHub provider), not Supabase Auth.
  - Realtime/presence **types exist**, but collaboration is not wired up.
- Canvas — **React Flow** → **React Flow (present in deps + stores/types), UI not implemented**
- Execution — **Web Workers** → **Implemented (Worker + message protocol), not integrated into UI**
- Data processing — **Custom** → **Custom node implementations exist**
- Charts — **Chart.js** → **Chart.js is installed but not used yet**
- Styling — **Tailwind CSS** → **Tailwind CSS configured**

### Current runtime behavior (what you can do today)

1. GitHub sign-in at `/login`.
2. Session is available at `/api/auth/session`.
3. Home page `/` lists the authenticated user’s pipelines from Supabase (renders as JSON).
4. `/editor/[id]` loads pipeline by id (auth required) but is a placeholder (“Editor coming soon…”).
5. `/p/[id]` loads pipeline by id when `is_public = true` but is a placeholder.
6. `/api/proxy?url=...` fetches an arbitrary URL server-side and returns the body (used by FetchURL node implementation).

---

## 2) Folder Structure (planned → actual)

### Planned
You originally planned a Vite/React layout under `/src`:

- `/src/nodes`, `/src/engine`, `/src/worker`, `/src/store`, `/src/components`, `/src/hooks`, `/src/lib`, `/src/pages`

### Actual (Next.js App Router)
The repository is organized like a Next.js app:

- `app/` — routes/pages (App Router)
  - `app/page.tsx` — Home (pipelines list)
  - `app/login/page.tsx` — Login
  - `app/editor/[id]/page.tsx` — Editor placeholder
  - `app/p/[id]/page.tsx` — SharedView placeholder
  - `app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
  - `app/api/proxy/route.ts` — fetch proxy
- `components/` — UI components (currently only the login button is implemented)
  - `components/ui/LoginButton.tsx`
- `engine/` — DAG builder/sort/executor (implemented)
- `nodes/` — node implementations (implemented)
- `worker/` — Web Worker entry + bridge (implemented)
- `store/` — Zustand stores (implemented)
- `lib/` — NextAuth options, Supabase clients, serializer helpers (implemented)
- `types/` — shared TS types (implemented)
- `hooks/` — exists as a folder but **no hooks implemented yet**

---

## 3) Data Model (planned → current)

### Supabase tables (planned)
You planned:

- `profiles` (`id uuid` FK `auth.users`, etc.)
- `pipelines` (`id uuid`, `user_id` FK to profiles, `graph_json jsonb`, etc.)
- `pipeline_collaborators` (`pipeline_id`, `user_id`, `role`)

### Supabase usage in code (actual)

- The app queries a `pipelines` table from server components using a Supabase client created with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Home page filters pipelines via:
  - `.eq("user_id", session.user.id)`

**Important mismatch vs the plan:**
- `session.user.id` is currently the **GitHub user id string** (e.g. `"154968000"`), coming from NextAuth.
- Your original schema expects `user_id` to be a **uuid** referencing `profiles/auth.users`.

In other words: the code currently assumes `pipelines.user_id` can match a GitHub id string, not a Supabase Auth uuid.

### Graph JSON shape (planned → actual)

Planned save shape:

```json
{
  "nodes": [
    { "id": "n1", "type": "FetchURL", "position": { "x": 100, "y": 200 }, "config": { "url": "..." } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2", "sourceHandle": "output", "targetHandle": "input" }
  ]
}
```

Actual shape in code today:
- The graph types are based on **React Flow** `Node` / `Edge`.
- `PipelineNode` uses `data.config` (not top-level `config`).
- There is a `Pipeline` type that includes `graph_json: GraphJSON`.

However:
- No page currently loads `graph_json` into ReactFlow or renders the canvas.

---

## 4) Node Architecture (planned → status)

### Planned
- Nodes are pure objects with `configSchema` + `execute(inputs, config)`.
- `DataTable` is the universal format.

### Actual (implemented)

✅ Implemented in `types/nodes.ts` and `nodes/*`:

- `DataTable = { columns: string[]; rows: Record<string, unknown>[] }`
- `NodeDefinition` includes:
  - `type`, `label`, `description`, `color`, `inputs`, `outputs`, `configSchema`, `execute(...)`

✅ Node registry exists:
- `nodes/index.ts` exports `NODE_REGISTRY` and `NODE_LIST`.

✅ Node types implemented (from your list)

- `FetchURL` — implemented (`nodes/fetchUrl.ts`)
  - Fetches via `/api/proxy?url=...` and supports `csv` or `json`.
- `FilterRows` — implemented (`nodes/filterRows.ts`)
  - Current implementation uses a simple operator set (`==`, `!=`, `>`, `<`, etc.), not arbitrary expressions.
- `SelectColumns` — implemented
- `GroupBy` — implemented
- `JoinDatasets` — implemented
- `SortRows` — implemented
- `Visualise` — implemented as a pass-through execute (rendering is not implemented)

❌ Not implemented as a separate node
- `ParseCSV` — not a standalone node; CSV parsing happens inside `FetchURL`.

❌ Charts rendering
- Chart.js is installed, but there is no UI component that renders charts yet.

---

## 5) DAG Execution Engine (planned → status)

✅ Implemented as planned (with minor differences) in `engine/`:

- `engine/buildGraph.ts` — builds adjacency list from edges
- `engine/topologicalSort.ts` — Kahn’s algorithm + cycle detection
  - Returns `{ cycleDetected, cycleNodes }` rather than throwing.
- `engine/executor.ts` — executes node-by-node using `NODE_REGISTRY`
  - Maintains a results map keyed by nodeId
  - Emits progress via callbacks: `onNodeStart`, `onNodeComplete`, `onNodeError`

### Config mapping detail (current)
- The executor expects a `configs` map keyed by node id.
- It expects `configs[nodeId].__type` to indicate which node implementation to run.

This config wiring is **not yet produced by any UI**, so it’s currently an internal convention.

---

## 6) Web Worker Protocol (planned → status)

✅ Implemented Worker entry + bridge.

### Messages (actual)

Main → Worker (`types/worker.ts`):

```ts
{ type: "RUN", graph, configs }
{ type: "CANCEL" }
```

Worker → Main:

```ts
{ type: "NODE_RUNNING", nodeId }
{ type: "NODE_COMPLETE", nodeId, result }
{ type: "NODE_ERROR", nodeId, error }
{ type: "CYCLE_DETECTED", nodeIds }
{ type: "RUN_COMPLETE" }
{ type: "RUN_CANCELLED" }
```

✅ The Worker runs topo sort + executor and streams progress.

❌ Not connected to UI
- No page currently instantiates the Worker or updates UI state from these messages.

---

## 7) Zustand Store Shape (planned → status)

### Planned
You planned one combined global store handling:
- graph state, execution results, selected node, pipeline metadata, presence

### Actual
Stores exist but are split across modules:

✅ Graph store (`store/graphStore.ts`)
- `nodes`, `edges`, `onNodesChange`, `onEdgesChange`
- `selectedNodeId`, `updateNodeConfig`
- **undo/redo** is already implemented via `history`/`future` stacks

✅ Execution store (`store/executionStore.ts`)
- `results`, `errors`, per-node statuses, pipeline status

✅ Presence store (`store/presenceStore.ts`)
- collaborator map + set/remove/clear

❌ Store is not wired to UI yet
- No ReactFlow canvas or sidebar currently uses these stores.
- No `runPipeline` action exists in stores yet; execution is not triggered from UI.

---

## 8) Supabase Realtime Collaboration (planned → status)

### Planned
- Two channels per pipeline: graph broadcast + presence

### Actual
✅ Collaboration-related types exist:
- Broadcast event types and presence shape are defined in `lib/realtimeChannel.ts`.

❌ Not implemented end-to-end
- No code currently subscribes to channels, broadcasts mutations, or tracks presence.
- No cursor rendering components exist.

---

## 9) Auth Flow (planned → actual)

### Planned
- GitHub OAuth via **Supabase Auth**
- Client checks `supabase.auth.getSession()`

### Actual
- GitHub OAuth via **NextAuth**
- Server components call `getServerSession(authOptions)` to protect routes.
- `SessionProvider` is added at the root so client components can use NextAuth hooks.

---

## 10) Shareable URL Architecture (planned → status)

### Planned
- `/p/[uuid]` loads graph read-only when `is_public = true`

### Actual
✅ Route exists:
- `/p/[id]` checks `is_public = true` in Supabase query.

❌ Read-only ReactFlow canvas is not implemented
- Current route renders placeholder text only.

---

## 11) Build Order (your plan) — progress snapshot

- Step 1 — Project scaffold: **DONE (but using Next.js instead of Vite)**
- Step 2 — Static canvas with hardcoded nodes: **NOT STARTED (UI canvas not present)**
- Step 3 — Node config sidebar: **NOT STARTED (no editor UI yet)**
- Step 4 — Implement 3 core nodes: **PARTIAL/DONE**
  - FetchURL + FilterRows exist; Visualise exists but only as a pass-through (no chart rendering)
- Step 5 — DAG engine: **DONE**
- Step 6 — Web Worker integration: **DONE (engine runs in Worker), NOT WIRED to UI**
- Step 7 — Remaining node types: **DONE (Select/Group/Join/Sort implemented)**
- Step 8 — Supabase persistence: **PARTIAL**
  - Auth exists (NextAuth), pipelines can be listed/loaded
  - No save/upsert UI exists; no editor UI exists
- Step 9 — Real-time collaboration: **NOT STARTED (types only)**
- Step 10 — Polish: **PARTIAL (undo/redo exists in store)**

---

## 12) Environment variables referenced by the code

- GitHub OAuth:
  - `GITHUB_ID`
  - `GITHUB_SECRET`
- NextAuth:
  - `NEXTAUTH_SECRET` (needed for stable JWT/JWE decryption across runs)
- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 13) Notable implementation notes / risks

- `lib/supabaseServer.ts` uses the **service role key** (bypasses RLS). It must remain server-only.
- `app/api/proxy/route.ts` is an unauthenticated server-side fetch proxy (SSRF/open-proxy risk) and should be restricted before production.


---

## Appendix A — Project folder structure (as of today)

```
.
├─ app/
│  ├─ api/
│  │  ├─ auth/
│  │  │  └─ [...nextauth]/
│  │  │     └─ route.ts
│  │  ├─ proxy/
│  │  │  └─ route.ts
│  │  ├─ editor/
│  │  │  └─ [id]/
│  │  │     └─ page.tsx
│  │  ├─ login/
│  │  │  └─ page.tsx
│  │  ├─ p/
│  │  │  └─ [id]/
│  │  │     └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ providers.tsx
├─ components/
│  ├─ canvas/               (empty)
│  ├─ nodes/                (empty)
│  ├─ sidebar/              (empty)
│  ├─ toolbar/              (empty)
│  └─ ui/
│     └─ LoginButton.tsx
├─ docs/
│  └─ IMPLEMENTATION_STATUS.md
├─ engine/
│  ├─ buildGraph.ts
│  ├─ executor.ts
│  ├─ index.ts
│  └─ topologicalSort.ts
├─ hooks/                   (empty)
├─ lib/
│  ├─ nextAuthOptions.ts
│  ├─ realtimeChannel.ts
│  ├─ serialiser.ts
│  ├─ supabaseClient.ts
│  └─ supabaseServer.ts
├─ nodes/
│  ├─ fetchUrl.ts
│  ├─ filterRows.ts
│  ├─ groupBy.ts
│  ├─ index.ts
│  ├─ joinDatasets.ts
│  ├─ selectColumns.ts
│  ├─ sortRows.ts
│  └─ visualise.ts
├─ public/
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ store/
│  ├─ executionStore.ts
│  ├─ graphStore.ts
│  ├─ index.ts
│  └─ presenceStore.ts
├─ types/
│  ├─ graph.ts
│  ├─ index.ts
│  ├─ next-auth.d.ts
│  ├─ nodes.ts
│  ├─ pipeline.ts
│  └─ worker.ts
├─ worker/
│  ├─ executionWorker.ts
│  └─ workerBridge.ts
├─ .env.local
├─ .gitignore
├─ AGENTS.md
├─ CLAUDE.md
├─ eslint.config.mjs
├─ next-env.d.ts
├─ nextjs.config.js
├─ package-lock.json
├─ package.json
├─ postcss.config.js
├─ tailwind.config.ts
└─ tsconfig.json
```

Notes:
- `node_modules/`, `.next/`, and `.git/` are omitted from the tree.
- `components/*` folders exist but are mostly placeholders right now.
