'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';

// --- LOCAL COMPONENTS ---
import HeroSection from '@/components/sections/HeroSection';
import ArchitectureDiagram from '@/components/features/ArchitectureDiagram';
import ROICalculation from '@/components/roi';
import AboutMeSection from '@/components/sections/AboutMeSection';
import Roadmap from '@/components/sections/Roadmap';
import KanbanBoard from '@/components/features/KanbanBoard';
import Connect from '@/components/sections/Connect';
import SkipLink from '@/components/ui/SkipLink';
import Footer from '@/components/sections/Footer';
import { useActiveSection } from '@/hooks/useActiveSection';
import { NAV_LINKS, SITE_OWNER_EMAIL } from '@/constants/site';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Active section tracking (U2)
  const sectionIds = useMemo(() => NAV_LINKS.map(link => link.sectionId), []);
  const activeSection = useActiveSection(sectionIds);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      {/* Skip Link for keyboard navigation (A1) */}
      <SkipLink />

{/* --- STICKY NAV --- */}
			<header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-zinc-200 dark:border-zinc-800 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
				<div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
					
					{/* LOGO: UX Value-Add -> Clicking logo resets to top */}
					<div
						onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								window.scrollTo({ top: 0, behavior: 'smooth' });
							}
						}}
						className="font-bold text-xl tracking-tighter flex items-center gap-2 group cursor-pointer select-none"
						role="button"
						aria-label="Scroll to top"
						tabIndex={0}
					>
						THOMAS<span className="text-blue-600 dark:text-blue-500 group-hover:text-blue-700 transition-colors duration-300">TO</span>
					</div>
					{/* UPDATED NAV: Active section highlighting (U2) */}
          <nav className="hidden sm:flex gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.sectionId;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative hover:text-blue-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  {link.label}
                  {/* Active indicator underline */}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>
					
					<a
						href={`mailto:${SITE_OWNER_EMAIL}`}
						className="flex items-center gap-2 text-xs bg-blue-600 text-white dark:bg-blue-500 px-4 py-2 rounded-full font-bold
											 hover:bg-blue-700 dark:hover:bg-blue-400 hover:scale-105 active:scale-95
											 transition-all duration-200 shadow-sm hover:shadow-blue-500/25 group
											 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black focus-visible:ring-blue-600"
					>
						Contact
						<ArrowRight size={16} className="opacity-75 group-hover:translate-x-1 transition-transform duration-200" />
					</a>
				</div>
			</header>
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6" role="main">

        {/* --- ABOUT ME SECTION --- */}
        <div id="about-me" className="mt-0 scroll-mt-24">
          <HeroSection />
          <AboutMeSection />
          <Connect />
        </div>

        <section id="pipeline" className="scroll-mt-24">
          <KanbanBoard />
        </section>

        {/* --- PROJECTS & DIAGRAMS --- */}
        <div id="projects" className="mt-0 scroll-mt-24">
           <ArchitectureDiagram />
           <ROICalculation />
           
        </div>


        <Roadmap />

				{/* --- FOOTER SECTION --- */}
				<Footer />

			</main>
		</div>
	);
}