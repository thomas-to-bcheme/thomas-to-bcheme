import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import SystemDesignPrepSidebar from '@/components/sections/systemDesignPrep/SystemDesignPrepSidebar';
import SystemDesignPrepMobileToc from '@/components/sections/systemDesignPrep/SystemDesignPrepMobileToc';
import SystemDesignCompassIntro from '@/components/sections/systemDesignPrep/SystemDesignCompassIntro';
import CoreCharacteristicsSection from '@/components/sections/systemDesignPrep/CoreCharacteristicsSection';
import InterviewFrameworkSection from '@/components/sections/systemDesignPrep/InterviewFrameworkSection';
import SystemDesignQuestionsSection from '@/components/sections/systemDesignPrep/SystemDesignQuestionsSection';
import ReferenceGridSection from '@/components/sections/systemDesignPrep/ReferenceGridSection';
import ScoringRubricSection from '@/components/sections/systemDesignPrep/ScoringRubricSection';
import StaffSignalsSection from '@/components/sections/systemDesignPrep/StaffSignalsSection';
import CommunicationScriptsSection from '@/components/sections/systemDesignPrep/CommunicationScriptsSection';
import ExternalReferencesSection from '@/components/sections/systemDesignPrep/ExternalReferencesSection';

export const metadata: Metadata = {
  title: 'System Design — Thomas To',
  description:
    'A working reference for system design judgment — the core characteristics (Chip Huyen\'s four plus CAP theorem) every decision is checked against, a 4-step interview framework, a question bank of decision cascades organized by the SWE Compass\'s six lifecycle stages, a 6-column building-block reference grid, a scoring rubric, staff-level signals, and reusable communication scripts.',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

export default function SystemDesignPage() {
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

        <div className="mt-4">
          <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
            Interview Prep
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            Ask the right question <span className="gradient-text-blue">before picking an answer</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            A working reference for system design judgment — the clarifying questions, approach
            options, and trade-offs behind data, communication, compute, and ML decisions, read
            through the same SWE Compass lens as the rest of this site.
          </p>
        </div>
      </div>

      {/* Sidebar + main content grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <SystemDesignPrepSidebar />

        <main className="min-w-0">
          <SystemDesignPrepMobileToc />

          <SystemDesignCompassIntro />
          <CoreCharacteristicsSection />
          <InterviewFrameworkSection />
          <SystemDesignQuestionsSection />
          <ReferenceGridSection />
          <ScoringRubricSection />
          <StaffSignalsSection />
          <CommunicationScriptsSection />
          <ExternalReferencesSection />
        </main>
      </div>

      <Footer />
    </div>
  );
}
