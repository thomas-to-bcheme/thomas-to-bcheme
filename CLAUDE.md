# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website demonstrating fullstack engineering capabilities with an embedded AI chat agent. The architecture uses GitHub as a data warehouse backend with Vercel for frontend deployment and Hugging Face for ML model hosting.

## Commands

### Frontend (Next.js)
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend ML Models (Python)
```bash
cd backend
pip install -r requirements.txt
python main.py                        # Run with sample data
python main.py --data-path data.csv   # Run with custom data
python main.py --no-plots             # Headless environments
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4
- **AI Integration**: Google Gemini API with RAG context from `src/data/AiSystemInformation.tsx`
- **ML Backend**: Python (TensorFlow, scikit-learn) for salary prediction models
- **Infrastructure**: Vercel (frontend), GitHub Actions (CI/CD, CRON), AWS SDK (DynamoDB, S3)

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/chat/route.ts` - Gemini API streaming chat endpoint
- `src/components/` - React components (HeroSection, AiGenerator, ProjectDeepDive, etc.)
- `src/data/AiSystemInformation.tsx` - RAG context/system prompt for the AI agent
- `backend/` - Python ML models (Random Forest + TensorFlow for salary prediction)
- `markdown/` - Architecture documentation (architecture.md, roadmap.md, api.md, database.md)

### Data Flow
GitHub CRON (30-min intervals) → ETL Processing → Data Warehouse (Sandbox → Quality → Production) → Vercel deployment

### Design Constraints
- Zero-cost architecture using free-tier services
- Vercel limit: 100 deploys/24h (safe max: hourly = 24/day)
- GitHub Actions handle scheduled tasks since Vercel Hobby limits CRON to daily

## Path Aliases
TypeScript path alias `@/*` maps to `./src/*`
