/**
 * Authoritative credentials data — the SINGLE source of truth for press
 * mentions, recognition/leadership programs, leadership activities,
 * quantified career-impact metrics, and behavioral-signal stories.
 *
 * Consumed by:
 *  - src/components/sections/FeaturedIn.tsx          (press callout)
 *  - src/components/sections/AboutMeSection.tsx      (leadership + recognition + competency stories)
 *  - src/components/sections/ImpactMetricsSection.tsx (quantified impact stats)
 *  - src/app/layout.tsx                              (Person JSON-LD)
 *
 * NOTE: the RAG chat system prompt (src/data/AiSystemInformation.ts) does NOT
 * import this module — it reads src/docs/Thomas_To_Resume.md from disk
 * directly, by design, so the chat agent can never drift from the résumé/PDF.
 * Keep this module free of React / lucide-react imports regardless, so the
 * client UI stays the only consumer that needs an icon library.
 */

import type {
  PressFeature,
  RecognitionItem,
  LeadershipActivity,
  ImpactMetric,
  CompetencyStory,
} from '@/types/credentials';
import { PUBLICATION_URL } from '@/constants/site';

/**
 * Press features. Grounded in the real published article — do not paraphrase the
 * headline or quote. Add future mentions here; the UI + JSON-LD scale automatically.
 */
export const PRESS_FEATURES: PressFeature[] = [
  {
    id: 'ibt-ai-enabled-biology',
    publication: 'International Business Times',
    headline:
      'Thomas To on How AI-Enabled Biology is Advancing Drug Discovery and Scientific Innovation',
    url: 'https://www.ibtimes.com/thomas-how-ai-enabled-biology-advancing-drug-discovery-scientific-innovation-3804756',
    quote:
      'Technology creates value when it supports scientific decision-making while respecting the complexity of biology.',
    date: 'Jun 2026',
  },
  {
    id: 'mcnair-beta-glucosidase',
    publication: 'UC Davis McNair Scholars',
    headline:
      'Design to Data for mutants of β-glucosidase B from Paenibacillus polymyxa (L171G, L171V, L171W)',
    url: PUBLICATION_URL,
  },
];

/**
 * Recognition & leadership programs. Each links to the program's public homepage
 * so readers can learn more (the McNair publication PDF is surfaced separately in
 * PRESS_FEATURES / FeaturedIn).
 */
export const RECOGNITION_ITEMS: RecognitionItem[] = [
  {
    id: 'mcnair-trio',
    program: 'McNair Scholars TRIO Fellow',
    organization: 'UC Davis',
    role: 'Fellow',
    blurb:
      'Federal TRIO program preparing first-generation and underrepresented students for doctoral research through mentored, publication-track work.',
    url: 'https://mcnair.ucdavis.edu/2019-mcnair-scholars-program',
  },
  {
    id: 'avenuee-leadership',
    program: 'AvenueE Engineering Leadership Program',
    organization: 'UC Davis College of Engineering',
    role: 'Participant',
    blurb:
      'Engineering leadership cohort pairing peer mentorship with technical and professional development for underrepresented engineers.',
    url: 'https://avenuee.engineering.ucdavis.edu/program-overview',
  },
  {
    id: 'genentech-leadership',
    program: 'Genentech Leadership Exchange',
    organization: 'Genentech',
    role: 'Participant',
    blurb:
      'Cross-functional leadership exchange for early-career scientists and engineers, building stakeholder management and organizational leadership skills.',
    url: 'https://careers.gene.com/us/en/internships',
  },
  {
    id: 'transfer-ambassador',
    program: 'Transfer Opportunity Program Ambassador',
    organization: 'UC Davis',
    role: 'Ambassador',
    blurb:
      'Guided prospective and current community college transfer students through peer mentorship and outreach initiatives.',
    url: 'https://www.ucdavis.edu/admissions/undergraduate/transfer/transfer-opportunity-program',
  },
];

/**
 * Leadership activities. Icons are string keys (LeadershipIconName) resolved to
 * components in the JSX layer, keeping this module dependency-free.
 */
