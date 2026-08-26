import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import Badge from '@/components/ui/Badge';
import StakeholderArchetypeCard from '@/components/sections/effectiveCommunication/StakeholderArchetypeCard';
import StoryStructureCard from '@/components/sections/effectiveCommunication/StoryStructureCard';
import {
  STAKEHOLDER_ARCHETYPES,
  CONVERSATION_NAVIGATION_FRAMEWORK,
  STORY_STRUCTURE_APPROACHES,
  HYBRID_NARRATIVE_GUIDANCE,
} from '@/constants/effectiveCommunication';

export const metadata: Metadata = {
  title: 'Effective Communication — Thomas To',
  description:
    'A reusable reference for audience-aware communication — a five-step, active-interviewing and active-listening framework for navigating any conversation, a guide to structuring the story of completed work, and five stakeholder archetypes (engineer, manager, PM, executive, cross-functional partner) applying both to match how each one actually communicates.',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const PAGE_SECTION_NAV_ITEMS = [
  { id: 'conversation-navigation', label: 'Navigating the Conversation' },
  { id: 'structuring-the-story', label: 'Structuring the Story' },
  { id: 'know-your-stakeholder', label: 'Stakeholders' },
];

export default function EffectiveCommunicationPage() {
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
            Know your stakeholder, <span className="gradient-text-blue">then choose your words</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            The same technical answer lands differently depending on who&apos;s asking. This is a
            reusable reference for reading the room — a step-by-step framework for actively
            interviewing and actively listening your way to who&apos;s in it, a structure to reach
            for when the moment calls for telling the story of something already done, and five
            stakeholder archetypes to calibrate against once you know.
          </p>
        </div>
      </div>

      <PageSectionNav items={PAGE_SECTION_NAV_ITEMS} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <section id="conversation-navigation" className="scroll-mt-24">
          <SectionHeading eyebrow="The Framework" title="Navigating any conversation" />
          <FrameworkStepList steps={CONVERSATION_NAVIGATION_FRAMEWORK} />
        </section>

        <section id="structuring-the-story" className="scroll-mt-24 mt-16">
          <SectionHeading eyebrow="Putting It Into Practice" title="Structuring the story" />
          <div className="grid gap-4 sm:grid-cols-2">
            {STORY_STRUCTURE_APPROACHES.map((approach) => (
              <StoryStructureCard key={approach.id} approach={approach} />
            ))}
          </div>

          <div className="mt-6 card-base border-l-2 border-l-blue-400 dark:border-l-blue-500 p-5 sm:p-6">
            <Badge color="blue" variant="outline">
              {HYBRID_NARRATIVE_GUIDANCE.label}
            </Badge>
            <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white leading-relaxed">
              {HYBRID_NARRATIVE_GUIDANCE.summary}
            </p>
            <div className="mt-3 space-y-3">
              {HYBRID_NARRATIVE_GUIDANCE.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section id="know-your-stakeholder" className="scroll-mt-24 mt-16">
          <SectionHeading eyebrow="Applied Examples" title="Know your stakeholder" />
          <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            The active-interviewing and active-listening moves from the framework above look
            different depending on who&apos;s actually in the room — the same probe-and-read
            instinct, aimed at a different signal. Five concrete archetypes below: what they
            care about, what to listen for, and how to adapt the delivery to match how each one
            actually communicates.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {STAKEHOLDER_ARCHETYPES.map((archetype) => (
              <StakeholderArchetypeCard key={archetype.id} archetype={archetype} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
