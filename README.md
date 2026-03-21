# thomas-to-bcheme.github.io

**Operationalizing AI Agents: Bridging the gap between reality and the matrix.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-API-4285F4?logo=google)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green)

## Overview

A fullstack portfolio application that demonstrates end-to-end engineering capabilities through an embedded AI chat agent, interactive ROI calculator, and ML-powered salary prediction models. Built on a zero-cost architecture using free-tier services (Vercel, GitHub Actions, Hugging Face) with strict TypeScript and modular React component patterns.

**[Live Demo](https://thomas-to-bcheme-github-io.vercel.app/)**

---

## Open-Source Ecosystem

This portfolio is powered by standalone microservices extracted from the monorepo into dedicated open-source repositories. Each provides specialized capabilities that enrich the portfolio's AI context and content pipeline.

### [resume](https://github.com/thomas-to-bcheme/resume) — Resume & Cover Letter Tailor

A Claude Code skill that automatically tailors resumes and cover letters to specific job descriptions, generating ATS-optimized single-page PDFs.

| Capability | Details |
|------------|---------|
| **Resume Tailoring** | AI-powered with XYZ bullet formula, ATS compliance validation (6 categories), single-page PDF with 5-step auto-optimization |
| **Cover Letter Generation** | Narrative paragraph structure with JD keyword extraction and structural validation |
| **Golden Dataset** | Immutable master resume (`docs/resume.md`) — the single source of truth for all career data |
| **Tech** | Claude Code + Sonnet, Python 3.12+, fpdf2, Docker |

**Portfolio Integration:** The golden dataset feeds the RAG knowledge base in `src/data/AiSystemInformation.ts`, grounding the AI chat agent's responses in verified career data. When the resume is updated, the portfolio's AI context reflects current qualifications, projects, and metrics.

```
resume repo                         portfolio
docs/resume.md  ──── syncs to ────→  src/data/AiSystemInformation.ts (RESUME_CONTEXT)
                                         ↓
                                     POST /api/chat → Gemini API (systemInstruction)
                                         ↓
                                     AI chat responses grounded in resume data
```

### [agentic-writer](https://github.com/thomas-to-bcheme/agentic-writer) — Content Generation Platform

A Claude Code plugin that generates platform-optimized professional content for technical audiences — LinkedIn posts and Medium articles with enforced writing quality constraints.

| Capability | Details |
|------------|---------|
| **LinkedIn Posts** | Algorithm-optimized (1,000–1,300 chars), hook optimization, community engagement CTAs |
| **Medium Articles** | SEO-optimized technical articles (1,600–2,000 words, 7-min read), auto-generated tags |
| **Writing Enforcement** | 127 banned words, active voice requirement, no emojis/hashtags/semicolons |
| **Lifecycle Management** | Draft → Review → Validate → Publish → Archive with organized folder structure |
| **Tech** | Claude Code plugin system, Claude Sonnet, YAML frontmatter + Markdown |

**Portfolio Integration:** The agentic-writer's content pipeline connects to the portfolio through the LinkedIn agent skill (`claude-marketplace/tto-agent-linkedin/`), which generates technical project updates. Planned CI/CD via LinkedIn Share API will automate content publishing from generated drafts.

```
agentic-writer repo                  portfolio
skills/linkedin/SKILL.md  ── pattern shared with ──→  claude-marketplace/tto-agent-linkedin/
skills/medium/SKILL.md                                .claude/skills/linkedin/
                                                           ↓
                                                      genAI/linkedin/drafts/ → LinkedIn API (planned)
```

**Install:** `claude plugins install github:thomas-to-bcheme/agentic-writer`

---

## Features

### AI & Voice
- **Live AI Chat Agent** — Google Gemini API with RAG context from resume and portfolio data, real-time streaming responses, markdown rendering
- **Voice Input (STT)** — Web Speech API for hands-free interaction with auto-submit on silence detection
- **Voice Output (TTS)** — Speech Synthesis API with sentence-boundary queuing for natural streaming playback

### Data Visualization
- **Interactive ROI Calculator** — 3-year financial projection comparing manual labor vs. automation costs with configurable inputs, break-even analysis, and live SVG trajectory graph
- **Architecture Diagram** — 4-level visualization of the data lifecycle (Empirical Data → Infrastructure → Applications → Business Value)
- **Project Deep Dives** — Case study format with problem/solution narrative, architecture tags, and KPIs

### UX & Accessibility
- **Roadmap Timeline** — 4-phase project lifecycle with animated status indicators and responsive zig-zag layout
- **System Status Ticker** — Real-time latency, region, and system health display
- **Dark Mode** — Automatic system preference detection
- **Accessibility** — Skip links, ARIA labels, `aria-live` regions, keyboard navigation, `prefers-reduced-motion` support

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | Next.js 16 (App Router) | Server/client components, API routes, streaming |
| UI Library | React 19 | Component architecture |
| Language | TypeScript 5 (strict) | Type safety across the stack |
| Styling | Tailwind CSS v4 | Utility-first CSS with dark mode |
| Animation | Framer Motion | Page transitions, micro-interactions |
| AI | Google Gemini API | Streaming chat with RAG context |
| Validation | Zod 4 | Runtime schema validation on API routes |
| Math | KaTeX | LaTeX rendering for ROI derivations |
| Icons | Lucide React | SVG icon system |
| ML Backend | Python (TensorFlow, scikit-learn) | Salary prediction models |
| Deployment | Vercel (Hobby) | Zero-cost hosting with preview deployments |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Python** 3.9+ (optional, for ML backend)
- **Google Gemini API key** ([Get one here](https://aistudio.google.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io.git
cd thomas-to-bcheme.github.io

# Install dependencies
npm install

# Configure environment
echo "GOOGLE_API_KEY=your_gemini_api_key_here" > .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### ML Backend (Optional)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/chat/route.ts       # Gemini streaming endpoint
│   ├── layout.tsx              # Root layout (server)
│   ├── page.tsx                # Home page (client)
│   └── error.tsx               # Error boundary
├── components/
│   ├── ui/                     # Badge, Button, TrustBadge, SkipLink
│   ├── sections/               # HeroSection, AboutMe, Connect, Footer, Roadmap
│   ├── features/               # AiGenerator, ArchitectureDiagram, ProjectDeepDive
│   ├── layout/                 # BentoGrid, MotionProvider, ImpactMetric
│   ├── voice/                  # VoiceControls
│   └── roi/                    # ROICalculation + sub-components
├── hooks/                      # useChat, useActiveSection, useSpeech*
├── constants/                  # site.ts, chat.ts, roi.ts, roadmap.ts
├── types/                      # chat.ts, api-errors.ts, roi.ts
├── lib/                        # chat-api.ts, utils.tsx
└── data/                       # AiSystemInformation.ts (RAG context)

backend/                        # Python ML models
system_design_docs/             # Architecture documentation
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key for AI chat |

**Local**: Add to `.env.local` (gitignored). **Production**: Configure in Vercel Dashboard > Project Settings > Environment Variables.

---

## Deployment

The project deploys automatically to **Vercel** on push to `main`. Vercel auto-detects Next.js — no custom configuration needed.

```
Framework:  Next.js (auto-detected)
Build:      next build
Output:     .next
```

**Hobby Tier Limits**: 100 deployments/24h, 10s serverless timeout, 100GB bandwidth/month.

---

## Roadmap

| Phase | Status | Focus | Stakeholder |
|-------|--------|-------|-------------|
| **Phase 1**: MVP | Completed | Frontend architecture as marketing signal | Recruiters |
| **Phase 2**: Agentic Integration | Current | Proof-of-concept AI features on serverless | Hiring Managers |
| **Phase 3**: E2E ML Infrastructure | Upcoming | Python ML models deployed via FastAPI + HuggingFace | Technical Leads |
| **Phase 4**: Open Source Distribution | Upcoming | Refactoring, documentation, educational resources | Community |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Built by [Thomas To](https://www.linkedin.com/in/thomas-to-ucdavis/) with Next.js, Vercel, and engineering rigor.
