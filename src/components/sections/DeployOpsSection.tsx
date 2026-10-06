'use client';

import React from 'react';

import Tabs from '@/components/ui/Tabs';
import {
  CardTabsPanel,
  FoundationPanel,
  ParadigmPanel,
  ReadingPanel,
} from '@/components/sections/DeployOpsPanels';
import {
  DETERMINISM_SPECTRUM,
  LLMOPS_CARDS,
  MLOPS_TOPICS,
  REPO_PROOF,
  REPO_PROOF_DISCLAIMER,
} from '@/constants/deployOps';

const SECTION_TABS = [
  { id: 'ai-ml', label: 'AI/ML Ops' },
  { id: 'llm', label: 'LLMOps' },
  { id: 'foundation', label: 'SWE foundation' },
  { id: 'compare', label: 'DevOps vs MLOps vs LLMOps' },
  { id: 'reading', label: 'Reading list' },
] as const;

/** LLMOps is a single group of cards; wrap it so it can reuse the topic-tabs panel. */
const LLMOPS_GROUPS = [{ id: 'llmops', label: 'LLMOps', cards: LLMOPS_CARDS }] as const;

/**
 * DeployOps — the homepage's delivery-engineering section. Traditional
 * software DevOps is the deterministic foundation; the dedicated focus is
 * AI/ML/LLMOps, where each topic states the SWE principle it extends and where
 * determinism breaks. Content lives in src/constants/deployOps/ (icon-free,
 * typed); this component only lays it out. Header markup mirrors
 * ImpactMetricsSection's eyebrow + h2 + description convention.
 */
const DeployOpsSection: React.FC = () => {
  return (
    <section id="deployops" className="scroll-mt-24">
      <div className="mb-6 max-w-2xl">
        <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-3 block">
          DeployOps
        </span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Deterministic code, probabilistic models.
        </h2>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Version everything, gate on evidence. Software DevOps keeps the code path reproducible;
          AI/ML/LLMOps extends the same principles to data, models, prompts and evals, and is
          honest about where determinism runs out.
        </p>
      </div>

      <ol className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Determinism spectrum">
        {DETERMINISM_SPECTRUM.map((step, index) => (
          <li key={step.id} className="card-base p-4">
            <span className="text-micro font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              {`${index + 1}. ${step.label}`}
            </span>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
              {step.example}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {step.guarantee}
            </p>
          </li>
        ))}
      </ol>

      <Tabs label="DeployOps topics" tabs={SECTION_TABS}>
        {(activeId) => {
          switch (activeId) {
            case 'ai-ml':
              return <CardTabsPanel label="AI/ML Ops topics" groups={MLOPS_TOPICS} />;
            case 'llm':
              return <CardTabsPanel label="LLMOps topics" groups={LLMOPS_GROUPS} />;
            case 'foundation':
              return <FoundationPanel />;
            case 'compare':
              return <ParadigmPanel />;
            case 'reading':
              return <ReadingPanel />;
            default:
              return null;
          }
        }}
      </Tabs>

      <div className="mt-8 card-base p-5">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Proof from this repo</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {REPO_PROOF.map((item) => (
            <li key={item.id}>
              {item.claim}{' '}
              <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5">
                {item.evidencePath}
              </code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">{REPO_PROOF_DISCLAIMER}</p>
      </div>
    </section>
  );
};

export default DeployOpsSection;
