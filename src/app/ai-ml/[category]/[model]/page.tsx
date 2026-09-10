import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ClassificationBadges from '@/components/ui/ClassificationBadges';
import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import ModelArticle, { MODEL_SECTIONS } from '@/components/sections/aiMl/ModelArticle';
import { AI_ML_MODELS, getCategoryById, getModelBySlug } from '@/constants/aiMl';

export const dynamicParams = false;

/**
 * Emits BOTH params. There is no layout.tsx in the [category] segment to supply
 * the parent, so this leaf owns the full cross-product — returning only
 * { model } would 404 every model page.
 */
export function generateStaticParams(): { category: string; model: string }[] {
  return AI_ML_MODELS.map((model) => ({
    category: model.category,
    model: model.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; model: string }>;
}): Promise<Metadata> {
  const { category, model: slug } = await params;
  const model = getModelBySlug(slug);
  if (!model || model.category !== category) return {};

  return {
    title: `${model.name} — AI/ML — Thomas To`,
    description: model.intuition,
    alternates: { canonical: `/ai-ml/${model.category}/${model.slug}` },
  };
}

export default async function AiMlModelPage({
  params,
}: {
  params: Promise<{ category: string; model: string }>;
}) {
  const { category, model: slug } = await params;
  const model = getModelBySlug(slug);
  // The category check rejects a real-model/wrong-category URL, which
  // dynamicParams also blocks — but this keeps the invariant at the call site.
  if (!model || model.category !== category) notFound();

  const entry = getCategoryById(model.category);

  return (
    <AiMlPageShell
      eyebrow={`AI/ML · ${entry?.label ?? model.category}`}
      title={model.name}
      lede={model.intuition}
      backHref={`/ai-ml/${model.category}`}
      backLabel={`Back to ${entry?.label ?? 'category'}`}
    >
      <div className="mb-2">
        <ClassificationBadges
          paradigms={model.paradigms}
          taskTypes={model.taskTypes}
          architecture={model.architecture}
        />
        {model.paradigmNote && (
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 max-w-3xl">
            {model.paradigmNote}
          </p>
        )}
        {model.aliases.length > 0 && (
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Also known as: {model.aliases.join(', ')}
          </p>
        )}
      </div>

      <PageSectionNav items={MODEL_SECTIONS} />

      <ModelArticle model={model} />
    </AiMlPageShell>
  );
}
