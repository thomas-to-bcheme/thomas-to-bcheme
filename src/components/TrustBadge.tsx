import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility, if not, standard string concatenation works

type BadgeVariant = 'success' | 'innovation' | 'compliance' | 'risk';

interface TrustBadgeProps {
  icon: LucideIcon;
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANTS = {
  success: {
    container: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-400"
  },
  risk: {
    // Using Emerald for "Risk Reduction" (Positive)
    container: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-400"
  },
  innovation: {
    container: "border-purple-200 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-900/10 text-purple-700 dark:text-purple-200",
    icon: "text-purple-600 dark:text-purple-400"
  },
  compliance: {
    container: "border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 text-blue-700 dark:text-blue-200",
    icon: "text-blue-600 dark:text-blue-400"
  }
};

const TrustBadge = ({ icon: Icon, label, variant = 'compliance', className }: TrustBadgeProps) => {
  const styles = VARIANTS[variant];

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 select-none",
      "hover:scale-105 hover:shadow-sm hover:brightness-105 cursor-default backdrop-blur-sm",
      styles.container,
      className
    )}>
      <Icon size={14} className={styles.icon} strokeWidth={2.5} />
      <span className="text-xs font-bold uppercase tracking-wide opacity-90">
        {label}
      </span>
    </div>
  );
};

export default TrustBadge;