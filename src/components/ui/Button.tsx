'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Button - Reusable button component with consistent variants (V3)
 * Variants: primary, secondary, ghost
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Render as anchor tag when href is provided */
  href?: string;
  /** Open link in new tab */
  external?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-blue-600 hover:bg-blue-700 text-white',
    'shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40',
    'focus-visible:ring-blue-500'
  ),
  secondary: cn(
    'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700',
    'text-zinc-900 dark:text-white',
    'border border-zinc-200 dark:border-zinc-700',
    'focus-visible:ring-zinc-500'
  ),
  ghost: cn(
    'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800',
    'text-zinc-700 dark:text-zinc-300',
    'focus-visible:ring-zinc-500'
  ),
};

const baseStyles = cn(
  'inline-flex items-center justify-center gap-2',
  'px-6 py-3 rounded-lg font-medium text-sm',
  'transition-all duration-200',
  'hover:scale-[1.02] active:scale-95',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:opacity-50 disabled:pointer-events-none'
);

export default function Button({
  variant = 'primary',
  href,
  external = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const combinedClassName = cn(baseStyles, variantStyles[variant], className);

  // Render as anchor if href is provided
  if (href) {
    return (
      <a
        href={href}
        className={combinedClassName}
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {children}
      </a>
    );
  }

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}
