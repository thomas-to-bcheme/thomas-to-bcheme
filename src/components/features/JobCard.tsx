import type { JobListing } from '@/types/jobs';
import { createResumeDownloadUrl } from '@/lib/auth/resumeToken';

function formatPostedDate(postedDate: string | null): string | null {
  if (!postedDate) return null;
  const parsed = new Date(postedDate);
  if (Number.isNaN(parsed.getTime())) return null;

  // ISO 8601 date (YYYY-MM-DD), e.g. "2026-06-18". Date-only source strings
  // parse as UTC midnight, so slicing the UTC ISO string back out never
  // shifts the day across a local timezone boundary.
  return parsed.toISOString().slice(0, 10);
}

const JobCard = ({ job }: { job: JobListing }) => {
  const postedDate = formatPostedDate(job.postedDate);

  return (
    <div className="card-base p-5 flex flex-col h-full space-y-3">
      <div>
        <h5 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
          {job.title}
        </h5>
        {job.company && <p className="text-sm text-subtle mt-0.5">{job.company}</p>}
      </div>

      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm w-fit"
      >
        View job →
      </a>

      {job.resumePdfPath && (
        <a
          href={createResumeDownloadUrl(job.id)}
          className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm w-fit"
        >
          Download resume (PDF) ↓
        </a>
      )}

      <div className="flex-1" />

      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-subtle">
        {postedDate ? `Posted ${postedDate}` : 'Posting date unavailable'}
      </div>
    </div>
  );
};

export default JobCard;
