"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Github, FileText, Mail, ArrowRight, Linkedin, Youtube, CheckCircle2, Zap } from 'lucide-react';

import {
  SITE_OWNER_NAME,
  SITE_OWNER_EMAIL,
  SITE_OWNER_LOCATION,
  GITHUB_URL,
  LINKEDIN_URL,
  YOUTUBE_URL,
  RESUME_PDF_URL,
  HERO_PHOTO,
  WORK_AUTH,
} from '@/constants/site';

const WORK_AUTH_CHIPS = [
  { label: WORK_AUTH.citizenship },
  { label: WORK_AUTH.state },
  { label: WORK_AUTH.sponsorship },
  { label: WORK_AUTH.availability },
] as const;

// Secondary "bubble" links beside the primary CTA — mapped to identical pills.
const SOCIAL_PILLS = [
  { icon: FileText, label: 'Resume', href: RESUME_PDF_URL },
  { icon: Github, label: 'GitHub', href: GITHUB_URL },
  { icon: Linkedin, label: 'LinkedIn', href: LINKEDIN_URL },
  { icon: Youtube, label: 'YouTube', href: YOUTUBE_URL },
] as const;

// Shared focus-visible ring, matching the convention used on nav links in page.tsx.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const HeroSection = () => {
  return (
    <section className="mb-8 pt-2">
      <div className="grid lg:grid-cols-2 gap-8 items-center mt-4">

        {/* --- LEFT COL: Identity, Value Prop, Auth, Pill CTAs --- */}
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

          {/* Pill CTA cluster — primary + secondary "bubbles" */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <a
              href={`mailto:${SITE_OWNER_EMAIL}`}
              className={`group inline-flex items-center gap-2 rounded-full bg-blue-600 text-white dark:bg-blue-500 px-5 py-2.5 text-sm font-bold hover:bg-blue-700 dark:hover:bg-blue-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30 ${FOCUS_RING}`}
            >
              <Mail size={16} />
              <span>Start a Conversation</span>
              <ArrowRight size={15} className="opacity-80 group-hover:translate-x-1 transition-transform duration-200" />
            </a>

            {SOCIAL_PILLS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-all duration-200 ${FOCUS_RING}`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </a>
            ))}
          </div>

          {/* Response-time caption */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <Zap size={12} className="text-yellow-500" />
            Typically replies in &lt; 24 hours
          </div>
        </motion.div>

        {/* --- RIGHT COL: Main Photo --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full"
        >
          <div className="relative mx-auto max-w-sm lg:max-w-md">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_PHOTO}
                alt={`${SITE_OWNER_NAME} — Fullstack AI/ML Engineer`}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default HeroSection;
