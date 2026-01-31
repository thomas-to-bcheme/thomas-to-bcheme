# Thomas To Portfolio

> A fullstack engineering portfolio with an embedded AI chat agent, demonstrating "Show, Don't Tell" through live, interactive technology.

[![Portfolio](https://img.shields.io/badge/Portfolio-Visit%20Live%20Site-2ea44f?style=for-the-badge&logo=vercel&logoColor=white)](https://thomas-to-bcheme-github-io.vercel.app/)
[![Resume](https://img.shields.io/badge/Resume-Download%20PDF-0078D4?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)](src/docs/Thomas_To_Resume.pdf?raw=true)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/thomas-to-ucdavis/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python)](https://python.org/)
[![LinkedIn Scheduler](https://github.com/thomas-to/thomas-to-bcheme/actions/workflows/linkedin-scheduler.yml/badge.svg)](https://github.com/thomas-to/thomas-to-bcheme/actions/workflows/linkedin-scheduler.yml)

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
        LinkedIn[LinkedIn API<br/>Share Posts]
    end

    subgraph GitHub["GitHub Infrastructure"]
        Actions[GitHub Actions<br/>CRON Scheduler]
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
    Edge --> LinkedIn
    Actions -->|Trigger| API
    Actions --> Repo
    Repo -->|Deploy| Vercel
    HF --> TF & SKL

    classDef vercel fill:#000,stroke:#fff,color:#fff
    classDef github fill:#24292e,stroke:#fff,color:#fff
    classDef service fill:#4285f4,stroke:#fff,color:#fff
    classDef ml fill:#ff6f00,stroke:#fff,color:#fff

    class NextJS,API,Edge vercel
    class Actions,Repo github
    class Gemini,LinkedIn service
    class HF,TF,SKL ml
```

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Chat Agent** | Live streaming chat powered by Google Gemini with RAG context |
| **LinkedIn Automation** | Scheduled posting via GitHub Actions with content management |
| **Voice Controls** | Speech-to-Text input and Text-to-Speech output |
| **Project Showcase** | Interactive deep-dives with architecture visualizations |
| **ROI Calculator** | Interactive calculator demonstrating business value |
| **ML Salary Prediction** | Random Forest + TensorFlow models for job market analysis |
| **Claude Code Plugins** | 15 specialized agent plugins for AI-assisted workflows |
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
            ML[ml_model.py]
            DL[dl_model.py]
            EVAL[evaluation.py]
        end

        subgraph PLUG["plugins/"]
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
│   │   │   ├── chat/route.ts     # Gemini streaming endpoint
│   │   │   └── linkedin/         # LinkedIn API endpoints
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
├── plugins/                      # Claude Code agents (15 total)
│   ├── git-push/
│   ├── git-commit/
│   ├── git-README/
│   ├── tto-agent-orchestrator/
│   └── ...
├── system_design_docs/           # Architecture documentation
├── genAI/linkedin-posts/         # Content management
├── .github/workflows/
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

### LinkedIn API

```mermaid
sequenceDiagram
    participant S as GitHub CRON
    participant A as /api/linkedin/post
    participant F as genAI/linkedin-posts/
    participant L as LinkedIn API

    S->>A: POST {filename}
    A->>F: Read validated post
    A->>L: POST ugcPosts
    L-->>A: 201 Created
    A->>F: Archive to posted/
    A-->>S: Success response
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/linkedin/content` | GET | List available posts |
| `/api/linkedin/post` | POST | Publish to LinkedIn |

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `LINKEDIN_ACCESS_TOKEN` | No | OAuth bearer token |
| `LINKEDIN_PERSON_URN` | No | `urn:li:person:{id}` |
| `LINKEDIN_DRY_RUN` | No | Test without posting |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | No | AWS credentials |

See [system_design_docs/linkedin-api.md](system_design_docs/linkedin-api.md) for OAuth setup.

---

## Claude Code Plugins

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
        API[api]
        QA[qa]
        ML[ai-ml]
        OPS[ops]
        UX[uiux]
        LI[linkedin]
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
        CRON[CRON Schedule]
        PR[Pull Request]
    end

    subgraph Actions["GitHub Actions"]
        LINT[Lint & Type Check]
        BUILD[Build]
        POST[LinkedIn Post]
    end

    subgraph Deploy["Deployment"]
        PREVIEW[Preview Deploy]
        PROD[Production Deploy]
    end

    PUSH --> LINT --> BUILD --> PROD
    PR --> LINT --> BUILD --> PREVIEW
    CRON --> POST
```

| Workflow | Schedule | Description |
|----------|----------|-------------|
| `linkedin-scheduler.yml` | Tuesdays 10:07 AM PST | Automated LinkedIn posting |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](system_design_docs/architecture.md) | Platform KPIs, zero-cost infrastructure |
| [API Design](system_design_docs/api.md) | Chat API streaming, RAG context |
| [LinkedIn API](system_design_docs/linkedin-api.md) | OAuth 2.0 setup, posting workflow |
| [Database](system_design_docs/database.md) | GitHub-as-warehouse pattern |
| [Deployment](system_design_docs/deployment.md) | CI/CD pipeline, Vercel config |
| [Frontend](system_design_docs/frontend.md) | Component architecture |
| [ML Models](system_design_docs/ml-models.md) | Random Forest + TensorFlow |
| [Roadmap](system_design_docs/roadmap.md) | Feature timeline |

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
