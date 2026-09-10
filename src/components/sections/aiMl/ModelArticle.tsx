import CodeProgressionTabs from '@/components/ui/CodeProgressionTabs';
import MathBlock from '@/components/ui/MathBlock';
import SectionHeading from '@/components/ui/SectionHeading';
import type { PageSectionNavItem } from '@/components/ui/PageSectionNav';
import AppliedDomainPanel from '@/components/sections/aiMl/AppliedDomainPanel';
import ModelSiblingNav from '@/components/sections/aiMl/ModelSiblingNav';
import { FEATURED_DOMAINS, getDomainById } from '@/constants/aiMl';
import {
  OBJECTIVE_KIND_LABELS,
  type AiMlModel,
  type FeaturedDomainId,
} from '@/constants/aiMl/types';

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * Section ids for a model page, exported so the page's PageSectionNav and these
 * anchors read from one source and cannot drift — the same discipline the
 * systemDesignPrep and glossary ToCs already use.
 */
export const MODEL_SECTIONS: PageSectionNavItem[] = [
  { id: 'intuition', label: 'Intuition' },
  { id: 'objective', label: 'Objective' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'applications', label: 'Applications' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'tradeoffs', label: 'Pros & cons' },
  { id: 'implementations', label: 'Code' },
  { id: 'related', label: 'Related' },
];

const SECTION_CLASS = 'scroll-mt-24 mt-12 first:mt-0';

const ModelArticle = ({ model }: { model: AiMlModel }) => (
  <article>
    <section id="intuition" className={SECTION_CLASS}>
      <SectionHeading eyebrow="Intuition" title="What it actually does" />
      <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {model.intuition}
      </p>

      <div className="mt-6">
        <span className="text-micro text-zinc-400 block mb-2">Assumptions it makes</span>
        <ul className="space-y-1.5 max-w-3xl">
          {model.assumptions.map((assumption) => (
            <li key={assumption} className={LIST_ITEM_CLASS}>
              {assumption}
            </li>
          ))}
        </ul>
      </div>
    </section>

    <section id="objective" className={SECTION_CLASS}>
      <SectionHeading
        eyebrow="Objective"
        title={OBJECTIVE_KIND_LABELS[model.objective.kind]}
      />
      <div className="card-base p-4 sm:p-5 max-w-3xl">
        <MathBlock math={model.objective.expression.formula} />
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {model.objective.reading}
        </p>
        <dl className="mt-4 space-y-1.5">
          {model.objective.expression.symbols.map((symbol) => (
            <div key={symbol.symbol} className="flex flex-wrap items-baseline gap-2">
              <dt className="shrink-0">
                <MathBlock math={symbol.symbol} display={false} />
              </dt>
              <dd className="text-sm text-zinc-500 dark:text-zinc-400">{symbol.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>

    <section id="optimization" className={SECTION_CLASS}>
      <SectionHeading eyebrow="Optimization" title="How it is minimized" />
      <div className="card-base p-4 sm:p-5 max-w-3xl">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          {model.optimization.method}
        </p>
        <MathBlock math={model.optimization.updateRule.formula} className="mt-2" />
        <dl className="mt-3 space-y-1.5">
          {model.optimization.updateRule.symbols.map((symbol) => (
            <div key={symbol.symbol} className="flex flex-wrap items-baseline gap-2">
              <dt className="shrink-0">
                <MathBlock math={symbol.symbol} display={false} />
              </dt>
              <dd className="text-sm text-zinc-500 dark:text-zinc-400">{symbol.meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {model.optimization.rationale}
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 max-w-3xl">
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 block mb-2">Hyperparameters</span>
          <ul className="space-y-2">
            {model.optimization.hyperparameters.map((hyperparameter) => (
              <li key={hyperparameter.name}>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {hyperparameter.name}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {hyperparameter.role}
                  {hyperparameter.typicalRange && (
                    <span className="text-zinc-400 dark:text-zinc-500">
                      {' '}
                      ({hyperparameter.typicalRange})
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 block mb-2">Convergence & cost</span>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {model.optimization.convergence}
          </p>
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {model.optimization.complexity}
          </p>
        </div>
      </div>
    </section>

    <section id="applications" className={SECTION_CLASS}>
      <SectionHeading eyebrow="Applications" title="How, where, and why it is used" />
      <div className="grid gap-4 lg:grid-cols-3">
        {FEATURED_DOMAINS.map((domain) => (
          <AppliedDomainPanel
            key={domain.id}
            domainLabel={domain.label}
            profile={model.applications.featured[domain.id as FeaturedDomainId]}
          />
        ))}
      </div>

      {Object.keys(model.applications.breadth).length > 0 && (
        <div className="mt-6">
          <span className="text-micro text-zinc-400 block mb-2">Also applied in</span>
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(model.applications.breadth).map(([domainId, profile]) => {
              const domain = getDomainById(domainId);
              if (!domain || !profile) return null;
              return (
                <AppliedDomainPanel
                  key={domainId}
                  domainLabel={domain.label}
                  profile={profile}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>

    <section id="deployment" className={SECTION_CLASS}>
      <SectionHeading eyebrow="Deployment" title="What it costs to run" />
      <div className="grid gap-4 md:grid-cols-3 max-w-4xl">
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 block mb-1.5">Training</span>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {model.deployment.trainingCost}
          </p>
        </div>
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 block mb-1.5">Inference</span>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {model.deployment.inferenceProfile}
          </p>
        </div>
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 block mb-1.5">Retraining</span>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {model.deployment.retrainingCadence}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 max-w-4xl">
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 block mb-2">Drift & monitoring</span>
          <ul className="space-y-1.5">
            {model.deployment.driftAndMonitoring.map((item) => (
              <li key={item} className={LIST_ITEM_CLASS}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 block mb-2">Production gotchas</span>
          <ul className="space-y-1.5">
            {model.deployment.productionGotchas.map((item) => (
              <li key={item} className={LIST_ITEM_CLASS}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    <section id="tradeoffs" className={SECTION_CLASS}>
      <SectionHeading eyebrow="Trade-offs" title="Pros and cons, in context" />
      <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
        <div className="card-base p-4 sm:p-5 border-l-2 border-l-emerald-400 dark:border-l-emerald-500">
          <span className="text-micro text-zinc-400 block mb-3">Strengths</span>
          <ul className="space-y-3">
            {model.pros.map((pro) => (
              <li key={pro.point}>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{pro.point}</p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {pro.context}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-base p-4 sm:p-5 border-l-2 border-l-amber-400 dark:border-l-amber-500">
          <span className="text-micro text-zinc-400 block mb-3">Limitations</span>
          <ul className="space-y-3">
            {model.cons.map((con) => (
              <li key={con.point}>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{con.point}</p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {con.context}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    <section id="implementations" className={SECTION_CLASS}>
      <SectionHeading eyebrow="Implementation" title="Intuitive, idiomatic, optimized" />
      <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        The same algorithm in three languages, each progressing through Kent Beck&apos;s three
        stages. Every optimization names the lever it pulls and the trade-off it accepts —
        cost profiles are illustrative, not measured benchmarks.
      </p>
      <CodeProgressionTabs implementations={model.implementations} label={model.name} />
    </section>

    <section id="related" className={SECTION_CLASS}>
      <SectionHeading eyebrow="Related" title="Where to go next" />
      <ModelSiblingNav model={model} />
    </section>
  </article>
);

export default ModelArticle;
