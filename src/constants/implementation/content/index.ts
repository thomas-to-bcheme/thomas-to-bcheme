import type { ModuleContent, ModuleId } from '../types';
import { FOUNDATIONS_CONTENT } from './foundations';
import { PARADIGMS_CONTENT } from './paradigms';
import { ALGORITHMS_CONTENT } from './algorithms';
import { CONCURRENCY_CONTENT } from './concurrency';
import { FROM_SCRATCH_CONTENT } from './fromScratch';
import { FFI_VS_NETWORK_CONTENT } from './ffiVsNetwork';
import { ARCHITECTURE_CONTENT } from './architecture';

/** Record over ModuleId, so adding a module without content is a type error. */
export const MODULE_CONTENT: Record<ModuleId, ModuleContent> = {
  foundations: FOUNDATIONS_CONTENT,
  paradigms: PARADIGMS_CONTENT,
  algorithms: ALGORITHMS_CONTENT,
  concurrency: CONCURRENCY_CONTENT,
  'from-scratch': FROM_SCRATCH_CONTENT,
  'ffi-vs-network': FFI_VS_NETWORK_CONTENT,
  architecture: ARCHITECTURE_CONTENT,
};
