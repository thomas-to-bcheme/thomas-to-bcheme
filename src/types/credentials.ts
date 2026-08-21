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
  id: string;
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

/**
 * One behavioral-signal story for the homepage's Leadership & Recognition
 * section, shaped like `/behavioural`'s own High-Signal Storytelling pyramid
 * (Headline → Behavioral Core → Base) rather than a program/activity blurb.
 * `attribution` is a plain string, not a foreign key into `RecognitionItem`/
 * `LeadershipActivity` — most of these stories are anchored in a Professional
 * Experience role, a résumé section this module doesn't model as its own
 * array and doesn't need to just for this.
 */
export interface CompetencyStory {
  id: string;
  /** Verbatim dimension label, e.g. "Handling Ambiguity". */
  competency: string;
  color: 'blue' | 'amber' | 'purple' | 'emerald' | 'rose';
  /** One sentence — the card's thesis, the most prominent text on it. */
  headline: string;
  /** 2–3 thought → action → result beats, always visible. */
  coreBullets: string[];
  /** 1–2 sentences of supporting depth, revealed on a "+ Details" toggle. */
  baseDetail?: string;
  /** e.g. "Founding Fullstack Engineer, Canventa Life Sciences". */
  attribution: string;
  /** Present only when the attribution is itself a page on this site (e.g. the
   *  SWE Compass essay) rather than a résumé role — an internal same-site
   *  link, not an outbound one, so it's a plain optional href, not the
   *  external-tab-forcing pattern `SourceQuote` uses for ByteByteGo sources. */
  attributionHref?: string;
  /** Optional supporting outbound link distinct from `attribution` — e.g.
   *  "View the pull requests" pointing at real, independently-checkable
   *  evidence (a GitHub PR search) rather than a site-internal anchor.
   *  Rendered as a small link beneath the Core bullets, mirroring the
   *  "Read the ByteByteGo chapter" outbound-link idiom already used in
   *  CompetencyChapterSection.tsx. */
  evidenceLink?: { label: string; href: string };
}
