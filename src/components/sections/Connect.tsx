import React from 'react';
import { Mail, ArrowRight, Linkedin, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import { SITE_OWNER_EMAIL, LINKEDIN_URL, IDEAL_ROLES } from '@/constants/site';

const Connect: React.FC = () => {
  return (
    <section
      id="connect"
      className="border-t border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50/60 via-white to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-black"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-center gap-12 md:gap-16">

          {/* LEFT: Copy + role fit */}
          <div className="flex-1 min-w-0">
            <p className="text-micro font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Open to Work &middot; Jun 2026
            </p>

            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4 leading-tight">
              Let&rsquo;s Engineer<br className="hidden sm:block" /> the Future.
            </h2>

            <p className="text-zinc-600 dark:text-zinc-300 text-base leading-relaxed max-w-lg mb-8">
              If you are looking for an engineer who can architect 0&rarr;1 systems, automate tribal
              knowledge, and deploy AI agents, let&rsquo;s talk.
            </p>

            <div className="space-y-2">
              <span className="text-micro font-mono text-zinc-400 uppercase tracking-widest">Ideal Role Fit</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {IDEAL_ROLES.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800/80 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-default"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: CTA */}
          <div className="flex flex-col gap-3 w-full md:w-64 shrink-0">
            <Button
              variant="primary"
              href={`mailto:${SITE_OWNER_EMAIL}`}
              className="w-full justify-center py-4 text-base shadow-lg shadow-blue-500/20 dark:shadow-blue-900/40 group"
            >
              <Mail size={20} />
              <span>Contact</span>
              <ArrowRight
                size={18}
                className="ml-auto opacity-75 group-hover:translate-x-1 transition-transform duration-200"
              />
            </Button>

            <Button
              variant="secondary"
              href={LINKEDIN_URL}
              external
              className="w-full justify-center py-3.5 text-sm text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:border-blue-400 dark:hover:border-blue-500"
            >
              <Linkedin size={18} />
              <span>View Profile</span>
            </Button>

            <p className="text-xs text-zinc-400 flex items-center justify-center gap-1.5 pt-1">
              <Zap size={11} className="text-yellow-500" />
              Response time: &lt; 24 hours
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Connect;
