import React from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQ_ITEMS } from '@/constants/faq';
import type { FaqCategory, FaqItem } from '@/constants/faq';
import FaqAccordionItem from '@/components/ui/FaqAccordionItem';

// Fixed display order — not derived from data, since category grouping is a
// presentation concern independent of FAQ_ITEMS' declaration order.
const CATEGORY_ORDER: FaqCategory[] = [
  'Architecture & Cost',
  'AI/Agents',
  'Job Search Strategy',
];

const FaqCategoryGroup = ({ category, items }: { category: FaqCategory; items: FaqItem[] }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <span className="text-micro text-zinc-500 dark:text-zinc-400 block">{category}</span>
      <div className="space-y-3">
        {items.map((item) => (
          <FaqAccordionItem key={item.id} question={item.question} answer={item.answer} />
        ))}
      </div>
    </div>
  );
};

const FaqSection = () => {
  return (
    <section id="faq" className="py-16 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">
            <HelpCircle size={12} /> Frequently Asked Questions
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
            Questions about the <span className="gradient-text-blue">architecture</span>
          </h2>
        </div>

        {/* Category Groups */}
        <div className={cn('space-y-10')}>
          {CATEGORY_ORDER.map((category) => (
            <FaqCategoryGroup
              key={category}
              category={category}
              items={FAQ_ITEMS.filter((item) => item.category === category)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
