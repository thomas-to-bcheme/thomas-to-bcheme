import React from 'react';

import { STAFF_PLUS_TOPICS } from '@/constants/staffPlus';
import ListeningPrimer from './ListeningPrimer';
import StaffPlusTopicCard from './StaffPlusTopicCard';

/**
 * Senior-to-Staff+ — advice, best practices, and industry standards for nine
 * data-engineering competencies, opened by a shared primer on listening and
 * questioning. The Leadership & Recognition stories above are the evidence.
 */
const StaffPlusSection: React.FC = () => (
  <section id="staff-plus" className="scroll-mt-24">
    <div className="mb-6 max-w-3xl">
      <span className="text-micro text-zinc-400 block mb-2">Senior to Staff+</span>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
        From doing the work to owning the outcome
      </h2>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Staff-level work is judged by the scope of the problems you own and the trust leaders place in your judgment,
        not by tasks completed. For each competency below: what changes, the practices and standards worth knowing,
        how it connects to risk, spend, and financial alignment, and the questions that get past the stated request.
      </p>
    </div>

    <div className="space-y-6">
      <ListeningPrimer />

      <div className="space-y-6">
        {STAFF_PLUS_TOPICS.map((topic) => (
          <StaffPlusTopicCard key={topic.id} topic={topic} />
        ))}
      </div>
    </div>
  </section>
);

export default StaffPlusSection;
