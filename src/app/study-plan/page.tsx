import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Github,
  GraduationCap,
  Radar,
  PenTool,
  RefreshCw,
  LineChart,
  Cpu,
  Database,
} from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import Badge from '@/components/ui/Badge';
import TechnicalPrepDiagram from '@/components/excalidraw/TechnicalPrepDiagram';
import { GITHUB_URL } from '@/constants/site';

export const metadata: Metadata = {
  title: 'Study Plan — Thomas To',
  description:
    "What Thomas To is actively learning — continuous-training MLOps, model drift, and edge AI — plus a live Excalidraw whiteboard used to reason through and communicate technical systems.",
};

// --- Content model (seeded from system_design_docs/roadmap.md + constants/roadmap.ts) ---

const CURRENTLY_LEARNING = [
  {
    icon: RefreshCw,
    title: 'Continuous-training pipelines',
    body: 'A static DistilBERT baseline (Model A — the 2025 “knowledge freeze”) against a twin that retrains weekly on fresh 2026 job-market data (Model B). Scraped samples are pseudo-labeled and only kept above a 90% confidence threshold, so the training set never gets poisoned.',
    tags: ['DistilBERT', 'GitHub Actions', 'Pseudo-labeling'],
  },
  {
    icon: LineChart,
    title: 'Model drift & monitoring',
    body: 'Wiring Hugging Face inference logs into Google Vertex AI to watch training-serving skew — how keyword distributions like “Agentic AI” and “Mamba” drift from the 2025 baseline, and where the frozen model starts to fail.',
    tags: ['Vertex AI', 'Training-serving skew'],
  },
  {
    icon: Cpu,
    title: 'Edge AI & quantization',
    body: 'Taking the matured model through post-training quantization (FP32 → INT8) to run on a Raspberry Pi 5 + AI HAT+ (Hailo NPU) — offline, private inference with no cloud round-trip.',
    tags: ['PTQ', 'Raspberry Pi 5', 'Hailo-8'],
  },
  {
    icon: Database,
    title: 'Reproducible ML data',
    body: 'Versioning the static Kaggle dataset and the growing scraped set with DVC, inside a provider-portable “Code Monolith” so the same pipeline can deploy to Hugging Face, Vercel, AWS, or GCP.',
    tags: ['DVC', 'Code Monolith'],
  },
] as const;

const KEEPING_UP_WITH = [
  {
    category: 'Research & models',
    items: ['Agentic AI', 'Mamba · state-space models', 'LangChain', 'DistilBERT'],
  },
  {
    category: 'Platforms & MLOps',
    items: ['Google Vertex AI', 'Hugging Face', 'PyTorch', 'DVC', 'GitHub Actions CI/CD'],
  },
  {
    category: 'Edge & hardware',
    items: ['Raspberry Pi 5', 'Hailo-8 NPU', 'INT8 quantization'],
  },
] as const;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-3 block">{children}</span>
);

export default function StudyPlanPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      <SiteHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        {/* Header */}
        <header className="mt-6 mb-14 max-w-3xl">
          <SectionLabel>Study Plan</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
            An open study log &amp; <span className="gradient-text-blue">live whiteboard</span>
          </h1>
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            A working record of what I&apos;m actively learning, the tools and research I track, and the
            Excalidraw board I actually think on. I keep it in the open as{' '}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">proof of work</strong> — for how I
            break systems down and communicate them.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge color="blue" variant="outline">Continuous Training</Badge>
            <Badge color="purple" variant="outline">Model Drift</Badge>
            <Badge color="green" variant="outline">Edge AI</Badge>
            <Badge color="zinc" variant="outline">Live Whiteboard</Badge>
          </div>
        </header>

        {/* Currently learning */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <GraduationCap size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">Currently learning</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-3xl">
            Seeded from my open project roadmap — a comparative ML study of how fast a 2025-frozen model goes
            stale against one that keeps retraining on live market data.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CURRENTLY_LEARNING.map(({ icon: Icon, title, body, tags }) => (
              <div key={title} className="card-base p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{title}</h3>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{body}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-micro px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Keeping up with */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Radar size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">Keeping up with</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-3xl">
            The research, platforms, and hardware I&apos;m tracking as this project evolves.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {KEEPING_UP_WITH.map(({ category, items }) => (
              <div key={category} className="card-base p-5">
                <h3 className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-3">{category}</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <li key={item}>
                      <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* The whiteboard — large interactive canvas (the proof-of-work artifact) */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <PenTool size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">The whiteboard</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-3xl">
            The same board I draw on to reason through architecture and interview prep. Pan, zoom, and open the
            frames — it&apos;s the proof-of-work artifact for how I communicate a system.
          </p>
          <TechnicalPrepDiagram showHeading={false} heightClassName="h-[75vh] min-h-[560px]" />
        </section>

        {/* Source docs CTA */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center">
          <h2 className="text-lg font-bold tracking-tight">Read the full roadmap</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            These notes track an open roadmap doc in the repo — the model ecosystem, the monitoring pipeline, and
            the edge-AI outlook, all in the open.
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
