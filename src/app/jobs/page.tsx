import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import JobBoard from '@/components/features/JobBoard';
import JobFilters from '@/components/features/JobFilters';
import JobPagination from '@/components/features/JobPagination';
import { getJobListings } from './query';
import { getJobCompanies, type JobsPageResult } from '@/lib/db/jobs';
import { parseJobsQueryParams, buildJobsSearch, type JobsQueryParams } from '@/lib/jobs/queryParams';

// This page reads `searchParams` (the date-range/company/page filters), so
// Next.js dynamically renders it per request regardless of any `revalidate`
// export — the previous `export const revalidate = 1800` (ISR) is gone
// because it would be dead/misleading config now that results vary by
// visitor-supplied filters. Each request now runs one filtered, paginated
// query (smaller than the old full-table fetch this replaced), so this is
// not a regression against the zero-cost/free-tier constraint.

export const metadata: Metadata = {
  title: 'Job Board — Thomas To',
  description: 'Open roles sourced live from a private job-matching microservice.',
};

interface JobsPageProps {
  searchParams: Promise<{ range?: string; company?: string; q?: string; pageSize?: string; page?: string }>;
}

function logJobsError(message: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: errorMessage,
    })
  );
}

async function loadJobsPage(params: JobsQueryParams): Promise<JobsPageResult> {
  try {
    return await getJobListings(params);
  } catch (error) {
    logJobsError('Failed to fetch jobs from database', error);
    return { jobs: [], page: params.page, totalPages: 1, totalCount: 0 };
  }
}

async function loadCompanyOptions(): Promise<string[]> {
  try {
    return await getJobCompanies();
  } catch (error) {
    logJobsError('Failed to fetch job companies from database', error);
    return [];
  }
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const resolvedSearchParams = await searchParams;
  const urlSearchParams = new URLSearchParams();
  if (resolvedSearchParams.range) urlSearchParams.set('range', resolvedSearchParams.range);
  if (resolvedSearchParams.company) urlSearchParams.set('company', resolvedSearchParams.company);
  if (resolvedSearchParams.q) urlSearchParams.set('q', resolvedSearchParams.q);
  if (resolvedSearchParams.pageSize) urlSearchParams.set('pageSize', resolvedSearchParams.pageSize);
  if (resolvedSearchParams.page) urlSearchParams.set('page', resolvedSearchParams.page);
  const params = parseJobsQueryParams(urlSearchParams);

  const [jobsResult, companyOptions] = await Promise.all([
    loadJobsPage(params),
    loadCompanyOptions(),
  ]);

  // Redirect to the real last page when the requested page is out of range —
  // keeps the address bar honest instead of showing "page 5" while quietly
  // rendering page 2's content, and self-heals stale/hand-edited links.
  // Gated on totalCount > 0 so a database failure (which reports totalCount:
  // 0, page: unclamped, via loadJobsPage's catch above) never gets
  // misread as "page out of range" and silently redirected away — it falls
  // through to JobBoard's empty state instead, same as before this change.
  if (jobsResult.totalCount > 0 && params.page > jobsResult.totalPages) {
    redirect(buildJobsSearch({ ...params, page: jobsResult.totalPages }));
  }

  // pageSize is deliberately excluded — it only changes LIMIT, never which
  // rows match, so a page-size choice alone shouldn't trigger "Clear filters"
  // copy that implies the WHERE clause is why results are empty/narrow.
  const isFiltered = params.range !== 'recent' || params.company !== null || params.search !== null;

  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="mt-4">
          <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
            Job Board
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            Open roles, pulled <span className="gradient-text-blue">live</span>
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <JobFilters params={params} companyOptions={companyOptions} />
        <JobBoard jobs={jobsResult.jobs} isFiltered={isFiltered} />
        <JobPagination
          params={params}
          totalPages={jobsResult.totalPages}
          totalCount={jobsResult.totalCount}
          resultCount={jobsResult.jobs.length}
        />
      </div>

      <Footer />
    </div>
  );
}
