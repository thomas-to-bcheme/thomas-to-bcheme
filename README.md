<a id="readme-top"></a>

<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&height=300&color=gradient&text=Thomas%20To&reversal=true&desc=Fullstack%20Software,%20Biomanufacturing,%20Protein%20Design&descAlignY=65&descSize=30&section=footer" width="100%"/>

  <br />

  <a href="https://thomas-to-bcheme-github-io.vercel.app/">
    <img src="https://img.shields.io/badge/Portfolio-Visit%20Live%20Site-2ea44f?style=for-the-badge&logo=vercel&logoColor=white" alt="Portfolio" />
  </a>
  <a href="src/docs/Thomas_To_Resume.pdf?raw=true">
    <img src="https://img.shields.io/badge/Resume-Download%20PDF-0078D4?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="Resume" />
  </a>
  <a href="https://www.linkedin.com/in/thomas-to-ucdavis/">
    <img src="https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>

  <br /><br />

  <!-- Tech Stack Badges -->
  <img src="https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/ESLint-9-4B32C3?logo=eslint&logoColor=white" alt="ESLint" />

</div>

---

## Features

- **AI Chat Agent** - Live streaming chat powered by Google Gemini with RAG context
- **Project Showcase** - Interactive deep-dives into engineering projects
- **Architecture Visualization** - Mermaid diagrams with animated system flows
- **ROI Calculator** - Interactive calculator demonstrating business value
- **Development Roadmap** - Visual timeline of upcoming features
- **ML Salary Prediction** - Random Forest + TensorFlow models for job market analysis
- **Claude Code Plugins** - Distributable AI workflow automation tools

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Claude Code Plugin Marketplace

This repository includes a **[Claude Code Plugin Marketplace](my_marketplace/)** with distributable plugins for AI-assisted development workflows.

