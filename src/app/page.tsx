'use client';

import React, { useState, useEffect } from 'react';

// --- LOCAL COMPONENTS ---
import HeroSection from '@/components/sections/HeroSection';
import FeaturedIn from '@/components/sections/FeaturedIn';
import AboutMeSection from '@/components/sections/AboutMeSection';
import BeyondTheTerminal from '@/components/sections/BeyondTheTerminal';
import KanbanBoard from '@/components/features/KanbanBoard';
import SystemDesignCarousel from '@/components/features/SystemDesignCarousel';
import ChatWidget from '@/components/features/ChatWidget';
import { ChatWidgetProvider } from '@/components/layout/ChatWidgetProvider';
import SiteHeader from '@/components/layout/SiteHeader';
import Link from 'next/link';
import { PenTool, ArrowRight, HeartHandshake, MessageCircle, Terminal, Network } from 'lucide-react';
import SkipLink from '@/components/ui/SkipLink';
import Footer from '@/components/sections/Footer';

// Homepage-only teaser copy for the 4 dedicated interview-prep pages — kept
// inline as a literal array (not a shared constants file) matching how the
// Study Plan teaser's own copy above is already hardcoded in this file.
const INTERVIEW_PREP_CARDS = [
  {
    href: '/behavioural',
    icon: HeartHandshake,
    title: 'Behavioural — STAR, applied',
    description:
      'The STAR method, generalized, plus 6 recurring categories: resistance to change, scope creep, conflict, ambiguity, mentoring, leadership.',
  },
  {
    href: '/effective-communication',
    icon: MessageCircle,
    title: 'Effective Communication — Know your stakeholder',
    description:
      "An audience-analysis framework for adapting depth, vocabulary, and style to whoever's actually in the room.",
  },
  {
    href: '/practical-technical',
    icon: Terminal,
    title: 'Practical Technical — Fundamentals, both modes',
    description:
      'CS fundamentals and agentic CLI workflows, mapped to synchronous (CoderPad) and asynchronous (LeetCode, HackerRank) formats.',
  },
  {
    href: '/system-design',
    icon: Network,
    title: 'System Design — The interview, decoded',
    description:
      'A 4-step framework, a question bank navigated via the SWE Compass, a scoring rubric, and staff-vs-senior signals — synthesized from my own whiteboard notes.',
  },
] as const;

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <ChatWidgetProvider>
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      {/* Skip Link for keyboard navigation (A1) */}
      <SkipLink />

      {/* --- STICKY NAV (shared across routes) --- */}
      <SiteHeader />

      {/* Vertical rhythm is centralized here: one consistent 48px (space-y-12) gap
          between every top-level block, so no section sets its own outer margin. */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-12" role="main">

        {/* --- ABOUT ME SECTION — same 48px rhythm between hero, press, and about --- */}
        <div id="about-me" className="scroll-mt-24 space-y-12">
          <HeroSection />
          <FeaturedIn />
          <AboutMeSection />
        </div>

        {/* --- OFF THE CLOCK: personal photo section (follows Leadership & Recognition) --- */}
        <BeyondTheTerminal />

        <section id="pipeline" className="scroll-mt-24">
          <KanbanBoard />

          {/* System design — inline carousel mirroring the pipeline projects */}
          <div id="system-design" className="scroll-mt-24 mt-12 pt-10 border-t border-zinc-200 dark:border-zinc-800">
            <div className="mb-6">
              <span className="text-micro text-zinc-400 block mb-2">System Design</span>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Architecture, <span className="gradient-text-blue">tier by tier</span>
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Each pipeline project mapped across five tiers — client → frontend → backend → model
                → data — with the design trade-offs behind it.
              </p>
            </div>
            <SystemDesignCarousel />
          </div>
        </section>

        {/* --- STUDY PLAN teaser → dedicated /study-plan page --- */}
        <section className="scroll-mt-24">
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

        {/* --- INTERVIEW PREP grid teaser → 4 dedicated pages --- */}
        <section className="scroll-mt-24">
          <div className="mb-6">
            <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-2 block">
              Interview Prep
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Frameworks I <span className="gradient-text-blue">practice with</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Four written reference pages — working notes, not slides.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {INTERVIEW_PREP_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group block card-base p-6 transition-colors hover:border-blue-300 dark:hover:border-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                  <span className="hidden sm:flex shrink-0 h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                    <card.icon size={20} className="text-blue-600 dark:text-blue-400" />
                  </span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Explore
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </span>
              </Link>
            ))}
          </div>
        </section>

				{/* --- FOOTER SECTION --- */}
				<Footer />

			</main>

			{/* --- FLOATING RAG CHAT WIDGET (bottom-right) --- */}
			<ChatWidget />
		</div>
		</ChatWidgetProvider>
	);
}