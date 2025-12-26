"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Zap, Scale, Server, ArrowDown } from 'lucide-react';
import CountUp from 'react-countup';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

const EfficiencyCalculator = () => {
  // --- INPUT STATE ( The Variables ) ---
  const [headcount, setHeadcount] = useState(10);      // Variable: H
  const [avgSalary, setAvgSalary] = useState(120000);  // Variable: S
  const [manualHours, setManualHours] = useState(5);   // Variable: C_manual (Hours/week)

  // --- CONSTANTS ---
  const WEEKS_PER_YEAR = 52;
  // We assume Agentic workflows are ~95% more efficient (supervision only)
  const EFFICIENCY_FACTOR = 0.95; 

  // --- THE MATH ( The Integration ) ---
  const hourlyRate = avgSalary / 2080;
  
  // 1. Calculate C_manual (The Cost of Inefficiency)
  // Formula: Headcount * HourlyRate * Hours/Week * 52
  const costManual = headcount * hourlyRate * manualHours * WEEKS_PER_YEAR;

  // 2. Calculate V_agent (The Cost of the Solution)
  // Agentic cost is supervision time + fixed infrastructure overhead
  const costAgentic = (costManual * (1 - EFFICIENCY_FACTOR)) + 5000;

  // 3. Calculate R_net (The Net Revenue/Savings)
  const netRevenue = costManual - costAgentic;

  // 4. Calculate % Improvement (The Delta)
  const percentImprovement = Math.round(((costManual - costAgentic) / costManual) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto mb-24 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      
      {/* HEADER */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <Scale size={18} className="text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Algorithm: <span className="text-zinc-800 dark:text-zinc-200">Scalable Infrastructure Leverage</span>
            </span>
        </div>
        <div className="text-[10px] text-zinc-400 font-mono bg-white dark:bg-zinc-900 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">
            <InlineMath math="R_{net} \approx C_{manual} \times \eta_{eng}" />
        </div>
      </div>

      <div className="grid lg:grid-cols-12">
        
        {/* LEFT PANEL: The Variables (Inputs) */}
        <div className="lg:col-span-5 p-6 space-y-8 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            
            {/* Variable 1: Headcount */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-2">
                        <Users size={12} /> Impacted Team Size
                    </label>
                    <span className="text-xs font-bold text-blue-600">{headcount} People</span>
                </div>
                <input 
                    type="range" min="1" max="100" step="1" 
                    value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            {/* Variable 2: Salary */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-2">
                        <DollarSign size={12} /> Avg. Salary
                    </label>
                    <span className="text-xs font-bold text-blue-600">${(avgSalary/1000).toFixed(0)}k/yr</span>
                </div>
                <input 
                    type="range" min="60000" max="250000" step="5000" 
                    value={avgSalary} onChange={(e) => setAvgSalary(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            {/* Variable 3: Inefficiency */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-2">
                        <Zap size={12} /> Manual Effort / Week
                    </label>
                    <span className="text-xs font-bold text-rose-500">{manualHours} Hours</span>
                </div>
                <input 
                    type="range" min="1" max="20" step="1" 
                    value={manualHours} onChange={(e) => setManualHours(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <p className="text-[10px] text-zinc-400 mt-2">
                    Time spent manually performing tasks per person (Data Entry, ETL, QA).
                </p>
            </div>

        </div>

        {/* RIGHT PANEL: The Calculation (Outputs) */}
        <div className="lg:col-span-7 bg-zinc-50/50 dark:bg-zinc-900/30 p-8 flex flex-col justify-center">
            
            {/* The Visual Comparison */}
            <div className="space-y-6">
                
                {/* 1. The Expensive Old Way */}
                <div className="relative">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-zinc-500">Manual Process Cost (<InlineMath math="C_{manual}" />)</span>
                        <span className="font-mono text-zinc-500">${(costManual/1000).toFixed(1)}k/yr</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            className="h-full bg-zinc-400"
                        />
                    </div>
                </div>

                {/* 2. The Scalable New Way */}
                <div className="relative">
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-blue-600 flex items-center gap-1">
                            <Server size={10} /> Agentic Infrastructure (<InlineMath math="V_{agent}" />)
                        </span>
                        
                        {/* 🟢 PERCENT IMPROVEMENT INDICATOR */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <ArrowDown size={10} /> {percentImprovement}% Cost
                            </span>
                            <span className="font-mono text-blue-600">${(costAgentic/1000).toFixed(1)}k/yr</span>
                        </div>
                    </div>
                    
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(costAgentic / costManual) * 100}%` }}
                            transition={{ type: "spring", stiffness: 100 }}
                            className="h-full bg-blue-500"
                        />
                    </div>
                    <p className="text-[9px] text-blue-500/80 mt-1 pl-1">
                        *Infrastructure scales logarithmically.
                    </p>
                </div>
            </div>

            {/* The BIG Result: Net Gains */}
            <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-end justify-between">
                    <div>
                        <h4 className="text-sm font-bold uppercase text-zinc-500 tracking-widest mb-1">Net Revenue Recognized</h4>
                        <p className="text-[10px] text-zinc-400">Total annual value (<InlineMath math="R_{net}" />) generated.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl lg:text-5xl font-black text-emerald-500 font-mono tracking-tight">
                            $<CountUp end={netRevenue} duration={0.8} separator="," />
                        </div>
                        {/* 🟢 MARGIN IMPROVEMENT BADGE */}
                        <div className="flex items-center justify-end gap-2 mt-2">
                             <span className="text-[10px] uppercase font-bold text-zinc-400">Margin Gain:</span>
                             <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {percentImprovement}%
                             </span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default EfficiencyCalculator;