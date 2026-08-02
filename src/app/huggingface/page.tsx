import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BookOpen } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import HuggingFaceEmbed from '@/components/features/HuggingFaceEmbed';
import ProjectObjective from '@/components/features/ProjectObjective';
import ComputeStackShowcase from '@/components/features/ComputeStackShowcase';
import { HUGGING_FACE_SPACE_URL, GRADIO_SHARING_GUIDE_URL } from '@/constants/site';

export const metadata: Metadata = {
  title: 'Hugging Face — Thomas To',
  description: 'A live Hugging Face Space embedded directly on this page via iframe.',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

export default function HuggingFacePage() {
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
              Hugging Face
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              A live Space, <span className="gradient-text-blue">embedded right here</span>
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
            Running directly from Hugging Face, embedded live below — no screenshots, no
            static mockups.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href={HUGGING_FACE_SPACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors rounded-sm ${FOCUS_RING}`}
          >
            Open the Space on Hugging Face <ArrowUpRight size={15} />
          </a>
          <a
            href={GRADIO_SHARING_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors rounded-sm ${FOCUS_RING}`}
          >
            <BookOpen size={15} /> Gradio: Sharing Your App guide
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <ProjectObjective />
        <ComputeStackShowcase />
        <HuggingFaceEmbed />
      </div>

      <Footer />
    </div>
  );
}
