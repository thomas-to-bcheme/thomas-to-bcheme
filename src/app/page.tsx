'use client';

/**
 * --------------------------------------------------------------------------------
 * NEXT.JS & REACT ARCHITECTURE NOTES
 * --------------------------------------------------------------------------------
 * 1. 'use client': This directive marks this file as a Client Component.
 * - Reasoning: We use `framer-motion` for animations and `useState/useEffect` 
 * for the live ticker and interactive elements. These are browser-specific APIs.
 * - Optimization: In a larger app, we would push these leaf components down 
 * to keep the page skeleton server-rendered (RSC) for better SEO/TTFB.
 * * 2. Component Composition: 
 * - Instead of one massive render function, we break the UI into smaller 
 * internal components (e.g., <HeroSection />, <ProjectDeepDive />). 
 * - This mocks a clean folder structure and makes this single file readable.
 * * 3. Accessibility (a11y):
 * - We use semantic HTML (<section>, <article>, <header>) for screen readers.
 * - 'id' attributes are used for anchor navigation (#about, #projects).
 * --------------------------------------------------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import AiGenerator from "@/components/AiGenerator";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import ROICalculation from "@/components/ROICalculation";
import EfficiencyCalculator from '@/components/EfficiencyCalculator'; // Import it
import { // --- SOCIAL & CONTACT ---
	Users, HeartHandshake, TrendingUp, Github, Linkedin, Mail, FileText, MapPin, 
	
	// --- CORE TECH & AI ---
	Cpu, Code2, Database, Server, Terminal, // General Tech
	Bot, BrainCircuit, Sparkles,            // AI & Agents
	CloudLightning, Layers, Network,        // Architecture/Cloud
	Lock, ShieldCheck,                      // Security
	GitBranch, Workflow,                    // DevOps/Version Control
	
	// --- BIO-ENGINEERING & SCIENCE ---
	Dna, FlaskConical, Microscope,          // Wet Lab & Research
	
	// --- HOBBIES & PERSONAL ---
	Dumbbell, Swords, Trophy, Medal,        // Sports (Lifting/Combat)
	Music, Mic, Headphones,                 // Music
	
	// --- UI & UX UTILITIES ---
	ArrowRight, ExternalLink, Download,     // Actions
	CheckCircle2, AlertCircle, HelpCircle,  // Status Indicators
	Zap, Activity, Signal, Globe,           // System Status
	Layout, Menu, ChevronDown,               // Navigation
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILITY: TAILWIND MERGE ---
function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
// Add this 'ScrollToTop' helper logic inside the component or as a utility
const scrollToTop = () => {
	window.scrollTo({ top: 0, behavior: 'smooth' });
};



// --- UI COMPONENT: BADGE ---
const Badge = ({ 
	children, 
	color = "zinc", 
	pulse = false,
	variant = "solid",     // Default to solid to maintain current look
	icon: Icon,            // Rename icon prop to Icon for rendering
	href,                  // URL for clickable badges
	title,                 // Tooltip text
	className
}: { 
	children: React.ReactNode;
	color?: "gradient" | "blue" | "green" | "zinc" | "amber" | "purple" | "red" | "rose";
	variant?: "solid" | "outline" | "glass";
	icon?: React.ElementType;
	href?: string;
	title?: string;
	pulse?: boolean;
	className?: string;
}) => {
	
	// 1. Solid Colors (Your existing palette)
	const solidColors = {
		gradient: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm",
		blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
		green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
		purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
		red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
		rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
		amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
		zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
	};

	// 2. Outline Colors (New: Transparent bg, colored border/text)
	const outlineColors = {
		gradient: "bg-transparent text-blue-600 dark:text-blue-400 border-blue-500", 
		blue: "bg-transparent text-blue-700 dark:text-blue-400 border-blue-600/50",
		green: "bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-600/50",
		purple: "bg-transparent text-purple-700 dark:text-purple-400 border-purple-600/50",
		red: "bg-transparent text-red-700 dark:text-red-400 border-red-600/50",
		rose: "bg-transparent text-rose-700 dark:text-rose-400 border-rose-600/50",
		amber: "bg-transparent text-amber-700 dark:text-amber-400 border-amber-600/50",
		zinc: "bg-transparent text-zinc-700 dark:text-zinc-400 border-zinc-600/50",
	};

	// 3. Select Color Map based on variant
	const selectedColors = variant === 'outline' ? outlineColors : solidColors;
	const glassEffect = variant === 'glass' ? "backdrop-blur-md bg-opacity-50 dark:bg-opacity-20" : "";

	// 4. Component Logic: Render <a> if href exists, otherwise <span>
	const Component = href ? 'a' : 'span';
	const interactionStyles = href 
		? "hover:scale-105 hover:shadow-md cursor-pointer active:scale-95" 
		: "hover:scale-105 cursor-default";

	return (
		<Component 
			href={href}
			target={href ? "_blank" : undefined}
			title={title}
			className={cn(
				`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border flex items-center gap-1.5 transition-all`, 
				selectedColors[color],
				glassEffect,
				interactionStyles,
				className
			)}
		>
			{/* Pulse Dot Logic */}
			{pulse && (
				<span className="relative flex h-1.5 w-1.5">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
					<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
				</span>
			)}

			{/* New Icon Logic */}
			{Icon && <Icon size={12} className="stroke-[2.5]" />}

			{children}
		</Component>
	);
};

