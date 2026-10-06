import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import TopicFigure from './figures/TopicFigure';
import FoundationsAccordion from '@/components/sections/systemDesignPrep/foundations/FoundationsAccordion';
import DataEngineeringLifecycleDiagram, {
  deOutputAnchor,
  deStageAnchor,
  deUndercurrentAnchor,
} from '@/components/sections/systemDesignPrep/foundations/DataEngineeringLifecycleDiagram';
import { BODY_TEXT_CLASS, FOCUS_RING, LINK_CLASS } from './styles';
import {
  DE_DOWNSTREAM_OUTPUTS,
  DE_LIFECYCLE_STAGES,
  DE_UNDERCURRENTS,
} from '@/constants/systemDesignPrep/foundations';
import { DEVELOPMENT_LIFECYCLES } from '@/constants/systemDesignPrep/developmentLifecycles';
import {
  LIFECYCLE_STAKEHOLDERS,
  ROLE_MAP_FIGURE,
  type LifecycleOwnership,
  type LifecycleStakeholderEntry,
} from '@/constants/sweDe';

const OWNERSHIP_GROUPS: { owner: LifecycleOwnership; eyebrow: string; intro: string }[] = [
  {
    owner: 'core',
    eyebrow: 'Your day-to-day',
    intro: 'The stages and undercurrents a software or data engineer owns directly. Expect to be the one communicating here.',
  },
  {
    owner: 'partner',
    eyebrow: 'Know the partner teams',
    intro: 'Usually dedicated roles elsewhere. You are not responsible for the work, but you are expected to know what they need from you and what you need from them.',
  },
];

const DATA_ENGINEERING_LIFECYCLE_ID = 'data-engineering';

const ListBlock = ({ heading, items }: { heading: string; items: string[] }) => (
  <div>
    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{heading}</p>
    <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);

/** Label, one-liner, and the diagram anchor — all read from the lifecycle's own constants. */
const resolveEntry = (entry: LifecycleStakeholderEntry) => {
  switch (entry.kind) {
    case 'stage': {
      const stage = DE_LIFECYCLE_STAGES.find((candidate) => candidate.id === entry.id);
      return stage && { label: stage.label, summary: stage.summary, anchor: deStageAnchor(stage.id), kindLabel: 'Stage' };
    }
    case 'undercurrent': {
      const undercurrent = DE_UNDERCURRENTS.find((candidate) => candidate.id === entry.id);
      return (
        undercurrent && {
          label: undercurrent.label,
          summary: undercurrent.summary,
          anchor: deUndercurrentAnchor(undercurrent.id),
          kindLabel: 'Undercurrent',
        }
      );
    }
    case 'output': {
      const output = DE_DOWNSTREAM_OUTPUTS.find((candidate) => candidate.id === entry.id);
      return (
        output && {
          label: output.label,
          summary: output.summary,
          anchor: deOutputAnchor(output.id),
          kindLabel: 'Downstream',
        }
      );
    }
  }
};

/**
 * The data engineering lifecycle as the foundation under software engineering:
 * the shared figure, then — per stage, downstream consumer, and undercurrent —
 * who to communicate with, what to say, and which SWE principles apply. Every
 * box in the figure links to an accordion below, so the anchors must stay
 * on this page.
 */
const LifecycleStakeholderSection = () => {
  const otherLifecycles = DEVELOPMENT_LIFECYCLES.filter((lifecycle) => lifecycle.id !== DATA_ENGINEERING_LIFECYCLE_ID);

  return (
    <>
      <p className={`mb-6 max-w-3xl ${BODY_TEXT_CLASS}`}>
        Data engineering is the infrastructure that every downstream software practice depends on:
        testing, versioning, observability, and review mean little if the data underneath is late,
        wrong, or undefined. Its lifecycle is also a communication map, because each stage hands
        something to a different team. Start here, then read the four levels below for how the
        machinery underneath actually works.
      </p>

      <DataEngineeringLifecycleDiagram />

      {OWNERSHIP_GROUPS.map((group) => (
        <div key={group.owner} className="mt-10">
          <p className="text-micro text-zinc-400 mb-1">{group.eyebrow}</p>
          <p className={`mb-3 max-w-3xl ${BODY_TEXT_CLASS}`}>{group.intro}</p>
          <div className="space-y-3">
            {LIFECYCLE_STAKEHOLDERS.filter((entry) => entry.owner === group.owner).map((entry) => {
              const resolved = resolveEntry(entry);
              if (!resolved) return null;
              return (
                <FoundationsAccordion
                  key={`${entry.kind}-${entry.id}`}
                  id={resolved.anchor}
                  title={
                    <>
                      {resolved.label} <span className="ml-1 text-micro text-zinc-400">{resolved.kindLabel}</span>
                    </>
                  }
                  summary={resolved.summary}
                >
                  <ListBlock heading="Who you work with" items={entry.stakeholders} />
                  <ListBlock heading="What to communicate" items={entry.communicate} />
                  <ListBlock heading="Software engineering principles" items={entry.swePrinciples} />
                </FoundationsAccordion>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-10">
        <TopicFigure spec={ROLE_MAP_FIGURE} />
      </div>

      <div className="mt-10 card-base p-4 sm:p-5">
        <p className="text-micro text-zinc-400 mb-1">Other lifecycles</p>
        <p className={`mb-3 ${BODY_TEXT_CLASS}`}>
          The same pattern repeats in the neighboring disciplines, and they assume this one is already
          built: ML/MLOps trains on what Serving produces, and DevOps runs the pipelines Orchestration
          schedules.
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {otherLifecycles.map((lifecycle) => (
            <li key={lifecycle.id}>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{lifecycle.shortLabel}</p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {lifecycle.stages.map((stage) => stage.label).join(' → ')}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <Link
            href="/system-design#development-lifecycles"
            className={`inline-flex items-center gap-1.5 rounded-sm ${LINK_CLASS} ${FOCUS_RING}`}
          >
            Compare all four lifecycles <ArrowRight size={13} />
          </Link>
          <Link
            href="/system-design#foundations-data-engineering"
            className={`inline-flex items-center gap-1.5 rounded-sm ${LINK_CLASS} ${FOCUS_RING}`}
          >
            Key questions for every stage <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </>
  );
};

export default LifecycleStakeholderSection;
