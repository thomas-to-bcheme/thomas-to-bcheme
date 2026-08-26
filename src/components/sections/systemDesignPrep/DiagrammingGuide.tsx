import MermaidDiagram from '@/components/ui/MermaidDiagram';
import { DIAGRAM_TYPES } from '@/constants/systemDesignPrep/diagrammingGuide';

/**
 * Which diagram to reach for, and when — nested inside the High-Level
 * Design framework step (not a standalone top-level section) since this is
 * what actually gets drawn during that step to give the interviewer
 * something concrete to react to before committing to a Deep Dive. Generic,
 * stack-agnostic examples so the concepts transfer to any system, not just
 * one specific architecture.
 */
const DiagrammingGuide = () => (
  <div className="mt-10">
    <span className="text-micro text-zinc-400 block mb-2">Visualizing the Design</span>
    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Which diagram, when</h3>
    <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
      The visual companion to the framework above: a C4/container sketch and an ERD carry the
      High-Level Design step, while a sequence diagram or flowchart carries one specific
      interaction or decision path into the Deep Dive — each giving the interviewer something
      concrete to react to, and preparing the ground before you commit to going deep on one part.
    </p>

    <div className="space-y-8">
      {DIAGRAM_TYPES.map((diagram) => (
        <div key={diagram.id} className="card-base p-5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{diagram.label}</h4>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">When to use it: </span>
            {diagram.whenToUse}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">This example: </span>
            {diagram.exampleNote}
          </p>
          <div className="mt-4">
            <MermaidDiagram chart={diagram.chart} label={`${diagram.label}: ${diagram.exampleNote}`} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default DiagrammingGuide;
