import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import GlossarySidebar from '@/components/sections/glossary/GlossarySidebar';
import GlossaryMobileToc from '@/components/sections/glossary/GlossaryMobileToc';
import GlossaryBrowser from '@/components/sections/glossary/GlossaryBrowser';

export const metadata: Metadata = {
  title: 'Glossary — Thomas To',
  description:
    'A first-principles glossary spanning GPU/CUDA compute, system design, data engineering, data science & ML modeling, AI/ML engineering, MLOps, and evaluation/observability — one definition per term, no examples, organized as a silicon-to-product dependency stack.',
};

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      <SiteHeader />

      {/* Compact header — constrained width, same shell as /changelog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="mt-4">
          <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Glossary</span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            One vocabulary, from <span className="gradient-text-blue">silicon to product</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Every term used in this codebase, this site&apos;s own system-design notes, and the wider vocabulary of
            AI/ML, data, and platform engineering — defined once, from first principles, with no examples to lean on.
          </p>
        </div>
      </div>

      {/* Sidebar + main content grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <GlossarySidebar />

        <main className="min-w-0">
          <GlossaryMobileToc />
          <GlossaryBrowser />
        </main>
      </div>

      <Footer />
    </div>
  );
}
