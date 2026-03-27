"use client";

import React, { useState } from 'react';
import { Users, Hammer, Activity, Calculator, Info, FileText, Lightbulb } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { PROJECTION_WEEKS, WORK_HOURS_YR, ROI_DEFAULTS } from '@/constants/roi';
import CleanInput from './CleanInput';
import KPICard from './KPICard';
import ProfitLossGraph from './ProfitLossGraph';
import VariableDef from './VariableDef';
import AssumptionItem from './AssumptionItem';

const ROICalculation = () => {
  // --- 1. STATE ---
  const [userCount, setUserCount] = useState<number>(ROI_DEFAULTS.userCount);
  const [userSalary, setUserSalary] = useState<number>(ROI_DEFAULTS.userSalary);
  const [userHours, setUserHours] = useState<number>(ROI_DEFAULTS.userHours);

  const [devSalary, setDevSalary] = useState<number>(ROI_DEFAULTS.devSalary);
  const [buildWeeks, setBuildWeeks] = useState<number>(ROI_DEFAULTS.buildWeeks);
  const [runCostWeekly, setRunCostWeekly] = useState<number>(ROI_DEFAULTS.runCostWeekly);

  // --- 2. CALCULATIONS ---
  
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
      <div className="surface-secondary border-default rounded-2xl overflow-hidden shadow-sm mb-8">
          
          {/* 1. HERO GRAPH */}
          <div className="relative w-full h-[320px] surface-primary border-b border-default flex flex-col">
              <div className="absolute top-4 left-14 z-10 pointer-events-none">
                  <h2 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-white flex items-center gap-2">
                      <Activity className="text-blue-600" size={16} /> 
                      ROI Trajectory
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1 max-w-md leading-relaxed">
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
            <div className="lg:col-span-4 card-base p-5 flex flex-col gap-6">
                <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="text-micro text-zinc-400">Model Drivers</h3>
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
          <div className="lg:col-span-2 card-base p-8">
             <div className="flex items-center gap-3 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><Calculator size={24} /></div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Engineering Derivation</h3>
             </div>
             
             <div className="space-y-10">
                 
                 {/* Step 1: Manual Cost */}
                 <div className="step-divider">
                    <div className="step-circle">1</div>
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
                 <div className="step-divider">
                    <div className="step-circle">2</div>
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
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">3</div>
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
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">4</div>
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
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-xs font-bold text-white">5</div>
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
          <div className="card-base p-8 flex flex-col gap-8">
             
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

export default ROICalculation;