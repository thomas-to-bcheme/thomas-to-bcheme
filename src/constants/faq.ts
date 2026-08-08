/**
 * FAQ data for /changelog. Every answer is grounded in a real, cited file —
 * see the "Source:" comment above each entry. No answer here should ever
 * restate changelog specifics ("what changed recently") as a hardcoded
 * string, since that goes stale; it points at the timeline above instead.
 */

import type { ProjectId } from '@/constants/changelog';

export type FaqCategory = 'Architecture & Cost' | 'AI/Agents' | 'Job Search Strategy';

export interface FaqItem {
  id: string;
  category?: FaqCategory;       // used only by the general FAQ
  projectId?: ProjectId;        // used only by per-project FAQ lists
  question: string;
  answer: string;
  isPlaceholder?: boolean;      // true only on scaffolded interview-FAQ slots — never on FAQ_ITEMS
}

export const FAQ_ITEMS: FaqItem[] = [
  // Source: AiSystemInformation.ts GITHUB_CONTEXT §1 & §5; ComputeStackShowcase.tsx
  {
    id: 'why-free',
    category: 'Architecture & Cost',
    question: 'Why is this whole platform free to run?',
    answer:
      "The zero-cost constraint is a deliberate design requirement, not an accident: this site runs entirely on free tiers — Vercel's Hobby plan (a rolling 24-hour window, 100 deploys/day), a GitHub Actions cron running every 30 minutes as the real scheduler (Vercel's free cron caps at once a day), and free GPU compute tiers on Hugging Face (ZeroGPU today, Colab T4/TPU next) that need no credit card. Staying inside those limits is itself the engineering exercise.",
  },
  // Source: Footer.tsx (MIT line)
  {
    id: 'reusable',
    category: 'Architecture & Cost',
    question: 'Can I reuse this architecture for my own project?',
    answer:
      "Yes — the site is built to be copyable: every layer (frontend, backend, model serving, data, ops) runs on a free tier, so nothing here depends on a budget you don't have. Fork the repo and read the version log below for the reasoning behind each piece.",
  },
  // Source: AiSystemInformation.ts GITHUB_CONTEXT §4 & §6
  {
    id: 'stack-breakdown',
    category: 'Architecture & Cost',
    question: 'How does the stack break down — frontend, backend, model, data, ops?',
    answer:
      'GitHub is the data warehouse and logic engine (ingestion + a 3-tier raw/staging/production lifecycle), Vercel is the frontend (Next.js 16, React 19, TypeScript), Hugging Face is the model/inference layer, and Neon Postgres plus Vercel Blob are the data layer the Job Board and résumé downloads read from. See the observability answer below for what "ops" concretely means today.',
  },
  // Source: src/app/api/jobs/route.ts, src/app/api/chat/route.ts
  {
    id: 'observability',
    category: 'Architecture & Cost',
    question: 'What monitoring and observability actually exists today?',
    answer:
      'Structured JSON logs, not a dashboard. The /api/jobs and /api/chat routes each generate a correlation ID per request (crypto.randomUUID()), log structured JSON around it, and return it in an X-Correlation-ID response header so one request can be traced through logs. There is no APM or tracing UI yet — that gap is called out here on purpose rather than overstated.',
  },
  // Source: AiSystemInformation.ts GITHUB_CONTEXT §7
  {
    id: 'resume-agent',
    category: 'AI/Agents',
    question: 'What is the résumé-tailoring agent and job board pipeline?',
    answer:
      'A separate external pipeline, apply-to-jobs, runs five stages — scrape, describe, tailor, render, sync — on a GitHub Actions cron four times a day. It tailors a résumé per role with a bounded-concurrency Gemini pipeline (with quota/rate-limit-aware backoff), checks every tailored résumé against a golden-dataset QA rubric, and syncs into the same Neon Postgres table and Vercel Blob store this site\'s Job Board reads live.',
  },
  // Source: roadmap.ts Phase 3
  {
    id: 'agent-repos',
    category: 'AI/Agents',
    question: "Where's the code for the LinkedIn automation and the other lightweight agents?",
    answer:
      'Three standalone open-source repos come out of this same lineage: agentic-writer (content generation tooling), linkedin-content-loop (the LinkedIn posting automation — the "LinkedIn CI/CD"), and resume (résumé-tailoring tooling, built alongside the pipeline that feeds the Job Board). All three were extracted and hardened into independent, distribution-ready tools.',
  },
  // Source: Roadmap.tsx "Engineering Manifesto" copy; AiSystemInformation.ts PERSONA — framing, not a metrics claim
  {
    id: 'why-automate-job-search',
    category: 'Job Search Strategy',
    question: 'Why build all of this instead of just applying to jobs manually?',
    answer:
      "Because there's no such thing as job security — treating the job search itself as a system to design, automate, and iterate on is the point. This portfolio is a verification mechanism for engineering aptitude as much as it is a tool: every piece, from the tailoring pipeline to this changelog, is meant to demonstrate the same judgment an employer is evaluating.",
  },
  // Self-referential — no external fact needed; exists specifically so this file never has to be edited when a release ships
  {
    id: 'track-changes',
    category: 'Job Search Strategy',
    question: 'What changed most recently, and how do I track changes over time?',
    answer:
      "Each project section above has its own version history, in the sidebar's Projects group — Job Board, Hugging Face/ZeroGPU, Study Plan, Chat/RAG Agent. This answer intentionally doesn't restate any entry, so it can't go stale the next time something ships.",
  },
];

