/**
 * Version log data.
 *
 * SCOPE NOTE: this repo has no git tags and SITE_VERSION's own history shows
 * it was set directly to 'v2.4.0' with no prior recorded bumps — there is no
 * authoritative version history to reconstruct from. The first 5 entries below
 * (v2.0.0–v2.4.0) reconstruct the most recent, well-documented feature arc
 * from real commits (verified via `git log --format='%h %ad %s' --date=short`)
 * and assign an approximate, monotonically increasing semver ending at what
 * was, at the time, the real, current SITE_VERSION. v2.5.0 (the /changelog
 * redesign itself) is a real, forward-dated entry added after that redesign
 * shipped and was verified — not backfilled. Earlier foundational work
 * (initial scaffold, first RAG chat integration, homepage sections) predates
 * this window and is intentionally NOT itemized here rather than guessed at.
 * Extend backwards later with the same methodology if a fuller v0.x/v1.x
 * history is wanted.
 */

import type { LucideIcon } from 'lucide-react';
import { Briefcase, Cpu, PenTool, MessageSquare } from 'lucide-react';

export type ChangelogLinkType = 'github' | 'route';

export interface ChangelogLink {
  label: string;
  url: string;
  type: ChangelogLinkType;
}

export interface ChangelogEntry {
  version: string;          // e.g. 'v2.4.0' — milestone-level, approximate (see SCOPE NOTE)
  date: string;              // ISO 8601 'YYYY-MM-DD', the last commit date in this milestone
  title: string;
  summary: string;           // one-sentence framing
  changes: string[];         // each bullet traceable to a real commit message
  lessonsLearned: string[];  // each traceable to a real commit; retrospective, not marketing
  links?: ChangelogLink[];
}

