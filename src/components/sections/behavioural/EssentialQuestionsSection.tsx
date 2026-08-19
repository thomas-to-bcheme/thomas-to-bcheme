import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import { ESSENTIAL_QUESTIONS } from '@/constants/behavioural/essentialQuestions';
import EssentialQuestionCard from './EssentialQuestionCard';

const EXTERNAL_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

/**
 * Six-card accordion list for ESSENTIAL_QUESTIONS — the questions ByteByteGo
 * flags as showing up in nearly every behavioural interview. Synthesized in
 * this site's own voice from ByteByteGo's "The Essential Questions" chapter —
 * paraphrased, not quoted; cited via the single inline link below rather than
 * SourceQuote, since none of the source notes contain quotable verbatim text.
 */
const EssentialQuestionsSection = () => (
  <section id="essential-questions" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="Ch.04" title="The six questions asked in nearly every interview" />
    <p className="max-w-3xl mb-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      These six show up in some form at almost every company, and — apart from the &ldquo;proud of a
      project&rdquo; question, which still leans on the full HSS structure since you&apos;re choosing your
      own story — they&apos;re meant to be shorter and more direct than the competency stories in the
      previous chapters. See{' '}
      <a
        href="https://bytebytego.com/courses/behavioral-interview/the-essential-questions"
        target="_blank"
        rel="noopener noreferrer"
        className={EXTERNAL_LINK_CLASS}
      >
        ByteByteGo&apos;s &ldquo;The Essential Questions&rdquo;
      </a>{' '}
      for the source course this section is built on.
    </p>
    <div className="space-y-3">
      {ESSENTIAL_QUESTIONS.map((question) => (
        <EssentialQuestionCard key={question.id} question={question} />
      ))}
    </div>
  </section>
);

export default EssentialQuestionsSection;
