import type { JobListing } from '@/types/jobs';

function formatPostedDate(postedDate: string | null): string | null {
  if (!postedDate) return null;
  const parsed = new Date(postedDate);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const JobCard = ({ job }: { job: JobListing }) => {
  const postedDate = formatPostedDate(job.postedDate);

  return (
    <div className="card-base p-5 flex flex-col h-full space-y-3">
      <h5 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
        {job.title}
      </h5>

      {job.description && (
        <p className="text-sm text-subtle line-clamp-4">{job.description}</p>
      )}

      <div className="flex-1" />

      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-subtle">
        {postedDate ? `Posted ${postedDate}` : 'Posting date unavailable'}
      </div>
    </div>
  );
};

export default JobCard;
