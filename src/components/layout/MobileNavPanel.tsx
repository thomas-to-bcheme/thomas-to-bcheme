'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { NAV_LINKS } from '@/constants/site';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

interface MobileNavPanelProps {
  onNavigate: () => void;
}

/**
 * Mobile nav — renders as a second row inside SiteHeader's own sticky
 * <header>, so it inherits the header's stacking (sticky top-0 z-50) with no
 * extra positioning/z-index work. The "Interview" group uses the same native
 * <details>/<summary> disclosure FaqAccordionItem already establishes in
 * this codebase, rather than introducing a second dropdown primitive.
 */
export default function MobileNavPanel({ onNavigate }: MobileNavPanelProps) {
  const pathname = usePathname();

  const linkClass = (isActive: boolean) =>
    `block rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${FOCUS_RING} ${
      isActive
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white'
    }`;

  return (
    <nav
      id="mobile-nav-panel"
      aria-label="Mobile"
      className="sm:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-1"
    >
      {NAV_LINKS.map((link) => {
        if (link.type === 'link') {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavigate}
              className={linkClass(isActive)}
            >
              {link.label}
            </Link>
          );
        }

        const isGroupActive = link.items.some((item) => pathname === item.href);
        return (
          <details key={link.label} className="group" open={isGroupActive}>
            <summary
              className={`flex items-center justify-between gap-2 cursor-pointer list-none rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 [&::-webkit-details-marker]:hidden ${FOCUS_RING} ${
                isGroupActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {link.label}
              <ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="pl-3 mt-1 space-y-1">
              {link.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onNavigate}
                    className={linkClass(isActive)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
