import type { JobListing } from '@/types/jobs';
import { createResumeDownloadUrl } from '@/lib/auth/resumeToken';
import { NVIDIA_COMPANY_NAME } from '@/lib/jobs/constants';

// Shared by postedDate and applicationsAcceptedUntil — both are date-only
// ISO strings (YYYY-MM-DD) from Postgres. Parsing as UTC midnight and
// slicing the UTC ISO string back out never shifts the day across a local
// timezone boundary, unlike using local getters on a date-only source.
function formatIsoDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

const JobCard = ({ job }: { job: JobListing }) => {
  const postedDate = formatIsoDate(job.postedDate);
  // NVIDIA-only, and null even for NVIDIA unless the posting's description
  // had a parseable deadline sentence — see JobListingSchema's doc comment.
  // Phrased as "at least until", not "closes on", since the upstream source
  // sentence is a stated floor, not a hard cutoff — the posting may still be
  // open past this date.
  const applicationsAcceptedUntil = formatIsoDate(job.applicationsAcceptedUntil);

  // True exactly when getFilteredJobs()'s effective-date CASE (src/lib/db/
  // jobs.ts) sourced this row's postedDate from applications_accepted_until
  // rather than posted_date — i.e. an NVIDIA row with a parsed deadline.
  // job.postedDate IS the deadline in that case, so "Posted <date>" would
  // misdescribe it; the primary line is relabeled instead, and the old
  // second line is dropped since it would just repeat the same date.
  const usesAcceptedUntilLabel = job.company === NVIDIA_COMPANY_NAME && applicationsAcceptedUntil !== null;

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

      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-subtle space-y-0.5">
        {usesAcceptedUntilLabel ? (
          <p>Accepting applications at least until {applicationsAcceptedUntil}</p>
        ) : (
          <p>{postedDate ? `Posted ${postedDate}` : 'Posting date unavailable'}</p>
        )}
      </div>
    </div>
  );
};

export default JobCard;
