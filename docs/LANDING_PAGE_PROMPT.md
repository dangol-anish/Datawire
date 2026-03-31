<!--
  Datawire Landing Page Prompt
  Purpose: give a design/website generation model enough detail to create a conversion-focused landing page
  that matches the existing app UI and feature set.
-->

# Datawire — Landing Conversion Page (Design AI Prompt + Full Spec)

Use this document as the single source of truth for generating a **high-converting marketing landing page** for **Datawire**. The landing page must **match the product UI** (dark, indigo-accent, premium SaaS vibe) and accurately reflect capabilities.

## 1) What Datawire is (Product Summary)

**Datawire** is a browser-based visual data pipeline builder.

Users build pipelines by placing **nodes** on a canvas and connecting them with edges. Pipelines run in the browser (via a background worker) and produce tabular results and charts. Users can save pipelines, share read-only views, collaborate, and manage access.

### Core mental model
- **Data in** (CSV/JSON upload or fetch from URL)
- **Transform** (filter/select/sort/group/join)
- **Visualise** (bar/line/pie chart)
- **Inspect results** (table with pagination + chart preview)

## 2) Audience + Positioning

Target users (landing copy should speak to them):
- Analysts / operators who want quick, repeatable transforms without writing code
- Engineers and PMs who need fast exploration + shareable pipelines
- Anyone who needs “ETL-like” workflows without standing up infrastructure

Positioning:
- **“Notebooks without the notebook overhead.”**
- **“Data transformations as a visual graph.”**
- **“Run locally in the browser; share what you built.”**

## 3) Brand + Visual System (Must Match App UI)

### 3.1 Color palette (authoritative)
These are Tailwind-extended tokens used by the app:
- `canvas`: `#0f1117` (page background)
- `surface`: `#1a1d27` (cards/panels)
- `border`: `#2a2d3a` (borders/dividers)
- `accent`: `#6366f1` (primary CTA, highlights)

Additional “UI metal” colors frequently used in the app’s inline styles (use them to match):
- Panel background: `#0d0f14`
- Card background: `#161b27`
- Dark border: `#1e2330`
- Elevated border: `#2a3347`
- Deep surface: `#0b0d12`
- Success: `#22c55e` (green)
- Warning: `#f59e0b` (amber)
- Error: `#ef4444` (red)
- Slate text spectrum:
  - Primary text: `#ffffff` / `text-white`
  - Secondary: `#cbd5e1` (slate-300)
  - Muted: `#94a3b8` / `#64748b` / `#475569`
  - Dim: `#3d4f6e`

### 3.2 Typography
Match the app’s tone:
- Default: modern sans (`font-sans`)
- Use high-contrast headings with modest tracking
- Use **uppercase micro-headings** often: `text-xs font-semibold uppercase tracking-widest`
- Body: `text-sm` with slate-muted color

### 3.3 Shape language + elevation
- Corner radius: prefer `rounded-xl` and `rounded-2xl` (premium SaaS)
- Borders: thin, subtle (1px) with `border` or `#1e2330`
- Shadows: soft but deep (`boxShadow` like `0 30px 120px rgba(0,0,0,0.65)`)

### 3.4 Background motifs (recommended)
Use the same motifs as the login screen:
- Subtle **radial gradient blobs** (indigo + emerald) with blur
- A **dot-grid overlay** at low opacity

### 3.5 Iconography (must)
- Use Lucide-style line icons (the app uses `react-icons/lu`)
- Primary “brand mark” icon: **workflow** glyph (e.g., `LuWorkflow`)
- Use icons next to features, steps, and CTAs (tastefully)

## 4) Product Features (Must Be Represented)

### 4.1 Node types (exact set)
Show this as a “Node Library” section with cards that match in-app node styling:
**Sources**
- **File Input**: load CSV or JSON via local upload (per run)
- **Fetch URL**: fetch CSV or JSON from a public URL (proxied server-side to avoid CORS)

**Transforms**
- **Filter Rows**: operators `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`
- **Select Columns**: choose columns to keep
- **Sort Rows**: sort by a column `asc` or `desc`
- **Group By**: group by column + aggregate (`sum`, `avg`, `count`, `min`, `max`)
- **Join Datasets**: join 2 tables (`inner`, `left`) on key columns

**Visualise**
- **Visualise**: chart types `Bar`, `Line`, `Pie`

### 4.2 Results experience
Show and describe:
- Results drawer/modal with:
  - Chart preview for visualise
  - Table preview with **pagination** (25/50/100/250 per page)
  - “Preview” indicator when only a UI preview is cached

