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

This diagram illustrates the automated pipeline moving data from external sources into Github "datbase folder" for accumulated (semantic) pre-processing of raw data from sandbox, test, to product with raw, staging, transform, and analyze layers before moving enviornments to Server-side database, Vercel Edge Config for low-latency frontend access.

### System Design Conclusions
* 30 minute CRON frequency [See KPIs](markdown/architecture.md#system-design-key-performance-indicators-kpi)
* 1 server-side (vercel) integrated database [See Vercel Limits](markdown/architecture.md#vercel-free-hobby-limitation-specifications)

More information can be found in each respective section:
[Architecture](architecture.md)
[Database](database.md)
[API](api.md)
[Deployment](deployment.md)

```mermaid
flowchart TD
    %% Styling Definitions
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
    classDef backend fill:#bbf,stroke:#333,stroke-width:2px;
    classDef storage fill:#ff9,stroke:#333,stroke-width:2px;
    classDef frontend fill:#bfb,stroke:#333,stroke-width:2px;

    %% 1. Data Sources
    subgraph Sources [Data Sources]
        Web[GitHub]:::external
        API[3rd Party APIs]:::external
    end

    %% 2. Backend Logic
    subgraph ETL_Backend [Backend / GitHub Actions]
        Cron((CRON Scheduler)):::backend
        Script[ETL Script Node.js]:::backend
        Transform[Data Normalization & JSON Prep]:::backend
    end

    %% 3. Storage Layer
    subgraph Cloud_Storage [Cloud Storage / Database]
        Blob[(Vercel Edge Config)]:::storage
        DynamoDB[("AWS DynamoDB (Failed)")]:::storage
        style DynamoDB stroke-dasharray: 5 5, fill:#eee, color:#999
    end

    %% 4. Frontend Layer
    subgraph Client [Frontend / Vercel]
        NextJS[Next.js Server Component]:::frontend
        UI[React UI]:::frontend
    end

    %% --- Connectivity Flows ---
    
    %% Trigger
    Cron --"Triggers every 15m"--> Script
    
    %% Extraction Phase
    Script --"EXTRACT (GitHub)"--> Web
    Script --"EXTRACT (3rd Party API)"--> API
    
    %% Transformation Phase
    Web --"Raw Data"--> Transform
    API --"Raw Data"--> Transform
    
    %% Load Phase (The Option 2 "Back and Forth")
    Transform --"1. GET Current State"--> Blob
    Blob --"2. Return JSON"--> Transform
    Transform --"3. PUT (Update/Overwrite)"--> Blob
    
    %% Consumption Phase
    Blob --"READ (Low Latency)"--> NextJS
    NextJS --"Hydrate"--> UI
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