export const LEADERSHIP_ACTIVITIES: LeadershipActivity[] = [
  {
    id: 'content-thought-leadership',
    iconName: 'Mic2',
    text: 'Produce and publish MLOps-focused educational content on YouTube and LinkedIn through an automated CI/CD publishing pipeline, driving developer community engagement and technical thought leadership.',
  },
  {
    id: 'student-outreach-ambassador',
    iconName: 'GraduationCap',
    text: 'Student Outreach Ambassador supporting 100,000+ community college transfer students through peer-to-peer mentorship programs, transfer outreach initiatives, and cross-institutional community building.',
  },
  {
    id: 'community-membership-panelist',
    iconName: 'Users',
    text: 'Active member of AIChE, ISPE, and Rosetta protein engineering community; panelist at the Ipsos AI Insights Community and inaugural Unintentional Consequences of Technology (UCOT) conference.',
  },
  {
    id: 'workshops-and-seminars',
    iconName: 'BookOpen',
    text: 'Organize collaborative workshops and learning initiatives including Interview Kickstart bootcamp peer sessions, Databricks weekly seminars, and enterprise analytics community forums.',
  },
  {
    id: 'bjj-coaching',
    iconName: 'Dumbbell',
    text: 'Coach students ages 3 to adult in Brazilian jiu-jitsu, delivering structured athletic training to build discipline, resilience, and community belonging in Oakland.',
  },
];

/**
 * Quantified career-impact metrics. Each `value`/`label` pair is traceable
 * verbatim to a real bullet in src/docs/Thomas_To_Resume.md — deliberately
 * spread across 4 different roles and 6 different metric types (cost avoided,
 * risk prevented, speed, accuracy, hours saved, adoption) rather than
 * repeating one company or one kind of number.
 */
export const IMPACT_METRICS: ImpactMetric[] = [
  {
    id: 'modeled-cost-reduction',
    iconName: 'TrendingDown',
    value: '$63.2M',
    label: 'in modeled manufacturing cost reductions from computational optimization models',
    context: 'UC Davis — Research Engineer',
  },
  {
    id: 'stockout-prevented',
    iconName: 'ShieldCheck',
    value: '$2M',
    label: 'inventory stockout prevented through data-driven demand forecasting',
    context: 'Canventa Life Sciences — Founding Fullstack Engineer',
  },
  {
    id: 'processing-time-cut',
    iconName: 'Gauge',
    value: '99%',
    label: 'cut in data processing time — weeks of manual work down to minutes',
    context: 'Genentech — Process Engineer',
  },
  {
    id: 'document-digitization-accuracy',
    iconName: 'BadgeCheck',
    value: '95%+',
    label: 'accuracy digitizing 5,000+ handwritten laboratory documents via a fine-tuned model',
    context: 'Canventa Life Sciences — Founding Fullstack Engineer',
  },
  {
    id: 'revenue-query-hours-saved',
    iconName: 'Clock',
    value: '500+',
    label: 'hours saved annually by replacing manual revenue queries with a natural-language RAG agent',
    context: 'Canventa Life Sciences — Founding Fullstack Engineer',
  },
  {
    id: 'rag-agent-adoption',
    iconName: 'Users',
    value: '10+',
    label: 'engineers adopted a production RAG AI agent shipped 0-to-1, from system design through open-source distribution',
    context: 'Founding AI Engineer — Open Source',
  },
];

/**
 * Behavioral-signal stories for the homepage's Leadership & Recognition
 * section — 5 named dimensions (a superset of `/behavioural`'s own 9 Part-II
 * competencies), each shaped Headline → Core → Base per that page's own
 * High-Signal Storytelling framework, in place of leading with an
 * institutional program name.
 *
 * Every headline/base quote marked "verbatim"/"near-verbatim" below traces to
 * a real, already-published line in this portfolio — most from
 * `ChangelogHeaderEssay.tsx` (rendered on /projects), a genuine "mental
 * models" essay in Thomas's own words — not reconstructed from a résumé
 * bullet. `influence-without-authority` is the one exception: no equivalent
 * artifact exists anywhere on this site for that dimension (confirmed via an
 * exhaustive grep of every `— Thomas To`-attributed quote in the repo), so
 * its headline is an explicit synthesis inferred from the pattern common to
 * the other 4 verified philosophies, pending Thomas's own correction.
 */
