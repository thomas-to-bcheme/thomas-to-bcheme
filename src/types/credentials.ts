/**
 * Credential domain types
 *
 * Models the three distinct credibility artifacts surfaced across the site:
 * verifiable press mentions, named recognition/leadership programs, and
 * ongoing leadership activities. Kept as three precise interfaces (rather than
 * one nullable-heavy shape) because the data shapes are genuinely different.
 *
 * The consuming data module (src/data/credentials.ts) is deliberately free of
 * React/icon imports so it can be shared safely between the client UI and the
 * server-side RAG system prompt — hence icons are referenced here by string key.
 */

/** Icon keys mapped to lucide components in the JSX layer (never imported into data). */
export type LeadershipIconName =
  | 'Mic2'
  | 'GraduationCap'
  | 'Users'
  | 'BookOpen'
  | 'Dumbbell';

export interface PressFeature {
  id: string;
  publication: string;
  headline: string;
  /**
   * REQUIRED. Every visible press claim must be independently verifiable —
   * enforcing the link at the type level prevents adding an unlinkable mention.
   */
  url: string;
  quote?: string;
  date?: string;
}

export interface RecognitionItem {
  id: string;
  program: string;
  organization: string;
  /** SHORT label only (e.g. "Fellow", "Ambassador", "Participant"); detail lives in blurb. */
  role: string;
  blurb: string;
  url?: string;
}

export interface LeadershipActivity {
  iconName: LeadershipIconName;
  text: string;
}
