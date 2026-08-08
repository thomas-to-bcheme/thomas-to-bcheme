import React from 'react';
import { HelpCircle } from 'lucide-react';
import { PROJECT_FAQ_ITEMS } from '@/constants/faq';
import type { ProjectId } from '@/constants/changelog';
import FaqAccordionItem from '@/components/ui/FaqAccordionItem';

interface ProjectFaqListProps {
  projectId: ProjectId;
}

/**
 * Filters PROJECT_FAQ_ITEMS by projectId and renders each via the shared
 * FaqAccordionItem — always isPlaceholder here, since no real interview Q&A
 * exists yet for any project.
 */
const ProjectFaqList = ({ projectId }: ProjectFaqListProps) => {
  const items = PROJECT_FAQ_ITEMS.filter((item) => item.projectId === projectId);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <span className="text-micro text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
        <HelpCircle size={12} className="stroke-[2.5]" /> Interview FAQ
      </span>
      <div className="space-y-3">
        {items.map((item) => (
          <FaqAccordionItem
            key={item.id}
            question={item.question}
            answer={item.answer}
            isPlaceholder={item.isPlaceholder}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectFaqList;
