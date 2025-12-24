<a id="readme-top"></a>

<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&color=0d1117&height=220&section=header&text=Thomas%20To&fontSize=70&fontColor=ffffff&desc=Founding%20Fullstack%20Engineer%20%7C%20Biotech%20Architecture%20%7C%20Agentic%20AI&descAlign=50&descAlignY=65" width="100%"/>

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
  <a href="mailto:thomas.to.bcheme@gmail.com">
    <img src="https://img.shields.io/badge/Email-Contact%20Me-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>

  <br />
  <br />

  <p align="center">
    <b>Bridging "Physical Reality" (Biotech/IoT) with "Cloud Architecture" (AI/Snowflake).</b>
    <br />
    Building secure, ROI-driven (AI/ML) systems that safeguard assets and automate the mundane.
  </p>
</div>

---

## 👨‍💻 Executive Summary

I am a **Founding Fullstack (AI/ML) Engineer** with a background in **Biochemical Engineering**. This background has allowed me to experience first-hand, on-the-floor and off-the-floor manufacturing experiences to design end-to-end architecture and data models to reflect "physical reality."

I specialize in **Zero-to-One Architecture**: starting from the generation of empirically obtained data, digitized into enterprise systems (ETL/ELT), and utilized for **Agentic Machine Learning**, data analytics, and automated applications.

> **Core Philosophy:** "Even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future."

---

<details>
  <summary><b>📚 Table of Contents</b></summary>
  <ol>
    <li><a href="#executive-summary">Executive Summary</a></li>
    <li>
      <a href="#architecture">Featured Architecture</a>
      <ul>
        <li><a href="#system-design">System Design Highlights</a></li>
      </ul>
    </li>
    <li><a href="#tech-stack">Tech Stack & Core Competencies</a></li>
    <li><a href="#experience">Experience Highlights</a></li>
    <li><a href="#documentation">Design & Documentation (GxP)</a></li>
    <li><a href="#connect">Connect With Me</a></li>
  </ol>
</details>

## 🏗️ Featured Architecture: Zero-to-One ETL Pipeline

This repository serves as a **Proof of Concept (PoC)** for a scalable data ingestion system. The aim is to showcase high level data architecture, bottleneck design considerations (price, security, scope), documentation of roadblocks, and next step roadmaps of features in development. The main purpose of this is to show, not tell, my personal portfolio which serves as an open source resource contribution to others as as learning resource or to continue building on this framework themselves.

*(This diagram is live-rendered by GitHub using Mermaid.js)*

```mermaid
graph TD
    %% Nodes
    subgraph "Physical Reality (Data Sources)"
        A[Biotech Sensors / IoT] -->|Raw Signals| C(Raw Data Ingestion)
        B[External APIs / Web Scraping] -->|JSON/HTML| C
    end

    subgraph "The Cloud Bridge (ETL)"
        C -->|Transform: Normalize| D{Validation Layer}
        D -->|Load: Server Action| E[(Vercel Blob Storage)]
        style E fill:#f9f,stroke:#333,stroke-width:2px
        
        E -.->|Future Migration| F[(AWS DynamoDB / Snowflake)]
        style F fill:#eee,stroke:#999,stroke-dasharray: 5 5
    end

    subgraph "Intelligence Layer (AI/ML)"
        E -->|Context Window| G[RAG Pipeline]
        G -->|Agentic Processing| H["LLM (OpenAI/Claude)"]
        H -->|Insights| I[Next.js Dashboard]
    end

    %% Styles
    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    class A,B,C source;
```
# System Design Highlights

---

## 🛠 Tech Stack & Core Competencies

I operate across the full stack, from **Hardware/IoT** to **Agentic AI**, with a specialization in **Biotech Data Models**.

| **🤖 AI & Agentic Systems** | **📊 Data & Analytics** | **💻 Full Stack & API** | **☁️ Cloud, DevOps & IoT** |
| :--- | :--- | :--- | :--- |
| **LangChain** | **Snowflake** | **Python** | **Google Cloud** |
| **RAG / LLMs** | **dbt** | **TypeScript** | **AWS** |
| **PyTorch** | **PostgreSQL** | **Next.js** | **Docker** |
| **TensorFlow** | **Tableau** | **React.js** | **Kubernetes** |
| **Hugging Face** | **Fivetran** | **FastAPI** | **CI/CD** |

### 🧬 Bio-Computation Tools
* **Molecular Modeling:** pyRosetta, pyMol, Benchling
* **Computer Vision:** ImageJ, Fiji, OpenCV

---

## 🚀 Experience Highlights

Here is what you will find detailed in my **[Resume](src/docs/Thomas_To_Resume.pdf?raw=true)**:

### **Founding Fullstack Engineer | Canventa Life Sciences**
* **AI/ML Integration:** Architected a revenue optimization system using Snowflake to integrate a predictive machine learning model with a Retrieval Augmented Generative (RAG) AI agent.
    * *Impact:* Reduced stakeholder decision-making from hours to minutes.
* **Knowledge Engineering:** Enriched RAG fine-tuning with Confluence data to enhance GenAI context, improving learning rates by **80%** (Wright’s Law).
* **DevOps:** Deployed an in-house fullstack SaaS on GCP via CI/CD, reducing daily calculation time by **87% (-40 min)**.

### **Founder | Proprietary FinTech**
* **Algorithmic Trading:** Deployed an ETF solution identifying market gaps across brokerages.
* **IoT Architecture:** Hosted secure trading bots on headless Raspberry Pi & AntMiner clusters.

### **Research Engineer | UC Davis**
* **$63.2M Savings:** Optimized biological models using numerical methods (Nandi/McDonald Lab).
* **Computer Vision:** Quantified organoid growth using Python (OpenCV) for automated image analysis (Wan Lab).

---

## 📝 Design & Documentation (GxP)

This repository follows **Good Documentation Practices (GDocP)** to support repeatability and auditability.

* **[View Architecture Deck](src/docs/architecture.pdf)** (PDF) - Deep dive into the ETL pipeline.
* **[Read System Design FAQ](src/docs/design-faq.md)** - Pricing, Security, and Scalability decisions.

### **Project Status (Dec 2025)**
![Status](https://img.shields.io/badge/Status-MVP%20Validation-yellow?style=for-the-badge)

* **Current Phase:** MVP Storage Integration (Vercel Blob).
* **Known Blockers:** AWS DynamoDB documentation inconsistencies (Resolved via Vercel Blob Pivot).

---

## 📫 Connect With Me

I am always open to discussing **Agentic AI**, **Bio-Manufacturing Optimization**, or **Cloud Architecture**.

* **Location:** Oakland, California, USA
* **LinkedIn:** [linkedin.com/in/thomas-to-ucdavis](https://www.linkedin.com/in/thomas-to-ucdavis/)
* **Email:** [thomas.to.bcheme@gmail.com](mailto:thomas.to.bcheme@gmail.com)

<p align="right">(<a href="#readme-top">back to top</a>)</p>