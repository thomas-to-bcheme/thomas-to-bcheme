'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, Globe, Linkedin, Github, GitBranch } from 'lucide-react';

// --- LOCAL COMPONENTS ---
import HeroSection from '@/components/HeroSection';
import ArchitectureDiagram from '@/components/ArchitectureDiagram';
import ROICalculation from '@/components/ROICalculation';
import ProjectDeepDive from '@/components/ProjectDeepDive';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';
import AboutMeSection from '@/components/AboutMeSection';
import Roadmap from '@/components/Roadmap';
import Connect from '@/components/Connect';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      
{/* --- STICKY NAV --- */}
			<header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-zinc-200 dark:border-zinc-800 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
				<div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
					
					{/* LOGO: UX Value-Add -> Clicking logo resets to top */}
					<div 
						onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
						className="font-bold text-xl tracking-tighter flex items-center gap-2 group cursor-pointer select-none"
						role="button"
						aria-label="Scroll to top"
						tabIndex={0}
					>
						THOMAS<span className="text-blue-600 dark:text-blue-500 group-hover:text-blue-700 transition-colors duration-300">TO</span>
					</div>
					{/* UPDATED NAV: Added Roadmap */}
          <nav className="hidden sm:flex gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {[
              { label: 'Live Agent', href: '#agent' },
              { label: 'About Me', href: '#about' },
              { label: 'Solutions', href: '#proj-1' },
              { label: 'Lifecycle', href: '#roadmap' },
            ].map((link) => (
              <a 
                key={link.href}
                href={link.href} 
                className="hover:text-blue-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>
					
					<a 
						href="mailto:thomas.to.bcheme@gmail.com" 
						className="flex items-center gap-2 text-xs bg-blue-600 text-white dark:bg-blue-500 px-4 py-2 rounded-full font-bold 
											 hover:bg-blue-700 dark:hover:bg-blue-400 hover:scale-105 active:scale-95 
											 transition-all duration-200 shadow-sm hover:shadow-blue-500/25 group 
											 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
					>
						Contact
						<ArrowRight size={16} className="opacity-75 group-hover:translate-x-1 transition-transform duration-200" />
					</a>
				</div>
			</header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* --- ABOUT ME SECTION --- */}
        <div id="about-me" className="mt-0 scroll-mt-24">
          <HeroSection />
          <AboutMeSection />
          <Connect />
        </div>
        <div id="impact" className="mt-0 scroll-mt-24">
        <BentoGrid className="pb-12">
          <BentoCard colSpan={2} noFade={true} id="proj-1" className="mb-4 scroll-mt-24">
             <ProjectDeepDive 
              title="Agentic Revenue Optimization"
              role="AI/ML Engineer"
              problem="High biological variability in donor starting material (Leukopaks, Bone Marrow) led to unpredictable cell yields, causing inventory misalignment and lost revenue on rare cell types."
              solution="Architected a predictive model to classify donors by highest probable cell yield (optimizing for Rarity vs. Throughput). Deployed an Agentic Interface to bridge lab data with enterprise ERP systems, automating yield reporting for sales teams."
              parameters={['Weight', 'Height', 'Age', 'Sex', 'Ethnicity','Smoker','Blood Type', 'CMV Status', 'Cell Count (TNC)', 'Cell Count (MNC)', 'Cell Count (Isolate)']}
              tags={['CRM (CRIO)','ERP (SAP)','Snowflake', 'BI (Tableau)', 'SQL','Python']}
              kpis={['Querying from hours to minutes','Ability to select donors for orders']}
            />
          </BentoCard>

          <BentoCard colSpan={2} noFade={true} id="proj-2">
             <ProjectDeepDive 
              title="Agentic Onboarding"
              role="AI/ML Engineer"
              problem="Fragmented documentation and reliance on tribal knowledge (i.e word of mouth) caused slow onboarding and information silos."
              solution="RAG Agents fine-tuned to department specific standard operating procedures (SOP) for niche context with atleast one (1) orchestrator agent with general context for cross-functional insight"
              parameters={['SOP','Work Instructions','Human Validated Training Text']}
              tags={['Google','ERP (SAP)','Snowflake', 'Atlassian (Confluence)','MCP','Vector DB', 'SQL','Python']}
              kpis={['Increased learning rate up to 80% (Wright’s Law: Stanford-B model)', 'Resource efficient contextual GenAI']}
            />
          </BentoCard>
        </BentoGrid>
        </div>

        {/* --- PROJECTS & DIAGRAMS --- */}
        <div id="projects" className="mt-0 scroll-mt-24">
           <ArchitectureDiagram />
           <ROICalculation />
           
        </div>


        <Roadmap />

				{/* --- FOOTER SECTION --- */}
				<footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 pt-16 pb-8">
					<div className="max-w-7xl mx-auto px-6">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
							
							{/* COLUMN 1: BRAND IDENTITY */}
							<div className="col-span-1 md:col-span-2 space-y-4">
								<div className="font-bold text-xl tracking-tighter flex items-center gap-2">
									THOMAS<span className="text-blue-600 dark:text-blue-500">TO</span>
								</div>
								<p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
									Operationalizing AI Agents: <br/> Bridging the gap between reality and the matrix.
								</p>
								<div className="flex gap-4 pt-2">
									<a 
										href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io" 
										target="_blank" 
										rel="noopener noreferrer"
										aria-label="GitHub Profile"
										className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all hover:scale-110"
									>
										<Github size={18} />
									</a>
									<a 
										href="https://www.linkedin.com/in/thomas-to-ucdavis/" 
										target="_blank" 
										rel="noopener noreferrer"
										aria-label="LinkedIn Profile"
										className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all hover:scale-110"
									>
										<Linkedin size={18} />
									</a>
									<a 
										href="mailto:thomas.to.bcheme@gmail.com" 
										aria-label="Email Contact"
										className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all hover:scale-110"
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
									onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
									className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:scale-105 active:scale-95"
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