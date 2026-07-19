/**
 * System-design diagram data
 *
 * A single, data-driven model that powers the interactive system-design
 * carousel. Every entry describes one project's end-to-end architecture as an
 * ordered list of tier-tagged nodes (client → frontend → backend → model →
 * data) plus its key design considerations.
 *
 * Sources of truth:
 *  - Project list & stack: KANBAN_ITEMS (src/constants/kanban.ts)
 *  - Portfolio HLD:        system_design_docs/{architecture,ml-models,api}.md
 *
 * Not every project has all five tiers — author only the tiers a project
 * actually has. The renderer groups by tier in canonical order and shows only
 * the tiers present (no fixed five-slot assumption). Lucide glyphs are mapped
 * to vendors/roles semantically, matching the codebase's existing convention.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Monitor,
  Smartphone,
  Watch,
  Users,
  Youtube,
  Terminal,
  Cloud,
  LayoutTemplate,
  Server,
  Workflow,
  Github,
  Bot,
  Container,
  Boxes,
  Network,
  Cpu,
  BrainCircuit,
  Sparkles,
  Database,
  HardDrive,
  FileText,
  Table,
  HeartPulse,
  LineChart,
} from 'lucide-react';

/** The five canonical architecture tiers, ordered client → data. */
export type SystemTier = 'client' | 'frontend' | 'backend' | 'model' | 'data';

/** Canonical left-to-right ordering used to group and render tiers. */
export const TIER_ORDER: SystemTier[] = ['client', 'frontend', 'backend', 'model', 'data'];

export interface DiagramNode {
  tier: SystemTier;
  /** Short node name, e.g. "Vercel Edge". */
  label: string;
  /** Stack/tech line, e.g. "Next.js 16 · React 19". */
  tech: string;
  /** One-line role or design consideration for this node. */
  note?: string;
  icon: LucideIcon;
}

export interface DesignConsideration {
  /** e.g. "Why" or "Trade-off". */
  label: string;
  body: string;
}

export interface SystemDesign {
  /** Matches a KanbanItem.id, or 'portfolio' for the site itself. */
  projectId: string;
  title: string;
  summary: string;
  /** Ordered client → data; omit tiers a project lacks. */
  nodes: DiagramNode[];
  considerations: DesignConsideration[];
}

