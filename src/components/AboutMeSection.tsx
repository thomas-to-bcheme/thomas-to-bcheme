import React from 'react';
import { Users, Globe, CheckCircle2, HeartHandshake } from 'lucide-react';
import Badge from '@/components/Badge';

// --- Main Section Component ---

const AboutMeSection: React.FC = () => {
  return (
    <section id="about" className="mb-16 scroll-mt-24">
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile & Badges */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm h-full flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                <Users className="text-blue-600" /> About Me
              </h3>
              
              <div className="mb-4">
                {/* The Closer */}
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  I am a Fullstack Engineer with a formal background in Biochemical Engineering. 
                  I apply software engineering principles across diverse use cases, leveraging a strong mathematical and empirical foundation to design end-to-end architectures that bridge physical reality with cloud infrastructure.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap content-start mb-6">
                <a 
                  href="mailto:thomas.to.bcheme@gmail.com" 
                  className="hover:opacity-80 transition-opacity"
                  aria-label="Email Thomas To"
                >
                  <Badge color="green" pulse icon={Globe}>
                    thomas.to.bcheme@gmail.com
                  </Badge>
                </a>
              </div>
              
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 italic leading-relaxed">
                "We've seen how even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future."
              </p>                  
            </div>

            {/* Work Authorization Status (Pinned to bottom of card) */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block">
                Work Authorization
              </span>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>Authorized to work in the U.S. for any employer.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>No visa sponsorship required (now or future).</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>Eligible to work in the U.S. without restriction.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Story */}
        <div className="md:col-span-2 space-y-6 flex flex-col h-full">
          
          {/* 1. PROFESSIONAL SUMMARY */}
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex-1">
            <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>
            
            {/* Core Identity */}
            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              
              {/* Paragraph 2: The Data Lifecycle */}
              <p>
                My experience spans the entire data lifecycle—from capturing empirical data on the manufacturing floor to digitizing it via <strong className="text-zinc-900 dark:text-white">enterprise ETL/ELT pipelines</strong> and capitalizing on it through <strong className="text-zinc-900 dark:text-white">Agentic Machine Learning</strong>. 
                By architecting data models that accurately reflect real-world processes, I deliver tangible value: driving efficiency, revenue generation, and optimization through scalable software solutions.
              </p>

              {/* Section 4: The 'Live' Status Update (Dec 2025) */}
              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    Current Focus (Jan 2026)
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
          
          {/* 2. GRID: Philosophy & Leadership */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
            
            {/* Philosophy Card */}
            <div className="bg-white dark:bg-black p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 transition-colors shadow-sm flex flex-col justify-center">
              <Globe className="mb-3 text-blue-500" size={20} />
              <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Philosophy</h5>
              
              <div>
                <h6 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                    The 0&rarr;1 Lifecycle
                </h6>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                    Abstraction
                  </span>
                  <span className="text-zinc-300">&rarr;</span>
                  <span className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                    Architecture
                  </span>
                  <span className="text-zinc-300">&rarr;</span>
                  <span className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                    Deployment
                  </span>
                </div>
              </div>
            </div>

            {/* Leadership Card */}
            <div className="bg-white dark:bg-black p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors shadow-sm flex flex-col justify-center">
              <HeartHandshake className="mb-3 text-pink-500" size={20} />
              <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Leadership</h5>
              <p className="text-xs text-zinc-500 leading-snug">
                Scaling engineering excellence through junior mentorship and cross-departmental upskilling. I act as a technical liaison, translating complex constraints into business value.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutMeSection;