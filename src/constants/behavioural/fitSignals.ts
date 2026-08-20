/**
 * Moved unchanged from the old flat `constants/behavioural.ts`.
 */

export interface FitSignal {
  signal: string;
  example: string;
}

export interface FitSignalGroup {
  id: 'role-fit' | 'company-fit';
  label: string;
  description: string;
  signals: FitSignal[];
}

/**
 * Behavioural interviews are answering two questions at once: do you fit, and at what
 * level. FIT_SIGNAL_GROUPS covers the first — Role Fit (does this story match what the
 * specific role demands day to day) and Company Fit (does it match how this company
 * actually rewards behavior, not just its stated values). Rendered by
 * FitFramingSection, ahead of the career-ladder section that covers the second
 * question (level). Synthesized from ByteByteGo's "What Companies Are Looking For".
 */
export const FIT_SIGNAL_GROUPS: FitSignalGroup[] = [
  {
    id: 'role-fit',
    label: 'Role Fit',
    description:
      'Whether your stories show comfort with what this specific role demands day to day — not the job title, the job.',
    signals: [
      {
        signal:
          'If the role runs on ambiguous requirements, do your stories show you moving before someone hands you clarity?',
        example:
          'Your story where you shipped a first pass against a spec that was still one page of bullet points, then revised it twice as edge cases surfaced — not the one where you waited for a full requirements doc before writing a line of code.',
      },
      {
        signal:
          'If the role spans multiple teams, do your stories show you coordinating across a boundary rather than staying inside your own?',
        example:
          'The story where you walked over to the infra team to renegotiate an API contract before your feature could ship, not the one where you optimized a service only your own team touches.',
      },
      {
        signal:
          'If the role rewards fast iteration, do your stories show you shipping something imperfect and adjusting, not polishing before you ship?',
        example:
          'The version where you launched a scrappy first cut to ten users on a Friday and rewrote half of it Monday based on what broke — not the six-week story where nothing shipped until it was airtight.',
      },
    ],
  },
  {
    id: 'company-fit',
    label: 'Company Fit',
    description:
      'Whether the choices inside your stories match how this company actually rewards behavior — not its stated values, the ones it visibly acts on.',
    signals: [
      {
        signal:
          'A company that prizes moving fast wants a story where you acted on incomplete information and it worked out.',
        example:
          'You greenlit a launch with the analytics pipeline only 80% validated because waiting for the last 20% would have cost the week — and it held up.',
      },
      {
        signal: 'A company that prizes depth wants a story where you went further than asked to understand a root cause.',
        example:
          'You were asked to bump a timeout to stop an alert from firing, and instead you traced it three services upstream to a connection-pool leak nobody had flagged.',
      },
      {
        signal:
          'A company that prizes openness wants a story where you surfaced a number or a mistake you could have kept quiet.',
        example:
          'You told your manager the A/B test you shipped came back flat, not a win, before anyone asked — even though the dashboard could have been read either way.',
      },
    ],
  },
];
