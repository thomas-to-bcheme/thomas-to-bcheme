import type { ArchitectureConcept, ArchitectureLaw, ArchitectureStyle } from './types';

// Drawn from Richards & Ford's "Fundamentals of Software Architecture"
// (2nd ed., O'Reilly, 2025). Scoped to what this page does NOT already
// cover: the characteristics themselves (reliability, scalability, CAP, ...)
// live in coreCharacteristics.ts and the building blocks (caching, LB vs.
// gateway, storage) in componentsOfSystemDesign.ts — entries here cross-link
// to those rather than re-explaining them. Chapter numbers come from the
// book's public table of contents; summaries/details are this page's own
// synthesis, not quotes.

// Ch. 27, "The Laws of Software Architecture, Revisited".
export const ARCHITECTURE_LAWS: ArchitectureLaw[] = [
  {
    id: 'everything-is-a-trade-off',
    statement: 'Everything in software architecture is a trade-off.',
    implication:
      'There is no "best practice" answer to an architecture question — only the least-bad option for these drivers. If an option seems to have no downside, the downside has not been found yet.',
  },
  {
    id: 'why-over-how',
    statement: 'Why is more important than how.',
    implication:
      'Anyone can read a diagram to see how a system is built; the reasoning behind it is what gets lost. Say why out loud in an interview, and write it down (as a decision record) in real life.',
  },
];

// The lifecycle of an architectural characteristic, in the order the book's
// Part I chapters walk it: define → identify → measure/govern → scope →
// componentize. Each is a step past simply *naming* characteristics.
export const ARCHITECTURE_CONCEPTS: ArchitectureConcept[] = [
  {
    id: 'architectural-thinking',
    label: 'Architectural thinking',
    summary: 'Breadth over depth: knowing many options well enough to compare them beats knowing one deeply.',
    detail:
      'An architect’s value is in the trade-off analysis between options, which requires technical breadth. It also means staying close enough to the code to keep decisions grounded.',
    chapters: [2],
  },
  {
    id: 'modularity',
    label: 'Modularity: cohesion and coupling',
    summary: 'How well a system splits into parts — high cohesion inside a module, low coupling between them.',
    detail:
      'Modularity is the raw material every architecture style is built from. Coupling is the cost of change: the more modules must change together, the less independently they can be deployed, scaled, or owned.',
    chapters: [3],
  },
  {
    id: 'identify-characteristics',
    label: 'Identify the characteristics that matter',
    summary: 'Derive the few characteristics that matter from requirements and business context — not all of them.',
    detail:
      'Every characteristic added makes the design more complex, so the goal is the smallest set that captures what the business actually needs. Domain concerns ("time to market", "user satisfaction") translate into characteristics (agility, performance, availability).',
    chapters: [4, 5],
    crossLink: { label: 'Core Characteristics →', href: '#core-characteristics' },
  },
  {
    id: 'measure-and-govern',
    label: 'Measure and govern with fitness functions',
    summary: 'Make characteristics objectively measurable, then check them automatically so they don’t drift.',
    detail:
      'A characteristic nobody measures is an aspiration. Fitness functions — automated checks such as latency budgets in CI, dependency rules, or chaos tests — turn "it should be scalable" into something a build can fail on.',
    chapters: [6],
  },
  {
    id: 'scope-and-quanta',
    label: 'Scope characteristics to the right part of the system',
    summary: 'Different parts of a system often need different characteristics — which is what drives where to split it.',
    detail:
      'If checkout needs high availability and reporting needs high throughput, forcing both onto one deployment unit means paying for both everywhere. Independently deployable units with their own characteristics (the book’s architecture quantum) are the real reason to split a system.',
    chapters: [7],
  },
  {
    id: 'component-thinking',
    label: 'Component-based thinking',
    summary: 'Partition components by technical layer or by business domain — and know which you chose.',
    detail:
      'Technical partitioning (presentation / business / persistence) is familiar but spreads every feature across layers. Domain partitioning (orders, payments, catalog) keeps a feature’s change in one place. That top-level choice constrains which architecture styles fit.',
    chapters: [8],
  },
  {
    id: 'decisions',
    label: 'Record architectural decisions',
    summary: 'Write decisions down with their context and consequences, so the "why" survives.',
    detail:
      'A lightweight decision record — context, decision, consequences, status — is the practical form of the second law. In an interview, narrating a decision in that shape is a strong staff-level signal.',
    chapters: [21],
    crossLink: { label: 'Staff-Level Signals →', href: '#staff-signals' },
  },
  {
    id: 'risk',
    label: 'Analyze architecture risk',
    summary: 'Assess risk per characteristic and per area of the system, then address the highest first.',
    detail:
      'Risk is likelihood × impact for each characteristic in each part of the architecture. Doing it collaboratively surfaces risks no single person sees — and gives the deep-dive portion of an interview a principled target.',
    chapters: [22],
    crossLink: { label: 'Deep Dive →', href: '#deep-dive' },
  },
];

