// The 7-characteristic baseline every decision cascade in the question bank
// gets checked against: Chip Huyen's 4 canonical characteristics of a
// well-designed ML/software system (Designing Machine Learning Systems,
// O'Reilly 2022) plus CAP theorem's 3. Everything else — which one matters
// most, and how much — is situational, captured separately below and
// cross-linked to the real question-bank entry it depends on.
export interface CoreCharacteristic {
  id: string;
  label: string;
  source: 'huyen' | 'cap';
  summary: string;
}

export const CORE_CHARACTERISTICS: CoreCharacteristic[] = [
  {
    id: 'reliability',
    label: 'Reliability',
    source: 'huyen',
    summary:
      'Keeps working correctly even when components fail — degrade gracefully, don’t go down.',
  },
  {
    id: 'scalability',
    label: 'Scalability',
    source: 'huyen',
    summary: 'Handles growth in load, data, or complexity without a fundamental rewrite.',
  },
  {
    id: 'maintainability',
    label: 'Maintainability',
    source: 'huyen',
    summary:
      'A different engineer — or you, in a year — can understand, fix, and extend this without archaeology.',
  },
  {
    id: 'adaptability',
    label: 'Adaptability',
    source: 'huyen',
    summary:
      'Absorbs new requirements, new data patterns, or new constraints without a ground-up redesign.',
  },
  {
    id: 'consistency',
    label: 'Consistency',
    source: 'cap',
    summary: 'Every read gets the latest write — no node ever serves stale data.',
  },
  {
    id: 'availability',
    label: 'Availability',
    source: 'cap',
    summary: 'Every request gets a response, even if the data behind it isn’t the latest.',
  },
  {
    id: 'partition-tolerance',
    label: 'Partition Tolerance',
    source: 'cap',
    summary: 'The system keeps working despite dropped or delayed messages between nodes.',
  },
];

// Characteristics that only matter once the core 7 hold, and whose priority
// depends entirely on this system's specific constraints — each one points
// at the real question-bank entry (by stable id) where the trade-off actually
// gets worked through.
export interface SituationalCharacteristic {
  id: string;
  label: string;
  summary: string;
  questionId: string;
}

export const SITUATIONAL_CHARACTERISTICS: SituationalCharacteristic[] = [
  {
    id: 'vertical-vs-horizontal-scaling',
    label: 'Vertical vs. horizontal scaling',
    summary:
      'Scaling up (a bigger machine) vs. scaling out (more machines) — the choice compounds hard once a budget constraint is in play.',
    questionId: 'scaling-progression',
  },
  {
    id: 'scaling-reads-vs-scaling-writes',
    label: 'Scaling reads vs. scaling writes',
    summary:
      'Read replicas and caching scale read traffic; sharding scales write volume — the scaling-progression ladder splits into two different levers depending on which side is actually the bottleneck.',
    questionId: 'scaling-progression',
  },
  {
    id: 'latency-vs-throughput',
    label: 'Latency vs. throughput',
    summary:
      'Optimizing one request’s speed vs. total requests handled per second — often in direct tension.',
    questionId: 'latency-vs-throughput',
  },
  {
    id: 'consistency-spectrum',
    label: 'Consistency spectrum',
    summary:
      'Strong vs. eventual consistency isn’t a binary — it’s a spectrum, and CAP only forces the choice during a partition.',
    questionId: 'consistency-spectrum',
  },
  {
    id: 'cap-vs-pacelc',
    label: 'CAP vs. PACELC',
    summary:
      'CAP only governs behavior during a partition; PACELC extends the same latency-vs-consistency trade-off to the normal, healthy case too.',
    questionId: 'cap-vs-pacelc',
  },
  {
    id: 'stateless-vs-stateful',
    label: 'Stateless vs. stateful',
    summary:
      'Whether any instance can handle any request — shapes both reliability (failover) and scalability (adding instances trivially).',
    questionId: 'stateless-vs-stateful',
  },
  {
    id: 'structured-vs-unstructured-data',
    label: 'Structured vs. unstructured data',
    summary:
      'Data shape drives maintainability (schema drift, validation) and adaptability (how easily new fields land).',
    questionId: 'structured-vs-unstructured',
  },
];
