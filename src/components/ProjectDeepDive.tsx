"use client";

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
  Cpu, Code2, Database, Server, Terminal,GitFork,Copyright,   // General Tech
  Bot, BrainCircuit, Sparkles,PiggyBank,               // AI & Agents
  CloudLightning, Layers, Network,          // Architecture/Cloud
  Lock, ShieldCheck, ClipboardCheck, Scale,           // Security
  GitBranch, Workflow,TrendingDown,Recycle,   // DevOps/Version Control
  
  // --- BIO-ENGINEERING & SCIENCE ---
  Dna, FlaskConical, Microscope, BookOpenCheck,          // Wet Lab & Research
  
  // --- HOBBIES & PERSONAL ---
  Dumbbell, Swords, Trophy, Medal,        // Sports (Lifting/Combat)
  Music, Mic, Headphones,                 // Music
  
  // --- UI & UX UTILITIES ---
  ArrowRight, ExternalLink, Download,     // Actions
  CheckCircle2, AlertCircle, HelpCircle,  // Status Indicators
  Zap, Activity, Signal, Globe, Package, Boxes,           // System Status
  Layout, Menu, ChevronDown,               // Navigation
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export default ProjectDeepDive;