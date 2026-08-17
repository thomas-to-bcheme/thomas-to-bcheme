/**
 * The single authoritative source for the SWE Compass's end-to-end axis
 * stages (see src/components/features/SweCompassDiagram.tsx's SweCompassAxis
 * for the 3 compass axes themselves — this is the 6-stage breakdown of just
 * the "end-to-end" axis: design -> data -> model -> backend -> frontend ->
 * ops, the same six words as the /study-plan whiteboard's six boards).
 *
 * Both the question bank (questions/types.ts) and the reference grid
 * (referenceGrid.ts) derive their column/category id type from this file
 * instead of each maintaining an independently-typed 6-string union that
 * could silently drift apart.
 */

export type SweCompassLifecycleStage = 'design' | 'data' | 'model' | 'backend' | 'frontend' | 'ops';

export interface SweCompassLifecycleStageMeta {
  id: SweCompassLifecycleStage;
  label: string;
}

// Fixed reading order — matches the Compass's end-to-end axis direction.
export const SWE_COMPASS_LIFECYCLE_STAGES: SweCompassLifecycleStageMeta[] = [
  { id: 'design', label: 'Design' },
  { id: 'data', label: 'Data' },
  { id: 'model', label: 'Model' },
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'ops', label: 'Ops' },
];
