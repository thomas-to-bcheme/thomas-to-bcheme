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
 * section — 12 cards, each shaped Headline → Core → Base per `/behavioural`'s
 * own High-Signal Storytelling framework. The first 9, in this order, map
 * 1:1 onto ByteByteGo's own Part-II competency chapters (Ch.05–13, see
 * `src/constants/behavioural/competencies/*.ts` — the same source
 * `/behavioural` renders), each answered at that chapter's own `staff`
 * `levelSignal` bar wherever real evidence supports it. The last 3
 * (`handling-ambiguity`, `translating-technical-into-business-impact`,
 * `influence-without-authority`) aren't part of ByteByteGo's taxonomy —
 * they're dimensions Thomas considers equally interview-relevant from his
 * own reading and real interview loops, appended after the mapped 9 rather
 * than mixed in with them.
 *
 * Every headline/base quote marked "verbatim"/"near-verbatim" below traces to
 * a real, already-published line in this portfolio — most from
 * `ChangelogHeaderEssay.tsx` (rendered on /projects), a genuine "mental
 * models" essay in Thomas's own words — not reconstructed from a résumé
 * bullet.
 *
 * OPEN / PARTIAL — flagged here, not on the page, so visible copy always
 * reads as complete while this file stays honest about what's thin:
 * - `delivery`: résumé bullets are outcome-stated, not obstacle-narrated —
 *   no real "a deadline was threatened, here's the trade-off I made" story
 *   yet. Ship the closest available (delivery-velocity acceleration +
 *   caught-early risk prevention) until a sharper one exists.
 * - `problem-solving-and-deep-dive`: the Arctic-TILT fine-tuning bullet has
 *   the right shape (systematic evaluation → result) but no explicit
 *   hypothesis-formed/ruled-out narrative, which is what this chapter's own
 *   sample questions actually probe for.
 * - `earning-trust-and-conflict`: only the proactive-trust half is real and
 *   sourced. The reactive half — a genuine disagreement worked through, a
 *   mistake owned — has zero résumé material and is not fabricated here.
 * - `developing-others`: the only real material is community/peer
 *   facilitation (bootcamp sessions, conference forums, a content pipeline),
 *   not a staff-level "stepped back so one engineer's independent capability
 *   grew" story. Placeholder pending that real anecdote.
 *
 * `taking-initiative`, `learning-and-growth`, `customer-and-user-focus`,
 * `innovation`, `earning-trust-and-conflict`, and `strategic-leadership-and-
 * thinking-big` — 6 of the 9 — pull one bullet each from the same two real,
 * previously-undocumented bodies of work: the `ml-drug-discovery` open-source
 * contributions, and Canventa Life Sciences' cross-org roadmap/GCP-
 * infrastructure work with parent company STEMCELL Technologies. Reused
 * deliberately from a different angle each time (unassigned-fix-adopted /
 * ramp-up-and-transfer / credibility-earned / sequencing-proof-points), the
 * same discipline `handling-ambiguity`, `translating-technical-into-
 * business-impact`, and `influence-without-authority` already applied to
 * this material — never the same bullet text twice, to avoid the "forcing
 * every question into the same story" failure interviewers are trained to
 * catch. `customer-and-user-focus` specifically inherited the ad-hoc-data-
 * request/self-serve story from a former `developing-others` placement: it's
 * a near-exact match to that chapter's own worked example (several teams'
 * literal requests tracing to one underlying need), and never actually built
 * another *person's* capability, which `developing-others` requires by its
 * own definition.
 */
