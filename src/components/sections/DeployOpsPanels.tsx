'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Cpu,
  Database,
  ExternalLink,
  FlaskConical,
  FlaskRound,
  GitCommitHorizontal,
  Hammer,
  MessageSquareText,
  Package,
  Rocket,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import CodeBlock from '@/components/ui/CodeBlock';
import Tabs from '@/components/ui/Tabs';
import {
  BOOKS,
  BRIDGE_BOOKS,
  DEPLOY_STRATEGIES,
  DETERMINISM_PILLARS,
  LIFECYCLE_STAGES,
  PARADIGM_ROWS,
  READING_ORDER,
} from '@/constants/deployOps';
import type {
  Book,
  DeployOpsIconName,
  DeterminismCard,
  OpsLayer,
} from '@/types/deployOps';

/** Resolves a data-file icon key to a lucide component — keeps src/constants/deployOps icon-free. */
const ICON_MAP: Record<DeployOpsIconName, LucideIcon> = {
  GitCommitHorizontal,
  Hammer,
  FlaskConical,
  Rocket,
  Activity,
  Undo2,
  Database,
  FlaskRound,
  Cpu,
  SlidersHorizontal,
  Package,
  MessageSquareText,
};

const LAYER_BADGE: Record<OpsLayer, { label: string; color: 'zinc' | 'blue' | 'purple' }> = {
  swe: { label: 'SWE foundation', color: 'zinc' },
  ml: { label: 'ML', color: 'blue' },
  llm: { label: 'LLM', color: 'purple' },
};

const BASIS_LABEL: Record<Book['basis'], string> = {
  toc: 'from table of contents',
  'publisher-description': 'from publisher description',
  'author-repo': 'from author repo outline',
};

