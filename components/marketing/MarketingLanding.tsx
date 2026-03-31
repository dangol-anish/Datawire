import Link from "next/link";
import Image from "next/image";
import {
  LuChartBar,
  LuBoxes,
  LuCheck,
  LuFileUp,
  LuGitFork,
  LuGlobe,
  LuLock,
  LuShare2,
  LuSparkles,
  LuWorkflow,
  LuZap,
} from "react-icons/lu";

const brand = {
  canvas: "#0f1117",
  surface: "#1a1d27",
  border: "#2a2d3a",
  accent: "#6366f1",
  panel: "#0d0f14",
  card: "#161b27",
  line: "#1e2330",
};

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-6">
        {eyebrow && (
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#3d4f6e", letterSpacing: "0.15em" }}
          >
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mt-2">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-slate-400 mt-3">{subtitle}</p>}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

function MacMockup({
  src,
  alt,
  aspect = "16/10",
  priority = false,
}: {
  src: string;
  alt: string;
  aspect?: string;
  priority?: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: brand.card,
        border: `1px solid ${brand.line}`,
        boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
      }}
    >
      <div
        className="h-10 flex items-center px-4 gap-2"
        style={{ background: brand.panel, borderBottom: `1px solid ${brand.line}` }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
        <div className="flex-1" />
        <div className="hidden sm:block text-xs text-slate-600">datawire.app</div>
        <div className="flex-1" />
      </div>

      <div
        className="relative w-full"
        style={{
          aspectRatio: aspect,
          background:
            "radial-gradient(900px 420px at 10% 0%, rgba(99,102,241,0.18) 0%, rgba(13,15,20,0) 60%), #0b0d12",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 94vw, 560px"
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(99,102,241,0.15)",
            border: `1px solid ${brand.line}`,
          }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-400 mt-1">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function MarketingLanding() {
  return (
    <main className="min-h-screen" style={{ background: brand.canvas }}>
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-56 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.55), rgba(99,102,241,0) 60%)",
          }}
        />
        <div
          className="absolute -bottom-56 left-0 h-[520px] w-[520px] rounded-full blur-3xl opacity-25"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(34,197,94,0.45), rgba(34,197,94,0) 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Nav */}
      <div
        className="sticky top-0 z-50"
        style={{
          background: "rgba(13,15,20,0.75)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${brand.line}`,
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-14 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: brand.accent }}
              aria-hidden="true"
            >
              <LuWorkflow size={16} color="white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Datawire</div>
              <div className="text-xs text-slate-500">
                Visual data pipelines
              </div>
            </div>
            <div className="flex-1" />
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
              <a href="#how" className="hover:text-white transition-colors">
                How it works
              </a>
              <a href="#nodes" className="hover:text-white transition-colors">
                Nodes
              </a>
              <a href="#collab" className="hover:text-white transition-colors">
                Share
              </a>
              <a
                href="#security"
                className="hover:text-white transition-colors"
              >
                Security
              </a>
            </div>
            <Link
              href="/login"
              className="ml-3 h-9 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 12px 30px rgba(99,102,241,0.18)",
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-16 sm:pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#3d4f6e", letterSpacing: "0.15em" }}
            >
              Ship insights faster
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold text-white mt-3 leading-tight">
              <span className="datawire-animated-gradient-text">Visual</span> data
              pipelines.
              <br />
              In your browser.
            </h1>
            <p className="text-base text-slate-400 mt-5 max-w-xl">
              Upload or fetch data, transform it with nodes, and chart the
              result — then share the pipeline with your team.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="h-11 px-5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-transform"
                style={{
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 16px 40px rgba(99,102,241,0.22)",
                }}
              >
                <LuZap size={16} aria-hidden="true" />
                Get started
              </Link>
              <Link
                href="/login"
                className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-200 flex items-center justify-center gap-2"
                style={{
                  background: brand.panel,
                  border: `1px solid ${brand.line}`,
                }}
              >
                <LuShare2 size={16} aria-hidden="true" />
                View demo pipeline
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <LuWorkflow
                  size={16}
                  className="text-indigo-300"
                  aria-hidden="true"
                />
                Drag-and-drop nodes
              </span>
              <span className="flex items-center gap-2">
                <LuChartBar
                  size={16}
                  className="text-indigo-300"
                  aria-hidden="true"
                />
                Charts + tables
              </span>
              <span className="flex items-center gap-2">
                <LuGitFork
                  size={16}
                  className="text-indigo-300"
                  aria-hidden="true"
                />
                Fork & share
              </span>
            </div>
          </div>

          <div>
            <MacMockup
              src="/1.png"
              alt="Datawire editor canvas showing nodes connected into a pipeline"
              aspect="16/10"
              priority
            />
            <p className="text-xs text-slate-600 mt-3">
              Drag nodes, connect edges, run, and inspect results — all in the browser.
            </p>
          </div>
        </div>
      </section>

      <div id="how" />
      <Section
        eyebrow="How it works"
        title="From raw data to shareable insight"
        subtitle="A simple workflow that stays readable as it grows."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon={
              <LuFileUp
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="1) Load"
            body="Upload CSV/JSON or fetch from a public URL."
          />
          <FeatureCard
            icon={
              <LuBoxes
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="2) Transform"
            body="Filter, select, sort, group, and join datasets with nodes."
          />
          <FeatureCard
            icon={
              <LuChartBar
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="3) Visualise"
            body="Render bar/line/pie charts and inspect results in a paginated table."
          />
        </div>
      </Section>

      <div id="nodes" />
      <Section
        eyebrow="Node library"
        title="Everything you need to build a pipeline"
        subtitle="Accurate to the current app: 8 nodes (sources, transforms, visualise)."
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              t: "File Input",
              d: "Load CSV/JSON from local upload",
              c: "#10b981",
            },
            {
              t: "Fetch URL",
              d: "Fetch CSV/JSON from a public URL",
              c: "#2563eb",
            },
            {
              t: "Filter Rows",
              d: "Operators: ==, !=, >, <, >=, <=, contains",
              c: "#ca8a04",
            },
            {
              t: "Select Columns",
              d: "Pick which columns to keep",
              c: "#9333ea",
            },
            { t: "Sort Rows", d: "Sort by a column (asc/desc)", c: "#db2777" },
            {
              t: "Group By",
              d: "Aggregate: sum/avg/count/min/max",
              c: "#16a34a",
            },
            {
              t: "Join Datasets",
              d: "Join two tables (inner/left)",
              c: "#ea580c",
            },
            { t: "Visualise", d: "Chart: Bar / Line / Pie", c: "#dc2626" },
          ].map((n) => (
            <div
              key={n.t}
              className="rounded-2xl p-4"
              style={{
                background: brand.surface,
                border: `1px solid ${brand.border}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: n.c }}
                />
                <div className="text-sm font-semibold text-slate-200">
                  {n.t}
                </div>
              </div>
              <div className="text-sm text-slate-400 mt-2">{n.d}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Results"
        title="Charts + paginated tables"
        subtitle="Inspect outputs confidently — even with large datasets."
      >
        <div className="grid lg:grid-cols-2 gap-6">
          <MacMockup
            src="/2.png"
            alt="Datawire results modal showing chart preview and paginated table"
            aspect="16/10"
          />

          <div className="space-y-4">
            <FeatureCard
              icon={
                <LuZap
                  size={18}
                  className="text-indigo-300"
                  aria-hidden="true"
                />
              }
              title="Fast on big data"
              body="The UI shows a preview and fetches result pages on demand for smoother performance."
            />
            <FeatureCard
              icon={
                <LuChartBar
                  size={18}
                  className="text-indigo-300"
                  aria-hidden="true"
                />
              }
              title="Better charts"
              body="Bar/line charts optimize labels; pie charts include a scrollable legend for long categories."
            />
            <FeatureCard
              icon={
                <LuSparkles
                  size={18}
                  className="text-indigo-300"
                  aria-hidden="true"
                />
              }
              title="One-click viewing"
              body="Open results from the node itself or from the configuration panel."
            />
          </div>
        </div>
      </Section>

      <div id="collab" />
      <Section
        eyebrow="Share & collaborate"
        title="Pipelines you can send, fork, and co-edit"
        subtitle="Built-in collaboration patterns for teams."
      >
        <div className="grid md:grid-cols-2 gap-4">
          <FeatureCard
            icon={
              <LuShare2
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="Public & private sharing"
            body="Share read-only views or keep pipelines private."
          />
          <FeatureCard
            icon={
              <LuGitFork
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="Fork pipelines"
            body="Create a copy of a shared pipeline and iterate safely."
          />
          <FeatureCard
            icon={
              <LuWorkflow
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="Invites & roles"
            body="Invite collaborators as viewer or editor."
          />
          <FeatureCard
            icon={
              <LuSparkles
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="Access requests"
            body="Request edit access and let owners approve/deny."
          />
        </div>
      </Section>

      <div id="security" />
      <Section
        eyebrow="Security"
        title="Guardrails for URL data fetches"
        subtitle="Designed to keep URL-based imports safe-by-default."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon={
              <LuGlobe
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="CORS-friendly"
            body="Fetch URL routes through a server proxy to avoid client-side CORS issues."
          />
          <FeatureCard
            icon={
              <LuLock
                size={18}
                className="text-indigo-300"
                aria-hidden="true"
              />
            }
            title="SSRF protections"
            body="Blocks unsafe hosts/IP ranges and enforces safe content types."
          />
          <FeatureCard
            icon={
              <LuZap size={18} className="text-indigo-300" aria-hidden="true" />
            }
            title="Size limits"
            body="Caps responses to keep the app fast and predictable."
          />
        </div>
      </Section>

      <Section eyebrow="FAQ" title="Questions, answered">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              q: "Does it run locally?",
              a: "Pipelines execute client-side in a background worker so the UI stays responsive.",
            },
            { q: "What formats are supported?", a: "CSV and JSON." },
            {
              q: "Can I share pipelines?",
              a: "Yes: public/private, read-only views, forks, invites, and access requests.",
            },
            {
              q: "Is it fast on big data?",
              a: "The UI uses previews and on-demand page fetching for results tables.",
            },
          ].map((item) => (
            <div
              key={item.q}
              className="rounded-2xl p-5"
              style={{
                background: brand.surface,
                border: `1px solid ${brand.border}`,
              }}
            >
              <div className="text-sm font-semibold text-white">{item.q}</div>
              <div className="text-sm text-slate-400 mt-2">{item.a}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background:
                "radial-gradient(900px 420px at 10% 0%, rgba(99,102,241,0.22) 0%, rgba(13,15,20,0) 60%), rgba(26,29,39,0.9)",
              border: `1px solid ${brand.border}`,
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <div className="text-2xl font-semibold text-white">
                  Start building your next pipeline today
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  Sign in with email/password, Google, or GitHub.
                </div>
              </div>
              <Link
                href="/login"
                className="h-11 px-6 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 16px 40px rgba(99,102,241,0.22)",
                }}
              >
                <LuZap size={16} aria-hidden="true" />
                Get started
              </Link>
            </div>
          </div>

          <footer className="mt-10 text-xs text-slate-600 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div>© {new Date().getFullYear()} Datawire</div>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <span className="text-slate-700">Built for speed.</span>
              <span className="text-slate-700">Designed for clarity.</span>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
