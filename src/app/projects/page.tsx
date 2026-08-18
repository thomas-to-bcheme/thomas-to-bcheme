import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import FaqSection from '@/components/sections/FaqSection';
import ChangelogSidebar from '@/components/sections/changelog/ChangelogSidebar';
import ChangelogMobileToc from '@/components/sections/changelog/ChangelogMobileToc';
import ChangelogHeaderEssay from '@/components/sections/changelog/ChangelogHeaderEssay';
import ExecutiveSummary from '@/components/sections/changelog/ExecutiveSummary';
import ProjectChangelogSection from '@/components/sections/changelog/ProjectChangelogSection';
import ProjectPipelineSection from '@/components/sections/changelog/ProjectPipelineSection';
import { CHANGELOG_PROJECTS } from '@/constants/changelog';

export const metadata: Metadata = {
  title: 'Projects — Thomas To',
  description:
    'The mental model behind this $0-infrastructure portfolio — mission, outbound/inbound funnel, the SWE Compass, what "agent" means here, and a system-design philosophy beyond CAP theorem — plus a per-project version history, lessons learned, the open-source & content project pipeline with its own tier-by-tier architecture, and FAQ for the Job Board, Hugging Face/ZeroGPU backend, Study Plan, and Chat/RAG agent.',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      <SiteHeader />

      {/* Compact header — constrained width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <Link
          href="/"
          className={`inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-sm ${FOCUS_RING}`}
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
              Projects
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              The mental model, & <span className="gradient-text-blue">lessons learned</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Sidebar + main content grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <ChangelogSidebar />

        <main className="min-w-0">
          <ExecutiveSummary />

          <ChangelogMobileToc />

          <ChangelogHeaderEssay />

          <div className="mt-20 space-y-20">
            {CHANGELOG_PROJECTS.map((project) => (
              <ProjectChangelogSection key={project.id} project={project} />
            ))}
          </div>

          <div className="mt-20">
            <ProjectPipelineSection />
          </div>

          <div className="mt-20">
            <FaqSection />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
