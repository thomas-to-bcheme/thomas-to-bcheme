# Thomas To Portfolio

> A fullstack engineering portfolio and landing page for open-source developer tools — demonstrating "Show, Don't Tell" through live, interactive technology.

[![Portfolio](https://img.shields.io/badge/Portfolio-Visit%20Live%20Site-2ea44f?style=for-the-badge&logo=vercel&logoColor=white)](https://thomas-to-bcheme-github-io.vercel.app/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/thomas-to-ucdavis/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python)](https://python.org/)

---

## Open Source Tools

Built from scratch. Used day-to-day. Each tool lives in its own repository with full documentation.

```mermaid
flowchart LR
    subgraph Portfolio["thomas-to-bcheme"]
        SITE[Portfolio Site<br/>Next.js + Gemini AI]
        ML[ML Backend<br/>Salary Prediction]
        PLUGINS[Claude Code Plugins<br/>Git Workflows]
    end

    subgraph Tools["Open Source Tools"]
        RESUME["resume<br/>AI Resume Tailor"]
        WRITER["agentic-writer<br/>Content Generator"]
    end

    Portfolio --- Tools

    classDef portfolio fill:#000,stroke:#fff,color:#fff
    classDef tools fill:#1e3a5f,stroke:#4a90d9,color:#fff

    class SITE,ML,PLUGINS portfolio
    class RESUME,WRITER tools
```

### resume

> AI-powered resume and cover letter tailoring with ATS compliance validation.

[![GitHub](https://img.shields.io/badge/Repo-thomas--to--bcheme%2Fresume-24292e?logo=github)](https://github.com/thomas-to-bcheme/resume)

A Claude Code skill that tailors resumes and cover letters to job descriptions using AI sub-agents, then validates output against ATS compliance rules and generates single-page PDFs. Reads from an immutable golden dataset, supports batch processing, and produces editable markdown intermediates.

| | |
|---|---|
| **Tech** | Claude Code Skills + Agents, Claude Sonnet, Python 3.12+ (fpdf2), Docker optional |
| **Features** | XYZ bullet formula, ATS validation (6 categories), single-page PDF auto-optimization, batch processing, three-file workflow per application |

### agentic-writer

> Platform-optimized professional content for LinkedIn and Medium.

[![GitHub](https://img.shields.io/badge/Repo-thomas--to--bcheme%2Fagentic--writer-24292e?logo=github)](https://github.com/thomas-to-bcheme/agentic-writer)

A Claude Code plugin that generates platform-optimized professional content for LinkedIn and Medium. Enforces strict writing standards (active voice, 127 banned words, character limits) and manages content lifecycle from draft through publication.

| | |
|---|---|
| **Tech** | Claude Code plugin system, Claude Sonnet, YAML/JSON config, Markdown |
| **Features** | `/linkedin` and `/medium` slash commands, algorithm-optimized posts, SEO articles, writing style enforcement, content lifecycle management |

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser[Browser]
        Mobile[Mobile]
    end

    subgraph Vercel["Vercel Edge"]
        NextJS[Next.js 16<br/>App Router]
        API[API Routes]
        Edge[Edge Functions]
    end

    subgraph Services["External Services"]
        Gemini[Google Gemini<br/>AI Chat]
    end

    subgraph GitHub["GitHub Infrastructure"]
        Actions[GitHub Actions<br/>CI/CD]
        Repo[(Repository<br/>Data Warehouse)]
    end

    subgraph ML["ML Backend"]
        HF[Hugging Face]
        TF[TensorFlow]
        SKL[scikit-learn]
    end

    Browser & Mobile --> NextJS
    NextJS --> API
    API --> Edge
    Edge --> Gemini
    Actions --> Repo
    Repo -->|Deploy| Vercel
    HF --> TF & SKL

    classDef vercel fill:#000,stroke:#fff,color:#fff
    classDef github fill:#24292e,stroke:#fff,color:#fff
    classDef service fill:#4285f4,stroke:#fff,color:#fff
    classDef ml fill:#ff6f00,stroke:#fff,color:#fff

    class NextJS,API,Edge vercel
    class Actions,Repo github
    class Gemini service
    class HF,TF,SKL ml
```

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Chat Agent** | Live streaming chat powered by Google Gemini with RAG context |
| **Voice Controls** | Speech-to-Text input and Text-to-Speech output |
| **Project Showcase** | Interactive deep-dives with architecture visualizations |
| **ROI Calculator** | Interactive calculator demonstrating business value |
| **ML Salary Prediction** | Random Forest + TensorFlow models for job market analysis |
| **Dark Mode** | Automatic theme switching with system preferences |

---

## Tech Stack

```mermaid
flowchart LR
    subgraph Frontend["Frontend"]
        direction TB
        N[Next.js 16] --> R[React 19]
        R --> T[TypeScript 5]
        T --> TW[Tailwind v4]
    end

    subgraph Backend["Backend"]
        direction TB
        PY[Python 3.8+]
        PY --> TF[TensorFlow]
        PY --> SK[scikit-learn]
    end

    subgraph Infra["Infrastructure"]
        direction TB
        V[Vercel Edge]
        GH[GitHub Actions]
        HF[Hugging Face]
    end

    subgraph AI["AI Services"]
        direction TB
        GEM[Google Gemini]
        RAG[RAG Context]
    end

    Frontend <--> Infra
    Backend <--> Infra
    Infra <--> AI
```

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Framer Motion |
| **AI/ML** | Google Gemini API, TensorFlow, scikit-learn, NumPy, Pandas |
| **Backend** | Python 3.8+, Node.js |
| **Infrastructure** | Vercel (Edge Functions), GitHub Actions (CI/CD), AWS SDK |
| **Data** | AWS DynamoDB, S3, Vercel Edge Config, Vercel Blob |
| **Quality** | ESLint 9, TypeScript strict mode, Zod validation |

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/thomas-to-bcheme/thomas-to-bcheme.git
cd thomas-to-bcheme
npm install

# Configure environment
cp .env .env.local
# Add GOOGLE_API_KEY to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### ML Backend (Optional)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

---

## Project Structure

```mermaid
flowchart TB
    subgraph Root["thomas-to-bcheme/"]
        subgraph SRC["src/"]
            APP[app/<br/>Next.js Routes]
            COMP[components/<br/>React UI]
            DATA[data/<br/>RAG Context]
            LIB[lib/<br/>Utilities]
        end

        subgraph BE["backend/"]
            MLM[ml_model.py]
            DL[dl_model.py]
            EVAL[evaluation.py]
        end

        subgraph PLUG["claude-marketplace/"]
            GIT[git-push<br/>git-commit<br/>git-README]
            AGENT[tto-agent-*<br/>9 specialists]
        end

        subgraph DOCS["system_design_docs/"]
            ARCH[architecture.md]
            APIDOC[api.md]
            DEPLOY[deployment.md]
        end
    end

    APP --> COMP
    COMP --> DATA
    APP --> LIB
```

<details>
<summary>Full Directory Tree</summary>

```
thomas-to-bcheme/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/
│   │   │   └── chat/route.ts     # Gemini streaming endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/               # React components (18 total)
│   ├── data/
│   │   └── AiSystemInformation.tsx  # RAG context
│   ├── lib/                      # Utilities
│   └── hooks/                    # Custom React hooks
├── backend/                      # Python ML models
│   ├── main.py
│   ├── ml_model.py               # Random Forest
│   ├── dl_model.py               # TensorFlow
│   └── requirements.txt
├── claude-marketplace/           # Claude Code plugins (15 total)
│   ├── git-push/
│   ├── git-commit/
│   ├── git-README/
│   ├── tto-agent-orchestrator/
│   └── ...
├── system_design_docs/           # Architecture documentation
└── CLAUDE.md
```

</details>

---

## API Reference

### Chat API

```mermaid
sequenceDiagram
    participant C as Client
    participant A as /api/chat
    participant R as RAG Context
    participant G as Google Gemini

    C->>A: POST {messages}
    A->>R: Load AiSystemInformation
    A->>G: Stream request + context
    loop Streaming Response
        G-->>A: Text chunk
        A-->>C: SSE event
    end
    A-->>C: Stream complete
```

**POST** `/api/chat`

```json
{
  "messages": [
    { "role": "user", "content": "Tell me about Thomas" }
  ]
}
```

**Response:** SSE stream with `X-Correlation-ID` header

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |

---

## Claude Code Plugins

This repository includes 15 Claude Code plugins in `claude-marketplace/` for git workflows and specialized development agents.

> Resume tailoring and content writing capabilities have been extracted into standalone open-source tools: [resume](https://github.com/thomas-to-bcheme/resume) and [agentic-writer](https://github.com/thomas-to-bcheme/agentic-writer).

```mermaid
flowchart LR
    subgraph Git["Git Workflows"]
        GP[git-push]
        GC[git-commit]
        GPA[git-push-agentic]
        GR[git-README]
    end

    subgraph Agents["Specialized Agents"]
        ORCH[orchestrator]
        FE[frontend]
        BE[backend]
        APIAG[api]
        QA[qa]
        MLAG[ai-ml]
        OPS[ops]
        UX[uiux]
    end

    subgraph Init["Setup"]
        INIT[tto-init]
        SWE[tto-agent-swe]
    end

    SWE --> Agents
    INIT --> Git
```

| Plugin | Description | Command |
|--------|-------------|---------|
| **tto-init** | Initialize CLAUDE.md | `/init` |
| **git-commit** | Auto-generate commit | `/git-commit` |
| **git-push** | Interactive push | `/git-push` |
| **git-push-agentic** | Autonomous workflow | `/git-push-agentic` |
| **git-README** | 5-agent README generator | `/git-README` |

### Quick Install

```bash
PLUGIN_NAME="git-push"
mkdir -p .claude/plugins/${PLUGIN_NAME}/.claude-plugin .claude/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME} && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json" -o ".claude/plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME}/SKILL.md" -o ".claude/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME}/SKILL.md"
```

---

## CI/CD Pipeline

```mermaid
flowchart LR
    subgraph Trigger["Triggers"]
        PUSH[Push to main]
        PR[Pull Request]
    end

    subgraph Actions["GitHub Actions"]
        LINT[Lint & Type Check]
        BUILD[Build]
    end

    subgraph Deploy["Deployment"]
        PREVIEW[Preview Deploy]
        PROD[Production Deploy]
    end

    PUSH --> LINT --> BUILD --> PROD
    PR --> LINT --> BUILD --> PREVIEW
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](system_design_docs/architecture.md) | Platform KPIs, zero-cost infrastructure |
| [API Design](system_design_docs/api.md) | Chat API streaming, RAG context |
| [Database](system_design_docs/database.md) | GitHub-as-warehouse pattern |
| [Deployment](system_design_docs/deployment.md) | CI/CD pipeline, Vercel config |
| [Frontend](system_design_docs/frontend.md) | Component architecture |
| [ML Models](system_design_docs/ml-models.md) | Random Forest + TensorFlow |
| [Roadmap](system_design_docs/roadmap.md) | Feature timeline |

---

## Roadmap

### Track A: Data Engineering Salary Prediction

EDA and ML pipeline for predicting data engineering salaries, identifying the AI skills premium.

```mermaid
flowchart TD
    subgraph Data["Data Foundation"]
        CSV[(jobs_dataset.csv<br/>735 rows)]
        TAX[Skill Taxonomy<br/>DE: 62 keywords<br/>AI: 56 keywords]
        SAL[Salary Parser<br/>Annual/Hourly/Range]
    end

    subgraph EDA["Exploratory Data Analysis"]
        SEG{Skill Classification}
        CSV --> SAL --> SEG
        TAX --> SEG
        SEG -->|No AI skills| PDE["Pure DE"]
        SEG -->|DE + AI skills| HYB["Hybrid DE+AI"]
        SEG -->|No DE skills| PAI["Pure AI"]
    end

    subgraph Models["Dual Ridge Regression"]
        PDE --> MA["Model A<br/>Lower Bound"]
        HYB --> MB["Model B<br/>Upper Bound"]
        MA --> BAND["Salary Band"]
        MB --> BAND
    end

    subgraph Deployment["Deployment"]
        BAND --> HF["Hugging Face<br/>Gradio API"]
        HF --> EXT["Chrome Extension"]
    end

    classDef data fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef eda fill:#2d5016,stroke:#5cb85c,color:#fff
    classDef model fill:#5c3d1e,stroke:#d9a441,color:#fff
    classDef deploy fill:#3d1e5c,stroke:#9b59b6,color:#fff

    class CSV,TAX,SAL data
    class SEG,PDE,HYB,PAI eda
    class MA,MB,BAND model
    class HF,EXT deploy
```

> For content automation and resume tooling roadmaps, see the [agentic-writer](https://github.com/thomas-to-bcheme/agentic-writer) and [resume](https://github.com/thomas-to-bcheme/resume) repositories.

---

## Contributing

```mermaid
gitGraph
    commit id: "main"
    branch feature/your-feature
    checkout feature/your-feature
    commit id: "Implement"
    commit id: "Test"
    checkout main
    merge feature/your-feature id: "PR Merged"
```

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow coding standards in `CLAUDE.md`
4. Run linting: `npm run lint`
5. Commit changes: `git commit -m 'Add feature'`
6. Push and open PR

---

## License

MIT License - Open source learning resource.

---

## Author

**Thomas To** - Biochemical Engineer turned Fullstack Developer

- [Portfolio](https://thomas-to-bcheme.vercel.app)
- [LinkedIn](https://www.linkedin.com/in/thomas-to-ucdavis/)
- [GitHub](https://github.com/thomas-to-bcheme)
- Email: thomas.to.bcheme@gmail.com
