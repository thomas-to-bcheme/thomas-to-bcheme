"use client";

import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  Milestone, 
  ArrowDown,
  Layers,
  Server,
  LayoutTemplate,
  GitBranch
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS (If you don't have this in a separate file yet) ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
type PhaseStatus = 'completed' | 'current' | 'upcoming';

interface RoadmapPhase {
  id: number;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  description: string;
  goal: string;
  stakeholder: string;
  icon: React.ElementType;
}

// --- DATA: EDIT YOUR STATUS HERE ---
const PHASES: RoadmapPhase[] = [
  {
    id: 1,
    title: "Phase 1: Minimal Viable Product",
    subtitle: "Frontend > Backend",
    status: 'completed', // <--- CHANGE TO 'completed', 'current', or 'upcoming'
    stakeholder: "Recruiters",
    icon: LayoutTemplate,
    description: "Deployment of the core frontend architecture to act as a marketing signal. Demonstrating proven competency and qualification to recruiters through a high-performance, accessible web application.",
    goal: "Frontend UI as a better visual representation of the resume. Prioritizing 0 to 1 delivery to demonstrate aptitude."
  },
  {
    id: 2,
    title: "Phase 2: Agentic Integration",
    subtitle: "Lightweight Backend Features",
    status: 'current', // <--- CURRENTLY ACTIVE PHASE
    stakeholder: "Hiring Managers",
    icon: Server,
    description: "Implementation of proof-of-concept Agentic features using Vercel's serverless infrastructure. Highlighting the agentic projects shown on the homepage to demonstrate immediate value.",
    goal: "Frontend development with lightweight backend development of agentic features. Focus on shipping demonstrable features live during interviews."
  },
  {
    id: 3,
    title: "Phase 3: E2E ML Infrastructure",
    subtitle: "Robust Backend & CI/CD",
    status: 'upcoming',
    stakeholder: "Technical Leads",
    icon: Layers,
    description: "Complete end-to-end and cross-platform CI/CD of local Python ML models shipped as a FastAPI to GitHub and deployed on Hugging Face. The Vercel frontend will call this custom ecosystem without external platforms.",
    goal: "Robust backend development with its own CI/CD pipeline integrated via API. All infrastructure built from scratch to demonstrate fullstack architectural control."
  },
  {
    id: 4,
    title: "Phase 4: Open Source Distribution",
    subtitle: "Refactoring & Education",
    status: 'upcoming',
    stakeholder: "Community & Developers",
    icon: GitBranch,
    description: "Refactoring code, addressing technical debt, and distributing the public portfolio as an open-source learning resource. Creating modules to teach building Agentic methods from code, not low-code solutions.",
    goal: "Completeness of a final project. Refactoring to best practices, aligning documentation, and creating educational resources to mentor open collaboration."
  }
];

const StatusIcon = ({ status }: { status: PhaseStatus }) => {
  if (status === 'completed') {
    return <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400 fill-blue-50 dark:fill-blue-900/20" />;
  }
  if (status === 'current') {
    return (
      <div className="relative flex items-center justify-center">
        <div className="absolute w-full h-full bg-blue-400/30 rounded-full animate-ping" />
        <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin relative z-10" />
      </div>
    );
  }
  return <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />;
};

const PhaseCard = ({ phase, isLast }: { phase: RoadmapPhase; isLast: boolean }) => {
  const isActive = phase.status === 'current';
  const isCompleted = phase.status === 'completed';

  return (
    <div className="relative pl-8 md:pl-0">
      
      {/* DESKTOP: Timeline Line */}
      <div className="hidden md:flex flex-col items-center absolute left-[50%] -translate-x-1/2 h-full top-0">
        <div className={cn(
          "w-px h-8 bg-zinc-200 dark:bg-zinc-800",
          phase.id === 1 && "opacity-0" // Hide top line for first item
        )} />
        <div className="bg-white dark:bg-zinc-950 p-2 z-10">
          <StatusIcon status={phase.status} />
        </div>
        <div className={cn(
          "w-px flex-1 bg-zinc-200 dark:bg-zinc-800",
          isLast && "opacity-0" // Hide bottom line for last item
        )} />
      </div>

      {/* MOBILE: Timeline Line */}
      <div className="md:hidden absolute left-2 top-0 h-full w-px bg-zinc-200 dark:bg-zinc-800">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-950 py-2">
           <StatusIcon status={phase.status} />
        </div>
      </div>

      <div className={cn(
        "md:flex items-center justify-between gap-12 py-8 group",
        phase.id % 2 === 0 ? "md:flex-row-reverse" : ""
      )}>
        
        {/* CARD SIDE */}
        <div className="flex-1 ml-6 md:ml-0">
          <div className={cn(
            "p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden",
            isActive 
              ? "bg-white dark:bg-zinc-900 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]" 
              : isCompleted
                ? "bg-zinc-50 dark:bg-zinc-900/50 border-blue-200 dark:border-blue-900/30 opacity-90 hover:opacity-100"
                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 opacity-60 grayscale hover:grayscale-0 transition-all"
          )}>
            
            {isActive && (
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                 <span className={cn(
                   "text-[10px] font-bold uppercase tracking-widest mb-1 block",
                   isActive || isCompleted ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"
                 )}>
                   {phase.subtitle}
                 </span>
                 <h3 className={cn(
                   "text-lg font-bold",
                   isActive ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                 )}>
                   {phase.title}
                 </h3>
              </div>
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <phase.icon size={18} className={cn(
                  isActive || isCompleted ? "text-blue-600" : "text-zinc-400"
                )} />
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              {phase.description}
            </p>

            {/* The Goal Box */}
            <div className={cn(
              "rounded-lg p-3 text-xs border",
              isActive 
                ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200"
                : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500"
            )}>
              <span className="font-bold block mb-1 uppercase text-[10px] opacity-70">
                Primary Goal
              </span>
              {phase.goal}
            </div>

            {/* Stakeholder Tag */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 uppercase font-medium">Target Stakeholder:</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {phase.stakeholder}
              </span>
            </div>

          </div>
        </div>

        {/* DATE/STATUS SIDE (Visual Balance for Desktop) */}
        <div className="flex-1 hidden md:flex flex-col justify-center items-center text-center opacity-50">
           {/* This space intentionally left blank or used for dates if you had them */}
        </div>

      </div>
    </div>
  );
};

const Roadmap = () => {
  return (
    <section id="roadmap" className="py-24 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">
             <Milestone size={12} /> Project Roadmap
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
            From MVP to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Open Source</span>
          </h2>
          <p className="max-w-2xl mx-auto text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            A transparent view of the engineering lifecycle. Prioritizing a 0 &rarr; 1 mindset to demonstrate aptitude, 
            evolving into a robust, autonomous ecosystem.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative">
          {PHASES.map((phase, index) => (
            <PhaseCard 
              key={phase.id} 
              phase={phase} 
              isLast={index === PHASES.length - 1} 
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default Roadmap;