'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X } from 'lucide-react';

import { NAV_LINKS, SITE_OWNER_EMAIL } from '@/constants/site';
import NavDropdown from '@/components/ui/NavDropdown';
import MobileNavPanel from '@/components/layout/MobileNavPanel';

// Shared focus-visible ring, matching the convention used across the site.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

/**
 * SiteHeader — the sticky top nav, shared by the homepage and every subpage.
 * NAV_LINKS is a mix of plain route links and one dropdown group ("Interview",
 * covering the 4 interview-prep routes) — grouping those 4 behind a single
 * trigger keeps the header at 6 top-level items, which is what actually fixes
 * the overflow (the previous 10-flat-links layout needed a hidden horizontal
 * scrollbar to avoid clipping). That scrollbar is kept below as a defensive
 * fallback only — it's no longer load-bearing.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const closeMobile = () => setMobileOpen(false);

  // Route change closes the mobile panel (covers link clicks plus back/forward nav).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape closes the mobile panel and returns focus to its toggle button.
  // Click outside the header also closes it.
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mobileOpen]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-zinc-200 dark:border-zinc-800 transition-all duration-300 supports-[backdrop-filter]:bg-white/60"
    >
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

        {/* Desktop nav — kept horizontally scrollable (no-scrollbar) as a
            defensive fallback only; at 6 top-level entries it shouldn't need
            to scroll on common laptop widths. */}
        <nav className="hidden sm:flex min-w-0 items-center gap-5 overflow-x-auto overflow-y-visible no-scrollbar text-sm font-medium text-zinc-500 dark:text-zinc-400 py-1">
          {NAV_LINKS.map((link) => {
            if (link.type === 'group') {
              return <NavDropdown key={link.label} label={link.label} items={link.items} />;
            }
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative shrink-0 whitespace-nowrap hover:text-blue-600 transition-colors duration-200 rounded-sm ${FOCUS_RING} ${
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

        <div className="flex items-center gap-3">
          <a
            href={`mailto:${SITE_OWNER_EMAIL}`}
            className={`flex items-center gap-2 text-xs bg-blue-600 text-white dark:bg-blue-500 px-4 py-2 rounded-full font-bold hover:bg-blue-700 dark:hover:bg-blue-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-blue-500/25 group ${FOCUS_RING}`}
          >
            Contact
            <ArrowRight size={16} className="opacity-75 group-hover:translate-x-1 transition-transform duration-200" />
          </a>

          {/* Mobile menu toggle — nav is `hidden` below `sm`, this is its only fallback. */}
          <button
            ref={mobileToggleRef}
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className={`sm:hidden flex items-center justify-center h-9 w-9 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-200 ${FOCUS_RING}`}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && <MobileNavPanel onNavigate={closeMobile} />}
    </header>
  );
}
