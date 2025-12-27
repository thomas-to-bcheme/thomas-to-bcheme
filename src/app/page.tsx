'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, HeartHandshake, Mail, ArrowRight, Zap, 
  Code2, Database, FlaskConical, Dna, CheckCircle2, 
  Workflow, ClipboardCheck, Bot, PiggyBank, Package, 
  BookOpenCheck, Copyright, GitFork, Globe, Linkedin, Github, 
  GitBranch
} from 'lucide-react';

// --- LOCAL COMPONENTS ---
import HeroSection from '@/components/HeroSection';
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import ROICalculation from "@/components/ROICalculation";
import EfficiencyCalculator from '@/components/EfficiencyCalculator';
import ProjectDeepDive from '@/components/ProjectDeepDive';
import Badge from '@/components/Badge';
import ImpactMetric from '@/components/ImpactMetric';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';
import Roadmap from '@/components/Roadmap';
// --- UTILITY ---
const scrollToTop = () => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

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
					
					<nav className="hidden sm:flex gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
						{[
							{ label: 'Live Agent', href: '#agent' },
							{ label: 'Business Impact', href: '#impact' },
							{ label: 'Engineering', href: '#projects' },
							{ label: 'About', href: '#about' },
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
        
        {/* --- HERO SECTION --- */}
        <HeroSection />

        {/* --- KPI SECTION --- */}
        <section id="impact" className="mb-4 scroll-mt-24">
          <div className="relative rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
              
              <ImpactMetric 
                value={63} suffix=".2M" prefix="$" label="Revenue Protected" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Workflow size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Optimized End-to-end Parameters</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <ClipboardCheck size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">ICH7 and GMP Compliant</span>
                    </div>
                  </div>
                }
              />

              <ImpactMetric 
                value={50} prefix=">$" suffix="k/yr" label="OpEx Reduction" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Bot size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Automated Manual Data Entry</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <PiggyBank size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Recurring Labor Cost Savings</span>
                    </div>
                  </div>
                }
              />

              <ImpactMetric 
                value={200} prefix=">$" suffix="k" label="Waste Eliminated" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Package size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Material Management Model</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <BookOpenCheck size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Standard Operating Procedures</span>
                    </div>
                  </div>
                }
              />

              <ImpactMetric 
                value={10} suffix="+" label="Agentic Products Deployed" 
                subtext={
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Copyright size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Proprietary (Profitable & Compliant)</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <GitFork size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Open Source</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </section>

        {/* --- PROJECTS & DIAGRAMS --- */}
        <div id="projects" className="mt-0 scroll-mt-24">
           <ArchitectureDiagram />
           <ROICalculation />
           <EfficiencyCalculator />
        </div>

        <BentoGrid className="pb-12">
          <BentoCard colSpan={2} noFade={true} id="proj-1">
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
             	tags={['Google','ERP (SAP)','Snowflake', 'Atlassian (Confluence)', 'SQL','Python']}
              kpis={['Context improving learning rate up to 80% (Wright’s Law: Stanford-B model)', 'Resource efficient contextual GenAI']}
           	/>
          </BentoCard>
        </BentoGrid>

				{/* --- ABOUT ME SECTION (UPDATED with Work Auth) --- */}


<section id="about" className="mb-4 scroll-mt-24">
	 <div className="grid md:grid-cols-3 gap-8">
			{/* LEFT COLUMN: Profile & Badges */}
			<div className="md:col-span-1">
				 <div className="sticky top-24">
						<h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-zinc-900 dark:text-white">
							 <Users className="text-blue-600" /> About Me
						</h3>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 italic">
							 "We've seen how even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future."
						</p>

						<div className="flex gap-2 flex-wrap content-start mb-4">
						  <a 
						    href="mailto:thomas.to.bcheme@gmail.com" 
						    className="hover:opacity-80 transition-opacity"
						    aria-label="Email Thomas To"
						  >
						    <Badge color="green" pulse icon={Globe}>thomas.to.bcheme@gmail.com</Badge>
						  </a>
						</div>
						
						{/* Hierarchical Badge Section

						<div className="flex gap-2 flex-wrap content-start mb-2">
							 <Badge color="blue" icon={Code2}>Fullstack Agentic Software Engineer</Badge>
							 <Badge color="blue" icon={Dna}>Protein Design</Badge>
							 <Badge color="blue" icon={Database}>Data Analyst</Badge>
							 <Badge color="blue" variant="outline" icon={Bot}>Data Science (AI/ML)</Badge>
							 <Badge color="blue" variant="outline" icon={Database}>AI/ML Engineer</Badge>
							 <Badge color="blue" variant="outline" icon={FlaskConical}>Biochemical Engineer</Badge>
						</div>
						*/}

						{/* 🟢 NEW: Work Authorization Status */}
						<div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
							 <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Work Authorization</span>
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
	
{/* RIGHT COLUMN: The Story */}
<div className="md:col-span-2 space-y-6 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
  
  {/* 1. PROFESSIONAL SUMMARY (Technical & Business Impact) */}
  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
    <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>
    <p className="mb-4">
      I architect data models and pipelines that accurately reflect real-world processes, delivering tangible value through scalable, reality-grounded software solutions. 
      My focus is on revenue generation, minimizing risk, and optimization by bridging the gap between reality and digital agents; as a humanoid Agentic API.
    </p>
  </div>
  
  {/* 2. GRID: Philosophy & Leadership */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    
    {/* Philosophy Card */}
    <div className="bg-white dark:bg-black p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 transition-colors">
       <Globe className="mb-3 text-blue-500" size={20} />
       <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Philosophy</h5>
       <p className="text-xs text-zinc-500 leading-snug">
         Data and mathematics are a means to engineer 0-to-1 minimally viable solutions, optimizing thereafter for maximum reality-grounded impact.
       </p>
    </div>

    {/* Leadership Card (Refined Text) */}
    <div className="bg-white dark:bg-black p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors">
       <HeartHandshake className="mb-3 text-pink-500" size={20} />
       <h5 className="font-bold text-zinc-900 dark:text-white mb-2">Leadership</h5>
       <p className="text-xs text-zinc-500 leading-snug">
          Scaling engineering excellence through junior mentorship and cross-departmental upskilling. I act as a technical liaison, translating complex engineering constraints into clear business value for executive leadership.
       </p>
    </div>

  </div>

</div>

</div>
	 </div>
</section>


{/* --- CONNECT & FOOTER --- */}
				{/* UX FIX: Reduced 'pb-24' to 'pb-12' to bring the footer closer to the call-to-action */}
				<BentoGrid className="pb-12">
					<BentoCard 
						colSpan={4} 
						noFade={true}
						className="bg-gradient-to-br from-white to-blue-50/50 dark:from-zinc-900 dark:to-blue-900/10 border-blue-100 dark:border-blue-900/30"
					>
						<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 h-full">
							
							<div className="flex-1 space-y-4">
								<div>
									<div className="flex items-center gap-2 mb-2">
									  <Badge 
									    color="green" 
									    pulse 
									    href="mailto:thomas.to.bcheme@gmail.com" // <--- Added this prop
									  >
									    AVAILABLE FOR HIRE
									  </Badge>
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
										{['AI/ML Engineer', 'AI/ML Ops', 'Data Scientist', 'Senior Fullstack Software Engineer'].map((role) => (
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
									className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-lg font-bold transition-all shadow-xl shadow-blue-200/50 dark:shadow-none group transform hover:scale-[1.02] active:scale-95"
								>
									<Mail size={18} />
									<span>Contact</span>
									<ArrowRight 
										size={16} 
										className="animate-pulse opacity-75 group-hover:translate-x-1 transition-transform" 
									/>
								</a>
								
								<a 
									href="https://www.linkedin.com/in/thomas-to-ucdavis/" 
									target="_blank" 
									rel="noopener noreferrer" 
									className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-lg font-bold transition-all hover:border-blue-300"
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