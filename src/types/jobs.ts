import { z } from 'zod';

// Confirmed against the live "PORTFOLIO".roles table: job_id, title, url,
// company, posted_date, resume_pdf_path, applications_accepted_until. `id`
// coerces to string since job_id's underlying SQL type (serial vs. text/uuid)
// isn't pinned down, but the column set itself is authoritative — see
// src/lib/db/jobs.ts for the query.
// `company` is nullable — the microservice doesn't guarantee every posting
// has one backfilled, and the job-board filter treats a null company as "not
// shown in the company dropdown" rather than crashing on parse.
// `resumePdfPath` is a bare Vercel Blob pathname (not a fetchable URL on its
// own — the store is private) or null when no resume was attached to the
// posting; see src/app/api/jobs/resume/route.ts for how it's resolved to a
// download.
// `applicationsAcceptedUntil` is NVIDIA-only (always null for Apple rows) and
// is itself frequently null even for NVIDIA — the upstream microservice only
// populates it when a posting's description contains a parseable "Applications
// for this job will be accepted at least until <date>" sentence. It's a
// stated floor, not a hard cutoff (the posting may still be open past this
// date) — see JobCard.tsx for how that's phrased to the visitor.
export const JobListingSchema = z.object({
  id: z.coerce.string(),
  title: z.string(),
  url: z.string().url(),
  company: z.string().nullable(),
  postedDate: z.string().nullable(),
  resumePdfPath: z.string().nullable(),
  applicationsAcceptedUntil: z.string().nullable(),
});

export type JobListing = z.infer<typeof JobListingSchema>;