// Part II's styles, in book order (Ch. 10–18). Ch. 19 covers choosing
// between them; the building blocks they're assembled from live in the
// Components section.
export const ARCHITECTURE_STYLES: ArchitectureStyle[] = [
  {
    id: 'layered',
    label: 'Layered',
    chapter: 10,
    partitioning: 'technical',
    reachForItWhen: 'Small, simple apps or a fast start with a team that knows the pattern.',
    watchOutFor: 'Every feature change cuts across all layers; scales and deploys as one unit.',
  },
  {
    id: 'modular-monolith',
    label: 'Modular monolith',
    chapter: 11,
    partitioning: 'domain',
    reachForItWhen: 'You want domain boundaries without distributed-system cost — often the right first step.',
    watchOutFor: 'Module boundaries erode without enforcement (fitness functions help).',
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    chapter: 12,
    partitioning: 'technical',
    reachForItWhen: 'One-directional processing — ETL, compilers, data transformation flows.',
    watchOutFor: 'Poor fit for interactive, request/response workloads.',
  },
  {
    id: 'microkernel',
    label: 'Microkernel',
    chapter: 13,
    partitioning: 'technical',
    reachForItWhen: 'A stable core plus customer- or feature-specific plug-ins (IDEs, rules engines).',
    watchOutFor: 'The plug-in contract becomes hard to change once many plug-ins depend on it.',
  },
  {
    id: 'service-based',
    label: 'Service-based',
    chapter: 14,
    partitioning: 'domain',
    reachForItWhen: 'A pragmatic middle ground: a handful of coarse domain services, often sharing a database.',
    watchOutFor: 'Shared database couples services’ schemas and release cycles.',
  },
  {
    id: 'event-driven',
    label: 'Event-driven',
    chapter: 15,
    partitioning: 'technical',
    reachForItWhen: 'High responsiveness and scale with asynchronous, loosely coupled processing.',
    watchOutFor: 'Harder to test, debug, and reason about consistency and error handling.',
  },
  {
    id: 'space-based',
    label: 'Space-based',
    chapter: 16,
    partitioning: 'technical',
    reachForItWhen: 'Extreme, spiky concurrency (ticketing, auctions) where the database is the bottleneck.',
    watchOutFor: 'In-memory data grids are complex and costly; eventual persistence to the database.',
  },
  {
    id: 'orchestration-soa',
    label: 'Orchestration-driven SOA',
    chapter: 17,
    partitioning: 'technical',
    reachForItWhen: 'Mostly a historical lesson in enterprise-wide reuse via a central orchestration bus.',
    watchOutFor: 'Reuse-driven coupling makes change slow — the problem microservices react against.',
  },
  {
    id: 'microservices',
    label: 'Microservices',
    chapter: 18,
    partitioning: 'domain',
    reachForItWhen: 'Independent deployability and scaling per domain, with teams aligned to services.',
    watchOutFor: 'Distributed-systems cost: network latency, data consistency, operational overhead.',
  },
];
