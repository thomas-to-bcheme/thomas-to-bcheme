/**
 * Site-wide constants
 *
 * Centralizes identity, URLs, and navigation data
 * used across multiple components.
 */

import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Dna, ShieldCheck } from 'lucide-react';

// --- Identity ---
export const SITE_OWNER_NAME = 'Thomas To';
export const SITE_OWNER_EMAIL = 'thomas.to.bcheme@gmail.com';

// --- External URLs ---
export const GITHUB_URL = 'https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io';
export const GITHUB_PROFILE_URL = 'https://github.com/thomas-to-bcheme';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/thomas-to-ucdavis/';
export const RESUME_PDF_URL = 'https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/src/docs/Thomas_To_Resume.pdf?raw=true';

// --- Site Metadata ---
export const SITE_TAGLINE = 'Operationalizing AI Agents: Bridging the gap between reality and the matrix.';
export const SITE_VERSION = 'v2.4.0';
export const SITE_REGION = 'US-West (SFO)';

// --- Navigation ---
export const NAV_LINKS = [
  { label: 'Live Agent', href: '#agent', sectionId: 'agent' },
  { label: 'About Me', href: '#about-me', sectionId: 'about-me' },
  { label: 'Solutions', href: '#proj-1', sectionId: 'proj-1' },
  { label: 'Lifecycle', href: '#roadmap', sectionId: 'roadmap' },
] as const;

// --- Ideal Roles ---
export const IDEAL_ROLES = [
  'AI/ML Engineer',
  'AI/ML Ops',
  'Data Scientist',
  'Senior Fullstack Software Engineer',
] as const;

// --- Trust Signals ---
export type TrustSignalVariant = 'success' | 'risk' | 'innovation' | 'compliance';

export interface TrustSignal {
  label: string;
  icon: LucideIcon;
  variant: TrustSignalVariant;
}

export const TRUST_SIGNALS: TrustSignal[] = [
  { label: 'Profit', icon: TrendingUp, variant: 'success' },
  { label: 'Risk', icon: TrendingDown, variant: 'risk' },
  { label: 'R&D', icon: Dna, variant: 'innovation' },
  { label: 'ICH', icon: ShieldCheck, variant: 'compliance' },
  { label: 'GxP', icon: ShieldCheck, variant: 'compliance' },
  { label: 'HIPAA', icon: ShieldCheck, variant: 'compliance' },
];

// --- Footer Navigation ---
export const FOOTER_NAV_LINKS = [
  { label: 'Live Agent', href: '#agent' },
  { label: 'Business Impact', href: '#impact' },
  { label: 'Engineering', href: '#projects' },
  { label: 'About Me', href: '#about-me' },
] as const;
