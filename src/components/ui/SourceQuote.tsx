import React from 'react';
import { Quote } from 'lucide-react';

interface SourceQuoteProps {
  /** Eyebrow label above the quote, e.g. "From the Course". */
  label: string;
  /** The quoted text — rendered inside curly quotes, don't add your own. */
  quote: string;
  /** e.g. "ByteByteGo — Taking Initiative" or "— Thomas To". */
  attribution: string;
  /** When present, wraps the attribution line in an outbound link. */
  href?: string;
  color?: 'blue' | 'emerald' | 'purple';
  icon?: React.ElementType;
}

const COLOR_CLASSES = {
  blue: {
    box: 'border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10',
    label: 'text-blue-700 dark:text-blue-400',
    quote: 'text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    attribution: 'text-blue-700 dark:text-blue-400 hover:underline',
  },
  emerald: {
    box: 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10',
    label: 'text-emerald-700 dark:text-emerald-400',
    quote: 'text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    attribution: 'text-emerald-700 dark:text-emerald-400 hover:underline',
  },
  purple: {
    box: 'border-purple-100 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-900/10',
    label: 'text-purple-700 dark:text-purple-400',
    quote: 'text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700',
    attribution: 'text-purple-700 dark:text-purple-400 hover:underline',
  },
} as const;

/**
 * Shared pull-quote/callout primitive, extracted from an idiom previously
 * copy-pasted 3x across ChangelogHeaderEssay, SweCompassSection, and
 * SystemDesignCompassIntro (always attributed "— Thomas To", blue or
 * emerald). Generalized here with an `attribution`/`href` pair so it also
 * works for a short, genuinely-quoted fragment attributed to an external
 * source, outbound-linked back to it — e.g. the /behavioural page's
 * ByteByteGo citations. Migrating the 3 existing call sites to use this is
 * intentionally out of scope for that migration; this is net-new usage only.
 */
const SourceQuote = ({ label, quote, attribution, href, color = 'blue', icon: Icon = Quote }: SourceQuoteProps) => {
  const colors = COLOR_CLASSES[color];
  return (
    <div className={`rounded-xl border p-5 sm:p-6 ${colors.box}`}>
      <span className={`flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider mb-3 ${colors.label}`}>
        <Icon size={12} className="stroke-[2.5]" /> {label}
      </span>
      <blockquote className={`text-sm sm:text-base italic leading-relaxed border-l-2 pl-4 ${colors.quote}`}>
        &quot;{quote}&quot;
      </blockquote>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-block text-xs font-semibold mt-3 ${colors.attribution}`}
        >
          {attribution}
        </a>
      ) : (
        <p className={`text-xs font-semibold mt-3 ${colors.label}`}>{attribution}</p>
      )}
    </div>
  );
};

export default SourceQuote;
