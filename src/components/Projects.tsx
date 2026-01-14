import React from 'react';
import { TrendingUp } from 'lucide-react';

// --- SUB-COMPONENTS ---

/**
 * ProjectDeepDive: Renders the detailed text, tags, and KPIs.
 */
interface ProjectDeepDiveProps {
  title: string;
  role: string;
  problem: string;
  solution: string;
  parameters: string[];
  tags: string[];
  kpis: string[];
}

const ProjectDeepDive: React.FC<ProjectDeepDiveProps> = ({ 
  title, 
  role, 
  problem, 
  solution, 
  parameters, 
  tags, 
  kpis 
}) => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
          {title}
        </h3>
        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
          {role}
        </span>
      </div>

      {/* Problem / Solution Grid */}
      <div className="grid md:grid-cols-2 gap-6 grow">
        <div>
          <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">
            The Problem
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {problem}
          </p>
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">
            The Solution
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {solution}
          </p>
        </div>
      </div>

      {/* Footer: Tags & KPIs */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
        
        {/* Parameters */}
        <div>
           <span className="text-xs font-bold text-zinc-500 mr-2">Key Inputs:</span>
           <div className="inline-flex flex-wrap gap-1 mt-1">
             {parameters.map((param) => (
               <span 
                key={param} 
                className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded border border-zinc-200 dark:border-zinc-700 whitespace-nowrap"
               >
                 {param}
               </span>
             ))}
           </div>
        </div>

        {/* Tech Stack */}
        <div>
           <span className="text-xs font-bold text-zinc-500 mr-2">Tech Stack:</span>
           <div className="inline-flex flex-wrap gap-1 mt-1">
             {tags.map((tag) => (
               <span 
                key={tag} 
                className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 whitespace-nowrap"
               >
                 {tag}
               </span>
             ))}
           </div>
        </div>

        {/* KPIs */}
        <div className="flex flex-col gap-1.5 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <TrendingUp size={14} className="shrink-0" />
              {kpi}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- LAYOUT HELPERS ---

const BentoGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto w-full ${className}`}>
      {children}
    </div>
  );
};

interface BentoCardProps {
  children: React.ReactNode;
  colSpan?: number;
  className?: string;
  noFade?: boolean;
  id?: string;
}

const BentoCard: React.FC<BentoCardProps> = ({ children, colSpan = 1, className = "", noFade = false, id }) => {
  const colSpanClass = colSpan === 4 ? "md:col-span-4" : colSpan === 2 ? "md:col-span-2" : "md:col-span-1";
  
  return (
    <div 
      id={id} 
      className={`${colSpanClass} relative overflow-hidden rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-sm flex flex-col ${className}`}
    >
      {children}
      {!noFade && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-black" />
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---

const Projects: React.FC = () => {
  return (
    <div id="impact" className="mt-0 scroll-mt-24">
 <BentoGrid className="pb-12">
          <BentoCard colSpan={2} noFade={true} id="proj-1" className="mb-4 scroll-mt-24">
             <ProjectDeepDive 
              title="Agentic Revenue Optimization"
              role="AI/ML Engineer"
              problem="High biological variability in donor starting material (Leukopaks, Bone Marrow) led to unpredictable cell yields, causing inventory misalignment and lost revenue on rare cell types."
              solution="Architected a predictive model to classify donors by highest probable cell yield (optimizing for Rarity vs. Throughput). Deployed an Agentic Interface to bridge lab data with enterprise ERP systems, automating yield reporting for sales teams."
              parameters={['Weight', 'Height', 'Age', 'Sex', 'Ethnicity','Smoker','Blood Type', 'CMV Status', 'Cell Count (TNC)', 'Cell Count (MNC)', 'Cell Count (Isolate)']}
              tags={['CRM (CRIO)','ERP (SAP)','Snowflake', 'BI (Tableau)', 'SQL','Python']}
              kpis={['Querying from hours to minutes','Ability to select donors for orders']}
            />
          </BentoCard>

          <BentoCard colSpan={2} noFade={true} id="proj-2">
             <ProjectDeepDive 
              title="Agentic Onboarding"
              role="AI/ML Engineer"
              problem="Fragmented documentation and reliance on tribal knowledge (i.e word of mouth) caused slow onboarding and information silos."
              solution="RAG Agents fine-tuned to department specific standard operating procedures (SOP) for niche context with atleast one (1) orchestrator agent with general context for cross-functional insight"
              parameters={['SOP','Work Instructions','Human Validated Training Text']}
              tags={['Google','ERP (SAP)','Snowflake', 'Atlassian (Confluence)','MCP','Vector DB', 'SQL','Python']}
              kpis={['Increased learning rate up to 80% (Wright’s Law: Stanford-B model)', 'Resource efficient contextual GenAI']}
            />
          </BentoCard>
        </BentoGrid>
    </div>
  );
};

export default Projects;