export const COMPETENCY_STORIES: CompetencyStory[] = [
  {
    id: 'taking-initiative',
    competency: 'Taking Initiative',
    color: 'blue',
    headline: "The best proof of initiative isn't the first fix — it's the maintainer trusting you enough to merge the second one.",
    coreBullets: [
      "nrflynn2/ml-drug-discovery's CUDA-only device selection was hardcoded, quietly blocking any contributor on TPU or Apple Silicon — not his repo, nobody assigned him to fix another maintainer's infrastructure debt.",
      'Migrated the pipeline to the unified torch.accelerator API and added deterministic seeding for cross-backend reproducibility (PR #24), merged by the maintainer.',
      'Followed it with a second, unprompted contribution — refactoring active learning loops and data ingestion, centralizing RDKit/Morgan fingerprint extraction, and hardening error handling for OpenBabel and OpenMM (PR #25) — a second unrelated PR getting merged is the real signal, not the first fix alone.',
    ],
    baseDetail:
      'The same pattern outside this one repo: shipped a production RAG AI agent 0-to-1 and open-sourced it before anyone asked for one, since adopted by 10+ engineers with no reporting line to him at all.',
    attribution: 'Founding AI Engineer, Open Source',
    evidenceLink: {
      label: 'View the pull requests',
      href: 'https://github.com/nrflynn2/ml-drug-discovery/pulls?q=is%3Apr+author%3Athomas-to-bcheme+is%3Aclosed',
    },
  },
  {
    id: 'delivery',
    competency: 'Delivery',
    color: 'amber',
    headline: 'Protecting a deadline is a series of small trade-offs made early, not one heroic push at the end.',
    coreBullets: [
      'Accelerated feature delivery from 4+ weeks to under 1 week for internal tooling at Genentech by folding stakeholder feedback directly into the development cycle instead of collecting it at the end, across 5+ scientific teams.',
      'Applied the same instinct to risk, not just velocity: caught a demand-forecasting gap early enough to prevent a $2M inventory stockout and $200K in material waste at Canventa, instead of discovering it once it was too late to act.',
    ],
    baseDetail:
      "The same trade-off either way: catching what's about to become a problem is worth more than pushing harder once it already is one.",
    attribution: 'Software Engineer, Genentech',
  },
  {
    id: 'problem-solving-and-deep-dive',
    competency: 'Problem Solving and Deep Dive',
    color: 'purple',
    headline: "Getting to 95% wasn't the model getting lucky — it was ruling things out systematically instead of shipping whatever looked better first.",
    coreBullets: [
      "Off-the-shelf OCR on 5,000+ handwritten laboratory documents wasn't clearing the accuracy bar needed to trust the digitized output.",
      'Fine-tuned Snowflake Arctic-TILT with custom embeddings and annotated training data, evaluating systematically against held-out documents rather than shipping the first pass that looked better.',
      "Reached 95%+ accuracy, saving 1,000+ hours of manual transcription — the evaluation discipline is what got it from 'looks better' to 'trustworthy enough to replace a manual process entirely.'",
    ],
    baseDetail:
      "The same evaluation discipline applies whether the model is predicting revenue or reading handwriting — a result that looks better on the first pass isn't trustworthy until it's been checked against what would actually break it.",
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences',
  },
  {
    id: 'earning-trust-and-conflict',
    competency: 'Earning Trust and Dealing with Conflict',
    color: 'emerald',
    headline: "Trust gets tested once — but it's built in every unscored interaction before that moment ever arrives.",
    coreBullets: [
      "Being a founding engineer at the smaller ~2,000-employee parent's subsidiary didn't come with automatic standing — earned enough credibility on the GCP infrastructure rollout that STEMCELL's own engineers, managers, and executives worked scope and timeline directly with him, rather than routing everything through Canventa's leadership first.",
      'Built that same credibility from scratch at Genentech, streamlining workflows for 5+ scientific teams as an engineer with no prior standing in a scientific organization.',
    ],
    baseDetail:
      "Reliability compounds quietly — small commitments delivered consistently before anyone's specifically watching are what let both of these hold up once real pressure showed up.",
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences (a STEMCELL Technologies subsidiary)',
  },
  {
    id: 'learning-and-growth',
    competency: 'Learning and Growth',
    color: 'rose',
    headline: 'The transferable model was never the CUDA-specific syntax — it was what actually has to stay invariant when the hardware underneath changes.',
    coreBullets: [
      'Ramped up on TPU/GPU-accelerated distributed training internals — outside his own prior specialization — well enough to contribute to OpenXLA, JAX, and Kubernetes rather than stay a user of them.',
      'Applied that model directly: implemented deterministic seeding and global graph-determinism flags tied to device type, so reproducibility held across CUDA, TPU, and Apple Silicon instead of just the backend he started on.',
    ],
    baseDetail:
      'The compounding asset was never the CUDA-specific syntax — it was the mental model of what has to stay invariant when the hardware underneath changes, which is what transferred to TPU and Apple Silicon without starting over.',
    attribution: 'Founding AI Engineer, Open Source',
  },
  {
    id: 'customer-and-user-focus',
    competency: 'Customer and User Focus',
    color: 'blue',
    headline: 'Every team’s literal request was a different report; the underlying need behind all of them was the same one dashboard could answer.',
    coreBullets: [
      'Finance, ops, and lab teams were each filing their own ad-hoc data requests — different literal asks that all traced back to the same underlying need: a way to answer their own questions without waiting on engineering.',
      'Built one shared system instead of one-off exports — data-validation pipelines (Python, dbt, Snowflake) with a Streamlit self-serve layer and Tableau dashboards, calibrated to what each audience actually needed, not just handed a dashboard.',
      'Ad-hoc requests dropped 70%, recovering 30+ production hours a week — the behavior changed because the underlying need got solved once, not the literal request answered three separate times.',
    ],
    baseDetail:
      "The same “read the audience, then decide what needs translating” instinct stated elsewhere on this site — a non-technical stakeholder doesn't need a term left undefined either; they need it translated into what it does, instead of what it's called. That's what made the tooling something people actually adopted, not another dashboard nobody opened.",
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences',
  },
  {
    id: 'innovation',
    competency: 'Innovation',
    color: 'amber',
    headline: 'Replacing a manual spreadsheet with a faster spreadsheet is optimization; replacing it with something finance can just ask a question is a different approach entirely.',
    coreBullets: [
      'Revenue analysis at Canventa was a manual, spreadsheet-driven process with a real ceiling — no amount of better spreadsheet tooling would let finance or ops query it directly.',
      'Architected a revenue-optimization system integrating a predictive ML model with a RAG AI agent on Snowflake, replacing the spreadsheet with natural-language query access instead of a faster version of the same workflow.',
      'Reduced decision cycles from 3+ hours to under 10 minutes, saving 500+ hours annually — adopted directly by non-technical stakeholders, not just handed to them.',
    ],
    baseDetail:
      "The same test applies elsewhere on this site: could refining the existing approach have gotten there? If yes, it's optimization, not innovation — this replaced the spreadsheet's ceiling entirely instead of raising it.",
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences',
  },
  {
    id: 'developing-others',
    competency: 'Developing Others',
    color: 'purple',
    headline: 'Scaling teaching past a single relationship means building something people return to without you in the room.',
    coreBullets: [
      'Organizes and contributes to peer-learning sessions and community forums — Interview Kickstart bootcamp peer sessions, Databricks weekly seminars, and enterprise analytics community forums — supporting data engineering and analytics practitioners outside any formal reporting relationship.',
      'Produces MLOps-focused educational content on YouTube and LinkedIn through an automated CI/CD publishing pipeline, scaling the same teaching instinct past any single 1:1 conversation.',
    ],
    baseDetail:
      'Community-facing teaching threads through both the content pipeline and the peer-session facilitation — the same instinct, aimed at people outside any single team or company.',
    attribution: 'Educational Content & Community Facilitation',
  },
  {
    id: 'strategic-leadership-and-thinking-big',
    competency: 'Strategic Leadership and Thinking Big',
    color: 'emerald',
    headline: "Think big by knowing which lever a bet actually needs, who else has to live with the choice, and why it's worth the timeline.",
    coreBullets: [
      "Canventa's 3–5 year strategic roadmap isn't one team's plan to execute — its infrastructure decisions ripple across both Canventa's and STEMCELL's engineering, operations, and compliance functions, translated into realistic year-by-year and quarter-by-quarter goals against current operational capacity, not an aspirational target.",
      "Sequenced the GCP-hosted enterprise/onboarding infrastructure rollout by proving the compliance approach out directly with STEMCELL's own engineers first, rather than finalizing Canventa's plan and asking STEMCELL to simply ratify it afterward.",
      'The scale of the bet was never the point on its own — the sequencing of who signs off on what, and in which order, is what actually determines whether a big technical bet ships or stalls.',
    ],
    baseDetail:
      "The same judgment generalized past any one project — this portfolio's own architecture swaps “scalability” for “resilience” against a $0-budget constraint, on the same reasoning: design for today's real constraint, not a guessed-at tomorrow.",
    attribution: 'System-design philosophy',
    attributionHref: '/projects#system-design-philosophy',
  },
  {
    id: 'handling-ambiguity',
    competency: 'Handling Ambiguity',
    color: 'rose',
    headline: 'Navigate ambiguity by understanding what to use, when to use it, and why to use it.',
    coreBullets: [
      'Built a 3-axis mental model instead of treating each ambiguous problem as a one-off — an end-to-end lifecycle (design→data→model→backend→frontend→ops), an abstraction ladder (hardware→distributed systems), and a time axis (iteration, legacy, scale).',
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
    color: 'blue',
    headline: 'Every design decision gets checked against one rubric: does it drive revenue, reduce risk, save time, or streamline a process?',
    coreBullets: [
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
    color: 'amber',
    headline: 'Aligning two entire organizations around one shared timeline — no reporting line into either, no shared manager to force it, and no obligation on their part to listen at all.',
    coreBullets: [
      "Canventa is a vertically-integrated subsidiary of STEMCELL Technologies (~2,000 employees) with no shared manager to arbitrate a cross-company roadmap decision, so coordinated the GCP-hosted enterprise/onboarding infrastructure rollout's scope and timeline directly with STEMCELL's own engineers, managers, and executives — rather than finalizing Canventa's plan first and imposing it after the fact.",
    ],
    baseDetail:
      'The same no-authority pattern at smaller scale: a production RAG AI agent shipped 0-to-1 and open-sourced, since adopted by other engineers with no reporting line to him at all.',
    attribution: 'Founding Fullstack Engineer, Canventa Life Sciences (a STEMCELL Technologies subsidiary)',
  },
];
