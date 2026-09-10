import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

interface AiMlPageShellProps {
  eyebrow: string;
  title: string;
  /** Rendered in the blue gradient, appended after `title`. */
  titleAccent?: string;
  lede: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
}

/**
 * The page chrome shared by all five /ai-ml route files.
 *
 * SiteHeader is not in src/app/layout.tsx — every page in this repo renders it
 * itself — so without this shell the same forty lines of header/back-link/lede
 * markup would be copied five times and drift.
 */
const AiMlPageShell = ({
  eyebrow,
  title,
  titleAccent,
  lede,
  backHref,
  backLabel,
  children,
}: AiMlPageShellProps) => (
  <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
    <SiteHeader />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
      <Link
        href={backHref}
        className={`inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-sm ${FOCUS_RING}`}
      >
        <ArrowLeft size={15} /> {backLabel}
      </Link>

      <div className="mt-4">
        <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
          {eyebrow}
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
          {title}
          {titleAccent && <span className="gradient-text-blue"> {titleAccent}</span>}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {lede}
        </p>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      <main className="min-w-0">{children}</main>
    </div>

    <Footer />
  </div>
);

export default AiMlPageShell;
