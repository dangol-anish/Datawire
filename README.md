# Datawire

Datawire is a browser-based **visual data pipeline builder**. You create a graph of nodes (fetch/upload data, transform it, and visualize results), run the graph in a **Web Worker**, and share pipelines via **public links** or **invite links** with viewer/editor access.

This repository is implemented as a **Next.js App Router** application with:
- **NextAuth** for authentication (GitHub + Google OAuth, plus optional email/password).
- **Supabase** as the Postgres datastore (and Supabase Auth Admin API for identity mapping).
- **React Flow** for the node graph UI.
- **Zustand** for editor state (graph, execution results, presence).
- **Chart.js** for visualization rendering.

## Screenshots

If you keep screenshots in `public/`, you can reference them directly:

![Editor](/public/1.png)
![Sharing](/public/2.png)

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Architecture Overview](#architecture-overview)
- [Feature Guide](#feature-guide)
- [Routes](#routes)
- [API Endpoints](#api-endpoints)
- [Database Schema (Supabase)](#database-schema-supabase)
- [Auth and Identity Mapping](#auth-and-identity-mapping)
- [Pipeline Execution Model](#pipeline-execution-model)
- [Nodes](#nodes)
- [Realtime Collaboration](#realtime-collaboration)
- [Security Notes](#security-notes)
- [Deployment (Vercel)](#deployment-vercel)
- [Development Notes](#development-notes)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js (a modern LTS is recommended)
- A Supabase project (Postgres + API keys)
- OAuth credentials for GitHub and/or Google (for OAuth sign-in)

### Install dependencies

```bash
npm install
```

### Configure env vars

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project and OAuth credentials. See the [Environment Variables](#environment-variables) section for details.

### Run the dev server

```bash
npm run dev
```

Then open:

- http://localhost:3000

## Environment Variables

All environment variables are documented in `.env.example`.

### Supabase (required)

- `NEXT_PUBLIC_SUPABASE_URL`
  - Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Public “anon” key used by the browser Supabase client (respects RLS).
- `SUPABASE_SERVICE_ROLE_KEY`
  - Server-only service role key used by server components/route handlers.
  - This **bypasses RLS**. All server queries must enforce access control in code.

### NextAuth (required)

- `NEXTAUTH_SECRET`
  - Secret used by NextAuth for signing/encryption and also used for some collaboration channel hardening.
- `NEXTAUTH_URL`
  - Base URL of the app (e.g. `http://localhost:3000` locally, your production domain on Vercel).

### OAuth providers (optional but recommended)

- GitHub OAuth:
  - `GITHUB_ID`
  - `GITHUB_SECRET`
- Google OAuth:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

### Invite token hashing salt (recommended)

- `INVITE_TOKEN_SALT`
  - Optional additional salt for invite token hashing.
  - If not set, the app falls back to `NEXTAUTH_SECRET`.

### Email/password signup (optional)

Datawire supports signing in with email/password via Supabase Auth. Signup can be enabled/disabled.

There are two related flags:
- `ENABLE_PASSWORD_SIGNUP` (server-side)
  - When set to `true`, `POST /api/auth/signup` is enabled.
- `NEXT_PUBLIC_ENABLE_PASSWORD_SIGNUP` (client-side)
  - When set to `true`, the UI exposes “Create account” mode.

For a consistent UX, set both when enabling signup:

```bash
ENABLE_PASSWORD_SIGNUP="true"
NEXT_PUBLIC_ENABLE_PASSWORD_SIGNUP="true"
```

## Architecture Overview

At a high level:

1. A pipeline is stored in Supabase as a row in `pipelines`.
2. The pipeline graph is stored in `pipelines.graph_json` (serialized JSON).
3. The editor renders and edits the graph using React Flow.
4. When you click “Run”, the editor sends the graph + per-node config to a Web Worker.
5. The worker topologically sorts the graph, executes each node in order, and streams progress/results back to the UI.
6. Results are stored in a Zustand store and displayed per node or via a results drawer.
7. Sharing is implemented via:
   - public view (`/p/[id]`) when `pipelines.is_public = true`
   - invite links (`/invite/[token]`) stored in `pipeline_invites` as a hashed token
   - collaborator roles (`pipeline_collaborators`) with viewer/editor access
   - access requests (`pipeline_access_requests`) for requesting editor privileges

### Key directories

- `app/`
  - Next.js App Router routes, pages, server components, and API route handlers.
- `components/`
  - UI components (editor canvas, sidebar, toolbar, dialogs, marketing, results).
- `engine/`
  - Graph adjacency building, topo sort, and execution loop.
- `nodes/`
  - Node definitions (config schema + `execute` implementation).
- `worker/`
  - Web Worker entry and bridge used by the editor.
- `store/`
  - Zustand stores (graph, execution results, files, presence).
- `types/`
  - Shared TypeScript types for graph, nodes, worker protocol, pipeline shape.
- `lib/`
  - Supabase clients, identity mapping, access checks, templates, token helpers.
- `docs/`
  - Deployment notes and SQL for required tables.

## Feature Guide

### Pipelines

Pipelines are owned by a user and have:
- a name
- a graph (nodes + edges)
- a visibility flag (`is_public`)

The home screen shows:
- Pipelines you own
- Pipelines shared with you (via collaborator role)

The UI also tracks:
- recently opened pipelines (localStorage)
- pinned pipelines (localStorage)

### Editor

The editor is located at:

- `/editor/[id]`

Core editor capabilities:
- Create nodes and connect them with edges (React Flow).
- Configure the selected node in a right sidebar.
- Undo/redo (graph store keeps history/future stacks).
- Save and autosave (best-effort) to Supabase.
- Run the graph in a Web Worker and inspect results per node.
- Share via public links and invite links (owner-only settings and management).
- Realtime collaboration (presence + cursor and best-effort graph event broadcasts).

Important editor behavior notes:
- Local file uploads are stored in memory (Zustand file store) and are not persisted to Supabase.
- Results are streamed from the worker; large results are previewed and paged on demand.

### Read-only view

The read-only view is located at:

- `/p/[id]`

Behavior:
- Public pipelines (`is_public = true`) can be viewed without authentication.
- Private pipelines require you to be a collaborator (viewer/editor) or the owner.
- If you have editor access, the app redirects you to `/editor/[id]`.

Read-only users can:
- Fork the pipeline into their own account (creates a new pipeline row with copied graph).
- Request edit access (creates a pending access request for the owner to approve/deny).

### Sharing and invites

Sharing is controlled by:
- `pipelines.is_public` (public, link-accessible, read-only view)
- `pipeline_collaborators` (explicit access per user with role)
- `pipeline_invites` (invite links granting viewer/editor role)
- `pipeline_access_requests` (request editor access for private pipelines)

Invite links are accepted at:
- `/invite/[token]`

Tokens are stored only as a hash in the database (`token_hash`). The raw token only exists in the invite URL.

## Routes

### Pages

- `/`
  - Signed out: marketing landing page
  - Signed in: pipelines list UI
- `/login`
  - OAuth and/or email+password sign-in
- `/account`
  - Account summary and sign-out
- `/editor/[id]`
  - Full editor (requires editor role)
- `/p/[id]`
  - Read-only view (public or collaborator)
- `/invite/[token]`
  - Invite acceptance

### Auth routes (NextAuth)

- `/api/auth/[...nextauth]`
  - NextAuth route handler (GET/POST)

## API Endpoints

The API is implemented as Next.js route handlers under `app/api/*`.

### Pipelines

- `POST /api/pipelines`
  - Create an empty pipeline for the current user.
- `PATCH /api/pipelines/:id`
  - Update graph JSON and/or pipeline settings (name, public flag).
  - Graph updates require editor permissions; name/visibility changes require ownership.
- `DELETE /api/pipelines/:id`
  - Delete a pipeline (owner only). Performs best-effort cleanup of related rows.

### Templates

- `POST /api/pipelines/templates/:templateId`
  - Create a new pipeline from a built-in template.

### Sharing / collaboration

- `GET /api/pipelines/:id/me`
  - Returns computed permissions: owner, canEdit, canView.
- `POST /api/pipelines/:id/invites`
  - Create an invite link (owner only).
- `GET /api/pipelines/:id/collaborators`
  - List collaborators with best-effort user hydration (owner only).
- `PATCH /api/pipelines/:id/collaborators`
  - Set role or remove collaborator (owner only).
- `POST /api/pipelines/:id/access-requests`
  - Create an access request (viewer requesting editor access).
- `GET /api/pipelines/:id/access-requests`
  - List access requests (owner only).
- `PATCH /api/pipelines/:id/access-requests/:requestId`
  - Approve/deny (owner only). Approve also upserts collaborator role `editor`.

### Forking

- `POST /api/pipelines/:id/fork`
  - Create a copy in your account if you can view the source pipeline.

### Fetch proxy

- `GET /api/proxy?url=...`
  - Server-side fetch proxy used by the `FetchURL` node to avoid CORS issues.
  - Includes SSRF mitigations (blocks private IP ranges, localhost, rebinding checks), rate limiting, redirect and size limits.

## Database Schema (Supabase)

Datawire expects a `pipelines` table and additional tables for sharing.

### Required tables for sharing

The invitation/access-request system requires the SQL in:

- `docs/INVITES_SQL.md`

This includes:
- `pipeline_collaborators`
- `pipeline_invites`
- `pipeline_access_requests`

### Pipelines table

This repo assumes a `pipelines` table exists in `public` with at least:

- `id uuid primary key`
- `user_id uuid not null` (the owner’s Supabase Auth user id)
- `name text not null`
- `graph_json jsonb or text` (the app is tolerant and normalizes to a JSON string when writing)
- `is_public boolean not null default false`
- `created_at timestamptz` (optional but recommended)
- `updated_at timestamptz` (optional; app tolerates missing by falling back to `created_at`)

If your `graph_json` column is `jsonb`, Supabase may return it as an object. The server code normalizes it when needed.

## Auth and Identity Mapping

Datawire uses **NextAuth** for login but uses **Supabase Auth UUIDs** as the canonical user id in the database.

### What `session.user.id` represents

Server components and API routes treat `session.user.id` as a Supabase Auth UUID.

In the NextAuth JWT callback, Datawire ensures `token.id` becomes a Supabase Auth UUID by calling:

- `lib/supabaseIdentity.ts`

This uses Supabase Admin APIs (`supabaseServer.auth.admin.*`) to:
- find an existing user by email or provider metadata, or
- create a new Supabase Auth user if needed

### Optional `profiles` table

For GitHub, the code prefers using a `profiles` table as a stable mapping (if it exists):
- `profiles.id` (uuid, often FK to `auth.users.id`)
- `profiles.github_id` (unique text recommended)

If `profiles` does not exist, the code falls back to scanning Supabase Auth users via `listUsers`.

## Pipeline Execution Model

Execution happens in a **Web Worker** so that data processing does not block the UI.

### Graph representation

- Nodes and edges are React Flow shapes stored as:
  - `types/graph.ts` (`GraphJSON`, `PipelineNode`, `PipelineEdge`)

### Topological sort and execution

- `engine/buildGraph.ts` builds adjacency (inputs/outputs per node).
- `engine/topologicalSort.ts` performs Kahn’s algorithm.
  - If a cycle is detected, the worker emits `CYCLE_DETECTED`.
- `engine/executor.ts` executes nodes in sorted order.

### Worker protocol

Inbound messages:
- `RUN` with `{ graph, configs }`
- `GET_RESULT_PAGE` to page results stored in the worker cache

Outbound messages:
- `NODE_RUNNING`
- `NODE_COMPLETE` (includes preview + `totalRows` and `isPreview`)
- `NODE_ERROR`
- `CYCLE_DETECTED`
- `RUN_COMPLETE`
- `RESULT_PAGE` (paged results for the results modal)

Large results are previewed:
- The worker stores the full result in memory, but sends only a preview (up to a maximum row count) back to the UI immediately.
- The results drawer can request additional pages from the worker on demand.

## Nodes

Nodes are defined in `nodes/*` and registered in `nodes/index.ts`.

Each node is a `NodeDefinition` with:
- metadata: `type`, `label`, `description`, `color`
- IO shape: `inputs` and `outputs`
- config UI schema: `configSchema`
- `execute(inputs, config)` which returns a `DataTable`

Current node types:

- `FileInput`
  - Reads CSV/JSON from a local upload (file content provided at run time).
- `FetchURL`
  - Fetches CSV/JSON via `/api/proxy?url=...` and parses it into a table.
- `FilterRows`
  - Filters rows based on a simple operator set (`==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`).
- `SelectColumns`
  - Selects a subset of columns from a table.
- `GroupBy`
  - Groups rows and computes aggregates (see node implementation for current operators).
- `JoinDatasets`
  - Joins two datasets on key columns (inner/left joins).
- `SortRows`
  - Sorts rows by a column (and direction if supported by config).
- `Visualise`
  - Produces a visualization result. Rendering is implemented in the results drawer via `components/nodes/VisualiseChart.tsx`.

## Realtime Collaboration

Realtime collaboration uses Supabase Realtime channels:
- presence (who is connected)
- cursor broadcasts
- graph event broadcasts (node moved/added/removed, edge changes, config changes, state sync)

The editor hook is:
- `hooks/usePipelineCollaboration.ts`

Notes:
- Collaboration is “best effort” and includes basic event de-duplication and a state request/response mechanism.
- Cursor broadcasting is throttled via `requestAnimationFrame`.
- The UI renders collaborator cursors via `components/canvas/PresenceCursors.tsx`.

## Security Notes

### Supabase service role key

This repo uses `SUPABASE_SERVICE_ROLE_KEY` on the server (`lib/supabaseServer.ts`).

Implications:
- RLS is bypassed for server-side queries.
- All route handlers must enforce authorization explicitly (owner/editor/viewer checks).
- Never import the server client in a client component.

### Fetch proxy and SSRF protections

`GET /api/proxy` exists to avoid CORS issues and to keep node execution in the browser simple.

It includes best-effort protections:
- blocks `localhost` and `.local`
- blocks private IP ranges and link-local addresses
- performs DNS resolution checks to mitigate rebinding attacks
- enforces timeouts, redirect limits, and response size limits
- rate-limits requests in memory

Production deployments should still consider network-level egress restrictions.

### Invite token storage

Invite tokens are never stored in plaintext. Only a SHA-256 hash is stored in `pipeline_invites.token_hash`.

## Deployment (Vercel)

See:
- `docs/DEPLOYMENT_VERCEL.md`

High-level steps:
1. Create Supabase project and apply required SQL (`docs/INVITES_SQL.md`).
2. Configure OAuth providers (GitHub/Google) with proper callback URLs.
3. Set env vars in Vercel:
   - Supabase URL/keys
   - NextAuth secret and URL
   - OAuth credentials
4. Deploy as a Next.js application.

## Development Notes

### Scripts

From `package.json`:
- `npm run dev` (Next dev server)
- `npm run build` (production build)
- `npm run start` (start production server)
- `npm run lint` (ESLint)

### Tailwind

- Tailwind is configured in `tailwind.config.ts`.
- Global CSS lives in `app/globals.css`.

### Worker bundling

The Next.js webpack config sets:

- `config.output.globalObject = "self"`

This is important for Web Worker bundling in some environments.

## Troubleshooting

### “Unauthorized” or “Invalid session user id (expected UUID)”

Many server routes and pages require `session.user.id` to be a Supabase UUID.

Check:
- `NEXTAUTH_SECRET` is set
- Supabase admin API is usable with `SUPABASE_SERVICE_ROLE_KEY`
- Your OAuth logins successfully map to a Supabase Auth user in `lib/supabaseIdentity.ts`

### Invite links not found / cannot accept invite

Check:
- You applied the SQL in `docs/INVITES_SQL.md`
- `INVITE_TOKEN_SALT` and/or `NEXTAUTH_SECRET` matches the environment that created the invite
- The user is logged in and has a UUID user id

### FetchURL node failing

Check:
- `/api/proxy` blocks private hosts, localhost, `.local`, and some redirects
- Response content type must be allowed (CSV/JSON/plain text)
- Response size must be under the configured limit

### “Run pipeline” produces no results

Check:
- Each node has required config filled in (sidebar)
- For `FileInput`, a file is uploaded for that node in the current session
- The graph has no cycles (cycles produce `CYCLE_DETECTED`)

---

If you are new to the codebase, start with:
- `app/editor/[id]/EditorClient.tsx` (end-to-end editor behavior)
- `worker/executionWorker.ts` + `engine/*` (execution)
- `nodes/*` (data transformations)
- `app/api/pipelines/*` (persistence + sharing)
