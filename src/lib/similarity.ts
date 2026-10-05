/**
 * Similarity and distance functions behind the /ai-ml similarity explorer.
 *
 * Framework-free on purpose: the explorer (a client component) and
 * scripts/verifyAiMl.ts (a node script that self-tests these against known
 * values) import the same code, so what the reader drags around is exactly what
 * the build checked.
 *
 * Undefined cases return `null` rather than NaN -- cosine of a zero vector has
 * no angle, Pearson of a constant vector has no variance -- so the UI can say
 * "undefined" instead of rendering "NaN".
 */

export type Vector = readonly number[];

/** 2x2 covariance, row-major: [[sxx, sxy], [sxy, syy]]. */
export type Covariance2d = readonly [readonly [number, number], readonly [number, number]];

/** Edit-distance inputs past this length make the DP grid unreadable. */
export const MAX_EDIT_STRING_LENGTH = 12;

/** Below this, a determinant or norm is treated as zero. */
const NUMERIC_EPSILON = 1e-12;

function assertSameLength(a: Vector, b: Vector): void {
  if (a.length !== b.length) {
    throw new RangeError(`vector length mismatch: a=${a.length} b=${b.length}`);
  }
}

export function dot(a: Vector, b: Vector): number {
  assertSameLength(a, b);
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

export function norm(a: Vector): number {
  return Math.sqrt(dot(a, a));
}

/** L2: straight-line distance; the norm ball is a circle. */
export function euclidean(a: Vector, b: Vector): number {
  assertSameLength(a, b);
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

/** L1: sum of axis-aligned moves; the norm ball is a diamond. */
export function manhattan(a: Vector, b: Vector): number {
  assertSameLength(a, b);
  return a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0);
}

/** L-infinity: the single worst coordinate; the norm ball is a square. */
export function chebyshev(a: Vector, b: Vector): number {
  assertSameLength(a, b);
  return a.reduce((worst, value, index) => Math.max(worst, Math.abs(value - b[index])), 0);
}

/** cos(theta) = a.b / (|a||b|); null when either vector has no direction. */
export function cosine(a: Vector, b: Vector): number | null {
  const denominator = norm(a) * norm(b);
  if (denominator < NUMERIC_EPSILON) return null;
  return dot(a, b) / denominator;
}

export function meanCentre(a: Vector): number[] {
  if (a.length === 0) return [];
  const mean = a.reduce((sum, value) => sum + value, 0) / a.length;
  return a.map((value) => value - mean);
}

/** Pearson r is cosine after mean-centring each vector. */
export function pearson(a: Vector, b: Vector): number | null {
  assertSameLength(a, b);
  return cosine(meanCentre(a), meanCentre(b));
}

/** Covariance for unit variances and correlation rho. */
export function correlationCovariance(rho: number): Covariance2d {
  return [
    [1, rho],
    [rho, 1],
  ];
}

/**
 * sqrt((a-b)^T Sigma^{-1} (a-b)) in 2D: Euclidean distance after whitening.
 * Null when Sigma is singular (|rho| = 1), where no whitening exists.
 */
export function mahalanobis2d(a: Vector, b: Vector, sigma: Covariance2d): number | null {
  if (a.length !== 2 || b.length !== 2) {
    throw new RangeError(`mahalanobis2d needs 2D vectors: a=${a.length} b=${b.length}`);
  }
  const [[sxx, sxy], [, syy]] = sigma;
  const determinant = sxx * syy - sxy * sxy;
  if (Math.abs(determinant) < NUMERIC_EPSILON) return null;

  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const quadratic = (syy * dx * dx - 2 * sxy * dx * dy + sxx * dy * dy) / determinant;
  return Math.sqrt(Math.max(quadratic, 0));
}

export interface SetOverlap {
  intersection: number;
  union: number;
  sizeA: number;
  sizeB: number;
  /** |A ∩ B| / |A ∪ B|; null when both sets are empty. */
  jaccard: number | null;
  /** The same sets read as binary vectors: |A ∩ B| / sqrt(|A||B|). */
  binaryCosine: number | null;
}

export function setOverlap<T>(setA: ReadonlySet<T>, setB: ReadonlySet<T>): SetOverlap {
  const intersection = [...setA].filter((item) => setB.has(item)).length;
  const union = setA.size + setB.size - intersection;
  const cosineDenominator = Math.sqrt(setA.size * setB.size);
  return {
    intersection,
    union,
    sizeA: setA.size,
    sizeB: setB.size,
    jaccard: union === 0 ? null : intersection / union,
    binaryCosine: cosineDenominator === 0 ? null : intersection / cosineDenominator,
  };
}

export type EditOperation = 'match' | 'substitute' | 'insert' | 'delete';

export interface EditStep {
  row: number;
  col: number;
  operation: EditOperation;
}

export interface EditDistanceResult {
  distance: number;
  /** (|source|+1) x (|target|+1) Levenshtein cost table. */
  matrix: number[][];
  /** Optimal alignment from (0,0) to the bottom-right cell, origin excluded. */
  path: EditStep[];
}

/**
 * Levenshtein distance by dynamic programming, plus the backtracked path so the
 * explorer can draw which cells the optimal alignment passes through.
 */
export function editDistance(source: string, target: string): EditDistanceResult {
  const sourceChars = [...source];
  const targetChars = [...target];

  const matrix = Array.from({ length: sourceChars.length + 1 }, (_, row) =>
    Array.from({ length: targetChars.length + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0)),
  );

  for (let row = 1; row <= sourceChars.length; row += 1) {
    for (let col = 1; col <= targetChars.length; col += 1) {
      const substitutionCost = sourceChars[row - 1] === targetChars[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost,
      );
    }
  }

  const path: EditStep[] = [];
  let row = sourceChars.length;
  let col = targetChars.length;
  // Each step decrements row, col, or both, so this ends within |s|+|t| steps.
  while (row > 0 || col > 0) {
    const current = matrix[row][col];
    if (row > 0 && col > 0) {
      const isMatch = sourceChars[row - 1] === targetChars[col - 1];
      if (matrix[row - 1][col - 1] + (isMatch ? 0 : 1) === current) {
        path.push({ row, col, operation: isMatch ? 'match' : 'substitute' });
        row -= 1;
        col -= 1;
        continue;
      }
    }
    if (row > 0 && matrix[row - 1][col] + 1 === current) {
      path.push({ row, col, operation: 'delete' });
      row -= 1;
      continue;
    }
    path.push({ row, col, operation: 'insert' });
    col -= 1;
  }

  return {
    distance: matrix[sourceChars.length][targetChars.length],
    matrix,
    path: path.reverse(),
  };
}

/**
 * Overlap area of two circles with radii r1, r2 whose centres are d apart.
 * Used to size an area-proportional Venn diagram.
 */
export function circleLensArea(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const part1 = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const part2 = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const part3 = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return part1 + part2 - part3;
}

/** Bisection steps for the Venn centre distance; 2^-40 of the range is plenty. */
const VENN_BISECTION_STEPS = 40;

/**
 * Centre distance at which two circles of radii r1, r2 overlap by
 * `targetOverlap` area. Overlap decreases monotonically in d, so bisection
 * converges within a fixed number of steps.
 */
export function vennCentreDistance(r1: number, r2: number, targetOverlap: number): number {
  let low = Math.abs(r1 - r2);
  let high = r1 + r2;
  if (targetOverlap <= 0) return high;
  if (targetOverlap >= Math.PI * Math.min(r1, r2) ** 2) return low;

  for (let step = 0; step < VENN_BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (circleLensArea(r1, r2, middle) > targetOverlap) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return (low + high) / 2;
}
