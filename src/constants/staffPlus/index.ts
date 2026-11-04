/**
 * /projects Senior-to-Staff+ registry barrel — server components only. Client
 * components import from ./types instead. No module-scope throws: integrity
 * checks live in scripts/verifyStaffPlus.ts.
 */

export * from './types';
export { STAFF_PLUS_TOPICS } from './topics';
export { LISTENING_SKILLS, PLAYBOOK_FRAMEWORKS, AUDIENCE_ADAPTATION_NOTE } from './listeningPrimer';
export { STAKEHOLDER_INTAKE_QUESTIONS } from './stakeholderIntake';
