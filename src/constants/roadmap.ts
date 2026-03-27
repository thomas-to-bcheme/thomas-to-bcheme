/**
 * Roadmap phase data
 *
 * Centralizes the project roadmap phases displayed
 * in the Roadmap component.
 */

import { LayoutTemplate, Server, Layers, GitBranch } from 'lucide-react';
import type React from 'react';

export type PhaseStatus = 'completed' | 'current' | 'upcoming';
export type LinkType = 'github' | 'youtube' | 'linkedin';

export interface RoadmapLink {
  label: string;
  url: string;
  type: LinkType;
}

export interface RoadmapPhase {
  id: number;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  description: string;
  goal: string;
  stakeholder: string;
  icon: React.ElementType;
  links?: RoadmapLink[];
}

export const PHASES: RoadmapPhase[] = [
  {
    id: 1,
    title: 'Phase 1: Minimal Viable Product',
    subtitle: 'Frontend > Backend',
    status: 'completed',
    stakeholder: 'Recruiters',
    icon: LayoutTemplate,
    description: 'Deployment of the core frontend architecture to act as a marketing signal. Demonstrating proven competency and qualification to recruiters through a high-performance, accessible web application.',
    goal: 'Frontend UI as a better visual representation of the resume. Prioritizing 0 to 1 delivery to demonstrate aptitude.',
  },
  {
    id: 2,
    title: 'Phase 2: Agentic Integration',
    subtitle: 'Lightweight Backend Features',
    status: 'current',
    stakeholder: 'Hiring Managers',
    icon: Server,
    description: 'Implementation of proof-of-concept Agentic features using Vercel\'s serverless infrastructure. Highlighting the agentic projects shown on the homepage to demonstrate immediate value.',
    goal: 'Frontend development with lightweight backend development of agentic features. Focus on shipping demonstrable features live during interviews.',
  },
  {
    id: 3,
    title: 'Phase 3: E2E ML Infrastructure',
    subtitle: 'Robust Backend & Open Source',
    status: 'upcoming',
    stakeholder: 'Technical Leads',
    icon: Layers,
    description: 'Complete end-to-end CI/CD of local Python ML models deployed via FastAPI to Hugging Face. Simultaneously, the Claude Code Marketplace plugin ecosystem and three standalone open-source microservices—agentic writer, LinkedIn content loop, and resume tailor—are extracted, hardened, and published as independent distribution-ready tools.',
    goal: 'Robust backend development with its own CI/CD pipeline integrated via API. All open-source tooling built from scratch to demonstrate fullstack architectural control and real-world distribution.',
    links: [
      { label: 'agentic-writer', url: 'https://github.com/thomas-to-bcheme/agentic-writer', type: 'github' },
      { label: 'linkedin-content-loop', url: 'https://github.com/thomas-to-bcheme/linkedin-content-loop', type: 'github' },
      { label: 'resume', url: 'https://github.com/thomas-to-bcheme/resume', type: 'github' },
    ],
  },
  {
    id: 4,
    title: 'Phase 4: Open Source Distribution',
    subtitle: 'Education & Community',
    status: 'upcoming',
    stakeholder: 'Community & Developers',
    icon: GitBranch,
    description: 'The lifecycle closes with video documentation on YouTube and written technical posts on LinkedIn—explaining how each system was designed, built, and operated using modern software engineering methods. This transforms the portfolio from a private artifact into a public teaching resource for engineers learning to build agentic systems from code, not low-code solutions.',
    goal: 'Produce a video series and LinkedIn content stream documenting the full 0-to-1 engineering arc: design decisions, architecture tradeoffs, and lessons learned—turning this project into an open-source educational artifact.',
    links: [
      { label: '@thomas-to-bcheme', url: 'https://www.youtube.com/@thomas-to-bcheme', type: 'youtube' },
      { label: 'thomas-to-bcheme', url: 'https://www.linkedin.com/in/thomas-to-bcheme/', type: 'linkedin' },
    ],
  },
];
