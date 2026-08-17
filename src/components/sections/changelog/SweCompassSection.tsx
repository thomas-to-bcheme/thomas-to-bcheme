'use client';

import React from 'react';
import { useActiveSection } from '@/hooks/useActiveSection';
import SweCompassDiagram, { type SweCompassAxis } from '@/components/features/SweCompassDiagram';

const AXIS_SECTION_IDS = ['swe-compass-end-to-end', 'swe-compass-abstraction', 'swe-compass-time'];

// Maps this section's own scoped ids to the SweCompassAxis union the diagram
// takes as a prop — kept local since these ids only ever mean one thing.
const ID_TO_AXIS: Record<string, SweCompassAxis> = {
  'swe-compass-end-to-end': 'end-to-end',
  'swe-compass-abstraction': 'abstraction',
  'swe-compass-time': 'time',
};

const PARAGRAPH_CLASS = 'text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed';
const CODE_CLASS =
  'px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[0.85em] font-mono';

const SweCompassSection = () => {
  // Own, scoped useActiveSection call — only these 3 axis-paragraph ids, not
  // the full page TOC (that's ChangelogSidebar's separate call).
  const activeSectionId = useActiveSection(AXIS_SECTION_IDS);
  const activeAxis = activeSectionId ? ID_TO_AXIS[activeSectionId] ?? null : null;

  return (
    <div className="space-y-8">
      <p className={PARAGRAPH_CLASS}>
        Before the details — design, data, model, backend, frontend, ops; hardware up through
        distributed systems; the version history below — there&apos;s one mental model that
        organizes all of it, and it&apos;s worth drawing before explaining.
      </p>

      <div className="card-base p-6 sm:p-8">
        <SweCompassDiagram activeAxis={activeAxis} />
      </div>

      <p className={PARAGRAPH_CLASS}>
        The compass has three axes from one origin, not two — it&apos;s not a 2D chart with an x
        and a y. <strong className="font-bold text-blue-700 dark:text-blue-400">End-to-end</strong>{' '}
        points right: the lifecycle a system moves through from design to data to model to
        backend to frontend to ops.{' '}
        <strong className="font-bold text-purple-700 dark:text-purple-400">Abstraction</strong>{' '}
        points up: the ladder from raw hardware up through distributed systems.{' '}
        <strong className="font-bold text-amber-700 dark:text-amber-400">Time</strong> points
        down-left: iteration — what shipped, what broke, what got learned, in that order, every
        release.
      </p>

      <div id="swe-compass-end-to-end" className="scroll-mt-24 space-y-3">
        <p className={PARAGRAPH_CLASS}>
          <strong className="font-bold text-zinc-900 dark:text-white">
            End-to-end — design → data → model → backend → frontend → ops.
          </strong>{' '}
          This is deliberately close to, but not the same vocabulary as, the five-tier{' '}
          <code className={CODE_CLASS}>client → frontend → backend → model → data</code> model
          that powers the System Design carousel on the homepage (
          <code className={CODE_CLASS}>src/constants/systemDesign.ts</code>) — that model is a
          rendering taxonomy for diagramming any one project&apos;s architecture; this axis is the
          broader engineering <em>lifecycle</em> a system moves through. It&apos;s concrete enough
          that it&apos;s literally how the Study Plan whiteboard is organized:{' '}
          <code className={CODE_CLASS}>/study-plan</code> has one board each named{' '}
          <code className={CODE_CLASS}>design</code>, <code className={CODE_CLASS}>data</code>,{' '}
          <code className={CODE_CLASS}>model</code>, <code className={CODE_CLASS}>backend</code>,{' '}
          <code className={CODE_CLASS}>frontend</code>, and <code className={CODE_CLASS}>ops</code>{' '}
          — this axis isn&apos;t an abstract claim, it&apos;s the same six words as six real,
          working boards.
        </p>
      </div>

      <div id="swe-compass-abstraction" className="scroll-mt-24 space-y-3">
        <p className={PARAGRAPH_CLASS}>
          <strong className="font-bold text-zinc-900 dark:text-white">
            Abstraction — hardware → distributed systems.
          </strong>{' '}
          This is the ladder from a single CUDA kernel up to a fleet of them coordinating.
          It&apos;s the Study Plan&apos;s <code className={CODE_CLASS}>GPU-TPU</code>,{' '}
          <code className={CODE_CLASS}>cuda-flash-attention</code>,{' '}
          <code className={CODE_CLASS}>cuda-distributed-computing</code>, and{' '}
          <code className={CODE_CLASS}>system_design_MLE</code> boards on the low end, and the
          ZeroGPU backend&apos;s runtime-JIT CUDA kernel benchmark and paged-attention/paged-state
          serving notes (documented on the Hugging Face page) on the high end — the same climb,
          from a kernel running on one GPU slice to a serving layer built to run against many.
        </p>
        <p className={PARAGRAPH_CLASS}>
          That climb keeps going past the two rungs above: the CUDA kernel is compiled by{' '}
          <code className={CODE_CLASS}>ZeroGPU</code>&apos;s own runtime-JIT step, which in turn is
          driven by a programming language — <code className={CODE_CLASS}>Python</code> for the
          Hugging Face ML backend, <code className={CODE_CLASS}>TypeScript</code> for this site —
          and each language sits inside a framework one rung up,{' '}
          <code className={CODE_CLASS}>TensorFlow</code>/<code className={CODE_CLASS}>
            scikit-learn
          </code>{' '}
          on the backend and <code className={CODE_CLASS}>Next.js</code> here. Above any single
          framework is open source itself: <code className={CODE_CLASS}>agentic-writer</code>,{' '}
          <code className={CODE_CLASS}>linkedin-content-loop</code>, and{' '}
          <code className={CODE_CLASS}>resume</code> are this project&apos;s own open-sourced
          repos, sitting in the same ecosystem <code className={CODE_CLASS}>Next.js</code> itself
          comes from. Above that is infrastructure this project doesn&apos;t run at all — a native
          cloud provider like <code className={CODE_CLASS}>AWS DynamoDB</code> for the
          roadmap&apos;s NoSQL store, and third-party cloud/SaaS like{' '}
          <code className={CODE_CLASS}>Vercel</code>, <code className={CODE_CLASS}>Neon</code>,
          and <code className={CODE_CLASS}>Vercel Blob</code> for everything else this site is
          hosted and stored on. One rung higher still is agents-as-a-service — the{' '}
          <code className={CODE_CLASS}>Gemini API</code>, a hosted generative model consumed over
          an API rather than run locally. The top of the ladder is where this closes the loop back
          to &quot;a fleet of them coordinating&quot;: GitHub Actions, Vercel, and Hugging Face
          acting as one &quot;GitHub Monolith&quot; is that same distributed-systems rung, three
          separate providers running as a single system.
        </p>
      </div>

      <div id="swe-compass-time" className="scroll-mt-24 space-y-3">
        <p className={PARAGRAPH_CLASS}>
          Every real system carries a time axis independent of any one page: the legacy decisions
          already made and now load-bearing, whether anyone remembers making them or not; the
          actual scale it runs at today, not the scale it was originally designed for; and the
          future scale it has to survive to without a rewrite, since a rewrite is itself a legacy
          decision the next version inherits. This page is one concrete instance of that general
          shape, not an exception to it.
        </p>
        <p className={PARAGRAPH_CLASS}>
          <strong className="font-bold text-zinc-900 dark:text-white">
            Time — iteration, and this page.
          </strong>{' '}
          This axis <em>is</em> the changelog below: not a marketing timeline, but a dated,
          milestone-level record — reconstructed from real commits — of what shipped, what broke,
          and what was learned each release, per project. The 402 paid-tier-gate bug in the
          ZeroGPU deploy, the Postgres schema-drift bug that crashed the Job Board&apos;s live
          query, the CSS theme-cascade bug that shipped unreadable text to production —
          that&apos;s what this axis looks like in practice, not an abstraction about
          &quot;iterating fast.&quot;
        </p>
        <p className={PARAGRAPH_CLASS}>
          Read together: build the full lifecycle (end-to-end), understand it from the hardware up
          (abstraction), and expect to revisit both as you learn (time) — the three axes this site
          is organized around, literally, in the sidebar to the left.
        </p>
      </div>
    </div>
  );
};

export default SweCompassSection;
