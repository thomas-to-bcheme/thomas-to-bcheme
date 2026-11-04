import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import ModelGrid from '@/components/sections/aiMl/ModelGrid';
import { PROBLEM_GENRES, WORKED_EXAMPLES, getModelBySlug } from '@/constants/aiMl';
import type { AiMlModel, ProblemGenre, WorkedLens, WorkedLensGenreId } from '@/constants/aiMl';

export const metadata: Metadata = {
  title: 'One Question, Three Methods — Thomas To',
  description:
    'A single retail business question, how much of each product each store should hold, split into the parts that need regression, classification and clustering, with the data, output, metric and decision for each.',
  alternates: { canonical: '/ai-ml/applied/worked-example' },
};

const SECTION_CLASS = 'scroll-mt-24 mt-12 first:mt-0';

const SECTIONS = [
  { id: 'question', label: 'The question' },
  { id: 'lenses', label: 'Three lenses' },
  { id: 'compare', label: 'Side by side' },
  { id: 'pipeline', label: 'Working together' },
  { id: 'models', label: 'Models' },
];

const BODY_TEXT = 'text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-3xl';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

/** Literal class strings so Tailwind can see them; one accent per method. */
const LENS_ACCENT: Record<WorkedLensGenreId, { border: string; dot: string; text: string }> = {
  regression: {
    border: 'border-l-blue-400',
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
  },
  classification: {
    border: 'border-l-emerald-400',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  clustering: {
    border: 'border-l-violet-400',
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-400',
  },
};

const COMPARISON_ROWS: { label: string; read: (lens: WorkedLens, genre: ProblemGenre) => string }[] = [
  { label: 'Question it answers', read: (lens) => lens.subQuestion },
  { label: 'Genre in one line', read: (_lens, genre) => genre.question },
  { label: 'Training data', read: (lens) => lens.input },
  { label: 'Example output', read: (lens) => lens.exampleOutput },
  { label: 'How it is judged', read: (lens) => lens.metric },
  { label: 'Decision it feeds', read: (lens) => lens.action },
  { label: 'Reach for it when', read: (lens) => lens.reachWhen },
  { label: 'Watch out', read: (lens) => lens.caution },
];

const FieldLabel = ({ children }: { children: string }) => (
  <dt className="text-micro font-bold uppercase tracking-widest text-zinc-400">{children}</dt>
);

const FieldValue = ({ children }: { children: string }) => (
  <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{children}</dd>
);

export default function WorkedExamplePage() {
  const example = WORKED_EXAMPLES[0];
  if (!example) notFound();

  const genreById = new Map(PROBLEM_GENRES.map((genre) => [genre.id, genre]));
  const lenses = example.lenses.flatMap((lens) => {
    const genre = genreById.get(lens.genreId);
    return genre ? [{ lens, genre }] : [];
  });

  const modelsBySlug = new Map<string, AiMlModel>();
  for (const { lens } of lenses) {
    for (const slug of lens.modelSlugs) {
      const model = getModelBySlug(slug);
      if (model) modelsBySlug.set(slug, model);
    }
  }

  return (
    <AiMlPageShell
      eyebrow="Applied Machine Learning"
      title="One question,"
      titleAccent="three kinds of answer"
      lede="Regression, classification and clustering are not rival techniques for the same job. They answer different parts of one business question. This page takes a single retail question and shows which part each one answers, and what the business does with the result."
      backHref="/ai-ml/applied"
      backLabel="Back to Applied ML"
    >
      <PageSectionNav items={SECTIONS} />

      <section id="question" className={SECTION_CLASS}>
        <SectionHeading eyebrow={example.label} title="The question the business asked" />
        <blockquote className="max-w-3xl border-l-2 border-l-blue-400 pl-4 text-lg font-semibold text-zinc-900 dark:text-white">
          {example.businessQuestion}
        </blockquote>
        <p className={`mt-4 ${BODY_TEXT}`}>{example.whyMoreThanOneMethod}</p>
        <p className={`mt-3 ${BODY_TEXT}`}>
          The quick test for which method fits: look at the answer you need. A quantity points to
          regression, a label points to classification, and a grouping nobody has labelled points
          to clustering. The first two are{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-200">supervised</strong>:
          the past contains the right answer to learn from. Clustering is{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-200">unsupervised</strong>:
          there is no answer key, only structure to find.
        </p>
      </section>

      <section id="lenses" className={SECTION_CLASS}>
        <SectionHeading eyebrow="The decomposition" title="Three sub-questions, three methods" />
        <div className="grid gap-4 lg:grid-cols-3">
          {lenses.map(({ lens, genre }) => {
            const accent = LENS_ACCENT[lens.genreId];
            return (
              <article
                key={lens.genreId}
                className={`card-base border-l-2 p-5 ${accent.border}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${accent.dot}`} aria-hidden="true" />
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${accent.text}`}>
                    {genre.label}
                  </h3>
                </div>
                <p className="mt-2 text-base font-bold text-zinc-900 dark:text-white leading-snug">
                  {lens.subQuestion}
                </p>
                <dl className="mt-4 space-y-3">
                  <div>
                    <FieldLabel>What it learns from</FieldLabel>
                    <FieldValue>{lens.input}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>What comes back</FieldLabel>
                    <FieldValue>{lens.exampleOutput}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>What the business does</FieldLabel>
                    <FieldValue>{lens.action}</FieldValue>
                  </div>
                </dl>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {lens.modelSlugs.map((slug) => {
                    const model = modelsBySlug.get(slug);
                    if (!model) return null;
                    return (
                      <li key={slug}>
                        <Link
                          href={`/ai-ml/${model.category}/${model.slug}`}
                          className={`tag-blue hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors ${FOCUS_RING}`}
                        >
                          {model.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section id="compare" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Same data, different job" title="The three lenses side by side" />
        <div className="card-base overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Regression, classification and clustering compared on the same retail question
            </caption>
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="p-3 text-micro font-bold uppercase tracking-widest text-zinc-400">
                  &nbsp;
                </th>
                {lenses.map(({ lens, genre }) => (
                  <th
                    key={lens.genreId}
                    scope="col"
                    className={`p-3 text-xs font-bold uppercase tracking-widest ${LENS_ACCENT[lens.genreId].text}`}
                  >
                    {genre.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-zinc-100 dark:border-zinc-900 last:border-b-0 align-top"
                >
                  <th
                    scope="row"
                    className="w-40 p-3 text-xs font-bold text-zinc-700 dark:text-zinc-200"
                  >
                    {row.label}
                  </th>
                  {lenses.map(({ lens, genre }) => (
                    <td
                      key={lens.genreId}
                      className="p-3 text-zinc-500 dark:text-zinc-400 leading-relaxed"
                    >
                      {row.read(lens, genre)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="pipeline" className={SECTION_CLASS}>
        <SectionHeading eyebrow="In production" title="They work together, not instead of each other" />
        <p className={`mb-4 ${BODY_TEXT}`}>
          The three outputs feed each other. Segments give the forecast a sensible grouping and a
          starting point for new products. The forecast and the current stock position give the
          alert its inputs. Each step uses the method whose output type matches what the next step
          needs.
        </p>
        <ol className="grid gap-3 md:grid-cols-3">
          {example.pipeline.map((step, stepIndex) => {
            const accent = LENS_ACCENT[step.genreId];
            const isLast = stepIndex === example.pipeline.length - 1;
            return (
              <li
                key={step.label}
                className={`card-base relative border-l-2 p-4 ${accent.border}`}
              >
                <span className="text-micro font-bold uppercase tracking-widest text-zinc-400">
                  Step {stepIndex + 1} · {genreById.get(step.genreId)?.label ?? step.genreId}
                </span>
                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">
                  {step.label}
                </h3>
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {step.detail}
                </p>
                {!isLast && (
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-zinc-400 md:block"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section id="models" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Go deeper" title="The models behind each lens" />
        <p className={`mb-4 ${BODY_TEXT}`}>
          Every model page carries the math, intuition, and code. One model can serve more than
          one lens: gradient boosting appears under both regression and classification, because
          the method is the same and only the target changes.
        </p>
        <ModelGrid models={Array.from(modelsBySlug.values())} />
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          For the wider map of problem types, see the{' '}
          <Link
            href="/ai-ml#problem-genres"
            className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
          >
            problem genre map
          </Link>
          , and for the same question argued from the problem&rsquo;s shape, see{' '}
          <Link
            href="/ai-ml/applied/time-series-forecasting"
            className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
          >
            time-series forecasting
          </Link>
          .
        </p>
      </section>
    </AiMlPageShell>
  );
}
