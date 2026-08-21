import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { HeartHandshake, Mic2, GraduationCap, Users, BookOpen, Dumbbell } from 'lucide-react';

import { RECOGNITION_ITEMS, LEADERSHIP_ACTIVITIES, COMPETENCY_STORIES } from '@/data/credentials';
import type { LeadershipIconName } from '@/types/credentials';

// Shared focus-visible ring, matching the convention used on nav links in page.tsx.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

/** Resolves a LeadershipActivity's icon key to a lucide component — keeps
 *  src/data/credentials.ts icon-free, same pattern as ImpactMetricsSection.tsx's ICON_MAP. */
const LEADERSHIP_ICON_MAP: Record<LeadershipIconName, LucideIcon> = {
  Mic2,
  GraduationCap,
  Users,
  BookOpen,
  Dumbbell,
};

/** Left-accent-bar classes per CompetencyStory color, one per card for scannability. */
const CARD_ACCENT_CLASSES = {
  blue: 'border-l-blue-400 dark:border-l-blue-500',
  amber: 'border-l-amber-400 dark:border-l-amber-500',
  purple: 'border-l-purple-400 dark:border-l-purple-500',
  emerald: 'border-l-emerald-400 dark:border-l-emerald-500',
  rose: 'border-l-rose-400 dark:border-l-rose-500',
} as const;

/**
 * Leadership activities already cited inside a COMPETENCY_STORIES entry's own
 * baseDetail (Influence Without Authority cites Student Outreach Ambassador) —
 * excluded from the leftover footer strip below so it isn't stated twice on
 * the same page. RECOGNITION_ITEMS has no such overlap currently (none of the
 * 4 programs are cited inside a story), so it needs no equivalent filter.
 */
const FEATURED_LEADERSHIP_ACTIVITY_IDS = new Set<string>(['student-outreach-ambassador']);

const AboutMeSection: React.FC = () => {
  return (
    <section id="about" className="scroll-mt-24 space-y-6">

      {/* PROFESSIONAL SUMMARY — full width */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>

        <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            Full Stack AI Engineer with <strong className="text-zinc-900 dark:text-white">7+ years of professional experience</strong> designing and deploying production systems across the full software engineering and machine learning lifecycle. Architects end-to-end platforms spanning React and Next.js frontends, Python and Node.js backend services, and RESTful APIs exposing ML capabilities to end users — including a production RAG AI agent shipped 0-to-1 from system design through open-source distribution that other engineers have since adopted on their own.
          </p>

          <p>
            Builds and operates <strong className="text-zinc-900 dark:text-white">containerized MLOps pipelines</strong> on GCP and AWS with CI/CD automation, prompt engineering, and model monitoring for domain-specific LLM accuracy — including migrating drug-discovery pipelines to run hardware-agnostically across CUDA, TPU, and Apple Silicon rather than one fixed target platform. Owns <strong className="text-zinc-900 dark:text-white">0-to-1 system design</strong> through production observability, collaborating with technical and non-technical stakeholders — up through executives at a parent company — to evaluate engineering trade-offs and deliver measurable business outcomes, for example replacing a manual, spreadsheet-driven revenue analysis with a natural-language RAG agent non-technical stakeholders can query directly.
          </p>

          <p>
            Supports multi-year strategic roadmap planning as the technical liaison between Canventa and its parent company, STEMCELL Technologies — translating a 3–5 year plan into realistic year-by-year and quarter-by-quarter goals and coordinating GCP-hosted, HIPAA-compliant infrastructure decisions across both organizations&apos; engineering, management, and executive stakeholders.
          </p>
        </div>
      </div>

      {/* LEADERSHIP & RECOGNITION — full width. Leads with behavior (5 named
          competency stories, Headline → Core → Base, per /behavioural's own
          High-Signal Storytelling shape) rather than institutional program
          names — the credential is now supporting proof in each story's
          attribution line, or in the quiet "Also" strip below for programs/
          activities that don't anchor one of the 5. */}
      <div className="bg-white dark:bg-black p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <HeartHandshake className="text-pink-500" size={20} />
          <h5 className="font-bold text-zinc-900 dark:text-white">Leadership &amp; Recognition</h5>
        </div>

        <div className="space-y-4">
          {COMPETENCY_STORIES.map((story) => (
            <article
              key={story.id}
              className={`rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-4 ${CARD_ACCENT_CLASSES[story.color]} p-4 sm:p-5`}
            >
              <span className="text-micro text-zinc-400 mb-2 block">{story.competency}</span>
              <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-snug mb-3">
                {story.headline}
              </p>
              <ul className="space-y-1.5 mb-3">
                {story.coreBullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
              {story.evidenceLink && (
                <a
                  href={story.evidenceLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block mb-3 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline rounded-sm ${FOCUS_RING}`}
                >
                  {story.evidenceLink.label} →
                </a>
              )}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                {story.baseDetail ? (
                  <details className="group max-w-[85%]">
                    <summary
                      className={`text-micro text-zinc-400 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-sm ${FOCUS_RING}`}
                    >
                      + Details
                    </summary>
                    <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      &ldquo;{story.baseDetail}&rdquo;
                    </p>
                  </details>
                ) : (
                  <span />
                )}
                {story.attributionHref ? (
                  <Link
                    href={story.attributionHref}
                    className={`ml-auto shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 hover:underline transition-colors rounded-sm ${FOCUS_RING}`}
                  >
                    {story.attribution}
                  </Link>
                ) : (
                  <span className="ml-auto shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {story.attribution}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Leftover recognition programs / leadership activities that don't
            anchor one of the 5 stories above — real credentials, kept, just
            demoted to quiet supporting detail instead of their own card. */}
        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
          <div>
            <span className="text-micro text-zinc-400 mb-1.5 block">Also Recognized</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {RECOGNITION_ITEMS.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && <span className="text-zinc-300 dark:text-zinc-700"> · </span>}
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`hover:text-pink-600 dark:hover:text-pink-400 hover:underline rounded-sm ${FOCUS_RING}`}
                    >
                      {item.program}
                    </a>
                  ) : (
                    item.program
                  )}
                </React.Fragment>
              ))}
            </p>
          </div>

          <div>
            <span className="text-micro text-zinc-400 mb-1.5 block">Also Ongoing</span>
            <ul className="space-y-1.5">
              {LEADERSHIP_ACTIVITIES.filter((activity) => !FEATURED_LEADERSHIP_ACTIVITY_IDS.has(activity.id)).map(
                (activity) => {
                  const Icon = LEADERSHIP_ICON_MAP[activity.iconName];
                  return (
                    <li key={activity.id} className="flex items-start gap-2">
                      <Icon size={13} className="mt-0.5 shrink-0 text-zinc-400" aria-hidden="true" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{activity.text}</span>
                    </li>
                  );
                }
              )}
            </ul>
          </div>
        </div>
      </div>

    </section>
  );
};

export default AboutMeSection;
