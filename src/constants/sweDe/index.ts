/**
 * /swe-de registry barrel — server components only. Client components import
 * from ./types (and ./levels) instead; scripts/verifySweDe.ts enforces this.
 * No module-scope throws: integrity checks live in the verify script.
 */

export * from './types';
export * from './books';
export * from './levels';
export * from './readingPath';
export { LIFECYCLE_STAKEHOLDERS } from './lifecycleStakeholders';
export { LEVELS_STACK_FIGURE, OVERVIEW_FIGURES, ROLE_MAP_FIGURE } from './overviewFigures';
export { HARDWARE_TOPICS } from './hardware';
export { APPLICATION_TOPICS } from './application';
export { DISTRIBUTED_TOPICS } from './distributed';
export { PIPELINES_TOPICS } from './pipelines';

import type { FirstPrinciplesTopic, ThinkingLevel } from './types';
import { HARDWARE_TOPICS } from './hardware';
import { APPLICATION_TOPICS } from './application';
import { DISTRIBUTED_TOPICS } from './distributed';
import { PIPELINES_TOPICS } from './pipelines';

export const TOPICS_BY_LEVEL: Record<ThinkingLevel, FirstPrinciplesTopic[]> = {
  hardware: HARDWARE_TOPICS,
  application: APPLICATION_TOPICS,
  distributed: DISTRIBUTED_TOPICS,
  pipelines: PIPELINES_TOPICS,
};
