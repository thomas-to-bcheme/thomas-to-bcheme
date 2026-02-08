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

### LinkedIn CLI

```mermaid
sequenceDiagram
    participant S as GitHub CRON
    participant C as CLI (npm run linkedin)
    participant F as genAI/linkedin-7day/
    participant L as LinkedIn API

    S->>C: post --file {filename}
    C->>F: Read post content
    C->>L: POST ugcPosts
    L-->>C: 201 Created
    C->>F: Update rotation index
    C-->>S: Exit code 0
```

| Command | Description |
|---------|-------------|
| `npm run linkedin list` | List available posts |
| `npm run linkedin post -- --file <name>` | Publish to LinkedIn |
| `npm run linkedin post -- --dry-run` | Test without posting |

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

## Roadmap

Three tracks of planned work extending this portfolio into production ML deployment, content automation, and developer tooling.

```mermaid
gantt
    title Implementation Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Track A: ML Pipeline
    Skill Taxonomy & Salary Parser        :a1, 2026-02-10, 2d
    EDA Notebook (Data Engineering)       :a2, after a1, 3d
    Linear Regression (Ridge)             :a3, after a2, 3d
    Hugging Face Deployment (Gradio)      :a4, after a3, 2d
    Chrome Extension (Manifest V3)        :a5, after a4, 3d

    section Track B: LinkedIn Engine
    Private Repo Setup                    :b1, 2026-02-10, 2d
    Anti-Spam Pipeline (4 Layers)         :b2, after b1, 4d
    Content Migration (20 Posts)          :b3, after b2, 2d
    GitHub Action CRON Workflow           :b4, after b3, 2d
    Claude Code Skills                    :b5, after b4, 3d

    section Track C: README & Docs
    Unified README with Mermaid           :c1, after a3, 2d
```

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
        SEG -->|No AI skills| PDE["Pure DE<br/>~38 rows"]
        SEG -->|DE + AI skills| HYB["Hybrid DE+AI<br/>~188 rows"]
        SEG -->|No DE skills| PAI["Pure AI<br/>~223 rows"]
    end

    subgraph Models["Dual Ridge Regression"]
        PDE --> MA["Model A<br/>Lower Bound<br/>Ridge Regression"]
        HYB --> MB["Model B<br/>Upper Bound<br/>Ridge Regression"]
        MA --> BAND["Salary Band<br/>$$X - $$Y"]
        MB --> BAND
    end

    subgraph Deploy["Deployment"]
        BAND --> HF["Hugging Face Space<br/>Gradio REST API"]
        HF --> EXT["Chrome Extension<br/>Manifest V3"]
        EXT --> JOB["Job Description<br/>LinkedIn / Indeed"]
    end

    classDef data fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef eda fill:#2d5016,stroke:#5cb85c,color:#fff
    classDef model fill:#5c3d1e,stroke:#d9a441,color:#fff
    classDef deploy fill:#3d1e5c,stroke:#9b59b6,color:#fff

    class CSV,TAX,SAL data
    class SEG,PDE,HYB,PAI eda
    class MA,MB,BAND model
    class HF,EXT,JOB deploy
