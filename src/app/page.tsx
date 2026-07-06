'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- LOCAL COMPONENTS ---
import HeroSection from '@/components/sections/HeroSection';
import FeaturedIn from '@/components/sections/FeaturedIn';
import AboutMeSection from '@/components/sections/AboutMeSection';
import BeyondTheTerminal from '@/components/sections/BeyondTheTerminal';
import KanbanBoard from '@/components/features/KanbanBoard';
import ChatWidget from '@/components/features/ChatWidget';
import { ChatWidgetProvider } from '@/components/layout/ChatWidgetProvider';
import SiteHeader from '@/components/layout/SiteHeader';
import Link from 'next/link';
import { PenTool, ArrowRight } from 'lucide-react';
import SkipLink from '@/components/ui/SkipLink';
import Footer from '@/components/sections/Footer';
import { useActiveSection } from '@/hooks/useActiveSection';
import { NAV_LINKS } from '@/constants/site';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Active section tracking (U2) — route links (e.g. System Design) have no
  // sectionId, so only the scroll-spy sections are tracked here.
  const sectionIds = useMemo(
    () => NAV_LINKS.flatMap((link) => ('sectionId' in link ? [link.sectionId] : [])),
    [],
  );
  const activeSection = useActiveSection(sectionIds);

  if (!mounted) return null;

  return (
    <ChatWidgetProvider>
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      {/* Skip Link for keyboard navigation (A1) */}
      <SkipLink />

      {/* --- STICKY NAV (shared across routes) --- */}
      <SiteHeader activeSection={activeSection} />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6" role="main">

        {/* --- ABOUT ME SECTION --- */}
        <div id="about-me" className="mt-0 scroll-mt-24">
          <HeroSection />
          <FeaturedIn />
          <AboutMeSection />
        </div>

        <section id="pipeline" className="scroll-mt-24">
          <KanbanBoard />
        </section>

        {/* --- STUDY PLAN teaser → dedicated /study-plan page --- */}
        <section className="scroll-mt-24 py-16">
          <Link
            href="/study-plan"
            className="group block card-base p-6 sm:p-8 transition-colors hover:border-blue-300 dark:hover:border-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-2 block">
                  Study Plan
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  SWE Study Plan — <span className="gradient-text-blue">Zero to Offer</span>
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  A live Excalidraw whiteboard plus written notes on what I&apos;m learning and tracking —
                  continuous-training MLOps, model drift, and edge AI. Open it full-page for the interactive board.
                </p>
              </div>
              <span className="hidden sm:flex shrink-0 h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                <PenTool size={20} className="text-blue-600 dark:text-blue-400" />
              </span>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400">
              Open the Study Plan
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          </Link>
        </section>

        {/* --- OFF THE CLOCK: personal photo section --- */}
        <BeyondTheTerminal />

				{/* --- FOOTER SECTION --- */}
				<Footer />

			</main>

			{/* --- FLOATING RAG CHAT WIDGET (bottom-right) --- */}
			<ChatWidget />
		</div>
		</ChatWidgetProvider>
	);
}