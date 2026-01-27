"use client";

import React, { useState } from 'react';
import { Users, Hammer, Activity, Calculator, Info, FileText, Lightbulb } from 'lucide-react';
import CountUp from 'react-countup';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import type { CleanInputProps, KPICardProps, VariableDefProps, ProfitLossGraphProps } from '@/types/roi';

const ROICalculation = () => {
  // --- 1. STATE ---
  // Defaults: Headcount 10, Build 4wks, Run $2500/WEEKLY
  const [userCount, setUserCount] = useState(10);
  const [userSalary, setUserSalary] = useState(70000); 
  const [userHours, setUserHours] = useState(10); 

  const [devSalary, setDevSalary] = useState(150000); 
  const [buildWeeks, setBuildWeeks] = useState(4); 
  const [runCostWeekly, setRunCostWeekly] = useState(2500); 

  // --- 2. CALCULATIONS ---
  const PROJECTION_WEEKS = 156; // 3 Year Horizon
  const WORK_HOURS_YR = 2080;
  
  // Rates
  const userHourlyRate = userSalary / WORK_HOURS_YR;
  const manualWeeklyBurn = (userCount * userHours) * userHourlyRate;
  
  const devWeeklyRate = devSalary / 52;
  const totalBuildCost = devWeeklyRate * buildWeeks; 
  
  const autoWeeklyRunCost = runCostWeekly;

  // Break Even
  const weeklyNetSavings = manualWeeklyBurn - autoWeeklyRunCost;
  const breakEvenWeeks = weeklyNetSavings > 0 
    ? totalBuildCost / weeklyNetSavings 
    : Infinity; 

  // Totals at 3 Years
  const totalManualCost = manualWeeklyBurn * PROJECTION_WEEKS;
  const totalAutoCost = totalBuildCost + (autoWeeklyRunCost * PROJECTION_WEEKS);
  const netSavings = totalManualCost - totalAutoCost;
  const efficiencyMultiplier = totalBuildCost > 0 ? (netSavings / totalBuildCost) : 0;
  const annualHoursSaved = (userCount * userHours) * 52;

  return (
    <div className="w-full max-w-5xl mx-auto my-8 font-sans text-zinc-800 dark:text-zinc-200">
      
      {/* --- MAIN CONTAINER (Graph + Dashboard) --- */}
      <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm mb-8">
          
          {/* 1. HERO GRAPH */}
          <div className="relative w-full h-[320px] bg-white dark:bg-black/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-col">
              <div className="absolute top-4 left-14 z-10 pointer-events-none">
                  <h2 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-white flex items-center gap-2">
                      <Activity className="text-blue-600" size={16} /> 
                      ROI Trajectory
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 max-w-md leading-relaxed">
                      Visualizing the cost arbitrage between human labor (Manual) and automated systems (Agentic)
                  </p>
              </div>
              <div className="absolute inset-0 pt-16 pb-2 pl-2 pr-0">
                   <ProfitLossGraph 
                        weeks={PROJECTION_WEEKS}
                        manualBurn={manualWeeklyBurn}
                        autoBurn={autoWeeklyRunCost}
                        buildCost={totalBuildCost}
                        breakEven={breakEvenWeeks}
                   />
              </div>
          </div>

          {/* 2. DASHBOARD GRID (Drivers + KPIs) */}
          <div className="p-4 grid lg:grid-cols-12 gap-4">
            
            {/* LEFT: MODEL DRIVERS */}
            <div className="lg:col-span-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm flex flex-col gap-6">
                <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Model Drivers</h3>
                    <div className="p-1 bg-zinc-100 dark:bg-zinc-800 rounded">
                        <Calculator size={12} className="text-zinc-500" />
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Manual Group */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Users size={14} className="text-rose-500"/>
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Manual Problem</span>
                        </div>
                        <CleanInput label="Headcount" val={userCount} set={setUserCount} min={1} max={50} step={1} unit="FTE" />
                        <CleanInput label="Avg Salary" val={userSalary} set={setUserSalary} min={40000} max={200000} step={5000} unit="$" />
                        <CleanInput label="Hrs/Wk" val={userHours} set={setUserHours} min={1} max={40} step={1} unit="h" />
                    </div>

                    {/* Engineering Group */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                             <Hammer size={14} className="text-blue-600"/>
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Agentic Solution</span>
                        </div>
                        <CleanInput label="Dev Salary" val={devSalary} set={setDevSalary} min={80000} max={300000} step={5000} unit="$" />
                        <CleanInput label="Build Time" val={buildWeeks} set={setBuildWeeks} min={1} max={24} step={1} unit="wks" />
                        <CleanInput label="Run Cost" val={runCostWeekly} set={setRunCostWeekly} min={0} max={10000} step={100} unit="$/wk" />
                    </div>
                </div>
            </div>

            {/* RIGHT: COMPACT KPI GRID */}
            <div className="lg:col-span-8 grid grid-cols-2 gap-3 h-full">
                
                {/* 1. NET SAVINGS */}
                <KPICard 
                    title="Net Savings (3Yr)"
                    value={netSavings}
                    prefix="$"
                    isCurrency={true}
                    color={netSavings >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                    bottomLabel={
                        <span>
                            Returns <span className="font-bold text-zinc-800 dark:text-white">${efficiencyMultiplier.toFixed(2)}</span> for every <span className="font-bold text-zinc-800 dark:text-white">$1</span> in engineering.
                        </span>
                    }
                />

                {/* 2. BREAK-EVEN */}
                <KPICard 
                    title="Time to Profit"
                    value={breakEvenWeeks === Infinity ? 0 : breakEvenWeeks}
                    suffix="wks"
                    isCurrency={false}
                    color="text-zinc-800 dark:text-white"
                    bottomLabel={
                         breakEvenWeeks === Infinity 
                         ? "Costs exceed savings." 
                         : <span>Investment paid off in <span className="font-bold text-zinc-800 dark:text-white">{(breakEvenWeeks/4).toFixed(1)} months</span>.</span>
                    }
                />

                 {/* 3. CAPACITY */}
                 <KPICard 
                    title="Capacity Unlocked"
                    value={annualHoursSaved}
                    suffix="hrs/yr"
                    isCurrency={false}
                    color="text-blue-600"
                    bottomLabel={
                        <span>Repurposed <span className="font-bold text-zinc-800 dark:text-white">{(annualHoursSaved / 2080).toFixed(1)} FTEs</span> to strategy.</span>
                    }
                />

                {/* 4. TOTAL INVESTMENT */}
                <KPICard 
                    title="Total CapEx"
                    value={totalBuildCost}
                    prefix="$"
                    isCurrency={true}
                    color="text-zinc-800 dark:text-white"
                    bottomLabel="Upfront fixed engineering cost."
                />
            </div>

          </div>
      </div>

      {/* --- SECTION 3: EXPANDED ENGINEERING LOGIC (First Principles) --- */}
      <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: STEP-BY-STEP DERIVATION */}
          <div className="lg:col-span-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm">
             <div className="flex items-center gap-3 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><Calculator size={24} /></div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Engineering Derivation</h3>
             </div>
             
             <div className="space-y-10">
                 
                 {/* Step 1: Manual Cost */}
                 <div className="relative pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">1</div>
                    <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">
  Manual Cost (<InlineMath math="C_{manual}" />)
</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed max-w-2xl">
                        We calculate the collective cost of the task by multiplying the headcount involved <b>(<InlineMath math="N" />) </b>, 
                        the time they dedicate to the task <b>(<InlineMath math="H" />) </b>
                        and their hourly cost to the company <b>(<InlineMath math="\frac{S_{annual}}{2080}" />) </b>
                        by the number of times this calculation is repeated <b>(<InlineMath math="t" />)</b>
                    </p>
                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                         <div className="mb-2">
                            <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Formula</div>
                            <div className="font-mono font-bold text-xl text-zinc-900 dark:text-zinc-100">
                                <InlineMath math="C_{manual}(t) = N \times \sum_{n=1}^{N} \frac{H_{n}}{n} \times \sum_{n=1}^{N} \frac{S_{annual,n}}{n \times 2080} \times t" />
                            </div>
                         </div>
                         <p className="text-xs text-zinc-500 italic">
                             Where 2080 represents the standard work hours in a year (40hrs x 52wks).
                         </p>
                    </div>
                 </div>

                 {/* Step 2: Auto Cost */}
                 <div className="relative pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">2</div>
                    <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">
  Automated Cost (<InlineMath math="C_{auto}" />)
</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed max-w-2xl">
                        The cost of the automated solution is the sum of the initial engineering investment (Salary during build time) plus the ongoing infrastructure run cost (<InlineMath math="C_{auto}(t)=C_{build}+C_{cloud}" />).
                    </p>
                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Initial Investment (Build)</div>
                                <div className="font-mono font-bold text-xl text-zinc-900 dark:text-zinc-100">
                                    <InlineMath math="C_{build} = \left( \frac{S_{dev}}{52} \right) \times W_{weeks}" />
                                </div>
                                <p className="text-xs text-zinc-500 italic">
                                    Where 52 is the number of weeks in one year to normalize annual Salary to weekly.
                                </p>
                             </div>
                             <div>
                                <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Ongoing Run Cost</div>
                                <div className="font-mono font-bold text-xl text-zinc-900 dark:text-zinc-100">
                                    <InlineMath math="C_{run}(t) = C_{cloud} \times t" />
                                </div>
                              <p className="text-xs text-zinc-500 italic">
                             Where the variable cloud costs are estimated at a weekly average.
                            </p>
                             </div>

                        </div>
                    </div>
                 </div>

                 {/* Step 3: Break Even */}
                 <div className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-900">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">3</div>
                    <h4 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">
                        Solve for Break-Even (<InlineMath math="t_{break}" />)
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed max-w-2xl">
                        We equate <InlineMath math="C_{manual}" /> to <InlineMath math="C_{auto}" /> to find <strong><InlineMath math="t" /></strong>, which represents the number of times the calculation or task is repeated until the engineering investment is fully repaid.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
                        
                        <div className="space-y-6">
                            {/* Line 0: Initiate Model */}
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-800 pb-3">
                                <span className="text-xs font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wide">0. Initiate Break-Even Model</span>
                                <div className="font-mono font-bold text-xl text-blue-800 dark:text-blue-100">
                                    <InlineMath math="C_{manual}(t) = C_{auto}(t)" />
                                </div>
                            </div>

                            {/* Line 1: Equate / Expand */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-800 pb-3">
                                <span className="text-xs font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wide">1. Expand Cumulative Terms</span>
                                <div className="font-mono font-bold text-xl text-blue-800 dark:text-blue-100">
                                    <InlineMath math="C_{manual} \cdot t = C_{build} + C_{cloud} \cdot t" />
                                </div>
                            </div>

                            {/* Line 2: Group Terms */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-800 pb-3">
                                <span className="text-xs font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wide">2. Isolate Variable (<InlineMath math="t" />)</span>
                                <div className="font-mono font-bold text-lg text-blue-800 dark:text-blue-100">
                                    <InlineMath math="t \cdot (C_{manual} - C_{cloud}) = C_{build}" />
                                </div>
                            </div>

                            {/* Line 3: Final Solution */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <span className="text-xs font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wide">3. Final Solution</span>
                                <div className="font-mono font-bold text-xl text-blue-800 dark:text-blue-100">
                                    <InlineMath math="t_{break} = \frac{C_{build}}{C_{manual} - C_{cloud}}" />
                                </div>
                            </div>
                        </div>

                    </div>
                 </div>

                 {/* Step 4: Profitable Case */}
                 <div className="relative pl-4 border-l-2 border-emerald-200 dark:border-emerald-900">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">4</div>
                    <h4 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                        Case A: Profitable (<InlineMath math="C_{manual} > C_{cloud}" />)
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed max-w-2xl">
                        We compare the <strong>weekly</strong> cost of manual labor against the <strong>weekly</strong> cloud infrastructure cost. This assumes no further engineering maintenance is required beyond keeping the infrastructure running for each repeated calculation.
                    </p>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wide mb-2">Condition</div>
                                <div className="font-mono font-bold text-m text-emerald-800 dark:text-emerald-100">
                                    <InlineMath math="\text{Savings} = C_{manual} - C_{cloud} > 0" />
                                </div>
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-300 italic border-l-2 border-emerald-200 dark:border-emerald-800 pl-4">
                            Conclusion: It is <span className="text-green-600 font-bold"> worth</span> the initial investment to build. The graph lines intersect, creating a <span className="text-emerald-600 font-bold">profit zone</span>.
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Step 5: Unprofitable Case */}
                 <div className="relative pl-4 border-l-2 border-rose-200 dark:border-rose-900">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white">5</div>
                    <h4 className="text-lg font-bold text-rose-700 dark:text-rose-400 mb-2">
                        Case B: Unprofitable (<InlineMath math="C_{manual} < C_{cloud}" />)
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed max-w-2xl">
                        If the Cloud Run Cost exceeds the Manual Cost, the denominator becomes negative. While mathematically this yields a negative time, in reality, it indicates that the automation is simply more expensive to operate than the manual process.
                    </p>
                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                                <div className="text-xs font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wide mb-2">Condition</div>
                                <div className="font-mono font-bold text-lg text-rose-800 dark:text-rose-100">
                                    <InlineMath math="t_{break} = \frac{C_{build}}{\text{Negative}} < 0" />
                                </div>
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-300 italic border-l-2 border-rose-200 dark:border-rose-800 pl-4">
                                Conclusion: It is <span className="text-rose-600 font-bold">not worth</span> the initial investment to build, as the running costs alone exceed the manual value.
                            </div>
                        </div>
                    </div>
                 </div>

             </div>
          </div>

          {/* RIGHT: VARIABLES & ASSUMPTIONS */}
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm flex flex-col gap-8">
             
             {/* Definitions */}
             <div>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"><FileText size={20} /></div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Variable Legend</h3>
                 </div>
                 <div className="space-y-4">
                    <VariableDef symbol="C" desc="Cost" />
                    <VariableDef symbol="N" desc="Headcount (Employees)" />
                    <VariableDef symbol="H" desc="Hours/Week dedicated to task" />
                    <VariableDef symbol="S_{annual}" desc="Employee Annual Salary" />
                    <VariableDef symbol="S_{dev}" desc="Developer Annual Salary" />
                    <VariableDef symbol="W_{weeks}" desc="Development Time (Weeks)" />
                    <VariableDef symbol="C_{cloud}" desc="Weekly Cloud Costs" />
                    <VariableDef symbol="t" desc="Number of repeated calculations" />
                 </div>
             </div>

             <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800" />

             {/* Assumptions */}
             <div>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"><Info size={20} /></div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Modeling Assumptions</h3>
                 </div>
                 <ul className="space-y-4">
                    <AssumptionItem text="Work year = 2,080 hours (40hr/wk × 52wks) for all hourly rate derivations." />
                    <AssumptionItem text="No Business Ramp-up: Model assumes stakeholder buy-in and user adoption are prerequisites for project initiation (0 to 1)." />
                    <AssumptionItem text="No Learning Curve: Model Immediately provides values" />
                    <AssumptionItem text="Run Costs assume standard cloud infrastructure (AWS/Vercel) + API usage tokens." />
                </ul>
             </div>

             {/* Rationale for Initial Conditions */}
             <div>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"><Lightbulb size={20} /></div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Rationale for Conditions</h3>
                 </div>
                 <ul className="space-y-4">
                 <AssumptionItem text="Dev Salary represents you hired me at a $150,000 annual salary to build and maintain these systems." />
                    <AssumptionItem text="Headcount & Hours: Representative of professional experience in small companies (<50 people) where roles are often hybrid." />
                    <AssumptionItem text="Build Time (4 Weeks): Includes full cycle abstraction, architecture, development, and deployment. Realistically often takes ~1 week, but 4 weeks provides a conservative buffer." />
                    <AssumptionItem text="Run Cost: Based on variable Snowflake compute credits + storage. A medium workload typically incurs $1k-$5k weekly." />
                </ul>
             </div>

          </div>

      </div>
    </div>
  );
};

// --- SUBCOMPONENTS ---

const CleanInput = ({ label, val, set, min, max, step, unit }: CleanInputProps) => {
    const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const ariaValueText = `${val.toLocaleString()}${unit}`;

    return (
        <div className="group">
            <div className="flex justify-between items-end mb-2">
                <label
                    htmlFor={inputId}
                    className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
                >
                    {label}
                </label>
                <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                    {val.toLocaleString()}{unit}
                </span>
            </div>
            <input
                id={inputId}
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={e => set(+e.target.value)}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={val}
                aria-valuetext={ariaValueText}
                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-800 dark:accent-white hover:accent-blue-600 dark:hover:accent-blue-400 transition-colors"
            />
        </div>
    );
};

const KPICard = ({ icon, title, value, prefix, suffix, isCurrency, color, bottomLabel }: KPICardProps) => (
    <div className="flex flex-col h-full bg-white dark:bg-black p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex-grow flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{title}</div>
                <div className="p-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg">{icon}</div>
            </div>
            
            {/* A3: Reduced duration for snappy reactive updates */}
            <div
              className={`text-5xl lg:text-6xl font-black tracking-tighter leading-none ${color} mb-1`}
              aria-live="polite"
              aria-atomic="true"
            >
                {prefix}
                <CountUp end={value} separator="," duration={0.3} decimals={isCurrency ? 0 : 1} />
                {suffix && <span className="text-2xl text-zinc-400 ml-1 font-bold align-baseline">{suffix}</span>}
            </div>
        </div>
        
        <div className="pt-3 border-t border-zinc-50 dark:border-zinc-800 mt-auto">
             <div className="text-sm text-zinc-500 dark:text-zinc-400 leading-snug">
                {bottomLabel}
             </div>
        </div>
    </div>
);

const VariableDef = ({ symbol, desc }: VariableDefProps) => (
    <div className="flex items-center gap-4">
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm w-12 text-center bg-blue-50 dark:bg-blue-900/20 rounded py-1 border border-blue-100 dark:border-blue-900/50 shrink-0">
            <InlineMath math={symbol} />
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{desc}</span>
    </div>
);

const AssumptionItem = ({ text }: { text: string }) => (
    <li className="flex gap-3 items-start text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 mt-1.5 shrink-0" />
        {text}
    </li>
);

// --- GRAPH COMPONENT ---
const ProfitLossGraph = ({ weeks, manualBurn, autoBurn, buildCost, breakEven }: ProfitLossGraphProps) => {
    const width = 1000; 
    const height = 300; 
    const paddingRight = 60; 
    const paddingBottom = 20; 
    const graphHeight = height - paddingBottom;
    const graphWidth = width - paddingRight; 
    
    // 1. HOVER STATE
    const [hoverWeek, setHoverWeek] = useState<number | null>(null);

    // Scaling
    const maxManual = manualBurn * weeks;
    const maxAuto = buildCost + (autoBurn * weeks);
    const maxY = Math.max(maxManual, maxAuto) * 1.1; 

    // Coord Helpers
    const getY = (val: number) => graphHeight - ((val / maxY) * graphHeight);
    const getX = (w: number) => (w / weeks) * graphWidth; 

    // Line Coords
    const startY = graphHeight;
    const manualEndY = getY(maxManual);
    const autoStartY = getY(buildCost);
    const autoEndY = getY(maxAuto);
    const endX = graphWidth; 

    // Intersection
    let crossX = 0;
    let crossY = 0;
    const hasIntersection = breakEven > 0 && breakEven < weeks;
    
    if (hasIntersection) {
        crossX = getX(breakEven);
        crossY = getY(manualBurn * breakEven);
    }

    // Generate minor tickers
    const yearWidth = graphWidth / 3;
    const minorTicks = [];
    for(let yr = 0; yr < 3; yr++) {
        for(let q = 1; q < 4; q++) {
            const x = (yr * yearWidth) + (q * (yearWidth / 4));
            minorTicks.push(x);
        }
    }

    // Y-Axis Ticks (Dollar Amounts)
    const yTicks = [0, maxManual, maxAuto];

    // 2. MOUSE HANDLERS
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate X relative to the SVG, accounting for scaling/responsiveness if necessary
        // A robust way for fixed viewBox is mapping the ratio:
        const xRatio = (e.clientX - rect.left) / rect.width;
        const svgX = xRatio * width;

        if (svgX < 0 || svgX > graphWidth) {
            setHoverWeek(null);
            return;
        }

        // Convert svgX to weeks
        // svgX = (w / weeks) * graphWidth
        const w = (svgX / graphWidth) * weeks;
        setHoverWeek(Math.max(0, w));
    };

    const handleMouseLeave = () => setHoverWeek(null);

    // 3. HOVER DATA CALCULATION
    let hoverData = null;
    if (hoverWeek !== null) {
        const currentManual = manualBurn * hoverWeek;
        const currentAuto = buildCost + (autoBurn * hoverWeek);
        const diff = currentManual - currentAuto;
        
        hoverData = {
            x: getX(hoverWeek),
            manualY: getY(currentManual),
            autoY: getY(currentAuto),
            manualVal: currentManual,
            autoVal: currentAuto,
            net: diff
        };
    }

    return (
        <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full overflow-visible font-sans cursor-crosshair touch-none" 
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
             
             {/* Base Grid */}
             <line x1="0" y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" className="text-zinc-400" />
             
             {/* Y-AXIS GRID & LABELS */}
             {yTicks.map((val, i) => {
                 const y = getY(val);
                 if (i === 0) return null; 
                 return (
                    <g key={i}>
                        <line x1="0" y1={y} x2={graphWidth} y2={y} stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" className="text-zinc-400" />
                        <text x={graphWidth + 10} y={y + 3} textAnchor="start" className="text-[10px] font-bold fill-zinc-400">
                            ${(val / 1000).toFixed(0)}k
                        </text>
                    </g>
                 )
             })}
             
             <text x={graphWidth + 10} y={graphHeight + 3} textAnchor="start" className="text-[10px] font-bold fill-zinc-400">$0</text>
             <line x1={graphWidth} y1={0} x2={graphWidth} y2={graphHeight} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" className="text-zinc-400" />

             {/* Minor Tickers */}
             {minorTicks.map((x, i) => (
                 <line key={i} x1={x} y1={graphHeight} x2={x} y2={graphHeight - 5} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" className="text-zinc-300 dark:text-zinc-700" />
             ))}

             {/* Major Ticks */}
             <line x1={yearWidth} y1={graphHeight} x2={yearWidth} y2={graphHeight + 5} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" className="text-zinc-400" />
             <line x1={yearWidth * 2} y1={graphHeight} x2={yearWidth * 2} y2={graphHeight + 5} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" className="text-zinc-400" />

             {/* --- AREAS --- */}
             {hasIntersection ? (
                 <>
                    <path d={`M 0,${startY} L ${crossX},${crossY} L ${crossX},${getY(buildCost + autoBurn * breakEven)} L 0,${autoStartY} Z`} className="fill-rose-50 dark:fill-rose-900/20" />
                    <path d={`M ${crossX},${crossY} L ${endX},${manualEndY} L ${endX},${autoEndY} L ${crossX},${crossY} Z`} className="fill-emerald-50 dark:fill-emerald-900/20" />
                 </>
             ) : (
                manualBurn * weeks < buildCost + autoBurn * weeks ? (
                     <path d={`M 0,${startY} L ${endX},${manualEndY} L ${endX},${autoEndY} L 0,${autoStartY} Z`} className="fill-rose-50 dark:fill-rose-900/20" />
                ) : (
                    <path d={`M 0,${startY} L ${endX},${manualEndY} L ${endX},${autoEndY} L 0,${autoStartY} Z`} className="fill-emerald-50 dark:fill-emerald-900/20" />
                )
             )}

            {/* --- LINES --- */}
            {/* Manual */}
            <path d={`M 0,${startY} L ${endX},${manualEndY}`} fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="4,4" className="opacity-50" />
            <text x={endX - 10} y={manualEndY - 10} textAnchor="end" className="text-[10px] font-bold fill-rose-600 uppercase tracking-wider">Manual</text>

            {/* Agentic */}
            <path d={`M 0,${autoStartY} L ${endX},${autoEndY}`} fill="none" stroke="#2563eb" strokeWidth="3" />
            <text x={endX - 10} y={autoEndY - 10} textAnchor="end" className="text-[10px] font-bold fill-blue-600 uppercase tracking-wider">Agentic</text>

            {/* --- HOVER INTERACTION OVERLAY --- */}
            {/* Transparent rect to catch events everywhere in the grid */}
            <rect x={0} y={0} width={graphWidth} height={graphHeight} fill="transparent" />

            {/* --- HOVER TOOLTIP & MARKERS --- */}
            {hoverData && (
                <g>
                    {/* Vertical Indicator Line */}
                    <line 
                        x1={hoverData.x} y1={0} 
                        x2={hoverData.x} y2={graphHeight} 
                        stroke="#71717a" strokeWidth="1" strokeDasharray="3,3" 
                    />

                    {/* Intersection Points */}
                    <circle cx={hoverData.x} cy={hoverData.manualY} r="4" className="fill-rose-500" stroke="white" strokeWidth="2" />
                    <circle cx={hoverData.x} cy={hoverData.autoY} r="4" className="fill-blue-600" stroke="white" strokeWidth="2" />

                    {/* Tooltip Box */}
                    {/* Shift tooltip left if near the right edge */}
                    <g transform={`translate(${hoverData.x > graphWidth * 0.7 ? hoverData.x - 170 : hoverData.x + 15}, ${Math.min(hoverData.manualY, hoverData.autoY)})`}>
                        <rect x="0" y="-10" width="160" height="90" rx="6" className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-700 shadow-xl" strokeWidth="1" />
                        
                        <g transform="translate(12, 12)">
                            {/* Header: Week Number */}
                            <text y="6" className="text-[10px] font-black uppercase tracking-wider fill-zinc-400">
                                Week {hoverWeek?.toFixed(0)}
                            </text>

                            {/* Manual Row */}
                            <circle cx="4" cy="24" r="3" className="fill-rose-500" />
                            <text x="12" y="27" className="text-xs font-bold fill-zinc-700 dark:fill-zinc-200">
                                Manual: ${(hoverData.manualVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </text>

                            {/* Auto Row */}
                            <circle cx="4" cy="44" r="3" className="fill-blue-600" />
                            <text x="12" y="47" className="text-xs font-bold fill-zinc-700 dark:fill-zinc-200">
                                Agentic: ${(hoverData.autoVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </text>

                            {/* Net Difference */}
                            <line x1="0" y1="58" x2="136" y2="58" stroke="currentColor" strokeOpacity="0.1" className="text-zinc-500" />
                            <text x="0" y="74" className={`text-xs font-black ${hoverData.net > 0 ? 'fill-emerald-600' : 'fill-rose-500'}`}>
                                {hoverData.net > 0 ? 'Savings: ' : 'Loss: '} 
                                ${(Math.abs(hoverData.net)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </text>
                        </g>
                    </g>
                </g>
            )}

            {/* --- X AXIS LABELS (Time) --- */}
            <text x={0} y={height} className="text-[10px] font-bold fill-zinc-400 uppercase">Start</text>
            <text x={yearWidth} y={height} textAnchor="middle" className="text-[10px] font-bold fill-zinc-400 uppercase">Year 1</text>
            <text x={yearWidth * 2} y={height} textAnchor="middle" className="text-[10px] font-bold fill-zinc-400 uppercase">Year 2</text>
            <text x={graphWidth} y={height} textAnchor="end" className="text-[10px] font-bold fill-zinc-400 uppercase">Year 3</text>

            {/* --- BREAK EVEN MARKER (Only show if not hovering to reduce clutter) --- */}
            {hasIntersection && !hoverData && (
                <g>
                    <circle cx={crossX} cy={crossY} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                    <line x1={crossX} y1={crossY} x2={crossX} y2={graphHeight} stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
                    <text x={crossX} y={graphHeight - 10} textAnchor="middle" className="text-[10px] font-bold fill-emerald-600 bg-white dark:bg-black p-1">Break-Even</text>
                </g>
            )}
        </svg>
    )
}

export default ROICalculation;