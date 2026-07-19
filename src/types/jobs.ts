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
