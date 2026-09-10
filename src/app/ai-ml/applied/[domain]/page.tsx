import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SectionHeading from '@/components/ui/SectionHeading';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import CategoryFitMatrix from '@/components/sections/aiMl/CategoryFitMatrix';
import ModelGrid from '@/components/sections/aiMl/ModelGrid';
import {
  APPLIED_DOMAINS,
  getDomainById,
  getModelDomainFit,
  getModelsByDomain,
} from '@/constants/aiMl';
import type { AiMlModel } from '@/constants/aiMl/types';

export const dynamicParams = false;

export function generateStaticParams(): { domain: string }[] {
  return APPLIED_DOMAINS.map((domain) => ({ domain: domain.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const entry = getDomainById(domain);
  if (!entry) return {};

  return {
    title: `${entry.label} — Applied ML — Thomas To`,
    description: entry.problemShape,
    alternates: { canonical: `/ai-ml/applied/${entry.id}` },
  };
}

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

export default async function AppliedDomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const entry = getDomainById(domain);
  if (!entry) notFound();

  // A pure projection over the registry, ranked primary -> viable -> adapted.
  const models = getModelsByDomain(entry.id);
  const fitOf = (model: AiMlModel) => getModelDomainFit(model, entry.id)?.fit ?? null;

  return (
    <AiMlPageShell
      eyebrow={entry.eyebrow}
      title={entry.label}
      lede={entry.problemShape}
      backHref="/ai-ml/applied"
      backLabel="Back to Applied ML"
    >
      <div className="card-base p-4 sm:p-5 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 max-w-3xl">
        <span className="text-micro text-zinc-400 block mb-1.5">The baseline to beat</span>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {entry.industryBaseline}
        </p>
      </div>

      <section id="category-fit" className="scroll-mt-24 mt-12">
        <SectionHeading eyebrow="First principles" title="Which family, and why" />
        <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          All four families get a verdict, including the ones argued against — an omission would
          let you assume the question was never asked.
        </p>
        <CategoryFitMatrix domain={entry} />
      </section>

      <section id="models" className="scroll-mt-24 mt-12">
        <SectionHeading eyebrow="The models" title="Ranked by fit for this problem" />
        <ModelGrid
          models={models}
          domainContext={{ id: entry.id, fitOf }}
          emptyMessage="Models rating this domain are still being written."
        />
      </section>

      <section id="practice" className="scroll-mt-24 mt-12">
        <SectionHeading eyebrow="In practice" title="How this domain is evaluated and run" />
        <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
          <div className="card-base p-4 sm:p-5">
            <span className="text-micro text-zinc-400 block mb-2">Evaluation norms</span>
            <ul className="space-y-1.5">
              {entry.evaluationNorms.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-base p-4 sm:p-5">
            <span className="text-micro text-zinc-400 block mb-2">Deployment norms</span>
            <ul className="space-y-1.5">
              {entry.deploymentNorms.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </AiMlPageShell>
  );
}
