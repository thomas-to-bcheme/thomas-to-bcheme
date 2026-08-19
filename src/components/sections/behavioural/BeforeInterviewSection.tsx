import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import InterviewPhaseTopicCard from '@/components/sections/behavioural/InterviewPhaseTopicCard';
import { BEFORE_INTERVIEW_TOPICS } from '@/constants/behavioural/nailingTheInterview';

const EXTERNAL_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

/**
 * Ch.14 "Nailing the Interview" — the before-the-interview half: body and
 * mindset prep, what to actually memorize versus let flow live, how to
 * practice conversing rather than reciting, and the final setup checklist.
 * Synthesized in this site's own voice from ByteByteGo's chapter — see
 * `src/constants/behavioural/nailingTheInterview.ts` for the underlying data.
 */
const BeforeInterviewSection = () => (
  <section id="nailing-before" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="Ch.14 — Nailing the Interview" title="Before the interview" />

    <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      Preparation here is less about writing more content and more about knowing what to hold tight
      and what to let flow live — from your sleep the night before, to exactly which pieces of a
      story deserve memorization at all. Drawn from{' '}
      <a
        href="https://bytebytego.com/courses/behavioral-interview/nailing-the-interview"
        target="_blank"
        rel="noopener noreferrer"
        className={EXTERNAL_LINK_CLASS}
      >
        ByteByteGo&rsquo;s Nailing the Interview chapter
      </a>
      .
    </p>

    <div className="grid gap-4 sm:grid-cols-2">
      {BEFORE_INTERVIEW_TOPICS.map((topic) => (
        <InterviewPhaseTopicCard key={topic.id} topic={topic} />
      ))}
    </div>
  </section>
);

export default BeforeInterviewSection;
