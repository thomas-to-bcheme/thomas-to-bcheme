'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, HeartHandshake, Mail, ArrowRight, Zap, 
  Code2, Database, FlaskConical, Dna, CheckCircle2, 
  Workflow, ClipboardCheck, Bot, PiggyBank, Package, 
  BookOpenCheck, Copyright, GitFork, Globe, Linkedin, Github, 
  GitBranch 
} from 'lucide-react';

// --- LOCAL COMPONENTS ---
import HeroSection from '@/components/HeroSection';
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import ROICalculation from "@/components/ROICalculation";
import EfficiencyCalculator from '@/components/EfficiencyCalculator';
import ProjectDeepDive from '@/components/ProjectDeepDive';
import Badge from '@/components/Badge';
import ImpactMetric from '@/components/ImpactMetric';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';

// --- UTILITY ---
const scrollToTop = () => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      
      {/* --- STICKY NAV --- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-zinc-200 dark:border-zinc-800 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="font-bold text-xl tracking-tighter flex items-center gap-2 group cursor-pointer">
            THOMAS<span className="text-blue-600 dark:text-blue-500 group-hover:text-blue-700 transition-colors">TO</span>
          </div>
          
          <nav className="hidden sm:flex gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
             <a href="#agent" className="hover:text-blue-600 transition-colors">Live Agent</a>
             <a href="#impact" className="hover:text-blue-600 transition-colors">Business Impact</a>
             <a href="#projects" className="hover:text-blue-600 transition-colors">Engineering</a>
            <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
          </nav>
          
          <a 
            href="mailto:thomas.to.bcheme@gmail.com" 
            className="flex items-center gap-2 text-xs bg-blue-600 text-white dark:bg-blue-500 px-4 py-2 rounded-full font-bold hover:bg-blue-700 dark:hover:bg-blue-400 transition-all hover:scale-105 transform duration-200 group"
          >
            Contact
            <ArrowRight size={16} className="opacity-75 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        
        {/* --- HERO SECTION --- */}
        <HeroSection />

        {/* --- KPI SECTION --- */}
        <section id="impact" className="mb-24 scroll-mt-24">
          <div className="relative rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
              
              <ImpactMetric 
                value={63} suffix=".2M" prefix="$" label="Revenue Protected" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Workflow size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Optimized End-to-end Parameters</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <ClipboardCheck size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">ICH7 and GMP Compliant</span>
                    </div>
                  </div>
                }
              />

              <ImpactMetric 
                value={50} prefix=">$" suffix="k/yr" label="OpEx Reduction" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Bot size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Automated Manual Data Entry</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <PiggyBank size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Recurring Labor Cost Savings</span>
                    </div>
                  </div>
                }
              />

              <ImpactMetric 
                value={200} prefix=">$" suffix="k" label="Waste Eliminated" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Package size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Material Management Model</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <BookOpenCheck size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Standard Operating Procedures</span>
                    </div>
                  </div>
                }
              />

              <ImpactMetric 
                value={10} suffix="+" label="Agentic Products Deployed" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Copyright size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Proprietary (Profitable & Compliant)</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <GitFork size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Open Source</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </section>

        {/* --- PROJECTS & DIAGRAMS --- */}
        <div id="projects" className="my-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
           <ArchitectureDiagram />
           <ROICalculation />
           <EfficiencyCalculator />
        </div>

        <BentoGrid className="pb-24">
          <BentoCard colSpan={2} noFade={true} id="proj-1">
             <ProjectDeepDive 
               title="Self-Hosted Agentic RAG"
               role="Lead Architect"
               problem="Static portfolios fail to demonstrate 'live' engineering capability or handling of non-deterministic data."
               solution="Built a self-correcting RAG agent that ingests my resume/codebase. It uses Vercel AI SDK to stream responses and 'hallucination checks' against a vector store."
               architecture="Next.js 14, LangChain, Pinecone, Vercel Edge Functions"
               tags={['Next.js', 'TypeScript', 'OpenAI', 'Vector DB']}
               kpis={['< 200ms TTFB', '100% Automated Recruiter Q&A']}
             />
          </BentoCard>

          <BentoCard colSpan={2} noFade={true} id="proj-2">
             <ProjectDeepDive 
               title="Bio-Process ETL Pipeline"
               role="Data Engineer"
               problem="Critical manufacturing decisions relied on 'tribal knowledge' and manual spreadsheets, leading to 87% operational inefficiency."
               solution="Engineered an automated ETL pipeline ingesting sensor data from bioreactors. Created a 'Digital Twin' model to predict yield outcomes."
               architecture="Python (Pandas), Airflow, Snowflake, JMP"
               tags={['Python', 'ETL', 'Snowflake', 'Statistics']}
               kpis={['$63.2M Cost Avoidance', 'Real-time Yield Prediction']}
             />
          </BentoCard>
        </BentoGrid>

        {/* --- ABOUT ME SECTION --- */}
        <section id="about" className="mb-24 scroll-mt-24">
           <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                 <div className="sticky top-24">
                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                       <Users className="text-blue-600" /> About Me
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 italic">
                       "We've seen how even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future."
                    </p>

                    <div className="flex gap-2 flex-wrap content-start mb-8">
                      <a href="mailto:thomas.to.bcheme@gmail.com" className="hover:opacity-80 transition-opacity">
                        <Badge color="blue" icon={Globe}>thomas.to.bcheme@gmail.com</Badge>
                      </a>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap content-start mb-8">
                       <Badge color="blue" pulse icon={Code2}>Fullstack Agentic Software Engineer</Badge>
                       <Badge color="blue" pulse icon={Database}>Data Science (AI/ML)</Badge>
                       <Badge color="blue" variant="outline" icon={FlaskConical}>Biochemical Engineer</Badge>
                       <Badge color="blue" variant="outline" icon={Dna}>Protein Design</Badge>
                    </div>

                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block">Work Authorization</span>
                       <ul className="space-y-2">
                          <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                             <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                             <span>Authorized to work in the U.S. for any employer.</span>
                          </li>
                          <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                             <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                             <span>No visa sponsorship required (now or future).</span>
                          </li>
                       </ul>
                    </div>
                 </div>
              </div>

              <div className="md:col-span-2 space-y-6 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>
                  <p className="mb-4">
                    My experience spans the entire data lifecycle—from capturing empirical data on the manufacturing floor to digitizing it via enterprise ETL/ELT pipelines and digitizing it through Agentic Machine Learning and automated applications for digital transformation. By architecting data models and pipelines that accurately reflect real-world processes, I deliver tangible value, driving efficiency, revenue generation, and optimization through scalable, reality-grounded software solutions.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-black p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 transition-colors">
                     <Globe className="mb-3 text-blue-500" size={20} />
                     <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Philosophy</h5>
                     <p className="text-xs text-zinc-500 leading-snug">
                       Data and mathematics are a means to engineer 0-to-1 minimally viable initial solutions to optimize thereafter.
                     </p>
                  </div>
                  <div className="bg-white dark:bg-black p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors">
                     <HeartHandshake className="mb-3 text-pink-500" size={20} />
                     <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Leadership</h5>
                     <p className="text-xs text-zinc-500 leading-snug">
                        Driving organizational efficiencies by scaling engineering excellence through junior mentorship and cross-departmental upskilling.
                     </p>
                  </div>
                </div>
              </div>
           </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 pt-16 pb-8 mt-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2 space-y-4">
                <div className="font-bold text-xl tracking-tighter flex items-center gap-2">
                  THOMAS<span className="text-blue-600 dark:text-blue-500">TO</span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                  Operationalizing Agentic Intelligence. Bridging the gap between biological systems and cloud infrastructure.
                </p>
                <div className="flex gap-4 pt-2">
                  <a href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io" target="_blank" className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 transition-all"><Github size={18} /></a>
                  <a href="https://www.linkedin.com/in/thomas-to-ucdavis/" target="_blank" className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 transition-all"><Linkedin size={18} /></a>
                  <a href="mailto:thomas.to.bcheme@gmail.com" className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 transition-all"><Mail size={18} /></a>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-zinc-900 dark:text-white mb-6 uppercase tracking-widest">System Status</h4>
                <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">All Systems Nominal</span>
                  </li>
                  <li className="flex items-center gap-2"><GitBranch size={14} /><span>v2.4.0 (Stable)</span></li>
                  <li className="flex items-center gap-2"><Globe size={14} /><span>Region: US-West (SFO)</span></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-xs text-zinc-400 space-y-1">
                <p>&copy; {new Date().getFullYear()} Thomas To. All rights reserved.</p>
                <p>Licensed under MIT Open Source.</p>
              </div>
              
              <button 
                onClick={scrollToTop}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full"
              >
                Back to Top <ArrowRight size={12} className="-rotate-90" />
              </button>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}