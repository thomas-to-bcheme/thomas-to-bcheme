import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import InterviewPhaseTopicCard from '@/components/sections/behavioural/InterviewPhaseTopicCard';
import { AFTER_INTERVIEW_TOPICS } from '@/constants/behavioural/nailingTheInterview';

const EXTERNAL_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

/**
 * Ch.14 "Nailing the Interview" — the after-the-interview half: capturing
 * what you learned while it's fresh, and the closing throughline for the
 * whole chapter (structure as foundation, conversation on top of it).
 * Synthesized in this site's own voice from ByteByteGo's chapter — see
 * `src/constants/behavioural/nailingTheInterview.ts` for the underlying data.
 */
const AfterInterviewSection = () => (
  <section id="nailing-after" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="Ch.14 — Nailing the Interview" title="After the interview" />

    <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      Every interview, good or bad, is raw material for the next one — the discipline is capturing
      what happened while it&apos;s still fresh instead of just moving on. Drawn from{' '}
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
      {AFTER_INTERVIEW_TOPICS.map((topic) => (
        <InterviewPhaseTopicCard key={topic.id} topic={topic} />
      ))}
    </div>
  </section>
);

export default AfterInterviewSection;
