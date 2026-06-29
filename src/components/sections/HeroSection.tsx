"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, FileText, Cpu, Mail, ArrowRight, Linkedin, Youtube, CheckCircle2, Zap } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import AiGenerator from '@/components/features/AiGenerator';
import Button from '@/components/ui/Button';
import {
  SITE_OWNER_NAME,
  SITE_OWNER_EMAIL,
  SITE_OWNER_LOCATION,
  GITHUB_URL,
  GITHUB_PROFILE_URL,
  LINKEDIN_URL,
  YOUTUBE_URL,
  RESUME_PDF_URL,
  WORK_AUTH,
} from '@/constants/site';

const WORK_AUTH_CHIPS = [
  { label: WORK_AUTH.citizenship },
  { label: WORK_AUTH.state },
  { label: WORK_AUTH.sponsorship },
  { label: WORK_AUTH.availability },
] as const;

const HeroSection = () => {
  const [isMobileChatCollapsed, setIsMobileChatCollapsed] = useState(true);

  return (
    <section className="mb-8 pt-2">
      <div className="grid lg:grid-cols-2 gap-8 items-center mt-4">

        {/* --- LEFT COL: Identity, Value Prop, Auth, Actions --- */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center h-full"
        >
          {/* Identity strip */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-4 text-sm">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {SITE_OWNER_NAME}
            </span>
            <span className="text-zinc-300 dark:text-zinc-600 select-none">·</span>
            <span className="text-zinc-500 dark:text-zinc-400">{SITE_OWNER_LOCATION}</span>
            <span className="text-zinc-300 dark:text-zinc-600 select-none">·</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
              Open to Work · Jun 2026
            </span>
          </div>

          {/* Main title */}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-zinc-900 dark:text-white leading-[1.1]">
            Fullstack<br />
            <span className="gradient-text-blue">AI/ML Engineer</span>
          </h1>

          <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-4">
            Integrating AI to digitally transform software engineering using machine learning methods to enhance workflows.
          </p>

          {/* Work authorization */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {WORK_AUTH_CHIPS.map(({ label }) => (
              <span
                key={label}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800/40 dark:text-emerald-400 font-medium"
              >
                <CheckCircle2 size={10} className="shrink-0" />
                {label}
              </span>
            ))}
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap gap-3 mb-3">
            <Button
              variant="primary"
              href={`mailto:${SITE_OWNER_EMAIL}`}
              className="group shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30"
            >
              <Mail size={18} />
              <span>Contact</span>
              <ArrowRight size={16} className="opacity-75 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
            <Button
              variant="secondary"
              href={RESUME_PDF_URL}
              external
            >
              <FileText size={18} />
              <span>Download Resume</span>
            </Button>
          </div>

          {/* Secondary link strip */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150"
            >
              <Github size={13} />
              View Source
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150"
            >
              <Linkedin size={13} />
              LinkedIn
            </a>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-150"
            >
              <Youtube size={13} />
              YouTube
            </a>
            <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <Zap size={11} className="text-yellow-500" />
              &lt; 24h response
            </span>
          </div>
        </motion.div>

        {/* --- RIGHT COL: Live Agent Card (Desktop) --- */}
        <motion.div
          id="agent"
          className="relative hidden lg:block h-full min-h-[400px] scroll-mt-32"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse" />
          <div className="relative card-base h-full p-4 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex gap-3">
                <div className="mt-2 shrink-0">
                  <Cpu size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Resume RAG Agent
                  </span>
                  <div className="text-xs leading-tight text-zinc-500 dark:text-zinc-400 mt-1">
                    <a
                      href={GITHUB_PROFILE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline decoration-blue-600/30 transition-all font-medium inline-flex items-center gap-1"
                    >
                      See source docs
                    </a>
                  </div>
                </div>
              </div>
              <Badge color="green">Online</Badge>
            </div>
            <div className="flex-1 overflow-hidden relative rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="absolute inset-0 overflow-auto custom-scrollbar">
                <AiGenerator />
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- MOBILE: Collapsible AI Chat Card --- */}
        <motion.div
          className="lg:hidden mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative">
            {!isMobileChatCollapsed && (
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse" />
            )}
            <div className={`relative card-base shadow-lg overflow-hidden transition-all duration-300 ${
              isMobileChatCollapsed ? '' : 'min-h-[400px]'
            }`}>
              {!isMobileChatCollapsed && (
                <div className="flex justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Resume RAG Agent
                    </span>
                  </div>
                  <Badge color="green">Online</Badge>
                </div>
              )}
              <div className={`${isMobileChatCollapsed ? '' : 'h-[350px] overflow-auto custom-scrollbar'}`}>
                <AiGenerator
                  collapsed={isMobileChatCollapsed}
                  onToggleCollapse={() => setIsMobileChatCollapsed(!isMobileChatCollapsed)}
                />
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default HeroSection;