/**
 * Scaffolded interview-FAQ slots, 3 per project, all isPlaceholder: true.
 *
 * No real interview Q&A exists anywhere in this repo — these are clearly
 * marked placeholder prompts grounded in real lessons-learned already
 * present in the changelog data, never fabricated answers. Rendered via
 * FaqAccordionItem's isPlaceholder styling so they can never be mistaken
 * for real content.
 */
export const PROJECT_FAQ_ITEMS: FaqItem[] = [
  // --- Job Board ---
  {
    id: 'job-board-faq-1',
    projectId: 'job-board',
    isPlaceholder: true,
    question: '[Add a real question an interviewer asked about the Job Board’s schema-drift bug]',
    answer:
      '[Add your real answer — e.g. how you diagnosed the posted_date TEXT→DATE→TEXT crash and what changed to prevent it recurring.]',
  },
  {
    id: 'job-board-faq-2',
    projectId: 'job-board',
    isPlaceholder: true,
    question: '[Add a real question about why Neon Postgres over another database option]',
    answer: '[Add your real answer here.]',
  },
  {
    id: 'job-board-faq-3',
    projectId: 'job-board',
    isPlaceholder: true,
    question: '[Add a real question about the résumé-download security model]',
    answer:
      '[Add your real answer — e.g. why signed, time-boxed Vercel Blob links instead of public URLs.]',
  },
  // --- Hugging Face / ZeroGPU ---
  {
    id: 'hf-zerogpu-faq-1',
    projectId: 'huggingface-zerogpu',
    isPlaceholder: true,
    question: '[Add a real question about the 402 paid-tier-gate bug hit deploying to ZeroGPU]',
    answer: '[Add your real answer here.]',
  },
  {
    id: 'hf-zerogpu-faq-2',
    projectId: 'huggingface-zerogpu',
    isPlaceholder: true,
    question: '[Add a real question about why ZeroGPU instead of a dedicated GPU instance]',
    answer: '[Add your real answer here.]',
  },
  {
    id: 'hf-zerogpu-faq-3',
    projectId: 'huggingface-zerogpu',
    isPlaceholder: true,
    question:
      '[Add a real question about the CSS theme-cascade bug that shipped unreadable text to production]',
    answer: '[Add your real answer here.]',
  },
  // --- Study Plan ---
  {
    id: 'study-plan-faq-1',
    projectId: 'study-plan',
    isPlaceholder: true,
    question:
      '[Add a real question about why one Excalidraw board was split into discipline-specific boards]',
    answer: '[Add your real answer here.]',
  },
  {
    id: 'study-plan-faq-2',
    projectId: 'study-plan',
    isPlaceholder: true,
    question: '[Add a real question about using Excalidraw as a thinking tool, not just a presentation one]',
    answer: '[Add your real answer here.]',
  },
  {
    id: 'study-plan-faq-3',
    projectId: 'study-plan',
    isPlaceholder: true,
    question: '[Add a real question about the fractional-indexing constraint on agentic writes to a board]',
    answer: '[Add your real answer here.]',
  },
  // --- Chat / RAG Agent ---
  {
    id: 'chat-agent-faq-1',
    projectId: 'chat-agent',
    isPlaceholder: true,
    question: '[Add a real question about how the RAG system prompt avoids hallucinating metrics]',
    answer: '[Add your real answer here.]',
  },
  {
    id: 'chat-agent-faq-2',
    projectId: 'chat-agent',
    isPlaceholder: true,
    question:
      '[Add a real question about splicing live Postgres KPIs into a static system prompt at request time]',
    answer: '[Add your real answer here.]',
  },
  {
    id: 'chat-agent-faq-3',
    projectId: 'chat-agent',
    isPlaceholder: true,
    question: '[Add a real question about the résumé-tailoring agent’s golden-dataset QA rubric]',
    answer: '[Add your real answer here.]',
  },
];
