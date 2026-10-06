import type { Metadata } from 'next';

import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import {
  CardTabsPanel,
  FoundationPanel,
  ParadigmPanel,
  ReadingPanel,
} from '@/components/sections/DeployOpsPanels';
import { BODY_TEXT_CLASS, SECTION_CLASS } from '@/components/sections/sweDe/styles';
import {
  DEPLOYOPS_BASE_PATH,
  DETERMINISM_SPECTRUM,
  LLMOPS_CARDS,
  MLOPS_TOPICS,
  REPO_PROOF,
  REPO_PROOF_DISCLAIMER,
} from '@/constants/deployOps';

export const metadata: Metadata = {
  title: 'DeployOps — Thomas To',
  description:
    'Deterministic code, probabilistic models: software DevOps as the foundation, with a dedicated focus on AI/ML/LLMOps — data version control, registries, distributed training, serving, evals and where determinism breaks. Includes six deployment strategies with Kubernetes and GitHub Actions snippets and a reading list.',
  alternates: { canonical: DEPLOYOPS_BASE_PATH },
};

const SECTIONS = [
  { id: 'spectrum', label: 'Determinism' },
  { id: 'ai-ml-ops', label: 'AI/ML Ops' },
  { id: 'llmops', label: 'LLMOps' },
  { id: 'foundation', label: 'SWE foundation' },
  { id: 'compare', label: 'Compare' },
  { id: 'reading', label: 'Reading list' },
  { id: 'proof', label: 'Proof' },
];

/** LLMOps is a single group of cards; wrap it so it can reuse the topic-tabs panel. */
const LLMOPS_GROUPS = [{ id: 'llmops', label: 'LLMOps', cards: LLMOPS_CARDS }];

export default function DeployOpsPage() {
  return (
    <AiMlPageShell
      eyebrow="DeployOps"
      title="Deterministic code,"
      titleAccent="probabilistic models"
      lede="Version everything, gate on evidence. Software DevOps keeps the code path reproducible; AI/ML/LLMOps extends the same principles to data, models, prompts and evals, and is honest about where determinism runs out. Each topic states the SWE principle it extends, the trade-offs, and where determinism breaks."
      backHref="/"
      backLabel="Back to home"
    >
      <PageSectionNav items={SECTIONS} />

      <section id="spectrum" className={SECTION_CLASS}>
        <SectionHeading eyebrow="The idea" title="A spectrum of guarantees" />
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Determinism spectrum">
          {DETERMINISM_SPECTRUM.map((step, index) => (
            <li key={step.id} className="card-base p-4">
              <span className="text-micro font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {`${index + 1}. ${step.label}`}
              </span>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                {step.example}
              </p>
              <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{step.guarantee}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="ai-ml-ops" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Dedicated focus" title="AI/ML Ops" />
        <CardTabsPanel label="AI/ML Ops topics" groups={MLOPS_TOPICS} />
      </section>

      <section id="llmops" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Dedicated focus" title="LLMOps" />
        <CardTabsPanel label="LLMOps topics" groups={LLMOPS_GROUPS} />
      </section>

      <section id="foundation" className={SECTION_CLASS}>
        <SectionHeading eyebrow="The base layer" title="Software DevOps foundation" />
        <FoundationPanel />
      </section>

      <section id="compare" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Side by side" title="DevOps vs MLOps vs LLMOps" />
        <ParadigmPanel />
      </section>

      <section id="reading" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Reference" title="Reading list" />
        <ReadingPanel />
      </section>

      <section id="proof" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Receipts" title="Proof from this repo" />
        <div className="card-base p-5">
          <ul className={`space-y-2 ${BODY_TEXT_CLASS}`}>
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
    </AiMlPageShell>
  );
}
