import React from 'react';
import { HeartHandshake } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import { RECOGNITION_ITEMS } from '@/data/credentials';

// Shared focus-visible ring, matching the convention used on nav links in page.tsx.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const AboutMeSection: React.FC = () => {
  return (
    <section id="about" className="mb-16 scroll-mt-24 space-y-6">

      {/* PROFESSIONAL SUMMARY — full width */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>

        <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            Full Stack AI Engineer with <strong className="text-zinc-900 dark:text-white">7+ years of professional experience</strong> designing and deploying production systems across the full software engineering and machine learning lifecycle. Architects end-to-end platforms spanning React and Next.js frontends, Python and Node.js backend services, and RESTful APIs exposing ML capabilities to end users.
          </p>

          <p>
            Builds and operates <strong className="text-zinc-900 dark:text-white">containerized MLOps pipelines</strong> on GCP and AWS with CI/CD automation, prompt engineering, and model monitoring for domain-specific LLM accuracy. Owns <strong className="text-zinc-900 dark:text-white">0-to-1 system design</strong> through production observability, collaborating with technical and non-technical stakeholders to evaluate engineering trade-offs and deliver measurable business outcomes.
          </p>

          {/* Current Focus */}
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
              <span className="text-micro font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Current Focus (Jun 2026)
              </span>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                Actively searching for new roles in AI/ML Engineering.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LEADERSHIP & RECOGNITION — full width */}
      <div className="bg-white dark:bg-black p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HeartHandshake className="text-pink-500" size={20} />
          <h5 className="font-bold text-zinc-900 dark:text-white">Leadership &amp; Recognition</h5>
        </div>

        <div>
          <ul className="grid sm:grid-cols-2 gap-3">
            {RECOGNITION_ITEMS.map((item) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">{item.program}</span>
                    <Badge color="rose" variant="outline" className="shrink-0">{item.role}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{item.organization}</span> — {item.blurb}
                  </p>
                </>
              );
              const cardClass = `block p-3 rounded-lg border border-pink-100 dark:border-pink-900/30 bg-pink-50/40 dark:bg-pink-900/10 hover:border-pink-300 dark:hover:border-pink-700 transition-colors ${FOCUS_RING}`;
              return (
                <li key={item.id}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className={cardClass}>
                      {body}
                    </a>
                  ) : (
                    <div className="block p-3 rounded-lg border border-pink-100 dark:border-pink-900/30 bg-pink-50/40 dark:bg-pink-900/10">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

    </section>
  );
};

export default AboutMeSection;
