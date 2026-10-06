/**
 * Registry barrel for the /deployops section. Server components only: client
 * components import ./types (and receive data as props) so book and topic
 * content stays out of browser bundles (enforced by scripts/verifyDeployOps.ts).
 */

export * from './types';
export { DEPLOYOPS_BASE_PATH, DEPLOYOPS_LEVELS, getLevelById } from './levels';
export {
  DETERMINISM_SPECTRUM,
  LIFECYCLE_DERIVATION,
  LIFECYCLE_PRINCIPLES,
  LIFECYCLE_STAGES,
  PARADIGM_ROWS,
} from './lifecycle';
export { DEPLOY_STRATEGIES } from './strategies';
export { DEVOPS_TOPICS } from './devopsTopics';
export { AI_TOPICS } from './aiTopics';
export { DEPLOYOPS_BOOKS, getBookById } from './books';
export { START_HERE_PATH, READING_STAGES, getStagesForLevel } from './readingPath';
export { TERMS, getTermsForLevel } from './terms';

import type { FirstPrinciplesTopic, LevelId } from './types';
import { AI_TOPICS } from './aiTopics';
import { DEVOPS_TOPICS } from './devopsTopics';

export const TOPICS_BY_LEVEL: Record<LevelId, FirstPrinciplesTopic[]> = {
  devops: DEVOPS_TOPICS,
  'ai-llm-mlops': AI_TOPICS,
};
