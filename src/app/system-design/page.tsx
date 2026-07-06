import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Github,
  Cloud,
  Cpu,
  Database,
  Workflow,
  Scale,
  Zap,
  AlertTriangle,
  GitCommitHorizontal,
  Layers,
  Network,
} from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import Badge from '@/components/ui/Badge';
import SystemDesignCarousel from '@/components/features/SystemDesignCarousel';
import { GITHUB_URL } from '@/constants/site';

export const metadata: Metadata = {
  title: 'System Design — Thomas To',
  description:
    "Architecture, trade-offs, and decision-making behind Thomas To's zero-cost, open-source portfolio: the GitHub Monolith data warehouse, the CI/CD pipeline, and the ML inference layer.",
};

// --- Content model (sourced from system_design_docs/architecture.md) ---

const ARCHITECTURE_LAYERS = [
  {
    icon: Github,
    role: 'The Center',
    title: 'GitHub — Data Warehouse & Logic Engine',
    body: 'A public repo doubles as the database and ETL engine. A GitHub Action CRON scrapes and transforms source data, then commits the result as JSON — versioned, auditable, and free of execution limits.',
  },
  {
    icon: Cloud,
    role: 'Left Wing',
    title: 'Vercel — Presentation Layer',
    body: 'Next.js 16 / React 19 renders pre-processed JSON as fast static and server-rendered pages on the edge. It stays thin on purpose: no heavy compute, no scheduled jobs.',
  },
  {
    icon: Cpu,
    role: 'Right Wing',
    title: 'Hugging Face — Inference Engine',
    body: 'Heavy Python ML (TensorFlow, scikit-learn, FastAPI) lives off-platform and is called over REST, so model inference never competes with the page for Vercel’s serverless budget.',
  },
  {
    icon: Database,
    role: 'Top Bridge',
    title: 'RAG Layer — Résumé-grounded Chat',
    body: 'A Gemini streaming endpoint answers recruiter questions grounded in the résumé markdown (read at request time), so the agent can never drift from the source-of-truth document.',
  },
] as const;

const DATA_LIFECYCLE = [
  {
    stage: 'Sandbox',
    body: 'Raw ingestion and parser experiments — where new sources land and break safely.',
  },
  {
    stage: 'Quality',
    body: 'Cleaning, validation, and schema enforcement before anything is trusted.',
  },
  {
    stage: 'Production',
    body: 'Optimized, compressed data ready to ship to the presentation layer.',
  },
] as const;

// GitHub (CI) vs Vercel (CD) — the core platform trade-off.
const PLATFORM_TRADEOFFS = [
  { kpi: 'Cost structure', github: 'Unlimited minutes (public repos)', vercel: 'Hard limits · no overage — pauses at cap' },
  { kpi: 'Deploy threshold', github: 'No hard count (concurrency-bound)', vercel: '100 / day (rolling 24h)' },
  { kpi: 'Execution time', github: 'Up to 6 hours per run', vercel: '10–60 seconds (serverless)' },
  { kpi: 'Resource access', github: 'Full VM — filesystem, CLI, Docker', vercel: 'HTTP endpoint only' },
  { kpi: 'Strategic role', github: 'ETL / logic layer', vercel: 'Rendering / presentation layer' },
] as const;

const DECISIONS = [
  {
    decision: 'GitHub as the database, not a hosted DB',
    why: 'Public repos grant unlimited CI minutes, a full VM (filesystem, Docker, up to 6-hour runs), and version-controlled, auditable data by default.',
    tradeoff: 'Not a low-latency transactional store — data is eventually consistent, published per commit. Acceptable for a read-mostly site.',
  },
  {
    decision: '“Vercel-Pinger” over Vercel Cron',
    why: 'Vercel Hobby caps Cron at once per day — too slow. A scheduled GitHub Action commits data.json, and that commit auto-triggers a Vercel deploy.',
    tradeoff: 'Deploys are coupled to data commits (a data push is a rebuild); kept safe by capping frequency.',
  },
  {
    decision: 'Hourly deploy cadence (24 / day)',
    why: 'Against Vercel’s 100-deploy rolling limit, reserving a 20% manual-hotfix buffer leaves ~80 slots; hourly uses just 24 (≈24%).',
    tradeoff: 'Not sub-hourly “real-time.” Exceeding every 15 minutes (96/day) enters a red-zone lockout risk.',
  },
  {
    decision: 'Hugging Face for ML inference',
    why: 'Vercel serverless functions time out in 10–60s and aren’t sized for model inference; offloading keeps the presentation layer fast.',
    tradeoff: 'Cold starts on the inference endpoint — mitigated by keeping models small.',
  },
  {
    decision: 'Résumé markdown as the single source of truth',
    why: 'The chat reads src/docs/Thomas_To_Resume.md at request time (traced into the serverless bundle) instead of a duplicated prompt copy, so the agent stays in lock-step with the PDF.',
    tradeoff: 'Relies on the model honoring the response contract; it degrades gracefully when it doesn’t.',
  },
] as const;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-3 block">{children}</span>
);

