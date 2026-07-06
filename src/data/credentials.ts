/**
 * Authoritative credentials data — the SINGLE source of truth for press
 * mentions, recognition/leadership programs, and leadership activities.
 *
 * Consumed by:
 *  - src/components/sections/FeaturedIn.tsx        (press callout)
 *  - src/components/sections/AboutMeSection.tsx    (leadership + recognition)
 *  - src/data/AiSystemInformation.ts               (RAG system prompt)
 *  - src/app/layout.tsx                            (Person JSON-LD)
 *
 * IMPORTANT: this module must stay free of React / lucide-react imports. It is
 * transitively imported by the server-side chat route via AiSystemInformation.ts;
 * keeping it pure data avoids dragging an icon library into the server bundle and
 * lets both the client UI and the server prompt read from one place.
 */

import type {
  PressFeature,
  RecognitionItem,
  LeadershipActivity,
} from '@/types/credentials';
import { PUBLICATION_URL } from '@/constants/site';

/**
 * Press features. Grounded in the real published article — do not paraphrase the
 * headline or quote. Add future mentions here; the UI + JSON-LD scale automatically.
 */
export const PRESS_FEATURES: PressFeature[] = [
  {
    id: 'ibt-ai-enabled-biology',
    publication: 'International Business Times',
    headline:
      'Thomas To on How AI-Enabled Biology is Advancing Drug Discovery and Scientific Innovation',
    url: 'https://www.ibtimes.com/thomas-how-ai-enabled-biology-advancing-drug-discovery-scientific-innovation-3804756',
    quote:
      'Technology creates value when it supports scientific decision-making while respecting the complexity of biology.',
    date: 'Jun 2026',
  },
  {
    id: 'mcnair-beta-glucosidase',
    publication: 'UC Davis McNair Scholars',
    headline:
      'Design to Data for mutants of β-glucosidase B from Paenibacillus polymyxa (L171G, L171V, L171W)',
    url: PUBLICATION_URL,
  },
];

/**
 * Recognition & leadership programs. Each links to the program's public homepage
 * so readers can learn more (the McNair publication PDF is surfaced separately in
 * PRESS_FEATURES / FeaturedIn).
 */
export const RECOGNITION_ITEMS: RecognitionItem[] = [
  {
    id: 'mcnair-trio',
    program: 'McNair Scholars TRIO Fellow',
    organization: 'UC Davis',
    role: 'Fellow',
    blurb:
      'Federal TRIO program preparing first-generation and underrepresented students for doctoral research through mentored, publication-track work.',
    url: 'https://mcnair.ucdavis.edu/2019-mcnair-scholars-program',
  },
  {
    id: 'avenuee-leadership',
    program: 'AvenueE Engineering Leadership Program',
    organization: 'UC Davis College of Engineering',
    role: 'Participant',
    blurb:
      'Engineering leadership cohort pairing peer mentorship with technical and professional development for underrepresented engineers.',
    url: 'https://avenuee.engineering.ucdavis.edu/program-overview',
  },
  {
    id: 'genentech-leadership',
    program: 'Genentech Leadership Exchange',
    organization: 'Genentech',
    role: 'Participant',
    blurb:
      'Cross-functional leadership exchange for early-career scientists and engineers, building stakeholder management and organizational leadership skills.',
    url: 'https://careers.gene.com/us/en/internships',
  },
  {
    id: 'transfer-ambassador',
    program: 'Transfer Opportunity Program Ambassador',
    organization: 'UC Davis',
    role: 'Ambassador',
    blurb:
      'Guided prospective and current community college transfer students through peer mentorship and outreach initiatives.',
    url: 'https://www.ucdavis.edu/admissions/undergraduate/transfer/transfer-opportunity-program',
  },
];

/**
 * Leadership activities. Icons are string keys (LeadershipIconName) resolved to
 * components in the JSX layer, keeping this module dependency-free.
 */
export const LEADERSHIP_ACTIVITIES: LeadershipActivity[] = [
  {
    iconName: 'Mic2',
    text: 'Produce and publish MLOps-focused educational content on YouTube and LinkedIn through an automated CI/CD publishing pipeline, driving developer community engagement and technical thought leadership.',
  },
  {
    iconName: 'GraduationCap',
    text: 'Student Outreach Ambassador supporting 100,000+ community college transfer students through peer-to-peer mentorship programs, transfer outreach initiatives, and cross-institutional community building.',
  },
  {
    iconName: 'Users',
    text: 'Active member of AIChE, ISPE, and Rosetta protein engineering community; panelist at the Ipsos AI Insights Community and inaugural Unintentional Consequences of Technology (UCOT) conference.',
  },
  {
    iconName: 'BookOpen',
    text: 'Organize collaborative workshops and learning initiatives including Interview Kickstart bootcamp peer sessions, Databricks weekly seminars, and enterprise analytics community forums.',
  },
  {
    iconName: 'Dumbbell',
    text: 'Coach students ages 3 to adult in Brazilian jiu-jitsu, delivering structured athletic training to build discipline, resilience, and community belonging in Oakland.',
  },
];
