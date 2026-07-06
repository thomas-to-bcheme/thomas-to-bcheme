import React from 'react';
import { HeartHandshake, ExternalLink } from 'lucide-react';

import { RECOGNITION_ITEMS } from '@/data/credentials';

// Shared focus-visible ring, matching the convention used on nav links in page.tsx.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const AboutMeSection: React.FC = () => {
  return (
    <section id="about" className="scroll-mt-24 space-y-6">

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
        </div>
      </div>

      {/* LEADERSHIP & RECOGNITION — full width */}
      <div className="bg-white dark:bg-black p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <HeartHandshake className="text-pink-500" size={20} />
          <h5 className="font-bold text-zinc-900 dark:text-white">Leadership &amp; Recognition</h5>
        </div>

        <div>
          <ul className="grid sm:grid-cols-2 gap-4">
            {RECOGNITION_ITEMS.map((item) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-snug group-hover:text-pink-700 dark:group-hover:text-pink-300 transition-colors">
                      {item.program}
                    </span>
                    {item.url && (
                      <ExternalLink
                        size={14}
                        aria-hidden="true"
                        className="shrink-0 mt-0.5 text-pink-400 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 motion-reduce:transition-none"
                      />
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{item.organization}</span> — {item.blurb}
                  </p>
                </>
              );
              const cardClass = `group block p-3 rounded-lg border border-pink-100 dark:border-pink-900/30 bg-pink-50/40 dark:bg-pink-900/10 hover:border-pink-300 dark:hover:border-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 motion-reduce:hover:translate-y-0 ${FOCUS_RING}`;
              return (
                <li key={item.id}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className={cardClass}>
                      {body}
                    </a>
                  ) : (
                    <div className="group block p-3 rounded-lg border border-pink-100 dark:border-pink-900/30 bg-pink-50/40 dark:bg-pink-900/10">
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