export default function SystemDesignPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        {/* Hero */}
        <header className="mt-6 mb-14 max-w-3xl">
          <SectionLabel>System Design</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
            Architecture, trade-offs &amp; <span className="gradient-text-blue">decision-making</span>
          </h1>
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            This portfolio is itself the flagship open-source project — a production-grade system that must
            run <strong className="font-semibold text-zinc-800 dark:text-zinc-200">free of charge, indefinitely</strong>.
            That single constraint forces a real engineering discipline. Below is the architecture, the platform
            trade-offs I weighed, and the reasoning behind each decision.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge color="green" variant="outline">Zero-Cost</Badge>
            <Badge color="blue" variant="outline">Open Source · MIT</Badge>
            <Badge color="zinc" variant="outline">Next.js 16 · Vercel · GitHub Actions · Hugging Face</Badge>
          </div>
        </header>

        {/* Per-project system designs — interactive carousel */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Network size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">System design, project by project</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-3xl">
            Every project in the pipeline — and this portfolio itself — mapped across the same five
            tiers: client → frontend → backend → model → data, with the trade-offs behind each
            decision. Use the arrows or dots to step through every architecture.
          </p>
          <SystemDesignCarousel syncHash />
        </section>

        {/* Architecture — the GitHub Monolith */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Layers size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">The “GitHub Monolith”</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-3xl">
            A bottom-up architecture where GitHub is the single source of truth, deploying to specialized wings.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ARCHITECTURE_LAYERS.map(({ icon: Icon, role, title, body }) => (
              <div key={title} className="card-base p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="text-micro text-zinc-400">{role}</span>
                </div>
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1.5">{title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data lifecycle */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Workflow size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">The data warehouse lifecycle</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-3xl">
            Data isn’t just stored — it moves through a three-tier lifecycle managed entirely by code inside the
            repo (each tier supporting Raw, Staging, Transform, and Analyze layers).
          </p>
          <ol className="grid gap-4 sm:grid-cols-3">
            {DATA_LIFECYCLE.map(({ stage, body }, index) => (
              <li key={stage} className="card-base p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{stage}</h3>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Platform trade-off */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Scale size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">The core trade-off: CI vs CD</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-3xl">
            The whole design leans into each platform’s free-tier shape — GitHub for unlimited compute, Vercel for
            fast rendering — and routes work to whichever is stronger.
          </p>
          <div className="card-base overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[34rem]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                  <th className="p-4 font-semibold text-zinc-500 dark:text-zinc-400">KPI</th>
                  <th className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">GitHub · Logic Engine</th>
                  <th className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">Vercel · Rendering Engine</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_TRADEOFFS.map(({ kpi, github, vercel }) => (
                  <tr key={kpi} className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 align-top">
                    <td className="p-4 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{kpi}</td>
                    <td className="p-4 text-zinc-500 dark:text-zinc-400">{github}</td>
                    <td className="p-4 text-zinc-500 dark:text-zinc-400">{vercel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* The Cron problem → Vercel-Pinger solution */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-5">
              <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle size={16} />
                <h3 className="font-semibold text-sm">The Cron problem</h3>
              </div>
              <p className="text-sm text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
                Vercel’s Hobby plan limits Cron jobs to once per day — far too slow for fresh data.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 p-5">
              <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
                <GitCommitHorizontal size={16} />
                <h3 className="font-semibold text-sm">The “Vercel-Pinger” solution</h3>
              </div>
              <p className="text-sm text-emerald-800/90 dark:text-emerald-200/80 leading-relaxed">
                A GitHub Action runs on schedule, performs the ETL, and commits <code className="font-mono text-xs">data.json</code>.
                That commit auto-triggers a Vercel deploy — high-frequency updates on a free plan.
              </p>
            </div>
          </div>
        </section>

        {/* Decision log */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <GitCommitHorizontal size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">Decision log</h2>
          </div>
          <div className="space-y-4">
            {DECISIONS.map(({ decision, why, tradeoff }) => (
              <div key={decision} className="card-base p-5">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-3">{decision}</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-micro text-emerald-600 dark:text-emerald-400 mb-1">Why</dt>
                    <dd className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{why}</dd>
                  </div>
                  <div>
                    <dt className="text-micro text-amber-600 dark:text-amber-400 mb-1">Trade-off</dt>
                    <dd className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{tradeoff}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* Safe frequency KPI */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Zap size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">The math: maximum safe frequency</h2>
          </div>
          <div className="card-base p-6">
            <div className="grid gap-6 sm:grid-cols-3 text-center">
              <div>
                <p className="text-3xl font-extrabold gradient-text-blue">Hourly</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Safe automated cadence (24 deploys/day)</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold gradient-text-blue">24%</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">of Vercel’s 100/day rolling limit used</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold gradient-text-blue">$0.00</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Cost, with 20% headroom for hotfixes</p>
              </div>
            </div>
            <p className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              <strong className="font-semibold text-zinc-700 dark:text-zinc-300">Guardrail:</strong> never exceed a deploy
              every 15 minutes (96/day). The rolling window absorbs 24 automated deploys plus manual work with ease, but a
              single manual commit in the red zone could lock the project for 24 hours.
            </p>
          </div>
        </section>

        {/* Source docs CTA */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center">
          <h2 className="text-lg font-bold tracking-tight">Read the full design docs</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Every layer here is documented in the open — architecture, data model, ML models, deployment, and roadmap.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 text-white dark:bg-blue-500 px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
          >
            <Github size={16} /> View the repository
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}