const STATUS_LABEL: Record<Book['status'], string> = {
  published: 'Published',
  'early-release': 'Early release',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

// --- Foundation (traditional SWE DevOps) ---

export const FoundationPanel: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        The loop: Monitor decides between promoting and rolling back
      </h3>
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const Icon = ICON_MAP[stage.iconName];
          return (
            <li key={stage.id} className="card-base p-4">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-blue-500" aria-hidden="true" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {`${index + 1}. ${stage.label}`}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {stage.artifact}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                <span className="font-semibold">Gate: </span>
                {stage.gate}
              </p>
            </li>
          );
        })}
      </ol>
    </div>

    <div>
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Determinism pillars: what makes the code side reproducible
      </h3>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DETERMINISM_PILLARS.map((pillar) => (
          <li key={pillar.id} className="card-base p-4">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{pillar.title}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {pillar.summary}
            </p>
          </li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Six release strategies
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Deployment strategies compared</caption>
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
              <th scope="col" className="py-2 pr-3 font-semibold">Strategy</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Use when</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Rollback</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Cost</th>
              <th scope="col" className="py-2 font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody className="text-zinc-600 dark:text-zinc-400">
            {DEPLOY_STRATEGIES.map((strategy) => (
              <tr key={strategy.id} className="border-b border-zinc-100 dark:border-zinc-900 align-top">
                <th scope="row" className="py-2 pr-3 font-semibold text-zinc-900 dark:text-white">
                  {strategy.name}
                </th>
                <td className="py-2 pr-3">{strategy.useWhen}</td>
                <td className="py-2 pr-3">{strategy.rollback}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{strategy.resourceCost}</td>
                <td className="py-2">{strategy.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Tabs
        className="mt-6"
        label="Deployment strategy manifests"
        tabs={DEPLOY_STRATEGIES.map((strategy) => ({ id: strategy.id, label: strategy.name }))}
      >
        {(activeId) => {
          const strategy = DEPLOY_STRATEGIES.find((candidate) => candidate.id === activeId);
          if (!strategy) return null;
          return (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{strategy.tagline}</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                <span className="font-semibold">Caveat: </span>
                {strategy.caveat}
              </p>
              {strategy.snippets.map((snippet) => (
                <CodeBlock key={snippet.title} title={snippet.title} code={snippet.code} />
              ))}
              <p className="text-xs text-zinc-500">
                {'Render with envsubst, Helm or Kustomize. Variables: '}
                {strategy.variables.map((name) => `\${${name}}`).join(', ')}
              </p>
            </div>
          );
        }}
      </Tabs>
    </div>
  </div>
);

// --- Determinism card grid (ML and LLM topics share one shape) ---

const DeterminismCardView: React.FC<{ card: DeterminismCard }> = ({ card }) => {
  const Icon = ICON_MAP[card.iconName];
  const layer = LAYER_BADGE[card.layer];
  return (
    <article className="card-base p-5 space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <Icon size={18} className="text-blue-500" aria-hidden="true" />
        <h4 className="text-base font-semibold text-zinc-900 dark:text-white">{card.title}</h4>
        <Badge color={layer.color} variant="outline">
          {layer.label}
        </Badge>
      </header>
      <dl className="space-y-2 text-sm leading-relaxed">
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-white">SWE principle</dt>
          <dd className="text-zinc-600 dark:text-zinc-400">{card.swePrinciple}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-white">Extension</dt>
          <dd className="text-zinc-600 dark:text-zinc-400">{card.extension}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-white">Trade-offs</dt>
          <dd>
            <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 space-y-0.5">
              {card.tradeoffs.map((tradeoff) => (
                <li key={tradeoff}>{tradeoff}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-rose-700 dark:text-rose-400">
            Where determinism breaks
          </dt>
          <dd className="text-zinc-600 dark:text-zinc-400">{card.breaksWhere}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-1.5">
        {card.tools.map((tool) => (
          <span key={tool} className="tag-blue">
            {tool}
          </span>
        ))}
      </div>
    </article>
  );
};

interface CardTabsProps {
  groups: readonly { id: string; label: string; cards: readonly DeterminismCard[] }[];
  label: string;
}

/** Topic tabs over a grid of determinism cards. */
export const CardTabsPanel: React.FC<CardTabsProps> = ({ groups, label }) => (
  <Tabs label={label} tabs={groups.map((group) => ({ id: group.id, label: group.label }))}>
    {(activeId) => {
      const group = groups.find((candidate) => candidate.id === activeId);
      if (!group) return null;
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {group.cards.map((card) => (
            <DeterminismCardView key={card.id} card={card} />
          ))}
        </div>
      );
    }}
  </Tabs>
);

// --- Paradigm comparison ---

export const ParadigmPanel: React.FC = () => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-left text-sm">
      <caption className="sr-only">DevOps, MLOps and LLMOps compared</caption>
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
          <th scope="col" className="py-2 pr-3 font-semibold">Dimension</th>
          <th scope="col" className="py-2 pr-3 font-semibold">DevOps</th>
          <th scope="col" className="py-2 pr-3 font-semibold">MLOps</th>
          <th scope="col" className="py-2 font-semibold">LLMOps</th>
        </tr>
      </thead>
      <tbody className="text-zinc-600 dark:text-zinc-400">
        {PARADIGM_ROWS.map((row) => (
          <tr key={row.dimension} className="border-b border-zinc-100 dark:border-zinc-900 align-top">
            <th scope="row" className="py-2 pr-3 font-semibold text-zinc-900 dark:text-white">
              {row.dimension}
            </th>
            <td className="py-2 pr-3">{row.devops}</td>
            <td className="py-2 pr-3">{row.mlops}</td>
            <td className="py-2">{row.llmops}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- Reading list ---

const BookCard: React.FC<{ book: Book }> = ({ book }) => {
  const layer = LAYER_BADGE[book.layer];
  return (
    <article className="card-base p-5 space-y-3">
      <header className="space-y-1">
        <a
          href={book.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-start gap-1.5 text-base font-semibold text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 rounded ${FOCUS_RING}`}
        >
          {book.title}
          <ExternalLink size={14} className="mt-1 shrink-0" aria-hidden="true" />
        </a>
        <p className="text-xs text-zinc-500">{book.authors}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge color={layer.color} variant="outline">{layer.label}</Badge>
          <Badge color="zinc" variant="outline">{book.publisher}</Badge>
          <Badge color={book.status === 'early-release' ? 'amber' : 'green'} variant="outline">
            {STATUS_LABEL[book.status]}
          </Badge>
        </div>
      </header>
      <ol className="list-decimal pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {book.takeaways.map((takeaway) => (
          <li key={takeaway}>{takeaway}</li>
        ))}
      </ol>
      <p className="text-xs text-zinc-500">
        {`Takeaways ${BASIS_LABEL[book.basis]}; not read from the book text. Confidence: ${book.confidence}.`}
        {book.isbn ? ` ISBN ${book.isbn}.` : ''}
        {book.note ? ` ${book.note}` : ''}
      </p>
    </article>
  );
};

export const ReadingPanel: React.FC = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {BOOKS.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>

    <div>
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Bridge books: DevOps/SRE to MLOps to LLMOps
      </h3>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {BRIDGE_BOOKS.map((book) => (
          <li key={book.id} className="card-base p-4">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{book.title}</p>
            <p className="text-xs text-zinc-500">{`${book.authors} · ${book.year} · ISBN ${book.isbn}`}</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {book.reason}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-semibold text-zinc-900 dark:text-white">Suggested order: </span>
        {READING_ORDER.join(' → ')}
      </p>
    </div>
  </div>
);