export const COMPETENCY_STORIES: CompetencyStory[] = [
  {
    id: 'handling-ambiguity',
    competency: 'Handling Ambiguity',
    color: 'blue',
    headline: 'Navigate ambiguity by understanding what to use, when to use it, and why to use it.',
    coreBullets: [
      'Built a 3-axis mental model instead of treating each ambiguous problem as a one-off — an end-to-end lifecycle (design→data→model→backend→frontend→ops), an abstraction ladder (hardware→distributed systems), and a time axis (iteration, legacy, scale).',
      'Applied it to a genuinely open-ended research problem with no known-good mutation to start from, publishing 3 novel β-glucosidase B variants (UC Davis).',
      'The same lifecycle now organizes every project on this portfolio, from the Job Board pipeline to the RAG chat agent.',
    ],
    baseDetail:
      "There's too much to know. From lessons learned in university, we apply mental models and derive solutions from first principles — applying what's needed to the problem we're actually trying to solve.",
    attribution: 'SWE Compass',
    attributionHref: '/projects#swe-compass',
  },
  {
    id: 'translating-technical-into-business-impact',
    competency: 'Translating Technical Into Business Impact',
    color: 'amber',
    headline: 'Every design decision gets checked against one rubric: does it drive revenue, reduce risk, save time, or streamline a process?',
    coreBullets: [
      "A technically elegant model nobody trusts or uses doesn't move any of those four levers.",
      'Architected Canventa’s revenue-optimization system specifically to be queried in plain language by finance and ops, not just to be technically correct.',
      'Benchmarked the manual process first, so the "after" number had a real "before" to be checked against.',
    ],
    baseDetail:
      "You can design this amazing technology that can support 1M users, but from grassroots, if your users are afraid of the technology, then what's the point in designing a system that can scale to 1M users when you don't have that many users?",
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences',
  },
  {
    id: 'influence-without-authority',
    competency: 'Influence Without Authority',
    color: 'purple',
    headline: 'Build something rigorous and checkable enough that it earns adoption on its own evidence — not by asking anyone to trust me personally.',
    coreBullets: [
      'Shipped a production RAG AI agent 0-to-1 with LLM output validation and guardrails, open-sourced with no mandate requiring anyone to use it.',
      'The guardrails and system design were the actual argument — other engineers could verify the reasoning themselves rather than take it on faith.',
      'Adopted independently by engineers with no reporting line to him at all.',
    ],
    baseDetail:
      'The same no-authority pattern shows up outside engineering too — as Student Outreach Ambassador, organizing peer mentorship across multiple community colleges with no formal authority over any of them.',
    attribution: 'Founding AI Engineer, Open Source',
  },
  {
    id: 'developing-others',
    competency: 'Developing Others',
    color: 'emerald',
    headline: "Turned a flood of one-off data requests into a self-serve habit finance, ops, and lab teams didn't need me for anymore.",
    coreBullets: [
      'Engineering was fielding a steady stream of ad-hoc data requests from teams with no way to answer their own questions.',
      'Built data-validation pipelines (Python, dbt, Snowflake) with a Streamlit self-serve layer and Tableau dashboards, calibrated to what each audience actually needed translated, not just handed a dashboard.',
      'Ad-hoc requests dropped 70%, recovering 30+ production hours a week — the behavior changed, not just the backlog.',
    ],
    baseDetail:
      "The same “read the audience, then decide what needs translating” instinct stated elsewhere on this site — a non-technical stakeholder doesn't need a term left undefined either; they need it translated into what it does, instead of what it's called. That's what made the tooling something people actually adopted, not another dashboard nobody opened.",
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences',
  },
  {
    id: 'strategic-leadership-and-thinking-big',
    competency: 'Strategic Leadership and Thinking Big',
    color: 'rose',
    headline: "The harder half of a big technical bet isn't knowing the levers exist — it's navigating which one a given problem actually needs, right now.",
    coreBullets: [
      'Drug-discovery pipelines were hard-coded to CUDA, blocking contributors on TPU or Apple Silicon.',
      'Migrated to the unified torch.accelerator API (PR #24), plus deterministic seeding for reproducibility across backends.',
      "The pattern became the shared codebase's new default, not a personal fork; a follow-on contribution (PR #25) shows sustained, trusted involvement in that project's direction.",
    ],
    baseDetail:
      "The same judgment generalized past that one PR — this portfolio's own architecture swaps “scalability” for “resilience” against a $0-budget constraint, on the same reasoning: design for today's real constraint, not a guessed-at tomorrow.",
    attribution: 'System-design philosophy',
    attributionHref: '/projects#system-design-philosophy',
  },
];
