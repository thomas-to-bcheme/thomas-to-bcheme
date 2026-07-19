import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import JobBoard from '@/components/features/JobBoard';
import { getJobs } from '@/lib/db/jobs';

export const revalidate = 1800; // 30 min — matches the site's documented ETL cadence

export const metadata: Metadata = {
  title: 'Job Board — Thomas To',
  description: 'Open roles sourced live from a private job-matching microservice.',
};

export default async function JobsPage() {
  const jobs = await getJobs();

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
        <JobBoard jobs={jobs} />
      </div>

      <Footer />
    </div>
  );
}
