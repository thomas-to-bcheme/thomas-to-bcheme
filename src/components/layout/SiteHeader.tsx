'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { NAV_LINKS, SITE_OWNER_EMAIL } from '@/constants/site';

// Shared focus-visible ring, matching the convention used across the site.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

interface SiteHeaderProps {
  /** Active homepage section id for scroll-spy highlighting (homepage only). */
  activeSection?: string | null;
}

/**
 * SiteHeader — the sticky top nav, shared by the homepage and the System Design
 * route. Section links (#about-me, …) point at `/#section` so they work from any
 * route; the "System Design" route link is highlighted via the current pathname.
 */
export default function SiteHeader({ activeSection }: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-zinc-200 dark:border-zinc-800 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        {/* Logo → home */}
        <Link
          href="/"
          aria-label="Home"
          className={`font-bold text-xl tracking-tighter flex items-center gap-2 group select-none rounded-sm ${FOCUS_RING}`}
        >
          THOMAS
          <span className="text-blue-600 dark:text-blue-500 group-hover:text-blue-700 transition-colors duration-300">
            TO
          </span>
        </Link>

        <nav className="hidden sm:flex gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {NAV_LINKS.map((link) => {
            // Section links highlight via scroll-spy on the homepage; the route
            // link ("System Design") highlights when its path is active.
            const isActive =
              'sectionId' in link
                ? pathname === '/' && activeSection === link.sectionId
                : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative hover:text-blue-600 transition-colors duration-200 rounded-sm ${FOCUS_RING} ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <a
          href={`mailto:${SITE_OWNER_EMAIL}`}
          className={`flex items-center gap-2 text-xs bg-blue-600 text-white dark:bg-blue-500 px-4 py-2 rounded-full font-bold hover:bg-blue-700 dark:hover:bg-blue-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-blue-500/25 group ${FOCUS_RING}`}
        >
          Contact
          <ArrowRight size={16} className="opacity-75 group-hover:translate-x-1 transition-transform duration-200" />
        </a>
      </div>
    </header>
  );
}
