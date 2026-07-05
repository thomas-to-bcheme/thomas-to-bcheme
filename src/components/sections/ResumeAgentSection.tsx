import React from 'react';
import { Cpu } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import AiGenerator from '@/components/features/AiGenerator';
import { GITHUB_PROFILE_URL } from '@/constants/site';

/**
 * Resume RAG Agent as a standalone section, directly below the hero. Lifted out
 * of the hero's right column (which now holds the portrait) so the interactive
 * AI demo keeps its prominence at full width.
 */
const ResumeAgentSection: React.FC = () => {
  return (
    <section id="agent" className="mb-8 scroll-mt-24">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse motion-reduce:animate-none" />
        <div className="relative card-base p-4 shadow-2xl flex flex-col">
          <div className="flex justify-between items-start mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex gap-3">
              <div className="mt-2 shrink-0">
                <Cpu size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Resume RAG Agent
                </span>
                <div className="text-xs leading-tight text-zinc-500 dark:text-zinc-400 mt-1">
                  <a
                    href={GITHUB_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline decoration-blue-600/30 transition-all font-medium inline-flex items-center gap-1"
                  >
                    See source docs
                  </a>
                </div>
              </div>
            </div>
            <Badge color="green">Online</Badge>
          </div>

          <div className="h-[440px] overflow-hidden relative rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="absolute inset-0 overflow-auto custom-scrollbar">
              <AiGenerator />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResumeAgentSection;
