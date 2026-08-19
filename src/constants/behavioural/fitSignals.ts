/**
 * Moved unchanged from the old flat `constants/behavioural.ts`.
 */

export interface FitSignalGroup {
  id: 'role-fit' | 'company-fit';
  label: string;
  description: string;
  signals: string[];
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
      'If the role runs on ambiguous requirements, do your stories show you moving before someone hands you clarity?',
      'If the role spans multiple teams, do your stories show you coordinating across a boundary rather than staying inside your own?',
      'If the role rewards fast iteration, do your stories show you shipping something imperfect and adjusting, not polishing before you ship?',
    ],
  },
  {
    id: 'company-fit',
    label: 'Company Fit',
    description:
      'Whether the choices inside your stories match how this company actually rewards behavior — not its stated values, the ones it visibly acts on.',
    signals: [
      'A company that prizes moving fast wants a story where you acted on incomplete information and it worked out.',
      'A company that prizes depth wants a story where you went further than asked to understand a root cause.',
      'A company that prizes openness wants a story where you surfaced a number or a mistake you could have kept quiet.',
    ],
  },
];