```

**Why Linear Regression?** The existing Random Forest and TensorFlow models predict general salary. Linear regression serves a different purpose here: **interpretability**. Ridge coefficients directly answer "which skills command a premium?" and two separate models (Pure DE vs Hybrid DE+AI) create a meaningful salary band. With only ~38 Pure DE rows, Ridge regularization prevents overfitting where tree-based methods would.

<details>
<summary>A1. Skill Taxonomy & Salary Parser</summary>

**Files:** `backend/config/skill_taxonomy.py`, `backend/de_salary/salary_parser.py`

- DE keywords (62): ETL, Spark, Airflow, Kafka, Snowflake, dbt, data warehouse, data lake, etc.
- AI keywords (56): machine learning, TensorFlow, PyTorch, NLP, LLM, computer vision, etc.
- `classify_role()` segments each job as "Pure DE", "Hybrid DE+AI", "Pure AI", or "General"
- `compute_de_score()` / `compute_ai_score()` return continuous 0.0-1.0 scores
- Salary parser handles all observed formats: annual range/single, hourly range/single

</details>

<details>
<summary>A2. EDA Jupyter Notebook</summary>

**File:** `backend/notebooks/01_eda_data_engineering.ipynb`

1. Data loading + quality assessment
2. Salary parsing + distribution (histogram + box plot)
3. Role classification using skill taxonomy (segment pie chart)
4. Salary box plot by segment (Pure DE vs Hybrid DE+AI vs Pure AI)
5. Top 20 keyword frequency per segment
6. DE-AI skill co-occurrence heatmap
7. Seniority x segment salary analysis
8. Geographic salary analysis by segment

</details>

<details>
<summary>A3. Ridge Regression Models</summary>

**File:** `backend/de_salary/linear_model.py`

| Model | Training Data | Features | Output |
|-------|--------------|----------|--------|
| Model A (Lower) | Pure DE (~38 rows) | Seniority, DE skill count, cloud/streaming/orchestration/warehouse flags, location tier | DE baseline salary |
| Model B (Upper) | Hybrid DE+AI (~188 rows) | Same + AI skill count, ML framework flag, NLP flag | AI premium salary |

- 5-fold cross-validation (mandatory for small samples)
- Metrics: MAE, RMSE, R2, MAPE via existing `ModelEvaluator`
- Coefficient bar charts + VIF multicollinearity analysis

</details>

<details>
<summary>A4. Hugging Face Deployment</summary>

**File:** `backend/hf_space/app.py` (Gradio)

```
POST /api/predict
Request:  { "data": ["<job_description>", "<position_name>"] }
Response: { "segment", "salary_lower", "salary_upper", "de_skills_found", "ai_skills_found" }
```

- Serialize models with `joblib`
- Gradio auto-exposes REST API
- Free tier, CPU-only

</details>

<details>
<summary>A5. Chrome Extension</summary>

**Directory:** `chrome-extension/` (Manifest V3)

- Content script extracts job descriptions from LinkedIn, Indeed, Greenhouse
- Configurable selector registry per job board (no hardcoding)
- Popup sends extracted text to Hugging Face API
- Displays salary band, segment classification, and matched skills

</details>

### Track B: LinkedIn Content Engine

Private repository (`linkedin-content-engine`) for CI/CD content automation with a 4-layer anti-spam pipeline.

```mermaid
flowchart LR
    subgraph Content["Content Lifecycle"]
        D[drafts/] -->|human review| Q[queue/<br/>not-posted]
        Q -->|pipeline selects| PIPE
        A[archive/<br/>posted] -->|"len >= 20<br/>& 30 days"| Q
    end

    subgraph PIPE["Anti-Spam Pipeline"]
        direction TB
        L4["Layer 4<br/>Frequency Guard<br/>archive >= 20?"]
        L3["Layer 3<br/>Hook Rotation<br/>Hydra Head"]
        L2["Layer 2<br/>Pixel Mutation<br/>Pillow"]
        L1["Layer 1<br/>Zero-Width<br/>Injection"]
        L4 --> L3 --> L2 --> L1
    end

    L1 --> POST[LinkedIn API]
    POST --> A

    classDef queue fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef pipe fill:#5c1e1e,stroke:#d94a4a,color:#fff
    classDef post fill:#2d5016,stroke:#5cb85c,color:#fff

    class D,Q,A queue
    class L4,L3,L2,L1 pipe
    class POST post
