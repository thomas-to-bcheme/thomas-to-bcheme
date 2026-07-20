import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import TechnicalPrepDiagram from '@/components/excalidraw/TechnicalPrepDiagram';
import { isValidBoardName, DEFAULT_BOARD_NAME } from '@/lib/excalidrawBoards';

export const metadata: Metadata = {
  title: 'Study Plan — Thomas To',
  description:
    "A live Excalidraw whiteboard Thomas To uses to reason through and communicate technical systems — continuous-training MLOps, model drift, and edge AI.",
};

interface StudyPlanPageProps {
  searchParams: Promise<{ board?: string }>;
}

export default async function StudyPlanPage({ searchParams }: StudyPlanPageProps) {
  const { board } = await searchParams;
  const initialBoard = isValidBoardName(board) ? board : DEFAULT_BOARD_NAME;

  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      <SiteHeader />

      {/* Compact header — constrained width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
              Study Plan
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              An open study log &amp; <span className="gradient-text-blue">live whiteboard</span>
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
            The board I actually think on — pan, zoom, and open the frames. It&apos;s the proof-of-work
            artifact for how I break systems down and communicate them.
          </p>
        </div>
      </div>

      {/* Full-bleed whiteboard filling the remainder of the viewport */}
      <div className="px-2 sm:px-4 pb-8">
        <TechnicalPrepDiagram
          showHeading={false}
          heightClassName="h-[calc(100dvh-13rem)] min-h-[520px]"
          initialBoard={initialBoard}
        />
      </div>

      <Footer />
    </div>
  );
}
