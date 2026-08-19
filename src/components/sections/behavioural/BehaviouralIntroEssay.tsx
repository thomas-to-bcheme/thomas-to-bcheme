import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';

const EXTERNAL_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

/**
 * Framing essay rendered first on /behavioural, ahead of RoadmapSection —
 * makes the case for why the behavioural round carries as much weight as
 * the technical one now that the technical bar is easy to drill for and
 * fairly standardized across companies. Synthesized in this site's own
 * voice from ByteByteGo's "Introduction" chapter — paraphrased, not
 * quoted; see `bytebytego_behavioral_interview_notes.md` §1.
 */
const BehaviouralIntroEssay = () => (
  <section id="intro" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="Why This Matters" title="Your stories carry as much weight as your skills" />
    <div className="space-y-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <p>
        The technical bar at most companies has become standardized and easy to prepare for — everyone
        applying to the same role has drilled roughly the same problems. That leaves the behavioural round
        as the actual differentiator between two similarly-skilled candidates, which is why{' '}
        <a
          href="https://bytebytego.com/courses/behavioral-interview/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className={EXTERNAL_LINK_CLASS}
        >
          the course
        </a>{' '}
        this page is built on treats it as a skill worth deliberately practicing, not something you
        wing with whatever anecdote comes to mind in the room.
      </p>
      <p>
        Companies dress this up under a named value — Google&apos;s &ldquo;Googleyness,&rdquo; Meta&apos;s
        &ldquo;Move Fast,&rdquo; Microsoft&apos;s &ldquo;Growth Mindset&rdquo; — but underneath the label
        they&apos;re all probing the same handful of things: how you operate when the requirements are
        ambiguous, whether you can move people who don&apos;t report to you, and whether a real failure
        actually changed how you work afterward.
      </p>
      <p>
        What&apos;s easy to underrate is that this round doesn&apos;t just decide yes or no — it decides
        the level you&apos;re hired at, and that swing compounds. A down-level doesn&apos;t just mean a
        smaller number on the offer; it means less interesting scope in the day-to-day, and a slower,
        harder climb back to where your actual skill level already put you.
      </p>
    </div>
  </section>
);

export default BehaviouralIntroEssay;
