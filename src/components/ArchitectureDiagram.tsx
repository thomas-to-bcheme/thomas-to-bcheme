// src/components/ArchitectureDiagram.tsx
'use client';

import React from 'react';

export default function ArchitectureDiagram() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Container for the diagram */}
      <div className="relative flex flex-col items-center space-y-8">
        
        {/* --- LEVEL 1: EMPIRICAL DATA --- */}
        <div className="relative group w-full max-w-2xl">
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 rounded-2xl -m-4 blur-xl transition-all group-hover:bg-blue-500/20" />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            {/* Icon Box */}
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            {/* Text */}
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Empirical Data Acquisition</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Capturing raw signals from the <strong>Manufacturing Floor</strong>. 
                Sensors, logs, and user inputs provide the ground truth for reality-based modeling.
              </p>
            </div>
          </div>
        </div>

        {/* Arrow Down */}
        <div className="h-8 w-0.5 bg-zinc-300 dark:bg-zinc-700"></div>

        {/* --- LEVEL 2: INFRASTRUCTURE & MODELING --- */}
        <div className="relative group w-full max-w-2xl">
          <div className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/5 rounded-2xl -m-4 blur-xl transition-all group-hover:bg-purple-500/20" />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="h-16 w-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Data Infrastructure & Modeling</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                <strong>Enterprise ETL/ELT Pipelines</strong> and rigorous Data Modeling. 
                Digitizing physical processes into structured, queryable assets (SQL/NoSQL/DynamoDB).
              </p>
            </div>
          </div>
        </div>

        {/* Arrow Down */}
        <div className="h-8 w-0.5 bg-zinc-300 dark:bg-zinc-700"></div>

        {/* --- LEVEL 3: APPLICATIONS & AGENTIC AI --- */}
        <div className="relative group w-full max-w-2xl">
          <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-2xl -m-4 blur-xl transition-all group-hover:bg-indigo-500/20" />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Algorithmic and/or Agentic Applications</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Digital Transformation via <strong>Agentic Machine Learning</strong>. 
                Deploying automated, self-optimizing software that reflects real-world dynamics.
              </p>
            </div>
          </div>
        </div>

        {/* Arrow Down */}
        <div className="h-8 w-0.5 bg-zinc-300 dark:bg-zinc-700"></div>

        {/* --- LEVEL 4: TANGIBLE VALUE --- */}
        <div className="relative group w-full max-w-2xl">
          <div className="absolute inset-0 bg-green-500/10 dark:bg-green-500/5 rounded-2xl -m-4 blur-xl transition-all group-hover:bg-green-500/20" />
          <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0 border border-green-200 dark:border-green-800">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-green-900 dark:text-green-100">Tangible Value & ROI</h3>
              <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                <strong>Efficiency, Revenue, Optimization.</strong> <br/>
                Delivering 0-to-1 scalable solutions that ground software in financial reality.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}