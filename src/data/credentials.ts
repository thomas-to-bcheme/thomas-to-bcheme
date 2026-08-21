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
 * bullet.
 *
 * `handling-ambiguity`, `translating-technical-into-business-impact`,
 * `influence-without-authority`, and `strategic-leadership-and-thinking-big`
 * each carry one bullet grounded in a real, previously-undocumented
 * experience: supporting Canventa Life Sciences' 3–5 year strategic roadmap
 * and standing up GCP-hosted, HIPAA-/legally-compliant enterprise
 * infrastructure, coordinated across Canventa and its parent company,
 * STEMCELL Technologies. `influence-without-authority`'s headline/Core was
 * previously an explicit unverified synthesis (no artifact existed anywhere
 * in the repo for that dimension, confirmed via an exhaustive grep) — this
 * cross-enterprise coordination is real evidence that resolves that gap, so
 * it's now the primary story rather than a placeholder. `developing-others`
 * is deliberately untouched by this material: coordinating a roadmap across
 * two organizations is Influence/stakeholder management, not "building
 * another person's lasting, independent capability" per that competency's
 * own definition — stretching it there would be exactly the "forcing every
 * question into the same story" failure interviewers are trained to catch.
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
      "Applied the same instinct where there was no clean answer either side would fully own: stood up 0-to-1 enterprise and onboarding infrastructure on GCP with no existing template to follow, building it to satisfy HIPAA and legal-compliance requirements for two organizations — Canventa and its parent, STEMCELL Technologies — before either side had fully defined what \"compliant\" meant for this specific system.",
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
      'Applied the same rubric translating GCP infrastructure\'s HIPAA and legal-compliance requirements into terms executives at both Canventa and its parent, STEMCELL Technologies, could act on — not just "this meets the requirement," but what it protects, what it unblocks, and why the timeline is worth it.',
    ],
    baseDetail:
      "You can design this amazing technology that can support 1M users, but from grassroots, if your users are afraid of the technology, then what's the point in designing a system that can scale to 1M users when you don't have that many users?",
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences',
  },
  {
    id: 'influence-without-authority',
    competency: 'Influence Without Authority',
    color: 'purple',
    headline: 'Aligning two entire organizations around one shared timeline — no reporting line into either, no shared manager to force it, and no obligation on their part to listen at all.',
    coreBullets: [
      'Canventa is a vertically-integrated subsidiary of STEMCELL Technologies (~2,000 employees) — a roadmap decision on one side routinely depends on a counterpart team on the other, with no shared manager to arbitrate.',
      "Coordinated the GCP-hosted enterprise/onboarding infrastructure rollout's scope and timeline directly with STEMCELL's own engineers, managers, and executives, rather than finalizing Canventa's plan first and imposing it after the fact.",
    ],
    baseDetail:
      'The same no-authority pattern at smaller scale: a production RAG AI agent shipped 0-to-1 and open-sourced, since adopted by other engineers with no reporting line to him at all.',
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences (a STEMCELL Technologies subsidiary)',
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
      "Landed 5 separate pull requests to a shared open-source codebase (nrflynn2/ml-drug-discovery), each merged by the maintainer, replacing hardcoded CUDA-only device selection with the unified torch.accelerator API across 5 different chapters — the maintainer adopting the same fix five separate times is the real signal, not one lucky patch.",
      "Supports Canventa's 3–5 year strategic roadmap — not one team's plan, but one whose infrastructure decisions ripple across both Canventa's and STEMCELL's engineering, operations, and compliance functions — translated into realistic year-by-year and quarter-by-quarter goals against current operational capacity, not an aspirational target, including standing up 0-to-1 enterprise and onboarding infrastructure on GCP built to be HIPAA- and legally-compliant for sensitive data across both organizations.",
      "Both reflect the same instinct: a big technical bet only counts if it's built for the constraint that's actually real — a shared codebase's existing contributors in one case, two organizations' compliance and timeline requirements in the other.",
    ],
    baseDetail:
      "The same judgment generalized past that one PR — this portfolio's own architecture swaps “scalability” for “resilience” against a $0-budget constraint, on the same reasoning: design for today's real constraint, not a guessed-at tomorrow.",
    attribution: 'System-design philosophy',
    attributionHref: '/projects#system-design-philosophy',
    evidenceLink: {
      label: 'View the pull requests',
      href: 'https://github.com/nrflynn2/ml-drug-discovery/pulls?q=is%3Apr+author%3Athomas-to-bcheme+is%3Aclosed',
    },
  },
];