```

<details>
<summary>B1. Repository Structure</summary>

```
linkedin-content-engine/          (private repo)
├── .github/workflows/
│   ├── linkedin-poster.yml       CRON: 7:30 AM PST, Mon-Thu (4/week)
│   └── content-audit.yml         Weekly Sunday health check
├── content/
│   ├── queue/                    Ready to post
│   ├── archive/                  Published (recycling source)
│   └── drafts/                   WIP (human review)
├── assets/carousels/             Image attachments per post
├── pipeline/
│   ├── run.py                    Orchestrator entry point
│   ├── selector.py               Queue selection + frequency guard
│   ├── assembler.py              Hook rotation (Hydra Head)
│   ├── image_mutator.py          Pixel mutation (Pillow)
│   └── antispam.py               Zero-width injection
├── state/
│   ├── post-history.json         What posted, when, which hook
│   ├── queue-manifest.json       Queue/archive sizes
│   └── hook-tracker.json         Hook rotation tracking
├── context/
│   └── portfolio-rag-snapshot.md  Curated RAG context from portfolio
└── scripts/                      Forked from portfolio
```

</details>

<details>
<summary>B2. Post Frontmatter Schema</summary>

```yaml
---
date: 2026-02-17
topic: Constraint-Driven Architecture
target_audience: CTOs, Engineering Managers
category: system-design

hooks:                                    # Layer 3: Hydra Head
  - "Hook variant 1..."
  - "Hook variant 2..."
  - "Hook variant 3..."

hashtag_sets:                             # Metadata diversification
  - ["#SystemDesign", "#OpenToWork"]
  - ["#MLEngineering", "#BuildInPublic"]

cta_variants:
  - "Happy to connect and chat!"
  - "Would love to hear your approach."

carousel: null                            # Optional image folder
times_posted: 0                           # Pipeline-populated
last_posted: null
hooks_used: []
---
Body content here...
```

</details>

<details>
<summary>B3. Anti-Spam Stack</summary>

| Layer | Threat | Solution | Implementation |
|-------|--------|----------|----------------|
| 1 | Exact String Match | Zero-Width Injection (`\u200B` between words at ~5% density) | `antispam.py` |
| 2 | Image Fingerprinting | Pixel Mutation (bottom-right pixel RGB +1 via Pillow) | `image_mutator.py` |
| 3 | Semantic Detection | Hook Rotation (3+ intros per post, tracked in `hook-tracker.json`) | `assembler.py` |
| 4 | Frequency Penalties | Queue Minimum (hard guard: `archive >= 20`, 30-day memory window) | `selector.py` |

**Safety rule:** Auto-recycle is disabled until 20 posts in archive. Mathematical basis: 4 posts/week x 5 weeks (safe margin) = 20 minimum queue size.

</details>

<details>
<summary>B4. GitHub Action CRON</summary>

- **Schedule:** `30 15 * * 1-4` (7:30 AM PST = 15:30 UTC, Mon-Thu)
- **PDT drift:** During daylight saving, posts go out at 8:30 AM local (acceptable)
- **Steps:** Checkout -> Python setup -> Anti-spam pipeline -> LinkedIn API -> Archive file -> Commit state -> Push
- **Supports:** `workflow_dispatch` with `dry_run` and `specific_post` inputs
- **State commit:** Atomic `git add content/ state/ && git commit && git push`

</details>

### Track C: Claude Code Skills

<details>
<summary>C1. /git-commit-linkedin</summary>

Extends `/git-commit` with LinkedIn post drafting:
1. **Phase 1:** Standard git add + commit
2. **Phase 2:** Analyze diff, generate LinkedIn post draft with 3 hook variants
3. **Phase 3:** Save to `content/drafts/YYYY-MM-DD-topic.md` (human review required)

</details>

<details>
<summary>C2. /git-PRD</summary>

Multi-agent PRD generator:
1. Inventory all agents (glob `.claude/agents/*.md`)
2. Draft system design doc per agent (with Mermaid diagrams)
3. Each agent reviews its own doc as subagent (peer review)
4. Orchestrator performs final PRD quality gate

</details>

<details>
<summary>C3. /git-README Mermaid Enhancement</summary>

Extend existing 5-agent README skill:
- Agent 1: Identify data flows and component relationships for Mermaid diagrams
- Agent 5: Generate Mermaid flowchart/sequence diagrams
- Merge rule: Validate Mermaid syntax, prefer `flowchart LR` for architecture

</details>

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
