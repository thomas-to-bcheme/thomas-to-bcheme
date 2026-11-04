import type { StaffPlusTopic } from './types';

/**
 * Nine senior-to-staff+ competencies. Each card gives the shift in scope, a
 * best-practice list, named industry standards, the risk / spend / financial
 * alignment lens, and four questions (one per conversation move) the reader
 * can ask to get past the stated request. Standards named here are widely
 * documented practices; keep it that way when adding to them.
 */
export const STAFF_PLUS_TOPICS: StaffPlusTopic[] = [
  {
    id: 'navigating-ambiguity',
    title: 'Navigating ambiguity',
    summary: 'Turn an unclear mandate into a bounded decision with a named owner, instead of waiting for clarity or guessing.',
    seniorToStaffShift: {
      senior: 'Asks for requirements, then executes the clearest interpretation well.',
      staff: 'Frames the problem, sorts decisions by how reversible they are, and gets the right people to agree on the question before anyone builds.',
    },
    insight:
      'Ambiguity is rarely missing information; it is missing agreement on the goal, the owner, or the constraint. The leverage is in making the open questions explicit and cheap to answer, not in answering all of them.',
    bestPractices: [
      'Write the problem statement and the success measure before the solution, and get the sponsor to confirm both.',
      'Separate decisions you can reverse cheaply from ones you cannot, and move fast only on the first kind.',
      'List assumptions with an owner and a date to validate each; the riskiest assumption gets tested first.',
      'Record the decision, the options rejected, and why, so the next person does not reopen it.',
    ],
    industryStandards: [
      {
        name: 'Two-way vs one-way doors',
        description: 'Amazon\'s framing for decisions: reversible choices should be made quickly by small groups, irreversible ones deserve more deliberation.',
      },
      {
        name: 'Architecture Decision Records (ADRs)',
        description: 'A short, dated document per significant decision capturing context, the decision, and its consequences.',
      },
      {
        name: 'Design docs / RFCs',
        description: 'A written proposal circulated for review before building, so disagreement surfaces while it is still cheap.',
      },
    ],
    businessLens: {
      risk: 'Building the wrong thing confidently is the largest risk; naming assumptions early converts it into a small, testable one.',
      spend: 'A short framing phase costs days; discovering the misunderstanding after a build costs the build.',
      financialAlignment: 'Tie the problem statement to a metric the sponsor already reports, so the work is funded as a priority, not a favor.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'So the goal is X, and the constraint that is not negotiable is Y. Is that right?',
        whyItWorks: 'It forces the sponsor to correct the framing before it hardens into a plan.',
      },
      {
        kind: 'active',
        question: 'Let me summarize what is decided, what is still open, and who owns each open item. What did I miss?',
        whyItWorks: 'It converts a fuzzy conversation into a list with owners.',
      },
      {
        kind: 'probing',
        question: 'What would a successful outcome look like in numbers, and by when?',
        whyItWorks: 'It replaces an adjective like "better" with a measurable target.',
      },
      {
        kind: 'deeper',
        question: 'What would have to be true for this to be the right problem to solve this quarter?',
        whyItWorks: 'It surfaces the hidden assumption the whole request rests on.',
      },
    ],
    relatedStoryIds: ['handling-ambiguity', 'strategic-leadership-and-thinking-big'],
  },
  {
    id: 'root-cause-analysis',
    title: 'Root cause analysis',
    summary: 'Find the cause that, once fixed, prevents the whole class of failure, not just the instance in front of you.',
    seniorToStaffShift: {
      senior: 'Fixes the bug or incident and documents what happened.',
      staff: 'Identifies the contributing conditions, changes the system so the failure cannot recur, and shares the lesson across teams.',
    },
    insight:
      'Most serious incidents have several contributing causes, and "human error" is where an analysis stops, not where it ends. A good root cause points at something you can change: a missing check, an unclear owner, a risky default.',
    bestPractices: [
      'Stabilize first, then analyze; write the timeline from logs and data, not memory.',
      'Ask why until you reach a process or system condition you can change, not a person.',
      'Distinguish the trigger from the contributing conditions that let it through.',
      'End with actions that have an owner, a date, and a way to verify they worked.',
    ],
    industryStandards: [
      {
        name: '5 Whys',
        description: 'Originating at Toyota, repeated "why" questions that trace a symptom back toward a systemic cause.',
      },
      {
        name: 'Ishikawa (fishbone) diagram',
        description: 'Groups possible causes by category so a team considers more than the first explanation that fits.',
      },
      {
        name: 'Blameless postmortems',
        description: 'Popularized in Google\'s SRE practice: focus on how the system allowed the failure, which makes honest reporting safe.',
      },
    ],
    businessLens: {
      risk: 'A fix that only addresses the symptom leaves the same exposure in place and teaches the organization to expect repeats.',
      spend: 'Each recurrence repays the incident cost; a systemic fix is paid for once.',
      financialAlignment: 'Express the cost of the incident, including labor, delay, and any material loss, so the preventive work competes fairly for budget.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'It sounds like the part that worries you most is that this could happen again. Is that the real concern?',
        whyItWorks: 'It separates the urge to fix this instance from the need to prevent the class.',
      },
      {
        kind: 'active',
        question: 'Here is the timeline as I understand it; where does it differ from what you saw?',
        whyItWorks: 'It builds a shared factual record before anyone assigns a cause.',
      },
      {
        kind: 'probing',
        question: 'When did this last work correctly, and what changed between then and now?',
        whyItWorks: 'It narrows the search to a specific change instead of the whole system.',
      },
      {
        kind: 'deeper',
        question: 'What allowed this to reach production without being caught, and which check would have stopped it?',
        whyItWorks: 'It moves from the trigger to the control that was missing.',
      },
    ],
    relatedStoryIds: ['problem-solving-and-deep-dive', 'delivery'],
  },
  {
    id: 'stakeholder-communication',
    title: 'Stakeholder communication',
    summary: 'Give each audience the decision, the risk, and the ask in the order and depth they need, then own the next step.',
    seniorToStaffShift: {
      senior: 'Reports what was built and answers questions when asked.',
      staff: 'Leads with the outcome, brings options with a recommendation, and closes with an owner and a date.',
    },
    insight:
      'Leaders remember the first sentence. Translating technical work into revenue, risk, efficiency, or customer outcomes is the job; the details live in an appendix for those who want proof.',
    bestPractices: [
      'Lead with the conclusion and the business outcome, never the task list.',
      'Never escalate a problem alone: bring context, options, trade-offs, and a recommendation.',
      'Close every meeting by naming the next step, the owner, and the date.',
      'Prepare three sizes of every message: a thirty-second headline, a one-page version, and a backup appendix.',
    ],
    industryStandards: [
      {
        name: 'Pyramid Principle / BLUF',
        description: 'Barbara Minto\'s structure (and the military "bottom line up front"): answer first, then supporting arguments.',
      },
      {
        name: 'Situation, Complication, Resolution',
        description: 'A narrative structure for stories that gives a decision-maker the stakes before the solution.',
      },
      {
        name: 'RACI',
        description: 'Makes explicit who is Responsible, Accountable, Consulted, and Informed so no decision is left ownerless.',
      },
      {
        name: 'Power / interest stakeholder mapping',
        description: 'Plots stakeholders by influence and interest to decide who to keep closely informed and who to consult.',
      },
    ],
    businessLens: {
      risk: 'Surprises erode trust fastest; flag risks early in the language the audience uses, with a mitigation attached.',
      spend: 'Unclear communication multiplies meetings and rework; one clear summary with owners removes both.',
      financialAlignment: 'Connect every result to a priority the leader already reports on, so your work reads as moving their number.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'It sounds like what you need from this update is confidence that the date holds, not the technical detail. Is that right?',
        whyItWorks: 'It checks what the real concern is behind a broad question.',
      },
      {
        kind: 'active',
        question: 'To confirm: we agreed on X. I will do Y by Z and report back on the result. Anything to correct?',
        whyItWorks: 'It closes the loop and secures ownership of the next step.',
      },
      {
        kind: 'probing',
        question: 'Which decision will you make with this information, and when do you need it?',
        whyItWorks: 'It sizes the message to the decision instead of to everything you know.',
      },
      {
        kind: 'deeper',
        question: 'Which outcome matters most, which options move the needle, and what are we choosing not to do?',
        whyItWorks: 'It surfaces the trade-off the sponsor has not yet stated out loud.',
      },
    ],
    relatedStoryIds: [
      'translating-technical-into-business-impact',
      'influence-without-authority',
      'earning-trust-and-conflict',
    ],
  },
  {
    id: 'managing-timelines',
    title: 'Managing timelines',
    summary: 'Treat a date as a commitment with known risks, and renegotiate scope early instead of slipping quietly.',
    seniorToStaffShift: {
      senior: 'Estimates their own work and reports status.',
      staff: 'Sequences cross-team dependencies, protects the critical path, and trades scope against date explicitly with the sponsor.',
    },
    insight:
      'Estimates are ranges, not points, and they widen as dependencies cross teams. The credible move is to show the range, name what could move it, and offer the scope that holds the date.',
    bestPractices: [
      'Give a range with the assumptions behind it, not a single date.',
      'Identify the critical path and the external dependencies that sit on it.',
      'Re-plan when assumptions break, and tell the sponsor before the date slips, not after.',
      'Cut scope by value; do not compress testing or review to hold a date.',
    ],
    industryStandards: [
      {
        name: 'Critical path method',
        description: 'Identifies the longest chain of dependent tasks, which determines the earliest possible finish.',
      },
      {
        name: 'Three-point (PERT) estimation',
        description: 'Combines optimistic, likely, and pessimistic estimates to express uncertainty as a range.',
      },
      {
        name: 'Cone of uncertainty',
        description: 'The observation (Boehm; popularized by McConnell) that early estimates are widest and narrow as decisions are made.',
      },
      {
        name: 'DORA delivery metrics',
        description: 'Lead time, deployment frequency, change failure rate, and time to restore, used to measure delivery performance.',
      },
    ],
    businessLens: {
      risk: 'A date held by cutting testing moves the risk to production; a date renegotiated early keeps it visible and priced.',
      spend: 'Late discovery of a slip burns the most expensive resource, other teams\' waiting time.',
      financialAlignment: 'Tie the date to what it unlocks financially, such as a launch window or a budget cycle, so trade-offs are made against value.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'It sounds like the date matters because of what it unlocks, not the date itself. Is that right?',
        whyItWorks: 'It separates a real deadline from a habitual one and reveals flexibility.',
      },
      {
        kind: 'active',
        question: 'Let me play back the dependencies on the critical path and who owns each. Did I miss one?',
        whyItWorks: 'It makes hidden cross-team risks visible and assigned.',
      },
      {
        kind: 'probing',
        question: 'What is the earliest date this could be done, the likely date, and the latest, and what drives the gap?',
        whyItWorks: 'It turns a point estimate into a range with named drivers.',
      },
      {
        kind: 'deeper',
        question: 'If we had to hold this date, what scope would we cut first, and who would feel it?',
        whyItWorks: 'It pre-negotiates the trade-off before pressure arrives.',
      },
    ],
    relatedStoryIds: ['delivery', 'strategic-leadership-and-thinking-big'],
  },
  {
    id: 'business-design-from-data',
    title: 'Business design from data',
    summary: 'Define the metric and the decision first, then design the data model and the product around that decision.',
    seniorToStaffShift: {
      senior: 'Builds the dashboard or model that was requested.',
      staff: 'Asks which decision it changes, defines the metric with the owner, and checks that the number can be trusted before building on it.',
    },
    insight:
      'Data work earns its place when it changes a decision. A metric nobody can define consistently, or whose movement nobody acts on, is cost with no return.',
    bestPractices: [
      'Start from the decision and the person who makes it, then work back to the data.',
      'Write each metric\'s definition, grain, owner, and source once, in one place.',
      'Pair a primary metric with guardrail metrics so you do not win one number by harming another.',
      'Prefer one shared self-serve layer over repeated one-off requests that answer the same underlying need.',
    ],
    industryStandards: [
      {
        name: 'North Star metric with driver trees',
        description: 'One outcome metric broken into the input metrics a team can actually influence.',
      },
      {
        name: 'Guardrail metrics',
        description: 'Metrics monitored alongside the target to catch unintended harm, standard in controlled experimentation.',
      },
      {
        name: 'Semantic / metrics layer',
        description: 'A governed, central definition of each metric so every dashboard calculates it the same way.',
      },
      {
        name: 'Unit economics',
        description: 'Revenue and cost per unit (customer, order, batch) used to test whether growth is actually profitable.',
      },
    ],
    businessLens: {
      risk: 'Conflicting definitions lead to decisions made on numbers that do not match; governed definitions reduce that risk.',
      spend: 'Repeated ad-hoc requests consume engineering capacity; a shared layer pays the cost once.',
      financialAlignment: 'Express the model in the finance team\'s own terms, so its output reconciles with the numbers they already report.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'It sounds like the real need is answering this yourselves without waiting on us. Is that it?',
        whyItWorks: 'Different literal requests often trace to one underlying need.',
      },
      {
        kind: 'active',
        question: 'Let me restate how you define this metric and where the number comes from. Does finance define it the same way?',
        whyItWorks: 'It exposes definition mismatches before they reach a dashboard.',
      },
      {
        kind: 'probing',
        question: 'Which decision does this number feed, who makes it, and how often?',
        whyItWorks: 'It sizes freshness, grain, and format to the decision.',
      },
      {
        kind: 'deeper',
        question: 'If this number moved 10%, what would you actually do differently?',
        whyItWorks: 'If the answer is nothing, the metric is not worth building.',
      },
    ],
    relatedStoryIds: ['innovation', 'customer-and-user-focus', 'translating-technical-into-business-impact'],
  },
  {
    id: 'data-ingestion',
    title: 'Data ingestion',
    summary: 'Choose how data enters the platform based on the source, the consumers, and the freshness the business actually needs.',
    seniorToStaffShift: {
      senior: 'Builds a reliable pipeline from a given source to a given table.',
      staff: 'Decides batch vs streaming from the requirement, defines ownership and failure behavior, and plans for replays and source changes.',
    },
    insight:
      'The source system dictates what is possible; the stakeholders dictate what is necessary. Real-time ingestion has a real operating cost, so it should be justified by a decision that cannot wait.',
    bestPractices: [
      'Start with the three intake questions: where is the source, who does the data serve, and what do they require.',
      'Make loads idempotent so a retry or backfill cannot create duplicates.',
      'Land raw data unchanged first, then transform, so you can replay without re-extracting.',
      'Decide the failure behavior up front: retry, alert, or quarantine bad records.',
    ],
    industryStandards: [
      {
        name: 'ELT with a raw landing layer',
        description: 'Load first, transform in the warehouse, which keeps the original data available for replay.',
      },
      {
        name: 'Change data capture (CDC)',
        description: 'Reads a database\'s change log to replicate only what changed, with lower source load than repeated full extracts.',
      },
      {
        name: 'Medallion layers (bronze, silver, gold)',
        description: 'Staged refinement from raw to cleaned to business-ready data, popularized by Databricks.',
      },
      {
        name: 'Idempotent, at-least-once delivery',
        description: 'Accept that messages may arrive more than once and design the sink so duplicates have no effect.',
      },
    ],
    businessLens: {
      risk: 'Silent ingestion failures produce confidently wrong reports; explicit failure handling makes them loud.',
      spend: 'Streaming infrastructure costs more to build and run than batch; match latency to the decision, not to ambition.',
      financialAlignment: 'Align the refresh schedule with reporting cycles such as close or planning, where freshness has a financial deadline.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'So the source is an external application we do not control, which limits us to what it exposes. Is that right?',
        whyItWorks: 'It makes the integration constraint explicit before design starts.',
      },
      {
        kind: 'active',
        question: 'Let me repeat the three answers: the source, the audience, and the freshness required. Does this match what you need?',
        whyItWorks: 'It confirms the intake before any pipeline is built.',
      },
      {
        kind: 'probing',
        question: 'How stale can this data be before a decision is affected, and what is the acceptable downtime?',
        whyItWorks: 'It turns "real time" into a number the architecture can be sized to.',
      },
      {
        kind: 'deeper',
        question: 'What happens to downstream reports if the source changes its format without notice?',
        whyItWorks: 'It surfaces the need for contracts, monitoring, and an owner.',
      },
    ],
    relatedStoryIds: ['customer-and-user-focus', 'taking-initiative'],
  },
  {
    id: 'schema-validation',
    title: 'Data and schema validation',
    summary: 'Define what valid data means as an explicit contract, and enforce it at the boundary before bad data spreads.',
    seniorToStaffShift: {
      senior: 'Adds checks to the pipelines they own.',
      staff: 'Establishes contracts between producers and consumers, sets who is paged, and decides what happens to records that fail.',
    },
    insight:
      'Bad data is cheapest to stop at the boundary and most expensive to find in an executive report. Schema checks catch shape problems; data-quality checks catch meaning problems; you need both.',
    bestPractices: [
      'Treat schemas as versioned contracts between producing and consuming teams, with an owner on each side.',
      'Validate at ingestion and again after transformation; fail loudly on critical checks.',
      'Quarantine failing records with the reason, rather than dropping them or loading them silently.',
      'Choose which changes are compatible (adding an optional field) and which require coordination (renaming or removing).',
    ],
    industryStandards: [
      {
        name: 'Data contracts',
        description: 'An agreed, versioned description of a dataset\'s schema, semantics, and service levels between producer and consumer.',
      },
      {
        name: 'Schema registry compatibility modes',
        description: 'Backward, forward, and full compatibility rules, as used with Avro, Protobuf, and JSON Schema in streaming systems.',
      },
      {
        name: 'dbt tests and Great Expectations',
        description: 'Declarative checks such as unique, not null, accepted values, and relationships, run as part of the pipeline.',
      },
      {
        name: 'Data quality dimensions',
        description: 'Completeness, validity, uniqueness, timeliness, consistency, and accuracy, used as a checklist for what to test.',
      },
    ],
    businessLens: {
      risk: 'Unvalidated data reaches finance and compliance reports; validation at the boundary keeps errors from becoming restatements.',
      spend: 'Cleaning data downstream in every consumer duplicates effort that one upstream contract removes.',
      financialAlignment: 'Prioritize checks on the fields that feed financial and regulatory numbers, where an error has the highest cost.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'It sounds like what hurts most is finding out a number was wrong after it was presented. Is that the concern?',
        whyItWorks: 'It frames validation as protecting trust, which wins sponsorship.',
      },
      {
        kind: 'active',
        question: 'Let me restate what "valid" means for this field and who owns it. Does the source team agree?',
        whyItWorks: 'It produces a contract both sides have actually acknowledged.',
      },
      {
        kind: 'probing',
        question: 'Which fields feed a financial or regulatory number, and what are the allowed values and ranges?',
        whyItWorks: 'It focuses effort on the highest-impact checks first.',
      },
      {
        kind: 'deeper',
        question: 'When a record fails a check, who is told, what happens to the record, and who decides how to fix it?',
        whyItWorks: 'It exposes the missing ownership that makes validation ineffective.',
      },
    ],
    relatedStoryIds: ['customer-and-user-focus', 'taking-initiative'],
  },
  {
    id: 'testing-and-monitoring',
    title: 'Testing and monitoring',
    summary: 'Test before release for known failures, and monitor after release for unknown ones, with alerts tied to what users feel.',
    seniorToStaffShift: {
      senior: 'Writes tests and dashboards for their own service.',
      staff: 'Defines reliability targets with the business, sets alerting policy, and decides how much reliability is worth paying for.',
    },
    insight:
      'Testing gives confidence before release, and monitoring gives it after. For data and ML systems, the failure is often silent: the job succeeds and the numbers are wrong, so you monitor data behavior as well as system health.',
    bestPractices: [
      'Keep many fast unit tests, fewer integration tests, and a small number of high-value end-to-end tests.',
      'Define service level objectives with the business, and alert on user-visible symptoms, not every internal cause.',
      'Monitor freshness, volume, schema, and distribution of data, plus model drift for ML.',
      'Make every alert actionable with an owner and a runbook, or delete it.',
    ],
    industryStandards: [
      {
        name: 'Test pyramid',
        description: 'Mike Cohn\'s guidance for the mix of unit, integration, and end-to-end tests.',
      },
      {
        name: 'SLIs, SLOs, and error budgets',
        description: 'Google SRE practice: measure what users feel, set a target, and use the remaining budget to decide between shipping and stabilizing.',
      },
      {
        name: 'Four golden signals',
        description: 'Latency, traffic, errors, and saturation, the SRE starting set for monitoring a service.',
      },
      {
        name: 'Data observability',
        description: 'Monitoring a dataset\'s freshness, volume, schema, distribution, and lineage to catch silent data failures.',
      },
    ],
    businessLens: {
      risk: 'Untested change and unmonitored pipelines both fail silently; an agreed objective makes the risk level a conscious choice.',
      spend: 'Reliability has diminishing returns; an error budget prices each additional nine against what the business needs.',
      financialAlignment: 'Set objectives from the cost of downtime or wrong data to the business, not from engineering preference.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'It sounds like a wrong number reaching leadership is worse than a late one. Is that the right priority?',
        whyItWorks: 'It sets what to protect first and shapes the whole monitoring design.',
      },
      {
        kind: 'active',
        question: 'Let me restate the objective: this report is fresh by 8am and 99% of runs succeed. Is that what you need?',
        whyItWorks: 'It turns expectations into a testable service level.',
      },
      {
        kind: 'probing',
        question: 'What does an outage or a bad number cost per hour or per incident, and who feels it first?',
        whyItWorks: 'It gives the reliability target a financial basis.',
      },
      {
        kind: 'deeper',
        question: 'How would we know if this were silently wrong for a week, and who would notice?',
        whyItWorks: 'It surfaces the gap that only data-level monitoring can close.',
      },
    ],
    relatedStoryIds: ['problem-solving-and-deep-dive', 'delivery'],
  },
  {
    id: 'big-data-scalability',
    title: 'Big data scalability',
    summary: 'Scale to the load you can justify, find the real bottleneck first, and make cost per query as visible as speed.',
    seniorToStaffShift: {
      senior: 'Tunes a slow job or query until it is fast enough.',
      staff: 'Sizes the design to forecast demand, chooses between scaling up, scaling out, and not computing at all, and owns the cost curve.',
    },
    insight:
      'Scalability is a cost question as much as a speed question. Most slow pipelines are bounded by one thing, such as skew, shuffles, or small files, and a bigger cluster only hides it at higher cost.',
    bestPractices: [
      'Measure before optimizing: profile to find the bottleneck, then fix that.',
      'Prefer incremental processing over full refreshes when the data is append-heavy.',
      'Partition and cluster on the columns queries actually filter by; use columnar formats.',
      'Do a back-of-envelope capacity estimate against forecast growth, and design for the load you can justify now with a known path beyond it.',
    ],
    industryStandards: [
      {
        name: 'Separation of storage and compute',
        description: 'Scale and pay for each independently, the model used by cloud warehouses such as Snowflake and BigQuery.',
      },
      {
        name: 'Columnar formats and partition pruning',
        description: 'Formats like Parquet and partitioned layouts reduce the bytes scanned, which cuts both time and cost.',
      },
      {
        name: 'FinOps practices',
        description: 'The FinOps Foundation framework for making cloud cost visible, allocated, and owned by the teams that cause it.',
      },
      {
        name: 'Amdahl\'s law',
        description: 'The serial portion of a workload limits the speedup parallelism can deliver, so find it before adding hardware.',
      },
    ],
    businessLens: {
      risk: 'Over-engineering for imagined scale delays delivery; under-sizing for real growth risks an outage at the worst time.',
      spend: 'Compute is a recurring cost that scales with careless queries; owning cost per query keeps it proportional to value.',
      financialAlignment: 'Forecast cost against growth with finance, and set budgets and alerts so a spike is an alert, not a surprise invoice.',
    },
    coreQuestions: [
      {
        kind: 'reflective',
        question: 'It sounds like the worry is the bill and the slowdown together, not just one. Is that right?',
        whyItWorks: 'It keeps cost and performance in the same conversation.',
      },
      {
        kind: 'active',
        question: 'Let me restate the growth you expect and the response time you need at that size. Does that match?',
        whyItWorks: 'It anchors the design to a forecast instead of a guess.',
      },
      {
        kind: 'probing',
        question: 'Which queries or jobs dominate cost and runtime today, and who owns them?',
        whyItWorks: 'A few workloads usually drive most of the bill.',
      },
      {
        kind: 'deeper',
        question: 'What is the cheapest version of this that meets the need, including not computing it at all?',
        whyItWorks: 'It challenges whether the scale is required before building for it.',
      },
    ],
    relatedStoryIds: ['strategic-leadership-and-thinking-big', 'learning-and-growth'],
  },
];
