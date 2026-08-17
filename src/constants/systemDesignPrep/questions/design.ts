import type { SystemDesignQuestion } from './types';

export const DESIGN_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'cap-vs-pacelc',
    category: 'design',
    axes: ['abstraction'],
    question:
      'When the network partitions, what breaks — availability or consistency? And even when it doesn’t, what do you trade for lower latency?',
    clarifyingSubQuestions: [
      'If a partition happens, can this system reject writes/reads (favoring consistency) or must it keep serving (favoring availability)?',
      'Absent a partition, is there still a latency-vs-consistency trade being made on every request (PACELC’s "else" clause)?',
      'Is a partition actually likely for this deployment topology, or is this a single-region system where the P in CAP rarely fires in practice?',
    ],
    approachOptions: [
      {
        label: 'CP (consistency over availability)',
        whenToUse:
          'Financial ledgers, inventory counts, anything where serving stale or conflicting data is worse than an error page.',
        tradeoffs:
          'Nodes on the minority side of a partition refuse requests until they can confirm they have the latest state — real, user-visible downtime during a partition.',
      },
      {
        label: 'AP (availability over consistency)',
        whenToUse:
          'Social feeds, shopping carts, presence indicators — anywhere a slightly stale read is acceptable and staying up matters more.',
        tradeoffs:
          'Every node keeps serving during a partition, but different nodes can disagree until they reconcile — requires a conflict-resolution strategy (last-write-wins, CRDTs, application-level merge).',
      },
      {
        label: 'PACELC’s "else": latency vs consistency with no partition at all',
        whenToUse:
          'Any system, at all times — this is the trade you’re making on the happy path, not just during failures.',
        tradeoffs:
          'Synchronous replication for strong consistency adds round-trip latency to every write; async replication is fast but leaves a window where a reader can see stale data.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'CAP is a partition-time statement, not a permanent system label',
        dependsOn:
          'A system can be CP during a partition and still make a separate latency/consistency trade the rest of the time — PACELC exists precisely because CAP alone underspecifies steady-state behavior.',
      },
    ],
    ripplesInto: ['consistency-spectrum', 'db-selection'],
    sourceNote: 'board',
  },
  {
    id: 'monolith-vs-microservices',
    category: 'design',
    axes: ['end-to-end', 'time'],
    question: 'Should this ship as one deployable unit, or as independently-deployable services?',
    clarifyingSubQuestions: [
      'How many teams need to own and deploy different parts of this system independently?',
      'Do different parts of the system have wildly different scaling profiles that a single deployable can’t serve efficiently?',
      'Is the domain boundary between components actually well understood yet, or still in flux?',
    ],
    approachOptions: [
      {
        label: 'Monolith',
        whenToUse: 'Early-stage products, small teams, or domains still being discovered — one deployable, one datastore, simplest operational surface.',
        tradeoffs: 'Fast to build and reason about, but scaling and deploying one piece means scaling/deploying the whole thing.',
      },
      {
        label: 'Modular monolith',
        whenToUse: 'Team wants clear internal domain boundaries (for a future split) without paying distributed-systems tax today.',
        tradeoffs: 'Keeps deployment simple while enforcing module boundaries in code — the natural middle ground, and often underrated.',
      },
      {
        label: 'Microservices',
        whenToUse: 'Multiple teams need independent deploy cadences, or components have genuinely different scaling/reliability needs.',
        tradeoffs: 'Independent scaling and deployment, at the cost of network calls between services, distributed debugging, and real operational overhead.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Splitting too early is a common staff-level anti-pattern',
        dependsOn:
          'Domain boundaries are usually clearer after a system has been in production for a while — premature microservices split along guessed boundaries that get expensive to redraw later.',
      },
    ],
    ripplesInto: ['stateless-vs-stateful', 'scaling-progression'],
    sourceNote: 'board',
  },
  {
    id: 'build-vs-buy-decision',
    category: 'design',
    axes: ['abstraction'],
    question:
      'Should this capability be built in-house, or adopted as an existing managed service, SaaS, or open-source library?',
    clarifyingSubQuestions: [
      'Is this capability actually the thing that differentiates the product, or is it commodity infrastructure every product needs?',
      'Do mature, well-supported solutions already exist for this problem, or would adopting one mean bending the product around a poor fit?',
      'What does the recurring cost (dollars, vendor risk, integration surface) of buying compare to the ongoing engineering cost of owning it forever?',
    ],
    approachOptions: [
      {
        label: 'Buy / adopt an existing solution',
        whenToUse:
          'The capability is not a differentiator for this product and mature solutions already exist — auth, payments, rate limiting.',
        tradeoffs:
          'Fast to ship and offloads ongoing maintenance to the vendor, but adds recurring cost and real vendor lock-in.',
      },
      {
        label: 'Build in-house',
        whenToUse:
          'The capability IS the differentiator, or a hard constraint (e.g. a $0 budget) rules out every paid option.',
        tradeoffs:
          'Full control and no recurring cost, but the team owns every bug, edge case, and security patch for as long as the system lives.',
      },
      {
        label: 'Hybrid — thin wrapper around an open-source or managed core',
        whenToUse:
          'The common middle case: most of the problem is commodity, but a specific piece needs product-specific behavior.',
        tradeoffs:
          'Balances speed and control, but needs an explicit customization boundary decided up front, or the "thin" wrapper quietly grows into a second implementation.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This mirrors a staff-level signal already tracked elsewhere on this page',
        dependsOn:
          'The difference is deciding it here, for a specific system, not just recognizing it as a competency — see the "Shows build-vs-buy judgment" staff signal for the general pattern this question turns into a concrete decision cascade.',
      },
      {
        consideration: 'How replaceable is this component later, if the buy decision turns out wrong?',
        dependsOn:
          'A buy decision behind a clean internal interface can be swapped for a build later at moderate cost; a buy decision woven directly through the codebase turns "wrong vendor" into a much larger rewrite than the original decision implied.',
      },
    ],
    ripplesInto: [],
    sourceNote: 'synthesized',
  },
];
