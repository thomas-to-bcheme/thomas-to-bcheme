import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import OperationalGoalTaxonomy from '@/components/sections/aiMl/OperationalGoalTaxonomy';
import { BREADTH_DOMAINS, FEATURED_DOMAINS } from '@/constants/aiMl';
import type { AppliedDomain } from '@/constants/aiMl/types';

export const metadata: Metadata = {
  title: 'Applied Machine Learning — Thomas To',
  description:
    'Nine applied domains, each answering which model family is the default, which is situational, and which is rarely the right tool — argued from the structure of the problem rather than from popularity.',
  alternates: { canonical: '/ai-ml/applied' },
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

const DomainCard = ({ domain }: { domain: AppliedDomain }) => (
  <Link
    href={`/ai-ml/applied/${domain.id}`}
    className={`card-base p-5 transition-colors hover:border-blue-300 dark:hover:border-blue-700 ${FOCUS_RING}`}
  >
    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{domain.label}</h3>
    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      {domain.problemShape}
    </p>
    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
      <span className="font-semibold text-zinc-600 dark:text-zinc-400">Baseline to beat: </span>
      {domain.industryBaseline}
    </p>
    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
      Which model, and why <ArrowRight size={13} />
    </span>
  </Link>
);

export default function AppliedIndexPage() {
  return (
    <AiMlPageShell
      eyebrow="Applied Machine Learning"
      title="Same models,"
      titleAccent="read by the problem"
      lede="The category pages organize by how a model works. These organize by what you are trying to do — and each one commits to a verdict on all four families, including the ones it argues against."
      backHref="/ai-ml"
      backLabel="Back to AI/ML"
    >
      <section id="taxonomy" className="scroll-mt-24">
        <SectionHeading
          eyebrow="The mental model"
          title="Complete taxonomy by operational goal"
        />
        <OperationalGoalTaxonomy />
      </section>

      <section id="featured" className="scroll-mt-24 mt-12">
        <SectionHeading eyebrow="Featured" title="Where this site goes deepest" />
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURED_DOMAINS.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </section>

      <section id="breadth" className="scroll-mt-24 mt-12">
        <SectionHeading eyebrow="Breadth" title="The wider field, for contrast" />
        <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Included because the interesting part of a category verdict is where it flips. Linear
          regression is a middling forecaster and the default estimator in causal inference;
          reinforcement learning is the default for control and the wrong tool for detection.
          Seeing the same four families ranked differently across nine problems is the point.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BREADTH_DOMAINS.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </section>
    </AiMlPageShell>
  );
}
