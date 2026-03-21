import React from 'react';
import { Layers, TrendingUp, CheckCircle2, Sliders } from 'lucide-react';

interface ProjectDeepDiveProps {
  title: string;
  role: string;
  problem: string;
  solution: string;
  parameters?: string[]; // Expecting an array of strings
  tags: string[];
  kpis: string[];
  architecture?: string;
}

const ProjectDeepDive = ({ 
  title, 
  role, 
  problem, 
  solution, 
  parameters, 
  tags, 
  kpis 
}: ProjectDeepDiveProps) => (
  <div className="flex flex-col h-full space-y-4">
    {/* Header */}
    <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
      <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{title}</h4>
      <p className="text-xs font-mono text-blue-600 dark:text-blue-400">{role}</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
      {/* Left Col: Narrative */}
      <div className="space-y-4">
        <div>
          <span className="text-micro text-zinc-400 block mb-1">The Problem</span>
          <p className="text-sm text-subtle leading-relaxed">{problem}</p>
        </div>
        <div>
          <span className="text-micro text-zinc-400 block mb-1">The Solution</span>
          <p className="text-sm text-subtle leading-relaxed">{solution}</p>
        </div>
      </div>
      
      {/* Right Col: Technical & Impact */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800 space-y-4 flex flex-col justify-between">
        
{/* --- FIXED SECTION START --- */}
        {Array.isArray(parameters) && parameters.length > 0 && (
          <div>
            <span className="text-micro text-zinc-400 flex items-center gap-1.5 mb-2">
              <Sliders size={12}/> Parameters
            </span>
            {/* CHANGED: Switched from 'grid grid-cols-2' to 'flex flex-wrap' to match Architecture */}
            <div className="flex flex-wrap gap-1.5">
              {parameters.map((param) => (
                 <span
                    key={param}
                    className="tag-blue"
                    title={param}
                 >
                  {param}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* --- FIXED SECTION END --- */}

        {/* Architecture Tags */}
        <div>
           <span className="text-micro text-zinc-400 flex items-center gap-1.5 mb-2">
             <Layers size={12}/> Architecture Stack
           </span>
           <div className="flex flex-wrap gap-1.5">
             {tags.map((t) => (
               <span key={t} className="tag-blue">
                 {t}
               </span>
             ))}
           </div>
        </div>

        {/* Impact KPIs */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
           <span className="text-micro text-zinc-400 flex items-center gap-1.5 mb-2">
             <TrendingUp size={12}/> Impact Outcomes
           </span>
           <ul className="space-y-1.5">
             {kpis.map((k) => (
               <li key={k} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5">
                 <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                 <span>{k}</span>
               </li>
             ))}
           </ul>
        </div>

      </div>
    </div>
  </div>
);

export default ProjectDeepDive;