// Sorted newest-first; CHANGELOG_ENTRIES[0] is the current release.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v2.5.0',
    date: '2026-08-08',
    title: 'Changelog becomes a project-organized mental model',
    summary:
      'Restructured /changelog from one flat timeline into four per-project sections with their own version history and interview-FAQ scaffold, plus a full mission/stakeholders/SWE-Compass/agent-definition/system-design essay.',
    changes: [
      'Restructured /changelog into four per-project sections (Job Board, Hugging Face/ZeroGPU, Study Plan, Chat/RAG Agent), each with a sticky, scrollspy-driven sidebar.',
      'Added a full-page essay ($0 mission, résumé/LinkedIn funnel, SWE Compass, agent definition, system design philosophy) with an inline SVG recreation of the SWE Compass diagram.',
      'Added placeholder interview-FAQ slots per project, explicitly flagged isPlaceholder so nothing here is mistaken for real interview material.',
    ],
    lessonsLearned: [
      'Organizing a changelog by project instead of strictly by date makes a thin-history project (the chat agent) visible on its own terms, instead of buried inside a mixed-purpose entry like v2.4.0.',
      "A mental-model essay this long only stays legible with real information architecture — a sticky sidebar and scrollspy reused from the homepage's own useActiveSection hook, not a new nav pattern invented for one page.",
    ],
    links: [{ label: 'Read the SWE Compass', url: '/changelog#swe-compass', type: 'route' }],
  },
  {
    version: 'v2.4.0',
    date: '2026-08-07',
    title: 'Job Board filtering at scale, and the chat agent gets live numbers',
    summary:
      "The Job Board grew real search/filter/pagination instead of a full-table fetch, and the chat agent's RAG context now cites live pipeline KPIs pulled straight from Postgres instead of a hand-copied number.",
    changes: [
      'Added date-range and company filtering with pagination to the Job Board.',
      'Added search, a page-size selector, and in-place pagination to the Job Board.',
      "Wired live pipeline KPIs into the chat agent's RAG context and updated the system design doc.",
    ],
    lessonsLearned: [
      "A full-table fetch doesn't stay free forever as a dataset grows — filtering and pagination moved the Job Board from one large query per page load to smaller, targeted queries, which is what made removing the old ISR/revalidate window (in favor of per-request rendering) safe under the zero-cost constraint.",
      "A hand-copied metric goes stale the moment the underlying data changes — splicing live Postgres counts into the RAG system prompt at request time keeps the chat agent from citing a number that was only ever true at one point in time.",
    ],
    links: [{ label: 'View the Job Board', url: '/jobs', type: 'route' }],
  },
  {
    version: 'v2.3.0',
    date: '2026-08-02',
    title: 'ZeroGPU as a technical report, plus a live Hugging Face Space page',
    summary:
      "Turned the backend status page into an actual technical report and gave the Hugging Face Space its own embedded page on the portfolio.",
    changes: [
      'Added a ZeroGPU constraints study and documented it directly in backend/app.py.',
      'Redesigned the ZeroGPU backend page as a light technical report.',
      'Added a Hugging Face Space page with an iframe embed and a compute-stack showcase.',
      'Added a paged-attention serving note and a pipeline diagram to the Hugging Face page.',
    ],
    lessonsLearned: [
      "Documenting a platform's real constraints inside the code that hits them (backend/app.py) keeps the docs from drifting the way a separate wiki page would.",
      '"No screenshots, no static mockups" became a literal design constraint — an embedded live Space is a stronger proof-of-work signal than a description of one.',
    ],
    links: [{ label: 'View the Hugging Face page', url: '/huggingface', type: 'route' }],
  },
  {
    version: 'v2.2.0',
    date: '2026-08-01',
    title: 'Standing up a real GPU inference backend on ZeroGPU',
    summary:
      "Replaced the placeholder backend page with an actual GPU inference service on Hugging Face's free ZeroGPU tier, then iterated hard on making the deploy and the page itself work.",
    changes: [
      'Added a GPU inference backend scaffold and deploy pipeline.',
      'Fixed the Hugging Face Space deploy by dropping create_repo, which was hitting a 402 on the paid-tier gate.',
      'Synced docs with the current architecture and made the ZeroGPU backend headless-only.',
      'Replaced the ZeroGPU placeholder with a runtime-JIT CUDA kernel benchmark.',
      'Redesigned the ZeroGPU backend page as a headless, datasheet-style status page.',
      'Fixed unreadable text on the deployed ZeroGPU backend page caused by a theme cascade bug.',
    ],
    lessonsLearned: [
      'Even a "free" compute tier has paid-tier gates hiding inside its API surface — create_repo silently assumed paid-tier permissions and returned a 402 until it was dropped from the deploy path.',
      'A CSS theme cascade bug can ship an unreadable page to production even when the app builds cleanly — this one only surfaced by checking the actual deployed page, not local dev.',
      "A placeholder is not a benchmark — the page didn't earn a 'live technical' framing until the placeholder was replaced with a real runtime-JIT CUDA kernel benchmark.",
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-07-21',
    title: 'Splitting the study whiteboard by discipline',
    summary:
      'The Excalidraw study-plan whiteboard grew a real information architecture: one board per engineering discipline instead of one large canvas.',
    changes: [
      'Added multi-board support to the Excalidraw study-plan whiteboard.',
      'Renamed technical_prep.excalidraw to SWE.excalidraw to match the new per-discipline naming.',
      'Split the study-plan whiteboard into discipline-specific boards.',
    ],
    lessonsLearned: [
      "A single flat whiteboard file doesn't scale as content grows — splitting into named, discipline-specific boards made /study-plan legible again instead of one unbounded canvas.",
    ],
    links: [{ label: 'View the Study Plan', url: '/study-plan', type: 'route' }],
  },
  {
    version: 'v2.0.0',
    date: '2026-07-19',
    title: 'Job Board goes live: real Postgres reads in production',
    summary:
      'The first live, database-backed feature on the portfolio — a Job Board reading real rows from a Neon Postgres table synced by an external tailoring pipeline.',
    changes: [
      'Added a Job Board fed by a Neon-backed API route.',
      'Documented the Job Board feature in the README and removed the stale Python ML backend it replaced.',
      'Wired the Jobs tab into the frontend as a tracker for cross-service database reads, and trimmed pipeline token usage on the writing side.',
      'Added signed, private Vercel Blob résumé downloads instead of public URLs.',
      'Debugged the posted_date column through TEXT → DATE → TEXT.',
      'Standardized posted dates to ISO 8601 (YYYY-MM-DD) formatting.',
      'Fixed a Job Board query crash caused by the live DATE-typed posted_date column.',
      'Switched résumé downloads to use the original filename instead of a generic jobId.',
    ],
    lessonsLearned: [
      'Schema drift between a writer service and a reader service is a real failure mode, not a hypothetical one — the posted_date column changed type out from under the read path and crashed a live query before the fix.',
      'Private file delivery should never rely on a public URL — résumé PDFs moved to signed, time-boxed Vercel Blob links from day one of this feature.',
    ],
    links: [{ label: 'View the Job Board', url: '/jobs', type: 'route' }],
  },
];

// Single source of truth for SITE_VERSION (see site.ts change below).
export const LATEST_CHANGELOG_VERSION = CHANGELOG_ENTRIES[0].version;

/**
 * Per-project grouping layer, additive on top of CHANGELOG_ENTRIES above.
 *
 * /changelog is organized per-project (Job Board, Hugging Face/ZeroGPU,
 * Study Plan, Chat/RAG Agent) rather than as one flat timeline. This layer
 * does not replace CHANGELOG_ENTRIES/LATEST_CHANGELOG_VERSION/SITE_VERSION —
 * those remain the flat, real-commit-grounded record those derive from.
 */
export type ProjectId = 'job-board' | 'huggingface-zerogpu' | 'study-plan' | 'chat-agent';

