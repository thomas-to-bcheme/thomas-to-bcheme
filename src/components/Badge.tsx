import React from 'react';
import { cn } from '@/lib/utils'; // Import the utility we just made

type BadgeProps = {
  children: React.ReactNode;
  color?: "gradient" | "blue" | "green" | "zinc" | "amber" | "purple" | "red" | "rose";
  variant?: "solid" | "outline" | "glass";
  icon?: React.ElementType;
  href?: string;
  title?: string;
  pulse?: boolean;
  className?: string;
};

const Badge = ({ 
  children, 
  color = "zinc", 
  pulse = false,
  variant = "solid", 
  icon: Icon, 
  href, 
  title, 
  className
}: BadgeProps) => {
  
  // 1. Solid Colors
  const solidColors = {
    gradient: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  };

  // 2. Outline Colors
  const outlineColors = {
    gradient: "bg-transparent text-blue-600 dark:text-blue-400 border-blue-500", 
    blue: "bg-transparent text-blue-700 dark:text-blue-400 border-blue-600/50",
    green: "bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-600/50",
    purple: "bg-transparent text-purple-700 dark:text-purple-400 border-purple-600/50",
    red: "bg-transparent text-red-700 dark:text-red-400 border-red-600/50",
    rose: "bg-transparent text-rose-700 dark:text-rose-400 border-rose-600/50",
    amber: "bg-transparent text-amber-700 dark:text-amber-400 border-amber-600/50",
    zinc: "bg-transparent text-zinc-700 dark:text-zinc-400 border-zinc-600/50",
  };

  // 3. Logic
  const selectedColors = variant === 'outline' ? outlineColors : solidColors;
  const glassEffect = variant === 'glass' ? "backdrop-blur-md bg-opacity-50 dark:bg-opacity-20" : "";
  
  const Component = href ? 'a' : 'span';
  const interactionStyles = href 
    ? "hover:scale-105 hover:shadow-md cursor-pointer active:scale-95" 
    : "hover:scale-105 cursor-default";

  return (
    <Component 
      href={href}
      target={href ? "_blank" : undefined}
      title={title}
      className={cn(
        `px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border flex items-center gap-1.5 transition-all`, 
        selectedColors[color],
        glassEffect,
        interactionStyles,
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
        </span>
      )}

      {Icon && <Icon size={12} className="stroke-[2.5]" />}
      {children}
    </Component>
  );
};

export default Badge;