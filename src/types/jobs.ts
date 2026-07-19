import { z } from 'zod';

// Column shapes are provisional, based on the sketch in system_design_docs/database.md.
// Confirm against the microservice's actual `jobs` table (information_schema.columns)
// before relying on this in production — see src/lib/db/jobs.ts.
export const JobPostingSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  remote: z.boolean().nullable(),
  url: z.string().url(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  salaryCurrency: z.string().nullable(),
  skills: z.array(z.string()),
  datePosted: z.string(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

// Minimal projection shown on the Job Board page: title, description, posted date only.
// `id` coerces to string since the primary key's underlying SQL type (serial vs. text/uuid)
// hasn't been confirmed yet — see src/app/jobs/query.tsx.
export const JobListingSchema = z.object({
  id: z.coerce.string(),
  title: z.string(),
  description: z.string().nullable(),
  postedDate: z.string().nullable(),
});

export type JobListing = z.infer<typeof JobListingSchema>;
