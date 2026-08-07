import Link from 'next/link';
import { BentoGrid } from '@/components/layout/BentoGrid';
import JobCard from '@/components/features/JobCard';
import type { JobListing } from '@/types/jobs';

interface JobBoardProps {
  jobs: JobListing[];
  /** True when the current range/company filters differ from the default view. */
  isFiltered: boolean;
}

const JobBoard = ({ jobs, isFiltered }: JobBoardProps) => {
  if (jobs.length === 0) {
    return (
      <div className="card-base p-8 text-center space-y-2">
        <p className="text-sm text-subtle">
          {isFiltered
            ? 'No roles match these filters right now.'
            : 'No open roles posted right now — check back soon.'}
        </p>
        {isFiltered && (
          <Link
            href="/jobs"
            className="inline-block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
          >
            Clear filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <BentoGrid className="auto-rows-fr" fillLastRow>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </BentoGrid>
  );
};

export default JobBoard;
