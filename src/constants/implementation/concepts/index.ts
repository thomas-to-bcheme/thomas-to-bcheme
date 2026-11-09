import { BASICS_CONCEPTS } from './basics';
import { CONTROL_FLOW_CONCEPTS } from './controlFlow';
import { FUNCTIONS_SCOPE_CONCEPTS } from './functionsScope';
import { STRINGS_OOP_CONCEPTS } from './stringsOop';
import { MEMORY_MODEL_CONCEPTS } from './memoryModel';
import { FOUNDATIONS_CORE_CONCEPTS } from './foundationsCore';
import { DS_FUNDAMENTAL_CONCEPTS } from './dsFundamentals';
import { DS_ADVANCED_CONCEPTS } from './dsAdvanced';
import { PARADIGM_CONCEPTS } from './paradigms';
import { ASYNC_CONCEPTS } from './asyncConcurrency';
import { PARALLELISM_CONCEPTS } from './parallelism';
import { FROM_SCRATCH_CONCEPTS } from './fromScratch';
import { INTEROP_CONCEPTS } from './interop';
import type { ModuleId } from '../types';
import type { Concept } from './types';

export * from './types';
export { CONCEPT_PARTS, EXPLORER_SECTION_ID } from './parts';
export { LANGUAGE_TRAITS } from './uniqueTraits';

/** Everything shown by the explorer on /implementation/foundations, in reading order. */
export const FOUNDATIONS_CONCEPTS: Concept[] = [
  ...BASICS_CONCEPTS,
  ...CONTROL_FLOW_CONCEPTS,
  ...FUNCTIONS_SCOPE_CONCEPTS,
  ...STRINGS_OOP_CONCEPTS,
  ...MEMORY_MODEL_CONCEPTS,
  ...FOUNDATIONS_CORE_CONCEPTS,
];

/** Shown by the explorer on /implementation/algorithms, in learning order. */
export const ALGORITHM_CONCEPTS: Concept[] = [...DS_FUNDAMENTAL_CONCEPTS, ...DS_ADVANCED_CONCEPTS];

/**
 * Which modules render a ConceptExplorer, and with what. A module with no entry
 * (architecture) renders its own components instead. The module page reads this
 * registry, so adding a module's explorer needs data only, no page changes.
 */
export const MODULE_CONCEPTS: Partial<Record<ModuleId, Concept[]>> = {
  foundations: FOUNDATIONS_CONCEPTS,
  paradigms: PARADIGM_CONCEPTS,
  algorithms: ALGORITHM_CONCEPTS,
  concurrency: [...ASYNC_CONCEPTS, ...PARALLELISM_CONCEPTS],
  'from-scratch': FROM_SCRATCH_CONCEPTS,
  'ffi-vs-network': INTEROP_CONCEPTS,
};
