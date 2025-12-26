"use client";

import React from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { TrendingUp, Activity, Zap } from 'lucide-react';

const ImpactEquation = () => {
  return (
    <div className="w-full max-w-4xl mx-auto my-12 bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      
      {/* 1. THE HEADER: Contextual Tags */}
      <div className="bg-zinc-50 dark:bg-zinc-950 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-4 justify-center md:justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            The Transformation Theorem
        </span>
        <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Zap size={12} /> Efficiency
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <TrendingUp size={12} /> Revenue
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                <Activity size={12} /> Optimization
            </div>
        </div>
      </div>

      <div className="p-8">
        
        {/* 2. THE MATHEMATICAL MODEL */}
        {/* We add \sum_{n=1}^{N} to represent scaling across 'N' people */}
        <div className="text-xl md:text-3xl text-zinc-800 dark:text-zinc-100 overflow-x-auto py-4 flex justify-center">
            <BlockMath math="R_{net} = \sum_{n=1}^{N} \int_{0}^{T} \left( C_{manual}(t) - \frac{V_{agent}(t)}{\eta_{eng}} \right) dt" />
        </div>

        {/* 3. THE LAYMAN DEFINITION */}
        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 text max-w-2xl mx-auto">
            <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-loose font-light">
            "Net gains (<span className="text-zinc-900 dark:text-white font-medium"><InlineMath math="R_{net}" /></span>) 
            are the measurable delta between manual process costs 
            (<span className="text-zinc-900 dark:text-white font-medium"><InlineMath math="C_{manual}" /></span>) 
            and optimized agentic output 
            (<span className="text-zinc-900 dark:text-white font-medium"><InlineMath math="V_{agent}" /></span>), 
            directly converting engineering efficiency 
            (<span className="text-zinc-900 dark:text-white font-medium"><InlineMath math="\eta_{eng}" /></span>) 
            into recognized revenue."
            </p>
            <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-loose font-light">
            Where "engineering efficiency" includes the initial investment, overhead to maintain, and any other hidden costs (e.g API token calls to LLMs)
            </p>
        </div>

      </div>
    </div>
  );
};
export default ImpactEquation;