import { MapPin, Wifi, ExternalLink } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { JobPosting } from '@/types/jobs';

function formatSalary(job: JobPosting): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: job.salaryCurrency ?? 'USD',
    maximumFractionDigits: 0,
  });

  if (job.salaryMin != null && job.salaryMax != null) {
    return `${formatter.format(job.salaryMin)} – ${formatter.format(job.salaryMax)}`;
  }
  return formatter.format(job.salaryMin ?? job.salaryMax!);
}

const JobCard = ({ job }: { job: JobPosting }) => {
  const salary = formatSalary(job);
  const postedDate = new Date(job.datePosted).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="card-base p-5 flex flex-col h-full space-y-4">
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <h5 className="text-base font-bold text-zinc-900 dark:text-white mb-1 leading-tight">
          {job.title}
        </h5>
        <p className="text-xs font-mono text-blue-600 dark:text-blue-400">{job.company}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {job.remote && (
          <Badge color="green" icon={Wifi}>
            Remote
          </Badge>
        )}
        {job.location && (
          <Badge color="zinc" icon={MapPin}>
            {job.location}
          </Badge>
        )}
      </div>

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <span key={skill} className="tag-blue">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
        <div className="text-xs text-subtle">
          {salary && <p className="font-bold text-emerald-600 dark:text-emerald-400">{salary}</p>}
          <p>Posted {postedDate}</p>
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400
                     hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                     focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          Apply <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
};

export default JobCard;
