/**
 * Roadmap phase data
 *
 * Centralizes the project roadmap phases displayed
 * in the Roadmap component.
 */

import { LayoutTemplate, Server, Layers, GitBranch } from 'lucide-react';
import type React from 'react';

export type PhaseStatus = 'completed' | 'current' | 'upcoming';

export interface RoadmapPhase {
  id: number;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  description: string;
  goal: string;
  stakeholder: string;
  icon: React.ElementType;
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
    subtitle: 'Robust Backend & CI/CD',
    status: 'upcoming',
    stakeholder: 'Technical Leads',
    icon: Layers,
    description: 'Complete end-to-end and cross-platform CI/CD of local Python ML models shipped as a FastAPI to GitHub and deployed on Hugging Face. The Vercel frontend will call this custom ecosystem without external platforms.',
    goal: 'Robust backend development with its own CI/CD pipeline integrated via API. All infrastructure built from scratch to demonstrate fullstack architectural control.',
  },
  {
    id: 4,
    title: 'Phase 4: Open Source Distribution',
    subtitle: 'Refactoring & Education',
    status: 'upcoming',
    stakeholder: 'Community & Developers',
    icon: GitBranch,
    description: 'Refactoring code, addressing technical debt, and distributing the public portfolio as an open-source learning resource. Creating modules to teach building Agentic methods from code, not low-code solutions.',
    goal: 'Completeness of a final project. Refactoring to best practices, aligning documentation, and creating educational resources to mentor open collaboration.',
  },
];
