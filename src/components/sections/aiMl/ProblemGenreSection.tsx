import SectionHeading from '@/components/ui/SectionHeading';
import MathBlock from '@/components/ui/MathBlock';
import {
  PROBLEM_GENRES,
  SIMILARITY_METRICS,
  TASK_TYPE_LABELS,
  getCategoryById,
  getDomainById,
  getModelBySlug,
  type AiMlModel,
  type ProblemGenre,
  type SimilarityMetricId,
} from '@/constants/aiMl';

import ProblemGenreMap, { type GenreLeafView, type GenreView } from './ProblemGenreMap';
import SimilarityExplorer, { type SimilarityMetricView } from './SimilarityExplorer';

const SECTION_CLASS = 'scroll-mt-24 mt-14 first:mt-0';
const GENRE_MAP_ID = 'problem-genres';
const EXPLORER_ID = 'similarity-metrics';

function modelHref(model: AiMlModel): string {
  return `/ai-ml/${model.category}/${model.slug}`;
}

// Unregistered slugs are dropped here rather than rendered as dead links;
// verifyAiMl fails the build-time check on them, so this never hides a bug.
function resolveLeaves(genre: ProblemGenre): GenreLeafView[] {
  return genre.leaves.flatMap((leaf) => {
    const model = getModelBySlug(leaf.slug);
    if (!model) return [];
    return [
      {
        slug: leaf.slug,
        label: leaf.label,
        examples: leaf.examples ?? [],
        href: modelHref(model),
        modelName: model.name,
        categoryLabel: getCategoryById(model.category)?.label ?? model.category,
      },
    ];
  });
}

function resolveAnchor(genre: ProblemGenre): Pick<GenreView, 'anchorHref' | 'anchorLabel'> {
  if (genre.anchor.kind === 'domain') {
    const domain = getDomainById(genre.anchor.id);
    return {
      anchorHref: domain ? `/ai-ml/applied/${domain.id}` : null,
      anchorLabel: domain ? `${domain.label}: which model, and why` : '',
    };
  }
  return { anchorHref: null, anchorLabel: TASK_TYPE_LABELS[genre.anchor.id] };
}

/**
 * Server half of the problem landscape. It resolves slugs against the registry
 * and pre-renders KaTeX here, then hands plain data to the two client
 * components. Client components may not import the registry (it carries every
 * model's code samples; see checkBundleSafety in scripts/verifyAiMl.ts).
 */
export default function ProblemGenreSection() {
  const metricLabels = new Map(SIMILARITY_METRICS.map((metric) => [metric.id, metric.label]));

  const genres: GenreView[] = PROBLEM_GENRES.map((genre) => ({
    id: genre.id,
    label: genre.label,
    question: genre.question,
    output: genre.output,
    typicalObjective: genre.typicalObjective,
    metricRationale: genre.metricRationale,
    ...resolveAnchor(genre),
    leaves: resolveLeaves(genre),
    metrics: genre.metricIds.map((id) => ({ id, label: metricLabels.get(id) ?? id })),
  }));

  const metrics: SimilarityMetricView[] = SIMILARITY_METRICS.map(({ expression, relatedSlugs, ...metric }) => ({
    ...metric,
    relatedModels: relatedSlugs.flatMap((slug) => {
      const model = getModelBySlug(slug);
      return model ? [{ slug, name: model.name, href: modelHref(model) }] : [];
    }),
    genres: PROBLEM_GENRES.filter((genre) => genre.metricIds.includes(metric.id)).map((genre) => ({
      id: genre.id,
      label: genre.label,
    })),
  }));

  const math: Partial<Record<SimilarityMetricId, React.ReactNode>> = Object.fromEntries(
    SIMILARITY_METRICS.map((metric) => [
      metric.id,
      <div key={metric.id}>
        <MathBlock math={metric.expression.formula} />
        <dl className="mt-2 space-y-1.5">
          {metric.expression.symbols.map((symbol) => (
            <div key={symbol.symbol} className="flex flex-wrap items-baseline gap-2">
              <dt className="shrink-0">
                <MathBlock math={symbol.symbol} display={false} />
              </dt>
              <dd className="text-sm text-zinc-500 dark:text-zinc-400">{symbol.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>,
    ]),
  );

  return (
    <>
      <section id={GENRE_MAP_ID} className={SECTION_CLASS}>
        <SectionHeading eyebrow="The problem landscape" title="What kind of problem is this?" />
        <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Before choosing a model, name the genre of the problem: a number, a label, a grouping, a decision, text, an image, a ranked
          list, or a future value. The same algorithm can serve several genres (an SVM both regresses and classifies), so the genre is
          a property of the problem, not of the model. Pick a genre to see the families that solve it. Every family links to its full
          entry.
        </p>
        <ProblemGenreMap genres={genres} explorerAnchorId={EXPLORER_ID} />
      </section>

      <section id={EXPLORER_ID} className={SECTION_CLASS}>
        <SectionHeading eyebrow="Similarity & distance" title="What does “similar” mean to the algorithm?" />
        <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Nearest neighbours, clustering, retrieval and recommendation all reduce to one choice: how to measure closeness. That choice
          depends first on how much structure the data has, from an unordered set up to a whitened coordinate system, and then on
          which differences should count. Drag the vectors and edit the sets and strings to see each metric compute, and why the same
          two points can be near under one metric and far under another.
        </p>
        <SimilarityExplorer metrics={metrics} math={math} genreAnchorId={GENRE_MAP_ID} />
      </section>
    </>
  );
}
