'use client';

import { Mail, ArrowRight, Globe, Linkedin, Github, GitBranch } from 'lucide-react';
import {
  SITE_OWNER_NAME,
  SITE_OWNER_EMAIL,
  GITHUB_URL,
  LINKEDIN_URL,
  SITE_TAGLINE,
  SITE_VERSION,
  SITE_REGION,
  FOOTER_NAV_LINKS,
} from '@/constants/site';

const Footer = () => {
  return (
    <footer className="border-default surface-secondary pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

          {/* COLUMN 1: BRAND IDENTITY */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="font-bold text-xl tracking-tighter flex items-center gap-2">
              THOMAS<span className="text-blue-600 dark:text-blue-500">TO</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              {SITE_TAGLINE}
            </p>
            <div className="flex gap-4 pt-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Profile"
                className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all hover:scale-110"
              >
                <Github size={18} aria-hidden="true" />
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile"
                className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all hover:scale-110"
              >
                <Linkedin size={18} aria-hidden="true" />
              </a>
              <a
                href={`mailto:${SITE_OWNER_EMAIL}`}
                aria-label="Email Contact"
                className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-all hover:scale-110"
              >
                <Mail size={18} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* COLUMN 2: SITEMAP */}
          <div>
            <h4 className="text-micro text-zinc-900 dark:text-white mb-6">Navigation</h4>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              {FOOTER_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-blue-600 transition-colors flex items-center gap-2">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3: SYSTEM STATUS & LEGAL */}
          <div>
            <h4 className="text-micro text-zinc-900 dark:text-white mb-6">System Status</h4>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="status-dot-ping bg-emerald-400"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">All Systems Nominal</span>
              </li>
              <li className="flex items-center gap-2">
                <GitBranch size={14} aria-hidden="true" />
                <span>{SITE_VERSION} (Stable)</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe size={14} aria-hidden="true" />
                <span>Region: {SITE_REGION}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="border-default border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-zinc-400 space-y-1">
            <p>&copy; {new Date().getFullYear()} {SITE_OWNER_NAME}. All rights reserved.</p>
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
  );
};

export default Footer;
