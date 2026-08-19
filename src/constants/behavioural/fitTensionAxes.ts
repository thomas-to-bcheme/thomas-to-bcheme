/**
 * Moved unchanged from the old flat `constants/behavioural.ts`.
 */

export interface FitTensionAxis {
  id: string;
  left: string;
  right: string;
  description: string;
  example: string;
}

/**
 * The same story can be a green flag at one company and a red flag at another — these
 * are the 7 recurring axes where that happens. Rendered by MisFitAxesSection.
 * Synthesized from ByteByteGo's "What Companies Are Looking For".
 */
export const FIT_TENSION_AXES: FitTensionAxis[] = [
  {
    id: 'independence-collaboration',
    left: 'Independence',
    right: 'Collaboration',
    description:
      'How you work and how you decide — some places want you to pick up a problem and return with a solution; others want the team built into every step.',
    example:
      'A story where you built something solo end-to-end reads as ownership at an autonomy-first company and as a steamroll risk at a consensus-driven one — and the reverse is just as true.',
  },
  {
    id: 'speed-thoroughness',
    left: 'Speed',
    right: 'Thoroughness',
    description:
      'Whether shipping a rough version fast is judgment or a red flag depends entirely on what breaks if you’re wrong.',
    example:
      'Shipping an MVP and iterating on feedback reads as good instinct at a startup and as recklessness at a company where a bug reaches a hospital chart or a bank balance.',
  },
  {
    id: 'excellence-pragmatism',
    left: 'Excellence',
    right: 'Pragmatism',
    description:
      'Whether you protect the architecture or protect the deadline when the two genuinely conflict.',
    example:
      'Spending two extra weeks on a clean abstraction reads as craft on a platform team and as missing the point on a team shipping against a fixed launch date.',
  },
  {
    id: 'innovation-stability',
    left: 'Innovation',
    right: 'Stability',
    description:
      'Whether you are expected to challenge the existing approach or keep a proven system running without surprises.',
    example:
      'Replacing an established process reads as initiative on a team chasing a new capability and as unnecessary risk on a team maintaining critical infrastructure.',
  },
  {
    id: 'direct-diplomatic',
    left: 'Direct',
    right: 'Diplomatic',
    description: 'Whether blunt, say-it-plainly feedback reads as clarity or as a relationship problem.',
    example:
      'Telling a peer their approach is wrong, in the room, reads as candor at a company that prizes disagree-and-commit and as abrasive at one that protects face carefully.',
  },
  {
    id: 'data-intuition',
    left: 'Data',
    right: 'Intuition',
    description:
      'Whether a decision needs a number behind it, or whether experienced judgment is trusted to stand on its own.',
    example:
      'Running three tests to settle a small decision reads as rigor at a data-driven company and as overkill — even mildly concerning — at one that trusts a senior engineer’s gut.',
  },
  {
    id: 'specialist-generalist',
    left: 'Specialist',
    right: 'Generalist',
    description: 'Whether the org needs deep mastery of one domain or comfort switching across several.',
    example:
      'A story about going deep on one subsystem for years reads as expertise at a large company with dedicated teams and as narrow at a small one that needs you wearing several hats.',
  },
];
