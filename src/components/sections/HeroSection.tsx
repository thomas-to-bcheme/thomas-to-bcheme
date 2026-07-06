"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Github, FileText, ArrowRight, Linkedin, Youtube, CheckCircle2, Zap, Bot } from 'lucide-react';

import { useChatWidget } from '@/components/layout/ChatWidgetProvider';

import {
  SITE_OWNER_NAME,
  SITE_OWNER_EMAIL,
  SITE_OWNER_LOCATION,
  GITHUB_URL,
  LINKEDIN_URL,
  YOUTUBE_URL,
  RESUME_PDF_URL,
  WORK_AUTH,
} from '@/constants/site';

// Hero portrait lives in src/docs (swap the photo by replacing this file).
import heroPortrait from '@/docs/thomas-to-portrait.jpg';

const WORK_AUTH_CHIPS = [
  { label: WORK_AUTH.citizenship },
  { label: WORK_AUTH.state },
  { label: WORK_AUTH.sponsorship },
  { label: WORK_AUTH.availability },
] as const;

// External profile links — rendered as labeled outlined pills, uniform with the
// "Ask my AI" / "Resume" secondary actions so the whole CTA row reads as one system.
const EXTERNAL_LINKS = [
  { icon: Github, label: 'GitHub', href: GITHUB_URL },
  { icon: Linkedin, label: 'LinkedIn', href: LINKEDIN_URL },
  { icon: Youtube, label: 'YouTube', href: YOUTUBE_URL },
] as const;

// Shared focus-visible ring, matching the convention used on nav links in page.tsx.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

// Outlined "secondary action" pill — shared by "Ask my AI" and "Resume" so they
// read as a single, uniform group (thin border, subtle hover fill).
const SECONDARY_PILL =
  'inline-flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors';

const HeroSection = () => {
  const { open: openChat } = useChatWidget();

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
          {/* Eyebrow — name · location · status, uppercase and letter-spaced so it
              sits above the headline like a byline (borrowed from the reference hero). */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-900 dark:text-zinc-100">{SITE_OWNER_NAME}</span>
            <span className="text-zinc-300 dark:text-zinc-600 select-none">·</span>
            <span>{SITE_OWNER_LOCATION}</span>
            <span className="text-zinc-300 dark:text-zinc-600 select-none">·</span>
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
              Open to Work · Jun 2026
            </span>
          </div>

          {/* Main title */}
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-3 text-zinc-900 dark:text-white leading-[1.05]">
            Fullstack<br />
            <span className="gradient-text-blue">AI/ML Engineer</span>
          </h1>

          <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-4">
            I build production AI systems for agents and manufacturing, scaling TPU/GPU-accelerated compute and turning engineering trade-offs into measurable business impact.
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

          {/* CTA — two rows: primary + on-site actions, then external profiles on
              their own line so the three profile pills always stay inline together. */}
          <div className="flex flex-col gap-2.5 mb-3">
            {/* Primary action + on-site actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Primary action — trailing-arrow "go" affordance, matching the nav
                  Contact button so the one primary stands apart from the pills. */}
              <a
                href={`mailto:${SITE_OWNER_EMAIL}`}
                className={`group inline-flex items-center gap-2 rounded-full bg-blue-600 text-white dark:bg-blue-500 px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors ${FOCUS_RING}`}
              >
                <span>Let&apos;s Chat</span>
                <ArrowRight size={16} className="opacity-80 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </a>

              {/* Opens the same floating RAG chat widget as the corner launcher. */}
              <button type="button" onClick={openChat} className={`${SECONDARY_PILL} ${FOCUS_RING}`}>
                <Bot size={16} />
                <span>Ask my AI</span>
              </button>
              <a
                href={RESUME_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${SECONDARY_PILL} ${FOCUS_RING}`}
              >
                <FileText size={16} />
                <span>Resume</span>
              </a>
            </div>

            {/* External profiles on their own row — labeled pills, uniform with the
                actions above. The visible text is the accessible name. */}
            <div className="flex flex-wrap items-center gap-2.5">
              {EXTERNAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${SECONDARY_PILL} ${FOCUS_RING}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
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
                src={heroPortrait.src}
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
