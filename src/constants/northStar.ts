/**
 * The North Star — the single source for the quote that frames the
 * system-design page, the SWE Compass section on /projects, the
 * "Handling Ambiguity" competency in credentials.ts, and the /swe-de pages.
 * Its applied form (what → why → how) lives in
 * src/constants/systemDesignPrep/framingDecisionTree.ts.
 *
 * Plain data only (no React) so credentials.ts can import it.
 */
export const NORTH_STAR = {
  quote: 'Navigate ambiguity by understanding what to use, when to use it, and why to use it.',
  attribution: 'Thomas To',
} as const;
