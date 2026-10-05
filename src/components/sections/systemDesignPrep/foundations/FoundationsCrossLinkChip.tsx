import type { FoundationsCrossLink } from '@/constants/systemDesignPrep/foundations';

const CHIP_CLASS =
  'tag-blue inline-block hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/** In-page cross-link chip — reuses SystemDesignQuestionCard's tag-blue ripple-chip style. */
const FoundationsCrossLinkChip = ({ label, href }: FoundationsCrossLink) => (
  <a href={href} className={CHIP_CLASS}>
    {label}
  </a>
);

export default FoundationsCrossLinkChip;
