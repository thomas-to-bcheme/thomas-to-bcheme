import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import FundamentalsPillarCard from '@/components/sections/practicalTechnical/FundamentalsPillarCard';
import PracticePlatformCard from '@/components/sections/practicalTechnical/PracticePlatformCard';
import {
  FUNDAMENTALS_PILLARS,
  INTERVIEW_MODES,
  PRACTICE_PLATFORMS,
} from '@/constants/practicalTechnical';

export const metadata: Metadata = {
  title: 'Practical Technical — Thomas To',
  description:
    'Two fundamentals pillars — programming fundamentals and agentic CLI tool fundamentals — mapped against synchronous and asynchronous interview formats, and the platforms (LeetCode, HackerRank, CoderPad) where they show up.',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const SECTION_NAV_ITEMS = [
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'interview-modes', label: 'Interview Modes' },
  { id: 'practice-platforms', label: 'Practice Platforms' },
];

export default function PracticalTechnicalPage() {
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
            Fundamentals that hold up <span className="gradient-text-blue">sync or async</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Two pillars — programming fundamentals and agentic CLI tool fundamentals — carry across
            both live and take-home interview formats. This portfolio is itself a Claude Code
            project, so agentic-workflow literacy is a real, first-class technical skill here, not
            a footnote.
          </p>
        </div>
      </div>

      <PageSectionNav items={SECTION_NAV_ITEMS} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <section id="fundamentals" className="scroll-mt-32 mb-16">
          <SectionHeading eyebrow="The Two Pillars" title="Fundamentals that transfer" />
          <div className="grid gap-4 sm:grid-cols-2">
            {FUNDAMENTALS_PILLARS.map((pillar) => (
              <FundamentalsPillarCard key={pillar.id} pillar={pillar} />
            ))}
          </div>
        </section>

        <section id="interview-modes" className="scroll-mt-32 mb-16">
          <SectionHeading eyebrow="Two Delivery Formats" title="Synchronous vs. asynchronous" />
          <div className="grid gap-4 sm:grid-cols-2">
            {INTERVIEW_MODES.map((modeProfile) => (
              <div key={modeProfile.mode} className="card-base p-5 sm:p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {modeProfile.label}
                </h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {modeProfile.description}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {modeProfile.whatItRewards.map((reward) => (
                    <li
                      key={reward}
                      className="text-sm text-zinc-600 dark:text-zinc-300 pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-400 dark:before:text-zinc-600"
                    >
                      {reward}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="practice-platforms" className="scroll-mt-32">
          <SectionHeading eyebrow="Where You'll See This" title="LeetCode, HackerRank, CoderPad" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRACTICE_PLATFORMS.map((platform) => (
              <PracticePlatformCard key={platform.id} platform={platform} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
