import React from 'react';
import { Mail, ArrowRight, Linkedin, Zap } from 'lucide-react';
import Badge from '@/components/Badge';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';
import Button from '@/components/ui/Button';

// --- Main Component ---

const Connect: React.FC = () => {
  return (
    <section id="connect">
      {/* UX FIX: Reduced 'pb-24' to 'pb-12' to bring the footer closer to the call-to-action */}
      <BentoGrid className="pb-12">
        <BentoCard 
          colSpan={4} 
          noFade={true}
          className="bg-gradient-to-br from-white to-blue-50/50 dark:from-zinc-900 dark:to-blue-900/10 border-blue-100 dark:border-blue-900/30"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 h-full">
            
            {/* Left Side: Copy & Role Fit */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    color="green" 
                    pulse 
                    href="mailto:thomas.to.bcheme@gmail.com" 
                  >
                    AVAILABLE FOR HIRE
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Let's Engineer the Future.
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-xl">
                  If you are looking for an engineer who can architect 0&rarr;1 systems, automate tribal knowledge, 
                  and deploy AI agents, let's talk.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Ideal Role Fit</span>
                <div className="flex flex-wrap gap-2">
                  {['AI/ML Engineer', 'AI/ML Ops', 'Data Scientist', 'Senior Fullstack Software Engineer'].map((role) => (
                    <span key={role} className="px-2.5 py-1 rounded-md bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm cursor-default hover:border-blue-400 transition-colors">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Actions (V3: Using Button component) */}
            <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
              <Button
                variant="primary"
                href="mailto:thomas.to.bcheme@gmail.com"
                className="w-full md:w-48 shadow-xl shadow-blue-200/50 dark:shadow-none group"
              >
                <Mail size={18} />
                <span>Contact</span>
                <ArrowRight
                  size={16}
                  className="animate-pulse opacity-75 group-hover:translate-x-1 transition-transform"
                />
              </Button>

              <Button
                variant="secondary"
                href="https://www.linkedin.com/in/thomas-to-ucdavis/"
                external
                className="w-full md:w-48 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:border-blue-300"
              >
                <Linkedin size={18} />
                <span>View Profile</span>
              </Button>

              <div className="text-center">
                <p className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                  <Zap size={10} className="text-yellow-500" />
                  Response time: &lt; 24 hours
                </p>
              </div>
            </div>

          </div>
        </BentoCard>
      </BentoGrid>
    </section>
  );
};

export default Connect;