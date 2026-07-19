import { BentoGrid } from '@/components/layout/BentoGrid';
import JobCard from '@/components/features/JobCard';
import type { JobPosting } from '@/types/jobs';

const JobBoard = ({ jobs }: { jobs: JobPosting[] }) => {
  if (jobs.length === 0) {
    return (
      <div className="card-base p-8 text-center">
        <p className="text-sm text-subtle">No open roles posted right now — check back soon.</p>
      </div>
    );
  }

  return (
    <BentoGrid className="auto-rows-fr">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </BentoGrid>
  );
};

export default JobBoard;
