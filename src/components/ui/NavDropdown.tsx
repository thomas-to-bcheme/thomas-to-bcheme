'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

interface NavDropdownProps {
  label: string;
  items: { label: string; href: string }[];
}

/**
 * Desktop "Interview" nav dropdown — groups the 4 interview-prep routes
 * behind one top-level trigger so SiteHeader's <nav> doesn't overflow.
 * Built on @radix-ui/react-dropdown-menu, which handles open/close-on-select,
 * Escape, click-outside, arrow-key nav, and focus return for free. Content
 * renders in a Portal, so it's unaffected by the sticky PageSectionNav bar
 * (z-10) each interview-prep page renders directly below the header.
 */
export default function NavDropdown({ label, items }: NavDropdownProps) {
  const pathname = usePathname();
  const isGroupActive = items.some((item) => pathname === item.href);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'group relative shrink-0 flex items-center gap-1 whitespace-nowrap hover:text-blue-600 transition-colors duration-200 rounded-sm outline-none',
          FOCUS_RING,
          isGroupActive ? 'text-blue-600 dark:text-blue-400' : '',
        )}
      >
        {label}
        <ChevronDown
          size={14}
          className="transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
        {isGroupActive && (
          <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={12}
          className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-lg shadow-black/5 p-1.5"
        >
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <DropdownMenu.Item key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 outline-none cursor-pointer',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white data-[highlighted]:bg-zinc-50 dark:data-[highlighted]:bg-zinc-900',
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