export interface ChangelogProject {
  id: ProjectId;
  name: string;
  tagline: string;
  description: string;
  route?: string;
  icon: LucideIcon;
  entries: ChangelogEntry[]; // newest-first; not always the same object as CHANGELOG_ENTRIES — see v2.4.0 split
}

function findEntry(version: string): ChangelogEntry {
  const entry = CHANGELOG_ENTRIES.find((e) => e.version === version);
  if (!entry) {
    throw new Error(`[changelog] No CHANGELOG_ENTRIES entry for version ${version}`);
  }
  return entry;
}

// v2.4.0 touched two areas in one real commit cluster — Job Board filtering
// and wiring live pipeline KPIs into the chat agent's RAG context. Rather
// than duplicate the full CHANGELOG_ENTRIES[0] object under both projects,
// each project gets an entry-shaped slice carrying only its own bullets.
// Same version + date is intentional — one real release touching two areas.
const V2_4_0_JOB_BOARD_SLICE: ChangelogEntry = {
  version: 'v2.4.0',
  date: '2026-08-07',
  title: 'Job Board filtering, search, and pagination at scale',
  summary:
    'The Job Board grew real search, filtering, and pagination instead of a full-table fetch — which is what made removing the ISR/revalidate window safe under the zero-cost constraint.',
  changes: [
    'Added date-range and company filtering with pagination to the Job Board.',
    'Added search, a page-size selector, and in-place pagination to the Job Board.',
  ],
  lessonsLearned: [
    "A full-table fetch doesn't stay free forever as a dataset grows — filtering and pagination moved the Job Board from one large query per page load to smaller, targeted queries, which is what made removing the old ISR/revalidate window (in favor of per-request rendering) safe under the zero-cost constraint.",
  ],
  links: [{ label: 'View the Job Board', url: '/jobs', type: 'route' }],
};

const V2_5_0_CHAT_AGENT_SLICE: ChangelogEntry = findEntry('v2.5.0');

const V2_4_0_CHAT_AGENT_SLICE: ChangelogEntry = {
  version: 'v2.4.0',
  date: '2026-08-07',
  title: 'The chat agent gets live pipeline numbers',
  summary:
    "The chat agent's RAG context now cites live pipeline KPIs pulled straight from Postgres at request time, instead of a hand-copied number.",
  changes: [
    "Wired live pipeline KPIs into the chat agent's RAG context and updated the system design doc.",
  ],
  lessonsLearned: [
    "A hand-copied metric goes stale the moment the underlying data changes — splicing live Postgres counts into the RAG system prompt at request time keeps the chat agent from citing a number that was only ever true at one point in time.",
  ],
};

export const CHANGELOG_PROJECTS: ChangelogProject[] = [
  {
    id: 'job-board',
    name: 'Job Board',
    tagline: 'Neon Postgres + résumé-tailoring pipeline',
    description:
      'The first live, database-backed feature on this portfolio — real rows in a Neon Postgres table, synced by an external tailoring pipeline four times a day, with signed 24-hour résumé downloads and no ISR/revalidate window once filtering made per-request rendering cheap enough.',
    route: '/jobs',
    icon: Briefcase,
    entries: [V2_4_0_JOB_BOARD_SLICE, findEntry('v2.0.0')],
  },
  {
    id: 'huggingface-zerogpu',
    name: 'Hugging Face / ZeroGPU Backend',
    tagline: "GPU inference on Hugging Face's free tier",
    description:
      "A real GPU inference backend on Hugging Face's free ZeroGPU tier — a runtime-JIT CUDA kernel benchmark and a paged-attention serving note, documented as a technical report rather than a marketing page, with the live Space embedded directly on /huggingface.",
    route: '/huggingface',
    icon: Cpu,
    entries: [findEntry('v2.3.0'), findEntry('v2.2.0')],
  },
  {
    id: 'study-plan',
    name: 'Study Plan (Excalidraw)',
    tagline: 'Discipline-specific live whiteboards',
    description:
      'The live Excalidraw whiteboard at /study-plan, split into discipline-specific boards — design, data, model, backend, frontend, ops, plus the lower-level GPU/CUDA boards — instead of one unbounded canvas.',
    route: '/study-plan',
    icon: PenTool,
    entries: [findEntry('v2.1.0')],
  },
  {
    id: 'chat-agent',
    name: 'Chat / RAG Agent',
    tagline: 'Résumé-grounded RAG, now with live pipeline KPIs',
    description:
      "The résumé-grounded RAG chat widget embedded on the homepage. Its version history here is the thinnest of the four projects — which is itself informative: most of its evolution so far is this very page.",
    icon: MessageSquare,
    entries: [V2_5_0_CHAT_AGENT_SLICE, V2_4_0_CHAT_AGENT_SLICE],
  },
];