### 4.3 Performance & reliability story (conversion-friendly)
- Pipelines run in the browser using a background worker (fast + responsive UI)
- Large results are handled efficiently:
  - UI receives a preview
  - Pages are fetched on-demand

### 4.4 Sharing & collaboration
Must mention:
- Public / private pipelines
- Read-only share view
- Fork a pipeline
- Invite links (viewer/editor)
- Request edit access (owner approves/denies)
- Live collaboration indicator (Live / Connecting / Offline)

### 4.5 Auth methods
Must mention:
- Email/password sign-in
- Google OAuth
- GitHub OAuth

## 5) Landing Page Goals (Conversion)

Primary conversion:
- “Start building” / “Create pipeline” / “Sign in”

Secondary conversion:
- “View a demo pipeline”
- “See templates”
- “Read docs / security”

Trust:
- Security posture for URL fetch proxy (safe-by-default messaging)
- No heavy infrastructure required to start

## 6) Page IA (Information Architecture) — Required Sections

Create a single-page landing with these sections (in this order):

1. **Hero**
2. **Social proof / credibility strip** (even if placeholder)
3. **How it works** (3 steps)
4. **Node library** (the 8 nodes)
5. **Templates** (2 templates: CSV→Chart, Fetch URL→Filter→Chart)
6. **Results & visualisation** (charts + paginated table)
7. **Collaboration & sharing**
8. **Security / proxy guardrails**
9. **FAQ**
10. **Final CTA**
11. **Footer**

## 7) Copywriting (Ready-to-use)

### 7.1 Hero copy (pick one)
Option A:
- H1: **Visual data pipelines. In your browser.**
- Sub: Upload or fetch data, transform it with nodes, and chart the result — then share the pipeline with your team.

Option B:
- H1: **Turn CSVs into insights with a workflow you can see.**
- Sub: Build repeatable transforms and charts using a node graph. No setup, no servers — just run.

### 7.2 Hero CTAs
Primary button (accent indigo):
- **Get started**

Secondary button (outline):
- **View demo pipeline**

Microcopy:
- “Runs in the browser. Shareable. Built for collaboration.”

### 7.3 How it works (3-step)
1) **Load**: Upload CSV/JSON or fetch from a URL  
2) **Transform**: Filter, select, sort, group, and join datasets  
3) **Visualise**: Create bar/line/pie charts and inspect tables

### 7.4 Collaboration section bullets
- Share read-only views
- Fork pipelines
- Invite collaborators (viewer/editor)
- Request edit access with approvals

### 7.5 Security section bullets
- URL fetching via server proxy to avoid CORS
- Blocks unsafe hosts/IPs and enforces size limits (conversion framing: “guardrails built in”)

### 7.6 FAQ (starter set)
- “Does it run locally?” (Runs in-browser; pipelines execute client-side in a worker.)
- “What data formats are supported?” (CSV + JSON.)
- “Can I share pipelines?” (Public/private, read-only view, fork, invites.)
- “Is it fast with large datasets?” (Preview + on-demand paging.)
- “Do I need to install anything?” (No.)

## 8) UI/Component Requirements (Match Existing UI)

### Buttons
- Primary: indigo `#6366f1`, subtle border, hover slightly brighter
- Secondary: dark surface with `border: #1e2330` and `hover:bg-white/5`

### Cards / Panels
- Background: `#161b27` or `bg-surface`
- Border: `#1e2330` or `border-border`
- Rounded: `rounded-2xl`

### Input styling
- Dark input background `#0d0f14`
- Border `#2a3347`
- Left icon inside input

### Motion
- Subtle transitions only:
  - hover background/border shifts
  - drawer-like transitions

## 9) “Screenshots / Images We Can Show” (Must Include in Design)

Use real product screenshots (or faithful mock screenshots) in these placements. The landing page should reference these explicitly:

### Image set (recommended)
1. **Editor canvas overview**  
   - Shows node palette (left), graph canvas (center), toolbar (top), configuration panel (right or drawer), minimap/controls.
2. **Node card close-up**  
   - One node card with color accent bar, type label, and status icon on the right (check/cross/spinner).
3. **Results modal**  
   - Chart preview at top (bar chart), paginated table below, “Rows/page” selector and Prev/Next.
4. **Pie chart with scrollable legend**  
   - Pie chart with legend panel on the right.
5. **Home dashboard**  
   - Grid/list of pipelines, pinned items, templates section (CSV→Chart and Fetch URL→Filter→Chart).
6. **Share dialog**  
   - Public/private toggle, invite link creation, collaborators list, access requests.
