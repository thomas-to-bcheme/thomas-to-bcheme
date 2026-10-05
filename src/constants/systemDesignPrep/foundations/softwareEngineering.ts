import type { SoftwareEngineeringFundamental } from './types';

// Fundamentals drawn from Schutta & Vega's "Fundamentals of Software
// Engineering: From Coder to Engineer" (O'Reilly, 2025) — deliberately not a
// reprint of its table of contents. Each entry is a fundamental that shows
// up in a system design conversation, tagged with the chapter(s) it comes
// from (per the book's public TOC) and the SWE Compass stages it applies to.
// `detail` is this page's own interview-oriented synthesis, not a quote.
export const SOFTWARE_ENGINEERING_FUNDAMENTALS: SoftwareEngineeringFundamental[] = [
  {
    id: 'coder-to-engineer',
    label: 'Engineering is more than code',
    summary: 'The job is solving a business problem under constraints — code is one of the tools.',
    detail:
      'The jump from programmer to engineer is the jump from "does it work?" to "does it solve the right problem, at acceptable cost, in a way others can maintain?" In an interview, that is the difference between naming a technology and justifying one.',
    chapters: [1],
    appliesTo: ['design'],
    crossLink: { label: 'Requirements & Scope →', href: '#requirements-scope' },
  },
  {
    id: 'read-before-write',
    label: 'Read and understand before you change',
    summary: 'Most engineering happens inside systems you did not write — reading code is a core skill.',
    detail:
      'Real systems are brownfield. Tracing how an existing codebase behaves, finding its seams, and changing it safely matters more than greenfield speed. In a design interview, the analog is asking what already exists before proposing a rewrite.',
    chapters: [2, 6],
    appliesTo: ['design', 'backend'],
  },
  {
    id: 'model-before-building',
    label: 'Model before you build',
    summary: 'Diagrams and models are how a design gets communicated and challenged before it is expensive to change.',
    detail:
      'A model is a cheap, disposable version of the system that exposes misunderstandings early. The whiteboard in a system design interview is exactly this — a shared model, not a decoration.',
    chapters: [4],
    appliesTo: ['design'],
    crossLink: { label: 'High-Level Design →', href: '#high-level-design' },
  },
  {
    id: 'architectural-drivers',
    label: 'Let drivers shape the architecture',
    summary: 'Requirements, constraints, and quality attributes drive architecture — not fashion.',
    detail:
      'An architecture is justified by its drivers: the functional requirements, the constraints you cannot change (budget, team, compliance), and the quality attributes that matter most. State the drivers out loud before naming any component.',
    chapters: [9],
    appliesTo: ['design'],
    crossLink: { label: 'Core Characteristics →', href: '#core-characteristics' },
  },
  {
    id: 'tests-as-safety-net',
    label: 'Automated tests are the safety net for change',
    summary: 'A trustworthy automated test suite is what makes a system safe to evolve.',
    detail:
      'Maintainability is not a property of clean code alone — it is the confidence to change code without breaking it. In design terms: how will this be tested, at which layer, and what would catch a regression before users do?',
    chapters: [5],
    appliesTo: ['backend', 'ops'],
  },
  {
    id: 'working-with-data',
    label: 'Data outlives the code around it',
    summary: 'Data models and storage choices are among the hardest decisions to reverse.',
    detail:
      'Application code gets rewritten; data and its schema tend to persist and accumulate dependents. Choosing a storage engine and data model deserves more deliberation than choosing a framework — the data engineering lifecycle below goes deeper.',
    chapters: [8],
    appliesTo: ['data'],
    crossLink: { label: 'Data lifecycle →', href: '#foundations-data-engineering' },
  },
  {
    id: 'path-to-production',
    label: 'Reliable, repeatable path to production',
    summary: 'Software creates no value until it is deployed — and deployment should be boring.',
    detail:
      'Automated, repeatable deployment (CI/CD, environment parity, rollbacks) turns releases from events into routine. In an interview, mentioning how a design gets deployed and rolled back is a cheap, strong operability signal.',
    chapters: [10],
    appliesTo: ['ops'],
  },
  {
    id: 'right-tool',
    label: 'Choose tools by fit, not trend',
    summary: 'Evaluate options against the problem and its constraints before reaching for the newest thing.',
    detail:
      'Every tool brings operational cost, a learning curve, and failure modes. "We already run Postgres and it fits" is often a stronger answer than a specialized store — as long as the trade-off is named.',
    chapters: [],
    appliesTo: ['design', 'backend'],
  },
  {
    id: 'communication',
    label: 'Communication is an engineering skill',
    summary: 'A design nobody understands, or nobody agreed to, does not get built well.',
    detail:
      'Explaining trade-offs, writing decisions down, and bringing people along are part of the engineering, not an add-on to it. The communication scripts above are this, made concrete for an interview.',
    chapters: [13],
    appliesTo: ['design'],
    crossLink: { label: 'Communication Scripts →', href: '#communication-scripts' },
  },
];
