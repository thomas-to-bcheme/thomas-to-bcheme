import Link from 'next/link';

/**
 * Global 404 — the render target for every `notFound()` call in the app.
 * Required by the /ai-ml dynamic routes (`dynamicParams = false` plus an
 * explicit `notFound()` guard), but deliberately global rather than scoped to
 * that segment: any mistyped URL on the site should land somewhere styled
 * rather than on Next's unbranded default. Mirrors src/app/error.tsx's
 * centered-panel layout, in zinc rather than rose since a 404 is not a fault.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black font-sans text-zinc-900 dark:text-zinc-100">
      <div className="text-center space-y-6 px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">
          404
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          This page doesn&apos;t exist
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          The link may be out of date, or the address mistyped.
        </p>
        <div>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
