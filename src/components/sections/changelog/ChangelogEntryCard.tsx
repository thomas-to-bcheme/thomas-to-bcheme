import React from 'react';
import Link from 'next/link';
import { Tag, GitCommit, Sparkles, Lightbulb, Github, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import type { ChangelogEntry, ChangelogLinkType } from '@/constants/changelog';

// Local link-type map — deliberately not imported from Roadmap.tsx's
// (unexported, out-of-scope) LINK_CONFIG.
const LINK_TYPE_ICON: Record<ChangelogLinkType, React.ElementType> = {
  route: ArrowUpRight,
  github: Github,
};

/**
 * Once entries are split per project, each project's own newest entry is
 * "latest for that project," but only one entry site-wide is the actual
 * SITE_VERSION. Showing four different "Current" badges would be
 * misleading, so entries render with one of three emphasis levels instead
 * of a boolean isLatest:
 *  - 'site-current':   entry.version === LATEST_CHANGELOG_VERSION — the
 *                       strong blue/scale/Sparkles "Current" treatment.
 *  - 'project-latest': index 0 within this project's own entries — a
 *                       lighter "Latest for this project" tag, no sparkle.
 *  - 'past':           unchanged, non-latest styling.
 */
export type ChangelogEntryEmphasis = 'site-current' | 'project-latest' | 'past';

const EntryLinks = ({ links }: { links: NonNullable<ChangelogEntry['links']> }) => (
  <div className="mt-4 flex flex-wrap gap-2">
    {links.map((link) => {
      const LinkIcon = LINK_TYPE_ICON[link.type];
      const chipClass = cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600',
      );

      if (link.type === 'route') {
        return (
          <Link key={link.url} href={link.url} className={chipClass}>
            <LinkIcon size={11} />
            {link.label}
          </Link>
        );
      }

      return (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={chipClass}
        >
          <LinkIcon size={11} />
          {link.label}
        </a>
      );
    })}
  </div>
);

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  emphasis: ChangelogEntryEmphasis;
}

const ChangelogEntryCard = ({ entry, emphasis }: ChangelogEntryCardProps) => {
  const isSiteCurrent = emphasis === 'site-current';
  const isProjectLatest = emphasis === 'project-latest';
  const isEmphasized = isSiteCurrent || isProjectLatest;

  return (
    <div
      className={cn(
        'card-base p-6 transition-all duration-300 relative overflow-hidden',
        isSiteCurrent
          ? 'dark:bg-zinc-900 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]'
          : 'bg-zinc-50 dark:bg-zinc-900/50 border-blue-200 dark:border-blue-900/30 opacity-90 hover:opacity-100',
      )}
    >
      {isSiteCurrent && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge color="blue" variant="outline" icon={Tag}>
              {entry.version}
            </Badge>
            {isSiteCurrent && (
              <span className="inline-flex items-center gap-1 text-micro text-blue-600 dark:text-blue-400">
                <Sparkles size={12} className="stroke-[2.5]" /> Current
              </span>
            )}
            {isProjectLatest && (
              <span className="inline-flex items-center gap-1 text-micro text-zinc-400 dark:text-zinc-500">
                Latest for this project
              </span>
            )}
          </div>
          <h3
            className={cn(
              'text-lg font-bold',
              isEmphasized ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300',
            )}
          >
            {entry.title}
          </h3>
        </div>
        <time dateTime={entry.date} className="text-micro text-zinc-400 whitespace-nowrap">
          {entry.date}
        </time>
      </div>

      {/* Summary */}
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
        {entry.summary}
      </p>

      {/* What Shipped */}
      <div className="mb-4">
        <span className="text-micro text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
          <GitCommit size={12} className="stroke-[2.5]" /> What Shipped
        </span>
        <ul className="space-y-1.5">
          {entry.changes.map((change) => (
            <li
              key={change}
              className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700"
            >
              {change}
            </li>
          ))}
        </ul>
      </div>

      {/* Lessons Learned — amber, visually distinct from "what shipped" */}
      <div className="rounded-lg p-3 text-xs border bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800 text-amber-900 dark:text-amber-200">
        <span className="font-bold flex items-center gap-1.5 mb-2 uppercase text-xs opacity-80">
          <Lightbulb size={12} className="stroke-[2.5]" /> Lessons Learned
        </span>
        <ul className="space-y-2">
          {entry.lessonsLearned.map((lesson) => (
            <li key={lesson} className="leading-relaxed">
              {lesson}
            </li>
          ))}
        </ul>
      </div>

      {entry.links && entry.links.length > 0 && <EntryLinks links={entry.links} />}
    </div>
  );
};

export default ChangelogEntryCard;
