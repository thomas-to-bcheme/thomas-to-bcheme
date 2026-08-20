/**
 * Credential domain types
 *
 * Models the four distinct credibility artifacts surfaced across the site:
 * verifiable press mentions, named recognition/leadership programs, ongoing
 * leadership activities, and quantified career-impact metrics. Kept as
 * precise interfaces (rather than one nullable-heavy shape) because the data
 * shapes are genuinely different.
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

/** Icon keys mapped to lucide components in the JSX layer (never imported into data). */
export type ImpactMetricIconName =
  | 'TrendingDown'
  | 'ShieldCheck'
  | 'Gauge'
  | 'BadgeCheck'
  | 'Clock'
  | 'Users';

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

export interface ImpactMetric {
  id: string;
  iconName: ImpactMetricIconName;
  /** Short bold stat, e.g. "$63.2M", "99%", "10+". */
  value: string;
  /** One sentence describing what the stat measures — no trailing period, reads as a caption. */
  label: string;
  /** Role/company attribution, e.g. "UC Davis — Research Engineer". */
  context: string;
}
