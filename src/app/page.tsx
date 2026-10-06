'use client';

import React, { useState, useEffect } from 'react';

// --- LOCAL COMPONENTS ---
import HeroSection from '@/components/sections/HeroSection';
import FeaturedIn from '@/components/sections/FeaturedIn';
import AboutMeSection from '@/components/sections/AboutMeSection';
import ImpactMetricsSection from '@/components/sections/ImpactMetricsSection';
import BeyondTheTerminal from '@/components/sections/BeyondTheTerminal';
import ChatWidget from '@/components/features/ChatWidget';
import { ChatWidgetProvider } from '@/components/layout/ChatWidgetProvider';
import SiteHeader from '@/components/layout/SiteHeader';
import SkipLink from '@/components/ui/SkipLink';
import Footer from '@/components/sections/Footer';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <ChatWidgetProvider>
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      {/* Skip Link for keyboard navigation (A1) */}
      <SkipLink />

      {/* --- STICKY NAV (shared across routes) --- */}
      <SiteHeader />

      {/* Vertical rhythm is centralized here: one consistent 48px (space-y-12) gap
          between every top-level block, so no section sets its own outer margin. */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-12" role="main">

        {/* --- ABOUT ME SECTION — same 48px rhythm between hero, press, and about --- */}
        <div id="about-me" className="scroll-mt-24 space-y-12">
          <HeroSection />
          <FeaturedIn />
          <AboutMeSection />
          <ImpactMetricsSection />
        </div>

        {/* --- OFF THE CLOCK: personal photo section (follows Leadership & Recognition) --- */}
        <BeyondTheTerminal />

				{/* --- FOOTER SECTION --- */}
				<Footer />

			</main>

			{/* --- FLOATING RAG CHAT WIDGET (bottom-right) --- */}
			<ChatWidget />
		</div>
		</ChatWidgetProvider>
	);
}