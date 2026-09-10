import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import CategoryComparison from '@/components/sections/aiMl/CategoryComparison';
import LanguageStandardsPanel from '@/components/sections/aiMl/LanguageStandardsPanel';
import ModelDecisionTree from '@/components/sections/aiMl/ModelDecisionTree';
import { AI_ML_MODELS, BREADTH_DOMAINS, FEATURED_DOMAINS } from '@/constants/aiMl';

export const metadata: Metadata = {
  title: 'AI/ML Model Reference — Thomas To',
  description:
    'A reasoning path through classical machine learning, deep learning, generative AI, and reinforcement learning — organized general to niche, with each model\'s objective, optimization procedure, applied-domain fit, and implementations in Python, C/C++, and Rust progressing from intuitive to optimized.',
  alternates: { canonical: '/ai-ml' },
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

const SECTION_CLASS = 'scroll-mt-24 mt-14 first:mt-0';

export default function AiMlHubPage() {
  return (
    <AiMlPageShell
      eyebrow="Applied Machine Learning"
      title="Start from the problem,"
      titleAccent="not the model"
      lede="Most model references are alphabetical, which is useless when you do not yet know what you are looking for. This one is a decision path: answer what you are trying to produce, what your data looks like, and what constrains you, and it narrows to a family — then to a model, its objective, and working code."
      backHref="/"
      backLabel="Back to home"
    >
      <section id="decision-tree" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Where to start" title="A decision path, general to niche" />
        <ModelDecisionTree />
      </section>

      <section id="categories" className={SECTION_CLASS}>
        <SectionHeading
          eyebrow="The four families"
          title="Which category, and what it assumes"
        />
        <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Ordered by how much they assume. Classical ML assumes you can state the structure;
          deep learning assumes you have enough data to learn it; generative modelling assumes
          you want the distribution rather than a mapping; reinforcement learning assumes an
          environment you can act on. Each premise is a trade, and naming the trade is what
          makes the choice arguable rather than fashionable.
        </p>
        <CategoryComparison />
      </section>

      <section id="applied" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Applied ML" title="The three this site goes deepest on" />
        <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Each of these answers the same question from the other direction: given this problem
          shape, which category is the default, which is situational, and which is rarely the
          right tool — argued from the structure of the problem rather than from popularity.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURED_DOMAINS.map((domain) => (
            <Link
              key={domain.id}
              href={`/ai-ml/applied/${domain.id}`}
              className={`card-base p-5 transition-colors hover:border-blue-300 dark:hover:border-blue-700 ${FOCUS_RING}`}
            >
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{domain.label}</h3>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-4">
                {domain.problemShape}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                Which model, and why <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <span className="text-micro text-zinc-400 block mb-2">
            And the wider field, for contrast
          </span>
          <div className="flex flex-wrap gap-1.5">
            {BREADTH_DOMAINS.map((domain) => (
              <Link
                key={domain.id}
                href={`/ai-ml/applied/${domain.id}`}
                className={`tag-blue hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors ${FOCUS_RING}`}
              >
                {domain.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="standards" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Code" title="What idiomatic and optimized mean here" />
        <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Every model carries nine code samples — Python, C/C++, and Rust, each progressing from
          the math transcribed literally, to how that language actually wants it written, to an
          optimized form that names the lever it pulls and the trade-off it accepts. Those
          definitions live here rather than being re-derived per model, and a build-time check
          holds each sample to them.{' '}
          <Link href="/practical-technical" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
            The philosophy behind the three stages
          </Link>{' '}
          is on the technical-prep page.
        </p>
        <LanguageStandardsPanel />
      </section>

      <p className="mt-12 text-xs text-zinc-400 dark:text-zinc-500">
        {AI_ML_MODELS.length} model{AI_ML_MODELS.length === 1 ? '' : 's'} published so far; more
        landing per category.
      </p>
    </AiMlPageShell>
  );
}
