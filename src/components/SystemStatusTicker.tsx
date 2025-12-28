"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import AiGenerator from "@/components/AiGenerator";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import ROICalculation from "@/components/ROICalculation";
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
				<span>LOCAL TIME: { lastCall || "SYNCING..."} PST</span>
			</div>
		</div>
	);
};

export default SystemStatusTicker;