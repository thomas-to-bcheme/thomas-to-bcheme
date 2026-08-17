/**
 * Site-wide constants
 *
 * Centralizes identity, URLs, and navigation data
 * used across multiple components.
 */

import { LATEST_CHANGELOG_VERSION } from './changelog';

// --- Identity ---
export const SITE_OWNER_NAME = 'Thomas To';
export const SITE_OWNER_EMAIL = 'thomas.to.bcheme@gmail.com';
export const SITE_OWNER_PHONE = '510-387-5408';
export const SITE_OWNER_LOCATION = 'Oakland, CA';

// --- External URLs ---
export const SITE_URL = 'https://thomas-to-bcheme.github.io';
export const GITHUB_URL = 'https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io';
export const GITHUB_PROFILE_URL = 'https://github.com/thomas-to-bcheme';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/thomas-to-bcheme/';
export const YOUTUBE_URL = 'https://www.youtube.com/@thomas-to-bcheme';
export const RESUME_PDF_URL = 'https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/src/docs/Thomas_To_Resume.pdf?raw=true';
export const SLIDES_AS_CODE_URL = 'https://script.google.com/d/1unZvIXxRzGxubxCdgMeAsy9Xg-LDxULdfh7wVgcrxkxI-W5wNI_9lqLH/edit?usp=sharing';
export const PUBLICATION_URL = 'https://mcnair.ucdavis.edu/sites/g/files/dgvnsk476/files/inline-files/Design%20to%20Data%20for%20mutants%20of%20%CE%B2-glucosidase%20B%20from%20Paenibacillus%20polymyxa%20L171G%2C%20L171V%20and%20L171W.pdf';
export const HUGGING_FACE_SPACE_URL = 'https://thomas-to-bcheme-portfolio-zerogpu.hf.space';
export const GRADIO_SHARING_GUIDE_URL = 'https://gradio.app/guides/sharing-your-app';
export const MANNING_BOOK_URL = 'https://www.manning.com/books/build-ai-drug-discovery-pipelines';

// --- Work Authorization ---
export const WORK_AUTH = {
  citizenship: 'US Citizen',
  state: 'California',
  sponsorship: 'No sponsorship (now or future)',
  availability: '2 weeks from offer',
} as const;

// --- Site Metadata ---
export const SITE_TAGLINE = 'Operationalizing AI Agents: Bridging the gap between reality and the matrix.';
export const SITE_VERSION = LATEST_CHANGELOG_VERSION;
export const SITE_REGION = 'US-West (SFO)';

// --- Navigation ---
// Discriminated union: a plain route link, or a dropdown group of related
// links (currently just "Interview", collapsing the 4 interview-prep routes
// into one top-level slot so the header doesn't overflow at common widths).
export type NavLink = { type: 'link'; label: string; href: string };
export type NavGroup = { type: 'group'; label: string; items: { label: string; href: string }[] };
export type NavEntry = NavLink | NavGroup;

export const NAV_LINKS: NavEntry[] = [
  { type: 'link', label: 'Study Plan', href: '/study-plan' },
  {
    type: 'group',
    label: 'Interview',
    items: [
      { label: 'Communication', href: '/effective-communication' },
      { label: 'Technical Prep', href: '/practical-technical' },
      { label: 'System Design', href: '/system-design' },
      { label: 'Behavioural', href: '/behavioural' },
    ],
  },
  { type: 'link', label: 'Jobs', href: '/jobs' },
  { type: 'link', label: 'Hugging Face', href: '/huggingface' },
  { type: 'link', label: 'Projects', href: '/projects' },
  { type: 'link', label: 'Glossary', href: '/glossary' },
];

// --- Ideal Roles ---
export const IDEAL_ROLES = [
  'AI/ML Engineer',
  'AI/ML Ops',
  'Data Scientist',
  'Senior Fullstack Software Engineer',
] as const;

// --- Footer Navigation ---
export const FOOTER_NAV_LINKS = [
  { label: 'Study Plan', href: '/study-plan' },
  { label: 'Behavioural', href: '/behavioural' },
  { label: 'Effective Communication', href: '/effective-communication' },
  { label: 'Practical Technical', href: '/practical-technical' },
  { label: 'System Design', href: '/system-design' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Hugging Face', href: '/huggingface' },
  { label: 'Projects', href: '/projects' },
  { label: 'Glossary', href: '/glossary' },
  { label: 'About Me', href: '/#about-me' },
] as const;
