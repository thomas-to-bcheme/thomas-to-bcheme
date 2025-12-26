"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Github, 
  FileText, 
  Cpu, 
  ShieldCheck, 
  TrendingUp, 
  Building2 
} from 'lucide-react';

// Assuming you have these components locally
import Badge from '@/components/Badge'; 
import SystemStatusTicker from '@/components/SystemStatusTicker';
import AiGenerator from '@/components/AiGenerator'; // Your chat component

const HeroSection = () => {
  return (
    <section className="mb-20 pt-10">
      {/* SYSTEM TICKER: 
         Placed at the very top to give immediate "Live System" context before the user even reads the title.
      */}
      <SystemStatusTicker />

      <div className="grid lg:grid-cols-2 gap-12 items-center mt-8">
        
        {/* =========================================================
            LEFT COLUMN: Value Proposition & Trust Signals
           ========================================================= */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.6 }}
        >
          {/* 1. STATUS BADGES: Immediate availability context */}
          <div className="flex gap-3 mb-6">
            <Badge color="blue" pulse>Available for Hire</Badge>
            <Badge color="zinc">California, United States</Badge>
          </div>
          
          {/* 2. THE TITLE: Highlighting the specific niche "Agentic" */}
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-white leading-[1.1]">
            Fullstack<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
              Agentic Engineer
            </span>
          </h1>
          
          {/* 3. THE SUBTITLE: Visual storytelling using strikethrough to show evolution */}
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-6">
            Integrating AI to digitally transform <span className="line-through decoration-rose-400/50 decoration-2 text-zinc-400/70">static algorithms</span> into dynamic revenue engines.
          </p>
          
          {/* 4. TRUST SIGNALS: The "High Value" Pill Row
             - This connects your code to business outcomes (ROI, Compliance).
             - Crucial for passing the "6-second recruiter scan".
          */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {/* Badge 1: Profitability */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10">
              <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                ROI-Focused & Profitable
              </span>
            </div>

            {/* Badge 2: Compliance (Bio/Med Tech Niche) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10">
              <ShieldCheck size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                GMP/HIPAA Compliant
              </span>
            </div>

            {/* Badge 3: Scale */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30">
              <Building2 size={14} className="text-zinc-600 dark:text-zinc-400" />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Enterprise Scalability
              </span>
            </div>
          </div>
          
          {/* 5. CALL TO ACTION BUTTONS */}
          <div className="flex flex-wrap gap-4">
            <a 
              href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
            >
               <Github size={20} /> View Source
            </a>
            <a 
              href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/src/docs/Thomas_To_Resume.pdf?raw=true" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg font-medium transition-all border border-zinc-200 dark:border-zinc-700"
            >
               <FileText size={20} /> Download Resume
            </a>
          </div>
        </motion.div>

        {/* =========================================================
            RIGHT COLUMN: The Interactive "Proof of Work"
           ========================================================= */}
        <motion.div 
          id="agent"
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.8 }}
          className="relative hidden lg:block h-full min-h-[400px]"
        >
           {/* Background Glow Effect */}
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse"></div>
           
           <div className="relative bg-white dark:bg-zinc-900/90 rounded-xl border border-zinc-200 dark:border-zinc-800 h-full p-4 shadow-2xl flex flex-col">
              
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex gap-3">
                  <div className="mt-2 shrink-0">
                     <Cpu size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Resume RAG Agent
                    </span>
                    
                    {/* Source Link for Transparency */}
                    <div className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400 mt-1">
                      <span>Limited to free license plans. </span>
                      <a 
                        href="https://github.com/thomas-to-bcheme" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline decoration-blue-600/30 transition-all font-medium inline-flex items-center gap-1"
                      >
                        See source docs
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      </a>
                    </div>
                  </div>
                </div>
                
                <Badge color="green" pulse>Online</Badge>
              </div>

              {/* Chat Interface Container */}
              <div className="flex-1 overflow-hidden relative rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800">
                  <div className="absolute inset-0 overflow-auto custom-scrollbar">
                     <AiGenerator /> 
                  </div>
              </div>

           </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;