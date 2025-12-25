'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import AiGenerator from "@/components/AiGenerator"; 
import { 
  Github, Linkedin, Mail, FileText, Dna, 
  Cpu, TrendingUp, Activity, Server, ArrowRight, 
  CheckCircle2, Users, Globe, HeartHandshake, GitBranch,
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---

const Badge = ({ children, color = "zinc", pulse = false }: { children: React.ReactNode, color?: "blue" | "green" | "zinc" | "amber" | "purple", pulse?: boolean }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  };
  return (
    <span className={cn(`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border flex items-center gap-1.5`, colors[color])}>
      {pulse && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span></span>}
      {children}
    </span>
  );
};

const BentoGrid = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]", className)}>
    {children}
  </div>
);

// UPDATED: Default noFade=true for instant readability
const BentoCard = ({ children, className, colSpan = 1, rowSpan = 1, title, icon: Icon, href, id, noFade = true }: any) => {
  const Wrapper = href ? 'a' : 'div';
  return (
    <motion.div 
      id={id}
      initial={noFade ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      whileInView={noFade ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-800 flex flex-col",
        colSpan === 2 && "md:col-span-2", colSpan === 3 && "md:col-span-3", colSpan === 4 && "md:col-span-4",
        rowSpan === 2 && "md:row-span-2",
        className
      )}
    >
      <Wrapper href={href} target={href ? "_blank" : undefined} className="h-full w-full flex flex-col">
        {(title || Icon) && (
          <div className="flex items-center justify-between mb-4 text-zinc-900 dark:text-zinc-100 font-semibold">
             <div className="flex items-center gap-2">
                {Icon && <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800"><Icon size={16} className="text-blue-600 dark:text-blue-400" /></div>}
                <span className="tracking-tight">{title}</span>
             </div>
             {href && <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-zinc-400" />}
          </div>
        )}
        <div className="flex-1 relative z-10">{children}</div>
      </Wrapper>
    </motion.div>
  );
};

// --- KPI METRIC COMPONENT ---
const ImpactMetric = ({ value, label, prefix = "", suffix = "", subtext }: any) => (
  <div className="flex flex-col items-center justify-center p-6 text-center border-b md:border-b-0 md:border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-300 group cursor-default">
    <div className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2 font-mono group-hover:scale-110 transition-transform duration-300">
      {prefix}
      <CountUp end={value} duration={2.5} separator="," enableScrollSpy scrollSpyOnce />
      {suffix}
    </div>
    <div className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{label}</div>
    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[180px] leading-relaxed">{subtext}</p>
  </div>
);

// --- DYNAMIC SYSTEM STATUS TICKER ---
const SystemStatusTicker = () => {
  const [latency, setLatency] = useState(24);
  const [lastCall, setLastCall] = useState<string>("Initializing...");

  useEffect(() => {
    setLastCall(new Date().toISOString());
    const interval = setInterval(() => {
      setLatency(prev => Math.floor(Math.random() * (45 - 20) + 20)); 
      setLastCall(new Date().toISOString());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap gap-4 text-[10px] font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 py-2 px-4 rounded-full border border-zinc-200 dark:border-zinc-800 w-fit mb-8 shadow-sm hover:border-blue-200 transition-colors">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>SYSTEM: NOMINAL</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <Server size={10} />
        <span>REGION: SFO1 (Edge)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Activity size={10} />
        <span>LATENCY: {latency}ms</span>
      </div>
       <div className="hidden md:flex items-center gap-1.5">
        <GitBranch size={10} />
        <span>BUILD: {lastCall.split('T')[1].split('.')[0]} UTC</span>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---

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
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
            </div>
            THOMAS<span className="text-blue-600 dark:text-blue-500 group-hover:text-blue-700 transition-colors">.TO</span>
          </div>
          
          <nav className="hidden sm:flex gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
             <a href="#impact" className="hover:text-blue-600 transition-colors">Impact</a>
             <a href="#agent" className="hover:text-blue-600 transition-colors">Agentic AI</a>
             <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
          </nav>
          
          <a href="mailto:thomas.to.bcheme@gmail.com" className="text-xs bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 rounded-full font-bold hover:opacity-90 transition-opacity hover:scale-105 transform duration-200">
            Contact
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        
        {/* --- HERO SECTION --- */}
        <section className="mb-20">
          <SystemStatusTicker />
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Col: Text */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.6 }}
            >
              <div className="flex gap-3 mb-6">
                 <Badge color="blue" pulse>Available for Hire</Badge>
                 <Badge color="zinc">Senior Fullstack Engineer</Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-zinc-900 dark:text-white leading-[1.1]">
                Operationalizing <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Agentic Intelligence.</span>
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-8">
                I don't just build websites. I engineer <strong>autonomous systems</strong> that bridge biological reality with cloud architecture. From <strong>protein design algorithms</strong> to <strong>self-healing RAG pipelines</strong>.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <a href="https://github.com/thomas-to-bcheme" target="_blank" className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
                   <Github size={20} /> View Source
                </a>
                <a href="src/docs/Thomas_To_Resume.pdf" target="_blank" className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg font-medium transition-all">
                   <FileText size={20} /> Download Resume
                </a>
              </div>
            </motion.div>

            {/* Right Col: Live Agent (SHOW, DON'T TELL) */}
            <motion.div 
              id="agent"
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.8 }}
              className="relative hidden lg:block h-full min-h-[400px]"
            >
               <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse"></div>
               <div className="relative bg-white dark:bg-zinc-900/90 rounded-xl border border-zinc-200 dark:border-zinc-800 h-full p-4 shadow-2xl flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                     <div className="flex items-center gap-2">
                        <Cpu size={18} className="text-blue-600" />
                        <span className="font-bold text-sm">Live Agentic RAG Model</span>
                     </div>
                     <Badge color="green" pulse>Online</Badge>
                  </div>
                  {/* Interactive Chat Window */}
                  <div className="flex-1 overflow-hidden relative rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800">
                      <div className="absolute inset-0 overflow-auto custom-scrollbar">
                         <AiGenerator /> 
                      </div>
                  </div>
               </div>
            </motion.div>
          </div>
        </section>

        {/* --- HORIZONTAL KPI SECTION --- */}
        <section id="impact" className="mb-24 scroll-mt-24">
           <div className="relative rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
                  <ImpactMetric 
                    value={63} 
                    suffix=".2M" 
                    prefix="$" 
                    label="Cost Savings" 
                    subtext="Reduced costs via Python modeling at UC Davis/Genentech"
                  />
                  <ImpactMetric 
                    value={87} 
                    suffix="%" 
                    label="Efficiency Gain" 
                    subtext="Reduction in daily calculation time via DevOps CI/CD"
                  />
                  <ImpactMetric 
                    value={2} 
                    prefix="$"
                    suffix="M" 
                    label="Risk Prevented" 
                    subtext="Inventory stockout prevention via Data Science methods"
                  />
                  <ImpactMetric 
                    value={1} 
                    label="End-to-End Design" 
                    subtext="Zero to One Infrastructure Architecture (Agentic Systems)"
                  />
              </div>
           </div>
        </section>

        {/* --- MINIMALIST BENTO GRID --- */}
        <BentoGrid className="pb-24" id="about">
          
          {/* 1. BIO-MANUFACTURING IMPACT (Domain Expertise) */}
          <BentoCard colSpan={2} title="Bio-Process Engineering" icon={Dna}>
             <div className="grid grid-cols-2 gap-6 h-full items-center">
                <div className="space-y-4">
                   <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <h4 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">$63.2M</h4>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 font-medium">Cost Savings</p>
                   </div>
                   <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <h4 className="text-2xl font-bold text-blue-700 dark:text-blue-400">-87%</h4>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/70 font-medium">Calc Time</p>
                   </div>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                   <p><strong>Method:</strong> Digitized 5+ years of "Tribal Knowledge" into automated ETL pipelines.</p>
                   <p className="text-xs text-zinc-500">Tech: Python (Pandas), SQL, JMP</p>
                </div>
             </div>
          </BentoCard>

          {/* 2. FINTECH HYPOTHESIS (Critical Thinking) */}
          <BentoCard colSpan={2} title="Algo-Trading Experiment" icon={TrendingUp}>
             <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                   <Badge color="amber">Critical Finding</Badge>
                   <span className="text-xs text-zinc-400">HMM vs Index Fund</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                   <strong>Hypothesis:</strong> Can an unsupervised Agentic model beat Warren Buffet?
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                   <strong>Result:</strong> <span className="text-red-500 font-bold">Latency Kills.</span> Cloud function round-trip times negate high-frequency gains. "Physical Reality" (Hardware location) dictates success.
                </p>
             </div>
          </BentoCard>

          {/* 3. OPEN SOURCE MANIFESTO (Philosophy) */}
          <BentoCard colSpan={4} title="The Collaborative Mindset" icon={Globe} className="bg-zinc-50 dark:bg-zinc-900/30">
             <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <Badge color="purple">Open Source</Badge>
                   <span className="text-xs text-zinc-400">MIT License</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl">
                   I don't believe in a zero-sum game. This entire architecture is <strong>open-sourced</strong> as a memento of my perspective: supporting everyone helps everyone win. We thrive when we solve the world's challenging problems together.
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                   <div className="flex items-center gap-1"><Users size={12}/> <span>Mentorship Focused</span></div>
                   <div className="flex items-center gap-1"><HeartHandshake size={12}/> <span>Cross-Dept Upskilling</span></div>
                </div>
             </div>
          </BentoCard>

          {/* 4. CONNECT & RECRUITER CONVERSION (No Scroll Fade) */}
          <BentoCard 
            colSpan={4} 
            noFade={true}
            className="bg-gradient-to-br from-white to-blue-50/50 dark:from-zinc-900 dark:to-blue-900/10 border-blue-100 dark:border-blue-900/30"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 h-full">
              
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color="blue" pulse>Open to Work</Badge>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status: Active</span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Let's Engineer the Future.
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-xl">
                    If you are looking for an engineer who can architect 0&rarr;1 systems, automate tribal knowledge, 
                    and deploy self-correcting AI agents, let's talk.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Ideal Role Fit</span>
                  <div className="flex flex-wrap gap-2">
                    {['Principal AI Engineer', 'Biotech Data Architect', 'Technical Lead', 'Sr. Fullstack Engineer'].map((role) => (
                      <span key={role} className="px-2.5 py-1 rounded-md bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm cursor-default hover:border-blue-400 transition-colors">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                <a 
                  href="mailto:thomas.to.bcheme@gmail.com" 
                  className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black rounded-lg font-bold transition-all shadow-xl shadow-zinc-200 dark:shadow-none group transform hover:scale-[1.02]"
                >
                  <Mail size={18} />
                  <span>Book Technical Sync</span>
                  <ArrowRight size={16} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                </a>
                
                <a 
                  href="https://www.linkedin.com/in/thomas-to-ucdavis/" 
                  target="_blank" 
                  className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-lg font-bold transition-all"
                >
                  <Linkedin size={18} />
                  <span>View Profile</span>
                </a>
                
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

        {/* --- FOOTER --- */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center text-zinc-500 text-sm">
           <div className="flex items-center gap-2 mb-4 md:mb-0">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>All Systems Nominal</span>
           </div>
           <p className="font-mono text-xs">Authored by Thomas To. Built with Next.js + LangChain.</p>
        </div>

      </main>
    </div>
  );
}