// --- UI COMPONENT: BENTO GRID ---
const BentoGrid = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
	<div id={id} className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]", className)}>
		{children}
	</div>
);

// --- UI COMPONENT: BENTO CARD ---
const BentoCard = ({ children, className, colSpan = 1, rowSpan = 1, title, icon: Icon, href, id, noFade = true }: any) => {
	const Wrapper = href ? 'a' : 'div';
	return (
		<motion.div 
			id={id}
			// "noFade" ensures critical content is always visible for SEO and quick scanning recruiters
			initial={noFade ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
			whileInView={noFade ? undefined : { opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-50px" }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			whileHover={{ y: -4, transition: { duration: 0.2 } }}
			className={cn(
				"group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-800 flex flex-col",
				colSpan === 2 && "md:col-span-2", colSpan === 3 && "md:col-span-3", colSpan === 4 && "md:col-span-4",
				rowSpan === 2 && "md:row-span-2",
				className
			)}
		>
			<Wrapper href={href} target={href ? "_blank" : undefined} className="h-full w-full flex flex-col">
				{(title || Icon) && (
					<div className="flex items-center justify-between mb-4 text-zinc-900 dark:text-zinc-100 font-semibold">
						 <div className="flex items-center gap-2">
								{Icon && <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800"><Icon size={16} className="text-blue-600 dark:text-blue-400" /></div>}
								<span className="tracking-tight">{title}</span>
						 </div>
						 {href && <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-zinc-400" />}
					</div>
				)}
				<div className="flex-1 relative z-10">{children}</div>
			</Wrapper>
		</motion.div>
	);
};

// --- UI COMPONENT: PROJECT DEEP DIVE CARD ---
// New component to handle the detailed "Problem/Solution/Architecture" structure
const ProjectDeepDive = ({ title, role, problem, solution, architecture, kpis, tags }: any) => (
	<div className="flex flex-col h-full space-y-4">
		<div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
			<h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{title}</h4>
			<p className="text-xs font-mono text-blue-600 dark:text-blue-400">{role}</p>
		</div>
		
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
			<div className="space-y-3">
				<div>
					<span className="text-[10px] uppercase font-bold text-zinc-400">The Problem</span>
					<p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{problem}</p>
				</div>
				<div>
					<span className="text-[10px] uppercase font-bold text-zinc-400">The Solution</span>
					<p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{solution}</p>
				</div>
			</div>
			
			<div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800 space-y-3">
				<div>
					 <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1"><Layers size={10}/> Architecture</span>
					 <div className="flex flex-wrap gap-1.5 mt-1.5">
						 {tags.map((t: string) => (
							 <span key={t} className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] text-zinc-600 dark:text-zinc-400">{t}</span>
						 ))}
					 </div>
				</div>
				<div>
					 <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1"><TrendingUp size={10}/> Impact KPI</span>
					 <ul className="mt-1.5 space-y-1">
						 {kpis.map((k: string) => (
							 <li key={k} className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
								 <CheckCircle2 size={10} /> {k}
							 </li>
						 ))}
					 </ul>
				</div>
			</div>
		</div>
	</div>
);

// --- COMPONENT: SYSTEM STATUS TICKER ---
const SystemStatusTicker = () => {
	const [latency, setLatency] = useState(24);
	const [lastCall, setLastCall] = useState<string | null>(null);

	useEffect(() => {
			// Helper function to get PST time
			const getPST = () => new Date().toLocaleTimeString('en-US', {
				timeZone: 'America/Los_Angeles',
				hour12: true, // Set to true if you want AM/PM
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});

			// Set initial time
			setLastCall(getPST());

			const interval = setInterval(() => {
				setLatency(prev => Math.floor(Math.random() * (45 - 20) + 20)); 
				setLastCall(getPST());
			}, 5000);

			return () => clearInterval(interval);
		}, []);

return (
		<div className="flex flex-wrap gap-4 text-[10px] font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 py-2 px-4 rounded-full border border-zinc-200 dark:border-zinc-800 w-fit mb-8 shadow-sm hover:border-blue-200 transition-colors">
			<div className="flex items-center gap-1.5">
				<div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
				<span>SYSTEM: NOMINAL</span>
			</div>
			<div className="hidden sm:flex items-center gap-1.5">
				<Server size={10} />
				<span>REGION: US-West</span>
			</div>
			<div className="flex items-center gap-1.5">
				<Activity size={10} />
				<span>LATENCY: {latency}ms</span>
			</div>
			 <div className="hidden md:flex items-center gap-1.5">
				<GitBranch size={10} />
				{/* Updated to display the PST string directly */}
				<span>BUILD: { lastCall || "SYNCING..."} PST</span>
			</div>
		</div>
	);
};

// --- UI COMPONENT: KPI METRIC ---
const ImpactMetric = ({ value, label, prefix = "", suffix = "", subtext }: any) => (
  <div className="flex flex-col items-center justify-start h-full pt-8 pb-6 px-4 text-center border-b md:border-b-0 md:border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-300 group cursor-default">
    
    {/* Metric Number */}
    <div className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2 font-mono group-hover:scale-110 transition-transform duration-300">
      {prefix}
      <CountUp end={value} duration={2.5} separator="," enableScrollSpy scrollSpyOnce />
      {suffix}
    </div>
    
    {/* Label */}
    <div className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">
      {label}
    </div>
    
    {/* Subtext Container (Updated for Top Alignment) */}
    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-start justify-center flex-1 w-full">
      {subtext}
    </div>

  </div>
);

// --- MAIN PAGE COMPONENT ---
export default function Home() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);
	if (!mounted) return null;

	return (
		<div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
			
			{/* --- STICKY NAV --- */}
			<header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-zinc-200 dark:border-zinc-800 transition-all">
				<div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
					<div className="font-bold text-xl tracking-tighter flex items-center gap-2 group cursor-pointer">
						THOMAS<span className="text-blue-600 dark:text-blue-500 group-hover:text-blue-700 transition-colors">TO</span>
					</div>
					
					<nav className="hidden sm:flex gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
						 <a href="#agent" className="hover:text-blue-600 transition-colors">Live Agent</a>
						 <a href="#impact" className="hover:text-blue-600 transition-colors">Business Impact</a>
						 <a href="#projects" className="hover:text-blue-600 transition-colors">Engineering</a>
						<a href="#about" className="hover:text-blue-600 transition-colors">About</a>
					</nav>
					
						<a 
							href="mailto:thomas.to.bcheme@gmail.com" 
							className="flex items-center gap-2 text-xs bg-blue-600 text-white dark:bg-blue-500 px-4 py-2 rounded-full font-bold hover:bg-blue-700 dark:hover:bg-blue-400 transition-all hover:scale-105 transform duration-200"
						>
							Contact
																<ArrowRight 
																size={16} 
																className="animate-pulse opacity-75 group-hover:translate-x-1 transition-transform" 
															/>
						</a>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
				
				{/* --- HERO SECTION --- */}
<section className="mb-20">
	<SystemStatusTicker />

	<div className="grid lg:grid-cols-2 gap-12 items-center">
		
		{/* --- LEFT COL: Text & Buttons --- */}
		<motion.div 
			initial={{ opacity: 0, x: -20 }} 
			animate={{ opacity: 1, x: 0 }} 
			transition={{ duration: 0.6 }}
		>
			<div className="flex gap-3 mb-6">
				<Badge color="blue" pulse>Available for Hire</Badge>
				<Badge color="zinc">California, United States</Badge>
			</div>
			
			<h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-zinc-900 dark:text-white leading-[1.1]">
				Deploying<br />
				<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
					Agentic Solutions.
				</span>
			</h1>
			
			<p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-8">
				Building AI systems that drive innovation by augmenting classical static algorithms to create solutions that adapt and execute.
			</p>
			
			<div className="flex flex-wrap gap-4">
				<a 
					href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io" 
					target="_blank" 
					className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
				>
					 <Github size={20} /> View Source
				</a>
				<a 
					href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/src/docs/Thomas_To_Resume.pdf?raw=true" 
					target="_blank" 
					className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg font-medium transition-all"
				>
					 <FileText size={20} /> Download Resume
				</a>
			</div>
		</motion.div>

		{/* --- RIGHT COL: Live Agent Card --- */}
		<motion.div 
			id="agent"
			initial={{ opacity: 0, scale: 0.98 }} 
			animate={{ opacity: 1, scale: 1 }} 
			transition={{ duration: 0.8 }}
			className="relative hidden lg:block h-full min-h-[400px]"
		>
			 {/* Background Glow */}
			 <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse"></div>
			 
			 <div className="relative bg-white dark:bg-zinc-900/90 rounded-xl border border-zinc-200 dark:border-zinc-800 h-full p-4 shadow-2xl flex flex-col">
					
					{/* REFACTORED HEADER START */}
					<div className="flex justify-between items-start mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
						<div className="flex gap-3">
							{/* Icon Container */}
								<div className="mt-2 shrink-0">
									 <Cpu size={20} className="text-blue-600 dark:text-blue-400" />
								</div>

							<div className="flex flex-col">
								{/* Title */}
								<span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
									Resume RAG Agent
								</span>
								
								{/* Subtitle & Link */}
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
						
						{/* Online Badge */}
						<Badge color="green" pulse>Online</Badge>
					</div>
					{/* REFACTORED HEADER END */}

					{/* Interactive Chat Window */}
					<div className="flex-1 overflow-hidden relative rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800">
							<div className="absolute inset-0 overflow-auto custom-scrollbar">
								 <AiGenerator /> 
							</div>
					</div>

			 </div>
		</motion.div>
	</div>
</section>

{/* --- KPI SECTION --- */}
<section id="impact" className="mb-24 scroll-mt-24">
	<div className="relative rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
		<div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
			<div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
			<ImpactMetric 
				value={63} 
				suffix=".2M" 
				prefix="$" 
				label="Revenue Protected" 
				subtext="Optimized End-to-end Parameters."
			/>
			<ImpactMetric 
				value={50} 
				prefix=">$"
				suffix="k/yr" 
				label="OpEx Reduction" 
				subtext={
			<div className="flex flex-col gap-1.5 w-full">
				{/* Line 1: The mechanism */}
				<div className="flex items-center justify-center md:justify-start gap-2">
					<span className="text-emerald-500 font-bold text-xs">✔</span>
					<span>Automated Manual Data Entry</span>
				</div>

				{/* Line 2: The business result */}
				<div className="flex items-center justify-center md:justify-start gap-2 text-zinc-400">
					<span className="text-blue-500 font-bold text-xs">↗</span>
					<span>Recurring Labor Cost Savings</span>
				</div>
			</div>
		}
		/>
		<ImpactMetric 
			value={200} 
			prefix=">$"
			suffix="k" 
			label="Waste Eliminated" 
			subtext="Inventory Modeling & Standard Operating Procedure."
		/>
		<ImpactMetric 
			value={10}
			prefix=">"
			suffix="+" 
			label="Agentic Products" 
			subtext="Deployed Proprietary & Open Source"
		/>
		</div>
	</div>
</section>

				{/* --- PROJECTS DEEP DIVE SECTION (NEW) --- */}
				<div id="projects" className="mb-8">
				</div>

		{/* 🟢 DIAGRAM EMBEDDED HERE */}
		<div className="my-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
			 <ArchitectureDiagram />
			 <ROICalculation />
			 <EfficiencyCalculator />
		</div>

				<BentoGrid className="pb-24">
					
					{/* PROJECT 1: AGENTIC PORTFOLIO (Meta-Project) */}
					<BentoCard colSpan={2} noFade={true} id="proj-1">
						 <ProjectDeepDive 
							 title="Self-Hosted Agentic RAG"
							 role="Lead Architect"
							 problem="Static portfolios fail to demonstrate 'live' engineering capability or handling of non-deterministic data."
							 solution="Built a self-correcting RAG agent that ingests my resume/codebase. It uses Vercel AI SDK to stream responses and 'hallucination checks' against a vector store."
							 architecture="Next.js 14, LangChain, Pinecone, Vercel Edge Functions"
							 tags={['Next.js', 'TypeScript', 'OpenAI', 'Vector DB']}
							 kpis={['< 200ms TTFB', '100% Automated Recruiter Q&A']}
						 />
					</BentoCard>

					{/* PROJECT 2: BIO-PROCESS OPTIMIZATION */}
					<BentoCard colSpan={2} noFade={true} id="proj-2">
						 <ProjectDeepDive 
							 title="Bio-Process ETL Pipeline"
							 role="Data Engineer"
							 problem="Critical manufacturing decisions relied on 'tribal knowledge' and manual spreadsheets, leading to 87% operational inefficiency."
							 solution="Engineered an automated ETL pipeline ingesting sensor data from bioreactors. Created a 'Digital Twin' model to predict yield outcomes."
							 architecture="Python (Pandas), Airflow, Snowflake, JMP"
							 tags={['Python', 'ETL', 'Snowflake', 'Statistics']}
							 kpis={['$63.2M Cost Avoidance', 'Real-time Yield Prediction']}
						 />
					</BentoCard>

				</BentoGrid>
				{/* --- ABOUT ME SECTION (UPDATED with Work Auth) --- */}


<section id="about" className="mb-24 scroll-mt-24">
	 <div className="grid md:grid-cols-3 gap-8">
			{/* LEFT COLUMN: Profile & Badges */}
			<div className="md:col-span-1">
				 <div className="sticky top-24">
						<h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
							 <Users className="text-blue-600" /> About Me
						</h3>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 italic">
							 "We've seen how even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future."
						</p>

						<div className="flex gap-2 flex-wrap content-start mb-8">
						  <a 
						    href="mailto:thomas.to.bcheme@gmail.com" 
						    className="hover:opacity-80 transition-opacity"
						    aria-label="Email Thomas To"
						  >
						    <Badge color="blue" icon={Globe}>thomas.to.bcheme@gmail.com</Badge>
						  </a>
						</div>
						
						{/* Hierarchical Badge Section */}
						<div className="flex gap-2 flex-wrap content-start mb-8">
							 <Badge color="blue" pulse icon={Code2}>Fullstack Agentic Software Engineer</Badge>
							 <Badge color="blue" pulse icon={Database}>Data Science (AI/ML)</Badge>
							 <Badge color="blue" variant="outline" icon={FlaskConical}>Biochemical Engineer</Badge>
							 <Badge color="blue" variant="outline" icon={Dna}>Protein Design</Badge>
						</div>

						{/* 🟢 NEW: Work Authorization Status */}
						<div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
							 <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block">Work Authorization</span>
							 <ul className="space-y-2">
									<li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
										 <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
										 <span>Authorized to work in the U.S. for any employer.</span>
									</li>
									<li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
										 <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
										 <span>No visa sponsorship required (now or future).</span>
									</li>
									<li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
										 <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
										 <span>Eligible to work in the U.S. without restriction.</span>
									</li>
							 </ul>
						</div>
				 </div>
			</div>

			{/* RIGHT COLUMN: The Story */}
<div className="md:col-span-2 space-y-6 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
	
	{/* The "Hook" Story Card */}
	<div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
		<h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>
		<p className="mb-4">
			My experience spans the entire data lifecycle—from capturing empirical data on the manufacturing floor to digitizing it via enterprise ETL/ELT pipelines and digitizing it through Agentic Machine Learning and automated applications for digital transformation. By architecting data models and pipelines that accurately reflect real-world processes, I deliver tangible value, driving efficiency, revenue generation, and optimization through scalable, reality-grounded software solutions.
		</p>

	</div>
	
	{/* Philosophy & Leadership Grid */}
	<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<div className="bg-white dark:bg-black p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 transition-colors">
			 <Globe className="mb-3 text-blue-500" size={20} />
			 <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Philosophy</h5>
			 <p className="text-xs text-zinc-500 leading-snug">
				 Data and mathematics are a means to engineer 0-to-1 minimally viable initial solutions and optimize thereafter.
			 </p>
		</div>
		<div className="bg-white dark:bg-black p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors">
			 <HeartHandshake className="mb-3 text-pink-500" size={20} />
			 <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Leadership</h5>
			 <p className="text-xs text-zinc-500 leading-snug">
					Driving organizational efficiencies by scaling engineering excellence through junior mentorship and  cross-departmental upskilling; communicating value and impact as a technical liaison for executive leadership. 
			 </p>
		</div>
	</div>

</div>
	 </div>
</section>
				{/* --- CONNECT & FOOTER --- */}
				<BentoGrid className="pb-24">
					<BentoCard 
						colSpan={4} 
						noFade={true}
						className="bg-gradient-to-br from-white to-blue-50/50 dark:from-zinc-900 dark:to-blue-900/10 border-blue-100 dark:border-blue-900/30"
					>
						<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 h-full">
							
							<div className="flex-1 space-y-4">
								<div>
									<div className="flex items-center gap-2 mb-2">
										<Badge color="blue" pulse>Open to Work</Badge>
										<span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status: Active</span>
									</div>
									<h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
										Let's Engineer the Future.
									</h3>
									<p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-xl">
										If you are looking for an engineer who can architect 0&rarr;1 systems, automate tribal knowledge, 
										and deploy self-correcting AI agents, let's talk.
									</p>
								</div>

								<div className="space-y-2">
									<span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Ideal Role Fit</span>
									<div className="flex flex-wrap gap-2">
										{['Principal AI Engineer', 'Biotech Data Architect', 'Technical Lead', 'Sr. Fullstack Engineer'].map((role) => (
											<span key={role} className="px-2.5 py-1 rounded-md bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm cursor-default hover:border-blue-400 transition-colors">
												{role}
											</span>
										))}
									</div>
								</div>
							</div>

							<div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
								<a 
									href="mailto:thomas.to.bcheme@gmail.com" 
									className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-lg font-bold transition-all shadow-xl shadow-blue-200/50 dark:shadow-none group transform hover:scale-[1.02]"
								>
									<Mail size={18} />

									<span>Contact</span>

									{/* 🟢 PULSING ARROW HERE */}
									<ArrowRight 
										size={16} 
										className="animate-pulse opacity-75 group-hover:translate-x-1 transition-transform" 
									/>
								</a>
								
								<a 
									href="https://www.linkedin.com/in/thomas-to-ucdavis/" 
									target="_blank" 
									className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-lg font-bold transition-all"
								>
									<Linkedin size={18} />
									<span>View Profile</span>
								</a>
								
								<div className="text-center">
									<p className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
										<Zap size={10} className="text-yellow-500" />
										Response time: &lt; 24 hours
									</p>
								</div>
							</div>

						</div>
					</BentoCard>
				</BentoGrid>

				{/* --- FOOTER --- */}
{/* --- FOOTER SECTION --- */}
<footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 pt-16 pb-8 mt-24">
	<div className="max-w-7xl mx-auto px-6">
		<div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
			
			{/* COLUMN 1: BRAND IDENTITY */}
			<div className="col-span-1 md:col-span-2 space-y-4">
				<div className="font-bold text-xl tracking-tighter flex items-center gap-2">
					THOMAS<span className="text-blue-600 dark:text-blue-500">TO</span>
				</div>
				<p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
					Operationalizing Agentic Intelligence. Bridging the gap between biological systems and cloud infrastructure with resilient, self-correcting architectures.
				</p>
				<div className="flex gap-4 pt-2">
					<a 
						href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io" 
						target="_blank" 
						aria-label="GitHub Profile"
						className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all"
					>
						<Github size={18} />
					</a>
					<a 
						href="https://www.linkedin.com/in/thomas-to-ucdavis/" 
						target="_blank" 
						aria-label="LinkedIn Profile"
						className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all"
					>
						<Linkedin size={18} />
					</a>
					<a 
						href="mailto:thomas.to.bcheme@gmail.com" 
						aria-label="Email Contact"
						className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all"
					>
						<Mail size={18} />
					</a>
				</div>
			</div>

			{/* COLUMN 2: SITEMAP */}
			<div>
				<h4 className="font-bold text-xs text-zinc-900 dark:text-white mb-6 uppercase tracking-widest">Navigation</h4>
				<ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
					<li><a href="#agent" className="hover:text-blue-600 transition-colors flex items-center gap-2">Live Agent</a></li>
					<li><a href="#impact" className="hover:text-blue-600 transition-colors flex items-center gap-2">Business Impact</a></li>
					<li><a href="#projects" className="hover:text-blue-600 transition-colors flex items-center gap-2">Engineering</a></li>
					<li><a href="#about" className="hover:text-blue-600 transition-colors flex items-center gap-2">About Me</a></li>
				</ul>
			</div>

			{/* COLUMN 3: SYSTEM STATUS & LEGAL */}
			<div>
				<h4 className="font-bold text-xs text-zinc-900 dark:text-white mb-6 uppercase tracking-widest">System Status</h4>
				<ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
					<li className="flex items-center gap-2">
						<div className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
						</div>
						<span className="text-emerald-600 dark:text-emerald-400 font-medium">All Systems Nominal</span>
					</li>
					<li className="flex items-center gap-2">
						<GitBranch size={14} />
						<span>v2.4.0 (Stable)</span>
					</li>
					<li className="flex items-center gap-2">
						<Globe size={14} />
						<span>Region: US-West (SFO)</span>
					</li>
				</ul>
			</div>
		</div>

		{/* BOTTOM BAR */}
		<div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
			<div className="text-xs text-zinc-400 space-y-1">
				<p>&copy; {new Date().getFullYear()} Thomas To. All rights reserved.</p>
				<p>Licensed under MIT Open Source.</p>
			</div>
			
			<div className="flex items-center gap-6">
				<div className="text-xs text-zinc-500 font-mono hidden md:block">
					Built with <span className="text-zinc-700 dark:text-zinc-300">GitHub, Next.js, Vercel, and ~Vibes~ </span>
				</div>
				<button 
					onClick={scrollToTop}
					className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full"
				>
					Back to Top <ArrowRight size={12} className="-rotate-90" />
				</button>
			</div>
		</div>
	</div>
</footer>

			</main>
		</div>
	);
}