"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  FileText,
  Cpu,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Dna,
} from 'lucide-react';

// --- IMPORTS ---
import Badge from '@/components/Badge';
import SystemStatusTicker from '@/components/SystemStatusTicker';
import AiGenerator from '@/components/AiGenerator';
import TrustBadge from '@/components/TrustBadge';
import Button from '@/components/ui/Button';

const HeroSection = () => {
  // Mobile chat collapsed state (U1)
  const [isMobileChatCollapsed, setIsMobileChatCollapsed] = useState(true);

  return (
    <section className="mb-16 pt-4">
      {/* SYSTEM TICKER: Real-time status bar */}
      <SystemStatusTicker />

      <div className="grid lg:grid-cols-2 gap-12 items-center mt-8">

        {/* --- LEFT COL: Value Proposition & Trust Signals --- */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center h-full" // Added flex col to maintain vertical alignment
        >
            {/* Header Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge
                color="green"
                pulse
                href="mailto:thomas.to.bcheme@gmail.com"
              >
                AVAILABLE FOR HIRE
              </Badge>
              <Badge color="zinc">California, United States</Badge>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-white leading-[1.1]">
              Fullstack<br />
              <span className="gradient-text-blue">
                AI/ML Engineer
              </span>
            </h1>

            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-6">
              Integrating AI to digitally transform software engineering using machine learning methods to enhance workflows.
            </p>

            {/* TRUST SIGNALS */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {[
                { label: 'Profit', icon: TrendingUp, variant: 'success' },
                { label: 'Risk', icon: TrendingDown, variant: 'risk' },
                { label: 'R&D', icon: Dna, variant: 'innovation' },
                { label: 'ICH', icon: ShieldCheck, variant: 'compliance' },
                { label: 'GxP', icon: ShieldCheck, variant: 'compliance' },
                { label: 'HIPAA', icon: ShieldCheck, variant: 'compliance' },
              ].map((badge) => (
                <TrustBadge
                  key={badge.label}
                  label={badge.label}
                  icon={badge.icon}
                  variant={badge.variant as 'success' | 'innovation' | 'compliance' | 'risk'}
                />
              ))}
            </div>

            {/* CTA BUTTONS (V3: Using Button component) */}
            <div className="flex flex-wrap gap-4 mt-auto">
              <Button
                variant="primary"
                href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io"
                external
              >
                <Github size={20} /> View Source
              </Button>
              <Button
                variant="secondary"
                href="https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/src/docs/Thomas_To_Resume.pdf?raw=true"
                external
              >
                <FileText size={20} /> Download Resume
              </Button>
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
           {/* Glow Effect */}
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse"></div>

           {/* Card Container */}
           <div className="relative card-base h-full p-4 shadow-2xl flex flex-col">

              {/* Agent Header */}
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
                        href="https://github.com/thomas-to-bcheme"
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

              {/* Chat Interface Area */}
              <div className="flex-1 overflow-hidden relative rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="absolute inset-0 overflow-auto custom-scrollbar">
                     <AiGenerator />
                  </div>
              </div>
           </div>
        </motion.div>

        {/* --- MOBILE: Collapsible AI Chat Card (U1) --- */}
        <motion.div
          className="lg:hidden mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative">
            {/* Glow Effect (only when expanded) */}
            {!isMobileChatCollapsed && (
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse" />
            )}

            <div className={`relative card-base shadow-lg overflow-hidden transition-all duration-300 ${
              isMobileChatCollapsed ? '' : 'min-h-[400px]'
            }`}>
              {/* Mobile Agent Header (always visible) */}
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

              {/* Chat Content */}
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
