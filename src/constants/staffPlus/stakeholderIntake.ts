import type { StakeholderIntakeQuestion } from './types';

/**
 * Core questions for gathering stakeholder requirements before designing any
 * enterprise data pipeline: they align the technical architecture with the
 * business operation it serves. Asked in this order, because each answer
 * constrains the next.
 */
export const STAKEHOLDER_INTAKE_QUESTIONS: StakeholderIntakeQuestion[] = [
  {
    id: 'data-source',
    question: 'Where is the data source?',
    identify:
      'The origin of the data. Is it an operational native system or an external application?',
    determines: 'Integration capabilities and data extraction methods.',
    followUps: [
      {
        kind: 'probing',
        question: 'Who owns that system, and what does it expose: an API, a database replica, file exports, or nothing?',
      },
      {
        kind: 'deeper',
        question: 'What happens to this pipeline if the source team changes the system without telling us?',
      },
    ],
  },
  {
    id: 'stakeholders',
    question: 'Who are the stakeholders this data serves?',
    identify:
      'The end-users: executives, marketing, operational managers. Name the roles, not just the teams.',
    determines: 'Data formats, accessibility requirements, and visualization needs.',
    followUps: [
      {
        kind: 'probing',
        question: 'Which decision does each of them make with this data, and how often?',
      },
      {
        kind: 'deeper',
        question: 'Who is affected by the answer but was never in the room when we asked?',
      },
    ],
  },
  {
    id: 'requirements',
    question: 'What are the stakeholder requirements?',
    identify: 'The specific metrics and the reporting frequency each stakeholder needs.',
    determines: 'Required latency, data freshness, and acceptable downtime.',
    followUps: [
      {
        kind: 'probing',
        question: 'If this number were an hour old, a day old, or a week old, which of those would change a decision?',
      },
      {
        kind: 'deeper',
        question: 'What would you do differently if this report were wrong, and how would you find out?',
      },
    ],
  },
];
