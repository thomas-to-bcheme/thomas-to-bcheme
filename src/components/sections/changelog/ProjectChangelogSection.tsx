import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LATEST_CHANGELOG_VERSION } from '@/constants/changelog';
import type { ChangelogProject } from '@/constants/changelog';
import ChangelogEntryCard, {
  type ChangelogEntryEmphasis,
} from '@/components/sections/changelog/ChangelogEntryCard';
import ProjectFaqList from '@/components/sections/changelog/ProjectFaqList';

interface ProjectChangelogSectionProps {
  project: ChangelogProject;
}

/**
 * Given one ChangelogProject: heading, description, mini version history
 * (each entry's emphasis computed against LATEST_CHANGELOG_VERSION and its
 * position within this project's own entries), and a per-project FAQ list.
 */
const ProjectChangelogSection = ({ project }: ProjectChangelogSectionProps) => {
  const Icon = project.icon;

  return (
    <section id={project.id} className="scroll-mt-24">
      <div className="mb-6">
        <span className="text-micro text-zinc-400 block mb-2">Project</span>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {project.name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
              {project.tagline}
            </p>
          </div>
          <span className="hidden sm:flex shrink-0 h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
            <Icon size={20} className="text-blue-600 dark:text-blue-400" />
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {project.description}
        </p>
        {project.route && (
          <Link
            href={project.route}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
          >
            Open {project.name}
            <ArrowUpRight size={15} />
          </Link>
        )}
      </div>

      <div className="space-y-6">
        {project.entries.map((entry, index) => {
          const emphasis: ChangelogEntryEmphasis =
            entry.version === LATEST_CHANGELOG_VERSION
              ? 'site-current'
              : index === 0
                ? 'project-latest'
                : 'past';

          return <ChangelogEntryCard key={`${project.id}-${entry.version}`} entry={entry} emphasis={emphasis} />;
        })}
      </div>

      <ProjectFaqList projectId={project.id} />
    </section>
  );
};

export default ProjectChangelogSection;
