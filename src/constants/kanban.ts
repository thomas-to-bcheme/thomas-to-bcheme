/**
 * Kanban pipeline data
 *
 * Centralizes project pipeline items displayed
 * in the KanbanBoard component.
 */

export type KanbanStatus = 'in-queue' | 'in-development' | 'completed';

export interface KanbanItem {
  id: string;
  title: string;
  role: string;
  problem: string;
  solution: string;
  tags: string[];
  kpis: string[];
  parameters?: string[];
  status: KanbanStatus;
  githubUrl?: string;
  priority: number;
}

export const KANBAN_ITEMS: KanbanItem[] = [
  // --- IN QUEUE ---
  {
    id: 'linkedin-api-cicd',
    title: 'LinkedIn API CI/CD Pipeline',
    role: 'Content Automation Engineer',
    problem: 'Manual LinkedIn posting breaks publishing consistency and requires context-switching during deep work.',
    solution: 'Automate content publishing via LinkedIn API with OAuth 2.0 token refresh, triggered by GitHub Actions on a CRON schedule.',
    tags: ['LinkedIn API', 'GitHub Actions', 'OAuth 2.0', 'CI/CD', 'TypeScript'],
    kpis: ['Zero manual post intervention', 'Consistent publishing cadence', 'API-driven content rotation'],
    status: 'in-queue',
    priority: 1,
  },
  {
    id: 'apple-lifestyle-app',
    title: 'Apple Lifestyle App',
    role: 'iOS Engineer / Health Data Architect',
    problem: 'Fragmented biometric data across apps lacks vertical integration — no unified model connecting Apple Watch sensors to nutrition and activity planning.',
    solution: 'Native iOS + WatchOS app using HealthKit to surface real-time HRV, VO2 max, and activity metrics into a unified lifestyle dashboard.',
    tags: ['Swift', 'SwiftUI', 'WatchOS', 'HealthKit', 'CoreML', 'CloudKit'],
    kpis: ['Real-time biometric sync from Apple Watch', 'Unified HRV + activity + nutrition view', 'Vertical Apple ecosystem integration'],
    status: 'in-queue',
    priority: 2,
  },
  {
    id: 'youtube-bodyfat-analysis',
    title: 'YouTube: Bodyweight vs. Bodyfat Analysis',
    role: 'Data Science Communicator',
    problem: 'The fitness community conflates 1% bodyweight loss with 1% bodyfat loss — these are different rate-limiting steps for macro nutrient allocation based on lean mass.',
    solution: 'Data-driven video comparing both models, deriving macro targets from lean mass (not total weight), and visualizing the bottleneck difference using Python analysis.',
    tags: ['Python', 'Matplotlib', 'Pandas', 'Nutrition Science', 'YouTube'],
    kpis: ['Visual proof of lean mass vs. total weight divergence', 'Macro allocation model based on FFMI', 'Accessible biochemistry for fitness audience'],
    status: 'in-queue',
    priority: 3,
  },

  // --- IN DEVELOPMENT ---
  // Source: PHASES[1] in src/constants/roadmap.ts (status: 'current')
  {
    id: 'phase2-agentic',
    title: 'Phase 2: Agentic Integration',
    role: 'Fullstack AI Engineer',
    problem: 'Agentic projects exist only as local prototypes with no live demonstration path for interviews or portfolio visitors.',
    solution: 'Implement proof-of-concept agentic features using Vercel serverless infrastructure, surfacing live demos on the portfolio homepage.',
    tags: ['Next.js', 'Vercel Serverless', 'Google Gemini', 'RAG', 'TypeScript'],
    kpis: ['Demonstrable agentic features live during interviews', 'Serverless architecture on free-tier infrastructure', 'Streaming chat with RAG context'],
    status: 'in-development',
    priority: 1,
  },

  // --- COMPLETED ---
  // Enterprise projects — migrated from Solutions BentoGrid section
  {
    id: 'agentic-revenue-optimization',
    title: 'Agentic Revenue Optimization',
    role: 'AI/ML Engineer',
    problem: 'High biological variability in donor starting material (Leukopaks, Bone Marrow) led to unpredictable cell yields, causing inventory misalignment and lost revenue on rare cell types.',
    solution: 'Architected a predictive model to classify donors by highest probable cell yield (optimizing for Rarity vs. Throughput). Deployed an Agentic Interface to bridge lab data with enterprise ERP systems, automating yield reporting for sales teams.',
    parameters: ['Weight', 'Height', 'Age', 'Sex', 'Ethnicity', 'Smoker', 'Blood Type', 'CMV Status', 'Cell Count (TNC)', 'Cell Count (MNC)', 'Cell Count (Isolate)'],
    tags: ['CRM (CRIO)', 'ERP (SAP)', 'Snowflake', 'BI (Tableau)', 'SQL', 'Python'],
    kpis: ['Querying from hours to minutes', 'Ability to select donors for orders'],
    status: 'completed',
    priority: 1,
  },
  {
    id: 'agentic-onboarding',
    title: 'Agentic Onboarding',
    role: 'AI/ML Engineer',
    problem: 'Fragmented documentation and reliance on tribal knowledge (i.e word of mouth) caused slow onboarding and information silos.',
    solution: 'RAG Agents fine-tuned to department specific standard operating procedures (SOP) for niche context with at least one (1) orchestrator agent with general context for cross-functional insight.',
    parameters: ['SOP', 'Work Instructions', 'Human Validated Training Text'],
    tags: ['Google', 'ERP (SAP)', 'Snowflake', 'Atlassian (Confluence)', 'MCP', 'Vector DB', 'SQL', 'Python'],
    kpis: ["Increased learning rate up to 80% (Wright's Law: Stanford-B model)", 'Resource efficient contextual GenAI'],
    status: 'completed',
    priority: 2,
  },
  // Open-source projects
  {
    id: 'linkedin-content-loop',
    title: 'LinkedIn Content Loop',
    role: 'Automation Engineer',
    problem: 'Manual LinkedIn post scheduling breaks consistency; no structured rotation system for pre-generated typed content.',
    solution: 'CI/CD pipeline using GitHub Actions CRON to auto-rotate TypeScript-typed LinkedIn posts from a managed content queue.',
    tags: ['GitHub Actions', 'CRON', 'TypeScript', 'CI/CD', 'Markdown'],
    kpis: ['Fully automated post rotation', 'TypeScript-typed content contracts', 'Zero manual scheduling'],
    status: 'completed',
    githubUrl: 'https://github.com/thomas-to-bcheme/linkedin-content-loop',
    priority: 3,
  },
  {
    id: 'resume-tailor',
    title: 'Resume & Cover Letter Tailor',
    role: 'AI/ML Engineer',
    problem: 'Job applicants cannot efficiently customize resumes per job description while maintaining ATS compliance and professional quality.',
    solution: 'Claude Sonnet sub-agents tailor a golden dataset (master resume) to specific JDs, generating ATS-compliant single-page PDFs via fpdf2.',
    tags: ['Claude Sonnet', 'Python 3.12', 'fpdf2', 'Docker', 'ATS Validation'],
    kpis: [
      '79 banned words enforced',
      'Single-page PDF with zero manual intervention',
      'Batch processing across job descriptions',
      '5-step cascading page-fit optimization',
    ],
    status: 'completed',
    githubUrl: 'https://github.com/thomas-to-bcheme/resume',
    priority: 4,
  },
  {
    id: 'agentic-writer',
    title: 'Agentic Writer',
    role: 'AI/ML Engineer',
    problem: 'Technical professionals lack a structured system for creating platform-specific content with consistent quality and voice.',
    solution: 'Claude Code plugin enforcing a content lifecycle (draft → review → validate → publish → archive) with 127 banned words and active voice validation.',
    tags: ['Claude Code', 'YAML', 'Prompt Engineering', 'Markdown', 'Claude Sonnet'],
    kpis: [
      '127 banned words enforced',
      '1,000–1,300 char LinkedIn posts',
      '1,600–2,000 word Medium articles',
      'Active voice-only validation',
    ],
    status: 'completed',
    githubUrl: 'https://github.com/thomas-to-bcheme/agentic-writer',
    priority: 5,
  },
];
