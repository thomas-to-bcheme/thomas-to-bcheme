import { z } from 'zod';

// Confirmed against the live "PORTFOLIO".roles table: job_id, title, url,
// posted_date, resume_pdf_path. `id` coerces to string since job_id's
// underlying SQL type (serial vs. text/uuid) isn't pinned down, but the
// column set itself is authoritative — see src/lib/db/jobs.ts for the query.
// `resumePdfPath` is a bare Vercel Blob pathname (not a fetchable URL on its
// own — the store is private) or null when no resume was attached to the
// posting; see src/app/api/jobs/resume/route.ts for how it's resolved to a
// download.
export const JobListingSchema = z.object({
  id: z.coerce.string(),
  title: z.string(),
  url: z.string().url(),
  postedDate: z.string().nullable(),
  resumePdfPath: z.string().nullable(),
});

export type JobListing = z.infer<typeof JobListingSchema>;