> **Note:** This marketplace follows the [Claude Code Plugin Marketplaces schema](https://code.claude.com/docs/en/plugin-marketplaces#host-and-distribute-marketplaces). This schema reference is used to agentically generate tools in this marketplace, ensuring compatibility with Claude Code's expected plugin structure.

### Available Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| **[git-push](my_marketplace/plugins/git-push/)** | Interactive git push with manual commit messages | [Instructions](my_marketplace/README.md#installation) |
| **[git-push-agentic](my_marketplace/plugins/git-push-agentic/)** | Autonomous git workflow - auto stages, commits, and pushes | [Instructions](my_marketplace/README.md#installation) |
| **[git-README](my_marketplace/plugins/git-README/)** | 5-agent README generator with smart merge | [Instructions](my_marketplace/README.md#installation) |

### Quick Install

```bash
# Set plugin name: git-push, git-push-agentic, or git-README
PLUGIN_NAME="git-push"

# One-liner install
mkdir -p .claude/plugins/${PLUGIN_NAME}/.claude-plugin .claude/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME} && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json" -o ".claude/plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME}/SKILL.md" -o ".claude/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME}/SKILL.md"
```

Then use in Claude Code: `/git-push`, `/git-push-agentic`, or `/git-README`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Executive Summary

This repository showcases data architecture, design considerations, risk assessment, documentation, and roadmap of features in development. This document outlines the strategic design choices to minimize cost while maximizing the capabilities within this constraint. To design this project for the foreseeable future, its longevity and sustainability must remain free of charge. Therefore, the project design will be small-scale, proof of concept showcasing aptitude for designing, developing, and deploying software.

To demonstrate agentic fullstack software engineering, at least one of the following will be implemented using continuous integration and continuous deployment from GitHub acting as our data warehouse backend, to utilizing Vercel for its intended purpose as a frontend as a service:
* database
* algorithmic model
* agentic model

The purpose of this is to ***show, not tell, my personal [portfolio/resume](src/docs/Thomas_To_Resume.pdf?raw=true)*** and serves as an open source resource to others as a learning resource or to continue building on this framework themselves.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 20+ | JavaScript runtime |
| **npm** | 10+ | Package manager |
| **Python** | 3.8+ | ML backend |
| **Git** | Latest | Version control |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Installation

### Frontend (Next.js)

```bash
# Clone the repository
git clone https://github.com/thomas-to/thomas-to-bcheme.git
cd thomas-to-bcheme

# Install dependencies
npm install

# Set up environment variables
cp .env .env.local
# Edit .env.local and add your GOOGLE_API_KEY
```

### Backend (Python ML)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Usage

### Development Server

```bash
# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Run ML Models

```bash
cd backend
python main.py
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Project Structure

```
thomas-to-bcheme/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/chat/           # Gemini streaming API endpoint
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── HeroSection.tsx     # Landing hero
│   │   ├── AiGenerator.tsx     # Chat interface
│   │   ├── ProjectDeepDive.tsx # Project showcase
│   │   └── ...                 # Additional components
│   ├── data/
│   │   └── AiSystemInformation.tsx  # RAG context/system prompt
│   ├── lib/                    # Utility functions
│   └── docs/                   # Resume and documentation
├── backend/                    # Python ML models
│   ├── main.py                 # Entry point
│   ├── ml_model.py             # Random Forest model
│   ├── dl_model.py             # TensorFlow model
│   ├── data_preprocessing.py   # Feature engineering
│   ├── evaluation.py           # Model metrics
│   └── requirements.txt
├── my_marketplace/             # Claude Code plugins
│   ├── plugins/
│   │   ├── git-push/
│   │   ├── git-push-agentic/
│   │   └── git-README/
│   └── README.md
├── system_design_docs/         # Architecture documentation
├── public/                     # Static assets
├── CLAUDE.md                   # AI assistant instructions
├── package.json
├── tsconfig.json
└── README.md
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key for chat functionality |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials for DynamoDB/S3 |
| `AWS_SECRET_ACCESS_KEY` | No | AWS credentials for DynamoDB/S3 |
| `VERCEL_API_KEY` | No | Vercel API for deployment automation |

### TypeScript Path Aliases

The project uses `@/*` to map to `./src/*`:

```typescript
import { Component } from "@/components/Component";
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## About Me

I am a **(Founding) Engineer** with a formal background in [Biochemical Engineering](https://catalog.ucdavis.edu/departments-programs-degrees/chemical-engineering/biochemical-engineering-bs/#requirementstext), and [research](https://mcnair.ucdavis.edu/sites/g/files/dgvnsk476/files/inline-files/Design%20to%20Data%20for%20mutants%20of%20%CE%B2-glucosidase%20B%20from%20Paenibacillus%20polymyxa%20L171G%2C%20L171V%20and%20L171W.pdf), applying fullstack software engineering in various fields and usecases on a strong mathematical and emperical foundation to design end-to-end architectures that bridge physical reality with cloud infrastructure. 

My experience spans the entire data lifecycle—from capturing empirical data on the manufacturing floor to digitizing it via enterprise ETL/ELT pipelines and digitulizing it through Agentic Machine Learning and automated applications for digital transformation. By architecting data models and pipelines that accurately reflect real-world processes, I deliver tangible value, driving efficiency, revenue generation, and optimization through scalable, reality-grounded software solutions.

> **We've seen how even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future.**

As of Dec 2025, I have taken on reaching out to protein academics to support GenAI of novel designs leveraging my formal background. Working in industry with tech during the day and protein design by night.

---

## Summary of System Architecture: ETL & Data Flow

This diagram illustrates the automated pipeline moving data from external sources into Github "database folder" for accumulated (semantic) pre-processing of raw data from sandbox, test, to product with raw, staging, transform, and analyze layers before moving enviornments to Server-side database, Vercel Edge Config for low-latency frontend access.

### System Design Conclusions
* 30 minute CRON frequency [See KPIs](system_design_docs/architecture.md#system-design-key-performance-indicators-kpi)
* 1 server-side (vercel) integrated database [See Vercel Limits](system_design_docs/architecture.md#vercel-free-hobby-limitation-specifications)

For detailed technical specifications, refer to the following documentation:
- [Architecture](system_design_docs/architecture.md)
- [Database](system_design_docs/database.md)
- [API](system_design_docs/api.md)
- [Deployment](system_design_docs/deployment.md)
- [Roadmap](system_design_docs/roadmap.md)

```mermaid
flowchart BT
    %% --- Styling Definitions ---
    classDef external fill:#e1e4e8,stroke:#24292e,stroke-width:2px;
    classDef github fill:#f6f8fa,stroke:#24292e,stroke-width:2px,stroke-dasharray: 0;
    classDef dwh fill:#d1e7dd,stroke:#0f5132,stroke-width:1px;
    classDef vercel fill:#000000,stroke:#fff,stroke-width:2px,color:#fff;
    classDef huggingface fill:#ffd21e,stroke:#333,stroke-width:2px;
    classDef db fill:#0070f3,stroke:#fff,stroke-width:2px,color:#fff;

    %% --- 1. External Data Sources (Bottom) ---
    subgraph Sources ["External Sources"]
        direction LR
        Ext_API["3rd Party APIs"]:::external
        Ext_Web["Web Scrapers"]:::external
    end

    %% --- 2. GitHub Ecosystem (Center / Monolith) ---
    subgraph GitHub ["GitHub Monolith & CI/CD"]
        
        %% The Codebase
        Repo[("Monorepo<br/>")]:::github
        
        %% The Scheduler
        Cron(("CRON Scheduler<br/>Every 30m")):::github
        
        %% The Data Warehouse Model
        subgraph DataWarehouse ["Data Warehouse Model (On GitHub)"]
            direction TB
            
            subgraph Env_Sandbox ["Env: Sandbox"]
                L1_S["Raw / Stage / Transform / Analyze"]:::dwh
            end
            
            subgraph Env_Quality ["Env: Quality"]
                L1_Q["Raw / Stage / Transform / Analyze"]:::dwh
            end
            
            subgraph Env_Prod ["Env: Production"]
                L1_P["Raw / Stage / Transform / Analyze"]:::dwh
            end
            
            %% Pipeline Flow inside GitHub
            Env_Sandbox ==> Env_Quality ==> Env_Prod
        end
    end

    %% --- 3. Deployment Targets (Left & Right) ---
    
    %% LEFT: Frontend (Vercel)
    subgraph Vercel_Env ["Vercel Deployment"]
        FE_Node[("Frontend<br/>Next.js / React / TS")]:::vercel
    end

    %% RIGHT: Backend (Hugging Face)
    subgraph HF_Env ["Hugging Face Deployment"]
        BE_Node[("Backend ML Model<br/>Python / PyTorch / Tensorflow / Huggingface")]:::huggingface
    end

    %% --- 4. The Bridge (Top) ---
    subgraph Database_Layer ["Internal Ecosystem Database"]
        DB[("Vector supported Database<br/>(RAG; Cleaned Data)")]:::db
    end

    %% --- Connections & Flows ---

    %% 1. Ingestion Flow (Bottom Up)
    Ext_API & Ext_Web --"Ingest Raw Data"--> Cron
    Cron --"Trigger Pipeline"--> Env_Sandbox
    
    %% 2. Data Processing to DB
    Env_Prod --"Load Cleaned Data"--> DB

    %% 3. CI/CD Deployment Flow
    Repo --"Deploy Frontend (Next.js)"--> FE_Node
    Repo --"Deploy Backend (FastAPI)"--> BE_Node

    %% 4. Application Communication (The Triangle)
    FE_Node <--"REST API / JSON"--> DB
    BE_Node <--"REST API / SQL"--> DB
    
    %% Optional: Direct Frontend-Backend Link via DB logic or Direct
    FE_Node -. "Request Predictions" .-> BE_Node

    %% Formatting Layout Hints
    Sources ~~~ Repo
```    
### 🏗️ Built Using

| **Core Infrastructure** | **Frontend** | **Data & Backend** | **AI & Integrations** |
| :--- | :--- | :--- | :--- |
| **Git & GitHub** (Version Control + "Database") | **React 19.2.3** (UI Library) | **Vercel Blob** (Object Storage) | **Gemini API** (GenAI Logic) |
| **Vercel** (Edge Hosting & Deployment) | **TypeScript 5** (Type Safety) | **AWS DynamoDB** (NoSQL / Roadmap) | **Hugging Face** (Model Inference) |
| **GitHub Actions** (CI/CD & CRON Workers) | **Next.js 16.1.1** (App Router) | **Node.js** (ETL Scripting) | **scikit-learn** (ML Models) |
| **Markdown** (Documentation as Code) | **Tailwind CSS v4** (Styling) | **Python 3** (ML Backend) | **TensorFlow** (Deep Learning) |
| | **Framer Motion** (Animations) | **OpenSSH** (Secure Auth) | **RESTful API** (public-apis) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Testing

> **Note:** A formal test framework is not yet configured. Current quality assurance includes:

| Tool | Command | Description |
|------|---------|-------------|
| ESLint | `npm run lint` | Static code analysis |
| TypeScript | `npm run build` | Type checking (strict mode) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following conventional commit format
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For Claude Code Plugins, see the [Plugin Marketplace Contributing Guide](my_marketplace/README.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

This project is provided as an open source learning resource.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---