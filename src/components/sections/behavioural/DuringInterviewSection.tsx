import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import InterviewPhaseTopicCard from '@/components/sections/behavioural/InterviewPhaseTopicCard';
import { DURING_INTERVIEW_TOPICS } from '@/constants/behavioural/nailingTheInterview';

const EXTERNAL_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

/**
 * Ch.14 "Nailing the Interview" — the live-execution half: reading
 * interruptions and follow-ups correctly, following the interviewer's lead,
 * recovering when a question catches you unprepared, and pacing yourself
 * across a multi-round loop. Synthesized in this site's own voice from
 * ByteByteGo's chapter — see
 * `src/constants/behavioural/nailingTheInterview.ts` for the underlying data.
 */
const DuringInterviewSection = () => (
  <section id="nailing-during" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="Ch.14 — Nailing the Interview" title="During the interview" />

    <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      Once you&apos;re in the room, the job shifts from recitation to real-time reading — of the
      interviewer&apos;s follow-ups, their engagement, and how much detail a given moment actually
      calls for. Drawn from{' '}
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
      {DURING_INTERVIEW_TOPICS.map((topic) => (
        <InterviewPhaseTopicCard key={topic.id} topic={topic} />
      ))}
    </div>
  </section>
);

export default DuringInterviewSection;