export const SYSTEM_DESIGNS: SystemDesign[] = [
  // --- The portfolio itself (flagship) ---
  {
    projectId: 'portfolio',
    title: 'This Portfolio — The "GitHub Monolith"',
    summary:
      'A production-grade personal site engineered to run free of charge, indefinitely. GitHub is the data warehouse and logic engine, Vercel is a thin presentation layer, and heavy ML inference is offloaded off-platform.',
    nodes: [
      {
        tier: 'client',
        label: 'Recruiter / Visitor',
        tech: 'Browser · Mobile Safari',
        note: 'Served static-first from the edge for instant loads.',
        icon: Monitor,
      },
      {
        tier: 'frontend',
        label: 'Vercel Edge',
        tech: 'Next.js 16 · React 19 · TS 5',
        note: 'Thin by design — renders pre-processed JSON, no heavy compute.',
        icon: Cloud,
      },
      {
        tier: 'backend',
        label: 'GitHub Actions ETL',
        tech: 'CRON · Node · CI/CD',
        note: 'The "Vercel-Pinger": scheduled ETL commits data.json, which auto-triggers a deploy.',
        icon: Workflow,
      },
      {
        tier: 'backend',
        label: '/api/chat Serverless',
        tech: 'Vercel Function · streaming',
        note: 'RAG endpoint reads the résumé markdown at request time.',
        icon: Server,
      },
      {
        tier: 'model',
        label: 'Gemini RAG',
        tech: 'Résumé-grounded chat',
        note: 'Grounded in Thomas_To_Resume.md — it cannot drift from the source doc.',
        icon: BrainCircuit,
      },
      {
        tier: 'model',
        label: 'Hugging Face Inference',
        tech: 'TensorFlow · scikit-learn · FastAPI',
        note: 'Salary prediction offloaded so inference never competes with the page budget.',
        icon: Cpu,
      },
      {
        tier: 'data',
        label: 'GitHub JSON Warehouse',
        tech: 'Versioned · Sandbox→Quality→Prod',
        note: 'A public repo doubles as the DB — auditable and free of execution limits.',
        icon: Github,
      },
      {
        tier: 'data',
        label: 'Résumé Markdown',
        tech: 'Single source of truth',
        note: 'Traced into the serverless bundle and read per request.',
        icon: FileText,
      },
    ],
    considerations: [
      {
        label: 'Why GitHub as the database',
        body: 'Public repos grant unlimited CI minutes, a full VM, and version-controlled, auditable data by default — a zero-cost warehouse.',
      },
      {
        label: 'Why offload ML to Hugging Face',
        body: 'Vercel serverless functions time out in 10–60s and aren’t sized for model inference; offloading keeps the presentation layer fast.',
      },
      {
        label: 'Trade-off',
        body: 'Data is eventually consistent, published per commit — not a low-latency transactional store. Acceptable for a read-mostly site.',
      },
    ],
  },

  // --- IN QUEUE ---
  {
    projectId: 'apple-lifestyle-app',
    title: 'Apple Lifestyle App',
    summary:
      'A native iOS + WatchOS app that unifies fragmented biometric data into one lifestyle dashboard, with on-device inference to keep sensitive health data private.',
    nodes: [
      {
        tier: 'client',
        label: 'Apple Watch',
        tech: 'HealthKit sensors',
        note: 'Captures HRV, VO2 max & activity in real time at the wrist.',
        icon: Watch,
      },
      {
        tier: 'frontend',
        label: 'iOS + WatchOS App',
        tech: 'Swift · SwiftUI',
        note: 'Unified HRV + activity + nutrition dashboard across watch and phone.',
        icon: Smartphone,
      },
      {
        tier: 'backend',
        label: 'HealthKit Pipeline',
        tech: 'HealthKit · CloudKit sync',
        note: 'Normalizes biometric streams into one health graph.',
        icon: HeartPulse,
      },
      {
        tier: 'model',
        label: 'Core ML',
        tech: 'On-device inference',
        note: 'Local models keep biometric data private — no server round-trip.',
        icon: Cpu,
      },
      {
        tier: 'data',
        label: 'CloudKit',
        tech: 'iCloud private DB',
        note: 'Per-user encrypted store synced across the Apple ecosystem.',
        icon: Database,
      },
    ],
    considerations: [
      {
        label: 'Why on-device Core ML',
        body: 'Health data is sensitive; on-device inference avoids ever sending biometrics off the phone.',
      },
      {
        label: 'Trade-off',
        body: 'Deep vertical integration (HealthKit/CloudKit) buys a seamless Apple experience at the cost of cross-platform portability.',
      },
    ],
  },
  {
    projectId: 'youtube-bodyfat-analysis',
    title: 'Bodyweight vs. Bodyfat Analysis',
    summary:
      'A data-driven analysis pipeline that separates 1% bodyweight loss from 1% bodyfat loss, deriving macro targets from lean mass rather than total weight.',
    nodes: [
      {
        tier: 'client',
        label: 'YouTube Audience',
        tech: 'Fitness community',
        note: 'Consumes the analysis as an explanatory video.',
        icon: Youtube,
      },
      {
        tier: 'backend',
        label: 'Python Analysis',
        tech: 'Pandas · Matplotlib',
        note: 'Computes and visualizes the lean-mass vs total-weight divergence.',
        icon: Terminal,
      },
      {
        tier: 'model',
        label: 'FFMI / Lean-Mass Model',
        tech: 'Statistical model',
        note: 'Allocates macros from fat-free mass, exposing the true rate-limiter.',
        icon: LineChart,
      },
      {
        tier: 'data',
        label: 'Body Composition Dataset',
        tech: 'CSV · Pandas DataFrame',
        note: 'Measurements feeding the comparison.',
        icon: Table,
      },
    ],
    considerations: [
      {
        label: 'Why lean mass over total weight',
        body: 'Macro allocation should track fat-free mass (FFMI); total-weight loss conflates fat and muscle and mis-sizes targets.',
      },
      {
        label: 'Trade-off',
        body: 'A communication/analysis pipeline, not a live service — no frontend or persistent backend by design.',
      },
    ],
  },

  // --- IN DEVELOPMENT ---
  {
    projectId: 'accelerated-compute-at-scale',
    title: 'Accelerated Compute at Scale',
    summary:
      'Upstream contributions to OpenXLA, JAX and Kubernetes, working the low-level hardware-accelerated compute path that most engineers treat as a black box.',
    nodes: [
      {
        tier: 'client',
        label: 'Contributor',
        tech: 'Upstream PRs',
        note: 'Engineer submitting to OpenXLA / JAX / Kubernetes.',
        icon: Terminal,
      },
      {
        tier: 'backend',
        label: 'Kubernetes',
        tech: 'Fleet orchestration',
        note: 'Schedules training workloads across TPU/GPU nodes.',
        icon: Boxes,
      },
      {
        tier: 'backend',
        label: 'OpenXLA / JAX Compiler',
        tech: 'XLA compilation',
        note: 'Lowers models to hardware-accelerated kernels.',
        icon: Workflow,
      },
      {
        tier: 'model',
        label: 'TPU / GPU Training',
        tech: 'PyTorch · JAX · C/C++',
        note: 'The low-level, hardware-accelerated compute path.',
        icon: Cpu,
      },
      {
        tier: 'data',
        label: 'Sharded Datasets',
        tech: 'Distributed I/O',
        note: 'Data pipelines feeding the accelerator fleet.',
        icon: HardDrive,
      },
    ],
    considerations: [
      {
        label: 'Why go below the framework',
        body: 'Scaling ML training is bottlenecked by the compiler and orchestration layers most engineers never open.',
      },
      {
        label: 'Trade-off',
        body: 'Upstream open-source work is high-leverage but slow — it favors depth in the low-level path over breadth.',
      },
    ],
  },

  // --- COMPLETED ---
  {
    projectId: 'agentic-revenue-optimization',
    title: 'Agentic Revenue Optimization',
    summary:
      'A predictive model classifies donors by probable cell yield (rarity vs throughput); an agentic interface bridges lab data to SAP ERP, automating yield reporting for sales.',
    nodes: [
      {
        tier: 'client',
        label: 'Sales & Ops',
        tech: 'Enterprise users',
        note: 'Select donors by highest probable cell yield for orders.',
        icon: Users,
      },
      {
        tier: 'frontend',
        label: 'Tableau BI',
        tech: 'Dashboards · reports',
        note: 'Surfaces yield forecasts and automated reporting.',
        icon: Table,
      },
      {
        tier: 'backend',
        label: 'Agentic ERP Interface',
        tech: 'Python · SAP · CRIO',
        note: 'Bridges lab data to SAP ERP, automating yield reporting.',
        icon: Bot,
      },
      {
        tier: 'model',
        label: 'Yield Classifier',
        tech: 'Predictive model',
        note: 'Classifies donors by probable cell yield (rarity vs throughput).',
        icon: BrainCircuit,
      },
      {
        tier: 'data',
        label: 'Snowflake',
        tech: 'Lab + CRM warehouse',
        note: 'CRIO/SAP data unified — querying in minutes, not hours.',
        icon: Database,
      },
    ],
    considerations: [
      {
        label: 'Why predict yield upfront',
        body: 'High biological variability in donor material caused inventory misalignment and lost revenue on rare cell types.',
      },
      {
        label: 'Trade-off',
        body: 'Rarity vs throughput is a business trade-off — the model surfaces it for humans rather than deciding it.',
      },
    ],
  },
  {
    projectId: 'agentic-onboarding',
    title: 'Agentic Onboarding',
    summary:
      'Department-specific RAG agents fine-tuned to SOPs, coordinated by an orchestrator agent with general context for cross-functional insight — replacing tribal knowledge.',
    nodes: [
      {
        tier: 'client',
        label: 'Employees',
        tech: 'Chat interface',
        note: 'Ask department questions in natural language.',
        icon: Users,
      },
      {
        tier: 'frontend',
        label: 'Chat UI',
        tech: 'Conversational front door',
        note: 'A single entry point across departments.',
        icon: LayoutTemplate,
      },
      {
        tier: 'backend',
        label: 'Orchestrator + RAG Agents',
        tech: 'MCP · Python · SQL',
        note: 'Dept-specific agents plus one orchestrator for cross-functional context.',
        icon: Bot,
      },
      {
        tier: 'model',
        label: 'Fine-tuned LLM (RAG)',
        tech: 'SOP-grounded',
        note: 'Tuned to department SOPs for niche context.',
        icon: BrainCircuit,
      },
      {
        tier: 'data',
        label: 'Vector DB + Snowflake',
        tech: 'Confluence · SAP embeddings',
        note: 'SOP and work-instruction embeddings for retrieval.',
        icon: Database,
      },
    ],
    considerations: [
      {
        label: 'Why RAG over fine-tuning alone',
        body: 'Fragmented docs and word-of-mouth knowledge need retrieval grounding to stay current without constant retraining.',
      },
      {
        label: 'Trade-off',
        body: 'Resource-efficient contextual GenAI, but answer quality is bounded by how well SOPs are documented.',
      },
    ],
  },
  {
    projectId: 'linkedin-content-loop',
    title: 'LinkedIn Content Loop',
    summary:
      'A CI/CD pipeline that auto-rotates TypeScript-typed LinkedIn posts from a managed content queue on a GitHub Actions CRON schedule — zero manual scheduling.',
    nodes: [
      {
        tier: 'client',
        label: 'LinkedIn Audience',
        tech: 'Followers',
        note: 'Receives consistently scheduled posts.',
        icon: Users,
      },
      {
        tier: 'backend',
        label: 'GitHub Actions CRON',
        tech: 'TypeScript · CI/CD',
        note: 'Auto-rotates posts from a managed queue on schedule.',
        icon: Workflow,
      },
      {
        tier: 'data',
        label: 'Markdown Content Queue',
        tech: 'TypeScript-typed contracts',
        note: 'Pre-generated posts with typed content contracts.',
        icon: FileText,
      },
    ],
    considerations: [
      {
        label: 'Why GitHub Actions CRON',
        body: 'Manual scheduling breaks consistency; a scheduled pipeline removes the context-switch entirely.',
      },
      {
        label: 'Trade-off',
        body: 'No model or UI by design — a deterministic rotation, not generative posting.',
      },
    ],
  },
  {
    projectId: 'resume-tailor',
    title: 'Resume & Cover Letter Tailor',
    summary:
      'Claude Sonnet sub-agents tailor a golden master résumé to specific job descriptions, generating ATS-compliant single-page PDFs via fpdf2 with zero manual intervention.',
    nodes: [
      {
        tier: 'client',
        label: 'Applicant (CLI)',
        tech: 'Batch invocation',
        note: 'Runs tailoring across many job descriptions.',
        icon: Terminal,
      },
      {
        tier: 'backend',
        label: 'Python + Docker',
        tech: 'Python 3.12 · fpdf2',
        note: 'Orchestrates tailoring and renders single-page PDFs.',
        icon: Container,
      },
      {
        tier: 'model',
        label: 'Claude Sonnet Sub-agents',
        tech: 'ATS-compliant tailoring',
        note: 'Tailor the golden master résumé to each JD.',
        icon: Sparkles,
      },
      {
        tier: 'data',
        label: 'Golden Master Résumé',
        tech: '+ JD corpus',
        note: 'Single source dataset; 79 banned words enforced.',
        icon: FileText,
      },
    ],
    considerations: [
      {
        label: 'Why a golden dataset',
        body: 'One master résumé keeps quality and voice consistent while sub-agents specialize per job description.',
      },
      {
        label: 'Trade-off',
        body: '5-step cascading page-fit optimization guarantees single-page output at the cost of extra passes.',
      },
    ],
  },
  {
    projectId: 'agentic-writer',
    title: 'Agentic Writer',
    summary:
      'A Claude Code plugin enforcing a content lifecycle (draft → review → validate → publish → archive) with banned-word and active-voice validation for a consistent house style.',
    nodes: [
      {
        tier: 'client',
        label: 'Author (Claude Code)',
        tech: 'Plugin invocation',
        note: 'Drives the content lifecycle from the CLI.',
        icon: Terminal,
      },
      {
        tier: 'backend',
        label: 'Claude Code Plugin',
        tech: 'YAML · lifecycle engine',
        note: 'Enforces draft → review → validate → publish → archive.',
        icon: Bot,
      },
      {
        tier: 'model',
        label: 'Claude Sonnet',
        tech: 'Prompt-engineered',
        note: 'Generates platform-specific content with active-voice validation.',
        icon: Sparkles,
      },
      {
        tier: 'data',
        label: 'Markdown + Rulesets',
        tech: '127 banned words',
        note: 'Typed content and validation lists.',
        icon: FileText,
      },
    ],
    considerations: [
      {
        label: 'Why enforce a lifecycle',
        body: 'A structured draft→publish→archive flow keeps voice and quality consistent across platforms.',
      },
      {
        label: 'Trade-off',
        body: 'Strict banned-word and active-voice gates reject more drafts but guarantee a house style.',
      },
    ],
  },
  {
    projectId: 'phase2-agentic',
    title: 'Phase 2: Agentic Integration',
    summary:
      'Proof-of-concept agentic features on Vercel serverless infrastructure, surfacing live streaming demos with RAG context on the portfolio homepage.',
    nodes: [
      {
        tier: 'client',
        label: 'Portfolio Visitor',
        tech: 'Browser',
        note: 'Interacts with live agentic demos during interviews.',
        icon: Monitor,
      },
      {
        tier: 'frontend',
        label: 'Next.js on Vercel',
        tech: 'TypeScript · React',
        note: 'Serves demos on free-tier infrastructure.',
        icon: Cloud,
      },
      {
        tier: 'backend',
        label: 'Vercel Serverless',
        tech: 'Streaming functions',
        note: 'Proof-of-concept agentic endpoints.',
        icon: Server,
      },
      {
        tier: 'model',
        label: 'Google Gemini (RAG)',
        tech: 'Streaming chat',
        note: 'RAG context grounds responses.',
        icon: BrainCircuit,
      },
      {
        tier: 'data',
        label: 'RAG Context',
        tech: 'Résumé · JSON',
        note: 'Source documents injected at request time.',
        icon: FileText,
      },
    ],
    considerations: [
      {
        label: 'Why serverless demos',
        body: 'Live, demonstrable agentic features beat local prototypes for interviews — at zero hosting cost.',
      },
      {
        label: 'Trade-off',
        body: 'Serverless time limits cap demo complexity, so features are kept lightweight and streaming.',
      },
    ],
  },
  {
    projectId: 'linkedin-api-cicd',
    title: 'LinkedIn API CI/CD Pipeline',
    summary:
      'Automated content publishing via the LinkedIn API with OAuth 2.0 token refresh, triggered by GitHub Actions on a CRON schedule — zero manual post intervention.',
    nodes: [
      {
        tier: 'client',
        label: 'LinkedIn Audience',
        tech: 'Followers',
        note: 'Receives API-published posts on cadence.',
        icon: Users,
      },
      {
        tier: 'backend',
        label: 'GitHub Actions CRON',
        tech: 'TypeScript · CI/CD',
        note: 'Triggers publishing on schedule.',
        icon: Workflow,
      },
      {
        tier: 'backend',
        label: 'LinkedIn API (OAuth 2.0)',
        tech: 'Token refresh',
        note: 'Publishes via API with automatic OAuth token refresh.',
        icon: Network,
      },
      {
        tier: 'data',
        label: 'Content + Tokens',
        tech: 'Rotation store',
        note: 'Queued content and refresh credentials.',
        icon: FileText,
      },
    ],
    considerations: [
      {
        label: 'Why API over manual posting',
        body: 'Manual posting breaks cadence and interrupts deep work; the API removes the human from the loop.',
      },
      {
        label: 'Trade-off',
        body: 'OAuth 2.0 token refresh adds moving parts versus manual posting, but eliminates ongoing intervention.',
      },
    ],
  },
  {
    projectId: 'apply-to-jobs',
    title: 'Apply-to-Jobs Pipeline',
    summary:
      'A 5-stage scrape → describe → tailor → render → sync pipeline that scrapes Apple job postings directly, tailors a résumé per role through a 6-model Gemini fallback cascade, and syncs into the same Neon table and Blob store this portfolio\'s Job Board already serves from.',
    nodes: [
      {
        tier: 'client',
        label: 'Operator (CLI)',
        tech: 'npm run extract',
        note: 'Triggers the 5-stage pipeline: scrape → describe → tailor → render → sync.',
        icon: Terminal,
      },
      {
        tier: 'backend',
        label: 'Apple Careers Scraper',
        tech: 'TypeScript · 4 search filters',
        note: 'Scrapes TPU / GPU / Infrastructure / Backend postings directly — 296/296 (100%) this run.',
        icon: Network,
      },
      {
        tier: 'backend',
        label: 'Render Pipeline',
        tech: 'Markdown → PDF',
        note: 'Renders every successfully tailored résumé — 179/179 (100% of tailored).',
        icon: Workflow,
      },
      {
        tier: 'model',
        label: 'Gemini Fallback Cascade',
        tech: '6-model priority chain',
        note: '167/179 tailors (93.3%) land on the #2-ranked model, not the most capable one.',
        icon: Sparkles,
      },
      {
        tier: 'data',
        label: 'Neon "PORTFOLIO".roles',
        tech: 'Shared Postgres table',
        note: 'Same table src/lib/db/jobs.ts reads — 296 rows synced, 179 carry a résumé.',
        icon: Database,
      },
      {
        tier: 'data',
        label: 'Vercel Blob (private)',
        tech: 'Shared blob store',
        note: 'Same private store src/app/api/jobs/resume/route.ts streams from.',
        icon: HardDrive,
      },
    ],
    considerations: [
      {
        label: 'Why fallback by quota, not capability',
        body: 'Gemini tracks quota independently per model (PerProjectPerModel) — a bulkhead pattern applied across a model portfolio. It lets gemini-3.1-flash-lite, ranked #2, absorb 93.3% of volume once the top-ranked model\'s 20 req/day cap is hit.',
      },
      {
        label: 'Idempotent checkpointing',
        body: 'Every success is written to data.json immediately; every re-run filters on !role.resume. A crash or quota wall loses at most one in-flight call.',
      },
      {
        label: 'Confirmed bug (P0)',
        body: 'The fallback only advances on HTTP 429 (quota), not 404 (retired model) — 11 of 19 failed attempts (57.9%) this run were repeat calls to the same dead, retired model instead of skipping it.',
      },
      {
        label: 'Why sync into existing infra',
        body: 'Writes land in the same Neon "PORTFOLIO".roles table and private Blob store the Job Board already reads/serves — no parallel storage layer, and the /jobs page picks up new rows on its existing 30-min ISR window.',
      },
    ],
  },
];

/** Fast lookup by projectId (KanbanItem.id or 'portfolio'). */
export const SYSTEM_DESIGN_BY_ID: Record<string, SystemDesign> = Object.fromEntries(
  SYSTEM_DESIGNS.map((design) => [design.projectId, design]),
);
