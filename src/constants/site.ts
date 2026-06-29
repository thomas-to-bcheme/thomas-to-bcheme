/**
 * Site-wide constants
 *
 * Centralizes identity, URLs, and navigation data
 * used across multiple components.
 */

// --- Identity ---
export const SITE_OWNER_NAME = 'Thomas To';
export const SITE_OWNER_EMAIL = 'thomas.to.bcheme@gmail.com';
export const SITE_OWNER_PHONE = '510-387-5408';
export const SITE_OWNER_LOCATION = 'Oakland, CA';

// --- External URLs ---
export const GITHUB_URL = 'https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io';
export const GITHUB_PROFILE_URL = 'https://github.com/thomas-to-bcheme';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/thomas-to-bcheme/';
export const YOUTUBE_URL = 'https://www.youtube.com/@thomas-to-bcheme';
export const RESUME_PDF_URL = 'https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/src/docs/Thomas_To_Resume.pdf?raw=true';
export const SLIDES_AS_CODE_URL = 'https://script.google.com/d/1unZvIXxRzGxubxCdgMeAsy9Xg-LDxULdfh7wVgcrxkxI-W5wNI_9lqLH/edit?usp=sharing';
export const PUBLICATION_URL = 'https://mcnair.ucdavis.edu/sites/g/files/dgvnsk476/files/inline-files/Design%20to%20Data%20for%20mutants%20of%20%CE%B2-glucosidase%20B%20from%20Paenibacillus%20polymyxa%20L171G%2C%20L171V%20and%20L171W.pdf';

// --- Work Authorization ---
export const WORK_AUTH = {
  citizenship: 'US Citizen',
  state: 'California',
  sponsorship: 'No sponsorship (now or future)',
  availability: '2 weeks from offer',
} as const;

// --- Site Metadata ---
export const SITE_TAGLINE = 'Operationalizing AI Agents: Bridging the gap between reality and the matrix.';
export const SITE_VERSION = 'v2.4.0';
export const SITE_REGION = 'US-West (SFO)';

// --- Navigation ---
export const NAV_LINKS = [
  { label: 'About Me', href: '#about-me', sectionId: 'about-me' },
  { label: 'Pipeline', href: '#pipeline', sectionId: 'pipeline' },
  { label: 'Study Plan', href: '#study-plan', sectionId: 'study-plan' },
  { label: 'Lifecycle', href: '#roadmap', sectionId: 'roadmap' },
] as const;

// --- Ideal Roles ---
export const IDEAL_ROLES = [
  'AI/ML Engineer',
  'AI/ML Ops',
  'Data Scientist',
  'Senior Fullstack Software Engineer',
] as const;

// --- Footer Navigation ---
export const FOOTER_NAV_LINKS = [
  { label: 'Pipeline', href: '#pipeline' },
  { label: 'Engineering', href: '#projects' },
  { label: 'About Me', href: '#about-me' },
] as const;
