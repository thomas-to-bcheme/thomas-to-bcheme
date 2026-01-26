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
</div>

---

## 👨‍💻 Executive Summary

This repository aims is to showcase data architecture, design considerations, risk assessment, documentation, and roadmap of features in development. This document outlines the strategic design choices to minimize cost while maximizing the capabilities within this constraint. To design this project for the foreseeable future, it's longevity and sustainability must remain free of charge. Therefore, the project design will be small-scale, proof of concept showcasing aptitude for designing, developing, and deploying software. 

To demonstrate agentic fullstack software engineering, atleast one of the following will be implemented using continious integration and continous deployment from GitHub acting as our data warehouse backend, to utilizing Vercel for it's intended purpose as a frontend as a service:
* database
* algorithmic model
* agentic model

The purpose of this is to ***show, not tell, my personal [portfolio/resume](src/docs/Thomas_To_Resume.pdf?raw=true)*** and serves as an open source resource to others as a learning resource or to continue building on this framework themselves.

## 🤖 About Me

I am a **(Founding) Engineer** with a formal background in [Biochemical Engineering](https://catalog.ucdavis.edu/departments-programs-degrees/chemical-engineering/biochemical-engineering-bs/#requirementstext), and [research](https://mcnair.ucdavis.edu/sites/g/files/dgvnsk476/files/inline-files/Design%20to%20Data%20for%20mutants%20of%20%CE%B2-glucosidase%20B%20from%20Paenibacillus%20polymyxa%20L171G%2C%20L171V%20and%20L171W.pdf), applying fullstack software engineering in various fields and usecases on a strong mathematical and emperical foundation to design end-to-end architectures that bridge physical reality with cloud infrastructure. 

My experience spans the entire data lifecycle—from capturing empirical data on the manufacturing floor to digitizing it via enterprise ETL/ELT pipelines and digitulizing it through Agentic Machine Learning and automated applications for digital transformation. By architecting data models and pipelines that accurately reflect real-world processes, I deliver tangible value, driving efficiency, revenue generation, and optimization through scalable, reality-grounded software solutions.

> **We've seen how even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future.**

As of Dec 2025, I have taken on reaching out to protein academics to support GenAI of novel designs leveraging my formal background. Working in industry with tech during the day and protein design by night.

## 🛠 Tech Stack & Core Competencies
| **🤖 AI & Agentic Systems** | **📊 Data & Analytics** | **💻 Full Stack & API** | **☁️ Cloud, DevOps & IoT** | **🧬 Bio-Computation** |
| :--- | :--- | :--- | :--- | :--- |
| **LangChain** | **Snowflake** | **Python** | **Google Cloud** | **pyRosetta** |
| **RAG / LLMs** | **dbt** | **TypeScript** | **AWS** | **pyMol** |
| **PyTorch** | **PostgreSQL** | **Next.js** | **Docker** | **Benchling** |
| **TensorFlow** | **Tableau** | **React.js** | **Kubernetes** | **OpenCV** |
| **Hugging Face** | **Fivetran** | **RestAPI** | **CI/CD** | **ImageJ / Fiji** |

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
| **Git & GitHub** (Version Control + "Database") | **React** (UI Library) | **Vercel Blob** (Object Storage) | **Gemini API** (GenAI Logic) |
| **Vercel** (Edge Hosting & Deployment) | **TypeScript** (Type Safety) | **AWS DynamoDB** (NoSQL / Roadmap) | **Hugging Face** (Model Inference) |
| **GitHub Actions** (CI/CD & CRON Workers) | **Next.js** (Server Components) | **Node.js** (ETL Scripting) | **Open API** (Coincap) |
| **Markdown** (Documentation as Code) | **Tailwind CSS** (Styling) | **OpenSSH** (Secure Auth) | **RESTful API** (public-apis) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🔌 Claude Code Plugin Marketplace

This repository includes a **[Claude Code Plugin Marketplace](claude/marketplace/)** with distributable plugins for AI-assisted development workflows.

### Available Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| **[git-push](claude/marketplace/plugins/git-push/)** | Smart git push workflow - checks status, stages/commits if needed, then pushes | [Instructions](claude/marketplace/README.md#installation-methods) |

### Quick Install

```bash
# One-liner install for git-push plugin
mkdir -p .claude/plugins/git-push && \
curl -sL https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/claude/marketplace/plugins/git-push/plugin.json -o .claude/plugins/git-push/plugin.json && \
curl -sL https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/claude/marketplace/plugins/git-push/SKILL.md -o .claude/plugins/git-push/SKILL.md
```

Then use in Claude Code: `/git-push`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---