7. **Read-only shared view**  
   - A pipeline opened in viewer mode, with “Fork” and “Request edit access”.
8. **Auth screen**  
   - The modern login card with brand panel and provider buttons.
9. **Mobile view** (optional but high impact)
   - Editor with mobile drawer for nodes/config (if available in screenshots).

### Screenshot style rules
- Always use the app’s dark theme background (canvas/surface)
- Prefer indigo accent highlights
- Include subtle blur glow behind screenshots (indigo/emerald), consistent with login page
- Use crisp, high-DPI captures with generous padding and rounded corners

## 10) Layout Guidance (Desktop + Mobile)

### Desktop
- Hero: left text block, right product screenshot card (editor canvas)
- Subsequent sections: alternating screenshot left/right
- Use a sticky top nav (transparent → solid on scroll) with:
  - Logo (workflow icon)
  - Product name
  - CTA button

### Mobile
- Single column
- Replace heavy screenshot grids with swipeable carousel
- Keep CTAs always visible near top and bottom

## 11) Deliverable: “Design AI Prompt” (Copy/Paste)

Paste the text below into a design AI / website generator. It must produce a landing page that matches the product UI and uses the above structure.

---

### DESIGN AI PROMPT (VERBATIM)

Create a modern, premium, conversion-focused landing page for a SaaS web app called **Datawire**. The product is a **browser-based visual data pipeline builder** where users drag-and-drop nodes on a canvas, connect them, run the pipeline in-browser, inspect results (charts + paginated table), and share/collaborate on pipelines.

**Style / Theme (must match):**
- Dark theme with indigo accent, similar to a high-end developer tool.
- Primary colors: background `#0f1117`, surfaces `#1a1d27` / `#161b27`, borders `#2a2d3a` / `#1e2330`, accent `#6366f1`.
- Use subtle radial gradient glows (indigo + emerald) with blur, plus a low-opacity dot-grid overlay.
- Rounded corners (`rounded-xl` / `rounded-2xl`), subtle borders, deep soft shadows.
- Use Lucide-style line icons (workflow/lock/sparkles/shield/mail).
- Typography: modern sans, high-contrast headings, uppercase micro-headings with tracking.

**Page structure (required):**
1) Hero (H1 + sub + 2 CTAs) with a large product screenshot of the editor canvas  
2) Credibility strip (logos/metrics placeholder)  
3) How it works (Load → Transform → Visualise)  
4) Node library (8 nodes) with mini cards  
5) Templates (CSV→Chart, Fetch URL→Filter→Chart)  
6) Results & visualisation (bar/line/pie, paginated table)  
7) Collaboration & sharing (public/private, invites, read-only view, fork, access requests)  
8) Security/guardrails (URL fetch proxy avoids CORS, blocks unsafe hosts/IPs, size limits)  
9) FAQ  
10) Final CTA  
11) Footer

**Feature accuracy (must include these nodes):**
- File Input (CSV/JSON upload)
- Fetch URL (CSV/JSON)
- Filter Rows (==, !=, >, <, >=, <=, contains)
- Select Columns
- Sort Rows (asc/desc)
- Group By (sum, avg, count, min, max)
- Join Datasets (inner/left join)
- Visualise (Bar, Line, Pie)

**Results UX details:**
- Results modal/drawer includes a chart preview and a table with pagination (25/50/100/250 rows per page) and Prev/Next controls.
- For large datasets, show a subtle “Preview” indicator and messaging like “Pages are fetched on demand.”
- Pie chart must have a scrollable legend panel on the right for long label lists.

**Auth UX:**
- Mention sign-in options: Email/password, Google, GitHub.
- The landing page nav should have a “Get started” CTA that goes to sign-in.

**Images to show (must plan placements):**
- Editor canvas overview screenshot (hero)
- Results modal screenshot (bar chart + paginated table)
- Pie chart screenshot with scrollable legend
- Share dialog screenshot (invites/access requests)
- Home dashboard screenshot (templates + pipelines)
- Read-only shared view screenshot (fork/request access)
- Auth screen screenshot (modern)

**Tone:**
Clear, confident, builder-focused. Emphasize speed, clarity, and shareability. Avoid vague buzzwords; use concrete benefits.

Produce the final landing page design with responsive layouts (desktop + mobile), polished spacing, and consistent component styling matching the dark indigo product UI.

---

## 12) Notes for the builder (optional)
- If you need a “logo”, use a **workflow icon** in an indigo square as the brand mark.
- Keep all screenshots inside rounded containers with subtle border `#1e2330`.

