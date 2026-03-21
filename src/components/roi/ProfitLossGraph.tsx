"use client";

import React, { useState } from 'react';
import type { ProfitLossGraphProps } from '@/types/roi';

const ProfitLossGraph = ({ weeks, manualBurn, autoBurn, buildCost, breakEven }: ProfitLossGraphProps) => {
    const width = 1000;
    const height = 300;
    const paddingRight = 60;
    const paddingBottom = 20;
    const graphHeight = height - paddingBottom;
    const graphWidth = width - paddingRight;

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

    // Mouse Handlers
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xRatio = (e.clientX - rect.left) / rect.width;
        const svgX = xRatio * width;

        if (svgX < 0 || svgX > graphWidth) {
            setHoverWeek(null);
            return;
        }

        const w = (svgX / graphWidth) * weeks;
        setHoverWeek(Math.max(0, w));
    };

    const handleMouseLeave = () => setHoverWeek(null);

    // Hover Data Calculation
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
             {yTicks.map((val, tickIndex) => {
                 const y = getY(val);
                 if (tickIndex === 0) return null;
                 return (
                    <g key={`ytick-${val}`}>
                        <line x1="0" y1={y} x2={graphWidth} y2={y} stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" className="text-zinc-400" />
                        <text x={graphWidth + 10} y={y + 3} textAnchor="start" className="text-xs font-bold fill-zinc-400">
                            ${(val / 1000).toFixed(0)}k
                        </text>
                    </g>
                 )
             })}

             <text x={graphWidth + 10} y={graphHeight + 3} textAnchor="start" className="text-xs font-bold fill-zinc-400">$0</text>
             <line x1={graphWidth} y1={0} x2={graphWidth} y2={graphHeight} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" className="text-zinc-400" />

             {/* Minor Tickers */}
             {minorTicks.map((x) => (
                 <line key={`tick-${x}`} x1={x} y1={graphHeight} x2={x} y2={graphHeight - 5} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" className="text-zinc-300 dark:text-zinc-700" />
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
            <path d={`M 0,${startY} L ${endX},${manualEndY}`} fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="4,4" className="opacity-50" />
            <text x={endX - 10} y={manualEndY - 10} textAnchor="end" className="text-micro fill-rose-600">Manual</text>

            <path d={`M 0,${autoStartY} L ${endX},${autoEndY}`} fill="none" stroke="#2563eb" strokeWidth="3" />
            <text x={endX - 10} y={autoEndY - 10} textAnchor="end" className="text-micro fill-blue-600">Agentic</text>

            {/* Transparent rect to catch events everywhere in the grid */}
            <rect x={0} y={0} width={graphWidth} height={graphHeight} fill="transparent" />

            {/* --- HOVER TOOLTIP & MARKERS --- */}
            {hoverData && (
                <g>
                    <line
                        x1={hoverData.x} y1={0}
                        x2={hoverData.x} y2={graphHeight}
                        stroke="#71717a" strokeWidth="1" strokeDasharray="3,3"
                    />

                    <circle cx={hoverData.x} cy={hoverData.manualY} r="4" className="fill-rose-500" stroke="white" strokeWidth="2" />
                    <circle cx={hoverData.x} cy={hoverData.autoY} r="4" className="fill-blue-600" stroke="white" strokeWidth="2" />

                    <g transform={`translate(${hoverData.x > graphWidth * 0.7 ? hoverData.x - 170 : hoverData.x + 15}, ${Math.min(hoverData.manualY, hoverData.autoY)})`}>
                        <rect x="0" y="-10" width="160" height="90" rx="6" className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-700 shadow-xl" strokeWidth="1" />

                        <g transform="translate(12, 12)">
                            <text y="6" className="text-micro fill-zinc-400">
                                Week {hoverWeek?.toFixed(0)}
                            </text>

                            <circle cx="4" cy="24" r="3" className="fill-rose-500" />
                            <text x="12" y="27" className="text-xs font-bold fill-zinc-700 dark:fill-zinc-200">
                                Manual: ${(hoverData.manualVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </text>

                            <circle cx="4" cy="44" r="3" className="fill-blue-600" />
                            <text x="12" y="47" className="text-xs font-bold fill-zinc-700 dark:fill-zinc-200">
                                Agentic: ${(hoverData.autoVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </text>

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
            <text x={0} y={height} className="text-micro fill-zinc-400">Start</text>
            <text x={yearWidth} y={height} textAnchor="middle" className="text-micro fill-zinc-400">Year 1</text>
            <text x={yearWidth * 2} y={height} textAnchor="middle" className="text-micro fill-zinc-400">Year 2</text>
            <text x={graphWidth} y={height} textAnchor="end" className="text-micro fill-zinc-400">Year 3</text>

            {/* --- BREAK EVEN MARKER --- */}
            {hasIntersection && !hoverData && (
                <g>
                    <circle cx={crossX} cy={crossY} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                    <line x1={crossX} y1={crossY} x2={crossX} y2={graphHeight} stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
                    <text x={crossX} y={graphHeight - 10} textAnchor="middle" className="text-xs font-bold fill-emerald-600 bg-white dark:bg-black p-1">Break-Even</text>
                </g>
            )}
        </svg>
    )
}

export default ProfitLossGraph;
