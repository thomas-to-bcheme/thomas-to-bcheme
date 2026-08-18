import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import SectionHeading from '@/components/ui/SectionHeading';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import PageSectionNav from '@/components/ui/PageSectionNav';
import BehaviouralCategoryCard from '@/components/sections/behavioural/BehaviouralCategoryCard';
import SeniorVsStaffSection from '@/components/sections/behavioural/SeniorVsStaffSection';
import { STAR_FRAMEWORK, BEHAVIOURAL_QUESTION_CATEGORIES } from '@/constants/behavioural';

export const metadata: Metadata = {
  title: 'Behavioural — Thomas To',
  description:
    'A reference for structuring behavioural interview answers with the STAR method, 11 recurring question archetypes spanning scope, conflict, ambiguity, initiative, failure, and prioritization, plus a junior-to-principal career ladder — scope, contribution, impact, and difficulty at every level — for reading how the same story signals seniority.',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const SECTION_NAV_ITEMS = [
  { id: 'star-method', label: 'STAR Method' },
  { id: 'senior-vs-staff', label: 'Career Ladder' },
  { id: 'resistance-to-change', label: 'Resistance to Change' },
  { id: 'scope-creep', label: 'Scope Creep' },
  { id: 'conflict-resolution', label: 'Conflict' },
  { id: 'navigating-ambiguity', label: 'Ambiguity' },
  { id: 'mentoring-juniors', label: 'Mentoring' },
  { id: 'leadership-style', label: 'Leadership' },
  { id: 'owning-failure', label: 'Failure & Feedback' },
  { id: 'hardest-technical-problem', label: 'Hardest Problem' },
  { id: 'taking-initiative', label: 'Initiative' },
  { id: 'disagreeing-with-leadership', label: 'Disagreeing Up' },
  { id: 'prioritizing-competing-deadlines', label: 'Prioritization' },
];

export default function BehaviouralPage() {
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
            Behavioural interviews, <span className="gradient-text-blue">answered with STAR</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            The STAR method, generalized, plus 11 recurring behavioural-question archetypes — from
            scope creep and conflict to owning a failure and prioritizing competing deadlines —
            and how the same story can read anywhere from junior to principal depending on scope,
            contribution, and impact.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <PageSectionNav items={SECTION_NAV_ITEMS} />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <section id="star-method" className="scroll-mt-24 mb-16">
          <SectionHeading eyebrow="The Framework" title="The STAR method, generalized" />
          <FrameworkStepList steps={STAR_FRAMEWORK} />
        </section>

        <SeniorVsStaffSection />

        <section className="mb-4">
          <SectionHeading eyebrow="By Category" title="Common behavioural question archetypes" />
        </section>

        <div className="space-y-4">
          {BEHAVIOURAL_QUESTION_CATEGORIES.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-24">
              <BehaviouralCategoryCard category={category} />
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
