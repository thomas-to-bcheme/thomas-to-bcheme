/**
 * Chat-related constants
 *
 * Centralizes suggested questions and capability badges
 * used in the AiGenerator component.
 */

import { FileText, Briefcase, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CapabilityBadge {
  icon: LucideIcon;
  label: string;
  description: string;
}

export const SUGGESTED_QUESTIONS = [
  'What are your strongest technical skills?',
  'Tell me about your AI/ML experience',
  'What projects demonstrate your capabilities?',
  'Are you available for interviews?',
] as const;

export const CAPABILITY_BADGES: CapabilityBadge[] = [
  { icon: FileText, label: 'Resume Context', description: 'Full resume access' },
  { icon: Briefcase, label: 'Career History', description: 'Work experience details' },
  { icon: Wrench, label: 'Tech Stack', description: 'Technical expertise' },
];
