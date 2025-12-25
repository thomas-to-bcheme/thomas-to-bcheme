<a id="readme-top"></a>

<div align="center">

  <img src=https://capsule-render.vercel.app/api?type=waving&height=300&color=gradient&text=Thomas%20To&reversal=true&desc=Fullstack%20Software,%20Biomanufacturing,%20Protein%20Design&descAlignY=65&descSize=30&section=footer width="100%"/>

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

This repository serves as a **Proof of Concept** for a real-time data ingestion system. The aim is to showcase data architecture, design considerations, risk assessment, documentation, and roadmap of features in development. 

The purpose of this is to ***show, not tell, my personal portfolio*** and serves as an open source resource to others as a learning resource or to continue building on this framework themselves.

## 🤖 About Me

I am a **Founding Fullstack (AI/ML) Engineer** with a background in **Biochemical Engineering**. This background has allowed me to experience first-hand, on-the-floor and off-the-floor experiences to design end-to-end architecture and data models to reflect "physical reality". From the generation of empirically obtained data, digitized into enterprise systems (ETL/ELT), and utilized for **Agentic Machine Learning**, data analytics, and automated applications.

> **"We've seen how even simplistic algorithms can automate manual workflows. Now with Agentic methods, I combine classical fullstack methods with agentic AI/ML solutions to drive reality into the future."**

> As of Dec 2025, I have taken on reaching out to protein academics to support GenAI of novel designs leveraging my formal background. Working in industry with tech during the day and protein design by night.


## 🛠 Tech Stack & Core Competencies

I operate across the full stack, bridging **Reality** with **Cloud Architecture** to drive (in)tangible value through time saved, revenue generated, or optimized solutions which may include agentic methods.

| **🤖 AI & Agentic Systems** | **📊 Data & Analytics** | **💻 Full Stack & API** | **☁️ Cloud, DevOps & IoT** | **🧬 Bio-Computation** |
| :--- | :--- | :--- | :--- | :--- |
| **LangChain** | **Snowflake** | **Python** | **Google Cloud** | **pyRosetta** |
| **RAG / LLMs** | **dbt** | **TypeScript** | **AWS** | **pyMol** |
| **PyTorch** | **PostgreSQL** | **Next.js** | **Docker** | **Benchling** |
| **TensorFlow** | **Tableau** | **React.js** | **Kubernetes** | **OpenCV** |
| **Hugging Face** | **Fivetran** | **FastAPI** | **CI/CD** | **ImageJ / Fiji** |

--- 

## 🏗️ Project Architecture:
To demonstrate agentic fullstack software engineering, atleast one database, one algorithmic model, and one agentic model will be implemented using continious integration and continous deployment from GitHub acting as our data warehouse backend, to utilizing Vercel for it's intended purpose as a frontend as a service.

This document outlines the strategic design choices to minimize cost while maximizing the capabilities within this constraint. To design this project for the foreseeable future, it's longevity and sustainability must remain free of charge. Therefore, the project design will be small-scale, proof of concept showcasing aptitude for designing, developing, and deploying software. 

### 🏗️ Built Using

| **Core Infrastructure** | **Frontend** | **Data & Backend** | **AI & Integrations** |
| :--- | :--- | :--- | :--- |
| **Git & GitHub** (Version Control + "Database") | **React** (UI Library) | **Vercel Blob** (Object Storage) | **Gemini API** (GenAI Logic) |
| **Vercel** (Edge Hosting & Deployment) | **TypeScript** (Type Safety) | **AWS DynamoDB** (NoSQL / Roadmap) | **Hugging Face** (Model Inference) |
| **GitHub Actions** (CI/CD & CRON Workers) | **Next.js** (Server Components) | **Node.js** (ETL Scripting) | **Open API** (Coincap) |
| **Markdown** (Documentation as Code) | **Tailwind CSS** (Styling) | **OpenSSH** (Secure Auth) | **RESTful API** (public-apis) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### System Design Key Performance Indicators (KPI):
| Feature | **GitHub Public Repo (Free)** | **Vercel Hobby (Free)** |
| :--- | :--- | :--- |
| **Usage Limit** | **Unlimited Minutes** | **2 Cron Jobs Total** |
| **Reset Logic** | **Fixed Date** (Billing Cycle Start) | **Rolling Window** (24h & 30d) |
| **Max Frequency** | Every 5 minutes | **Once per Day** (24 hours) |
| **Execution Time** | Up to **6 hours** per run | Max **10–60 seconds** |
| **Precision** | Low (delay 5–30 mins) | Low (delay up to 1 hour) |
| **Resource Access** | Full VM (Filesystem, CLI, Docker) | HTTP Endpoint only (Serverless) |
| **Overages** | N/A (Always free for public) | **None** (Hard stop at limit) |

**The Bottleneck:** The platform imposes a hard limit of **100 deployments per rolling 24-hour period**. Exceeding this limit results in an immediate **"Deployment Block,"** preventing critical hotfixes and manual updates until the rolling window clears.

### The "Vercel-Pinger" Solution (Technical Hack)
To bypass the Vercel scheduling limit, we utilize the **GitHub Action -> Vercel Webhook** pattern:
1.  **Schedule:** Set GitHub Action.
2.  **Execute:** GitHub performs the ETL (Scraping/API Calls).
3.  **Trigger:** GitHub commits the new data file (`data.json`) to the repo.
4.  **Deploy:** The commit automatically triggers a Vercel deployment.

**Result:** We achieve high-frequency updates using GitHub's scheduler, bypassing Vercel's Cron limits entirely.
To ensure the system never hits a "Hard Stop," we calculate the safe frequency based on Vercel's daily limit of **100 deployments**.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Deployment Frequency & Risk Assessment

The chart below visualizes the deployment consumption against the platform's hard limit. The "Danger Zone" begins where automated usage consumes the safety buffer required for manual intervention.

```mermaid
xychart-beta
    title "Daily Deployment Consumption vs Hard Limit (100)"
    x-axis [24hr, 12hr, 6hr, 3hr, 1hr, 30m, 15m]
    y-axis "Deployments per Day" 0 --> 100
    bar [1, 2, 4, 8, 24, 48, 96]
    line [100, 100, 100, 100, 100, 100, 100]
```

## Risk Model

To quantify operational stability, we define the **Risk Factor ($R$)** as the percentage of the daily limit consumed by automation.

$$
\text{Let } T = \text{Interval in Minutes}
$$

$$
\text{Daily Usage } (U) = \frac{1440 \text{ min}}{T}
$$

$$
\text{Risk Factor } (R) = \left( \frac{U}{L_{max}} \right) \times 100\%
$$

### Risk Condition Logic
A system is considered "Unstable" if it consumes the 20% buffer reserved for manual hotfixes.

### Absolute Maximum Absolute Risk Frequency
Running a deployment every 15 minutes utilizes **96%** of the daily capacity immediately:

$$
\text{At } T=15\text{min}: \quad R = \left( \frac{96}{100} \right) \times 100\% = \mathbf{96\%} \quad (\text{CRITICAL})
$$

*Result: Only 4 slots remain for maintenance*

---

## Optimized to the Maximum Allowable Risk Frequency

To determine the fastest possible safe interval ($T_{safe}$) that utilizes 80% of the daily capacity:

$$
\text{Target Usage } (U_{safe}) = L_{max} \times 0.80 = 80 \text{ deployments}
$$

$$
T_{safe} = \frac{1440 \text{ min}}{U_{safe}}
$$

$$
T_{safe} = \frac{1440}{80} = \mathbf{18 \text{ minutes}}
$$

**Result:** An interval of **18 minutes** is the mathematical hard limit for safety.

### Comparison of Acceptable Realistic Frequencies: Hourly vs. 30 Minutes
The following table compares the capacity impact of standard cron schedules against the platform hard limit ($L_{max}=100$).

| Metric | Hourly (60 min) | 30 Minutes |
| :--- | :--- | :--- |
| **Daily Deploys ($U$)** | 24 | 48 |
| **Risk Factor ($R$)** | 24 | 48 |
| **Status** | ✅ **SAFE** | ⚠️ **CAUTION** |
| **Buffer Remaining** | 76 slots | 52 slots |

### Final Decision
30 Minutes during active development and maintenace of tools while under continous deployment and allow for continual uptime for users to interact with the production server upto 20 minutes when the project life cycle has reached it's deployed monitoring phase and is no longer undergoing development of new features given the (financial) constraints previously mentioned.

An additional layer of security for risk migitation can be used to omit deploying changes and develop in an local enviornment when working in the backend.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Database:

This project was initially scoped for the use of AWS database services; opting for dynamoDB, to support both structured and unstructured data types as a way to demonstrate use of AWS Cloud infrastructure. However, the free license expires after a year or when credits end. An alternative database solution from reviewing [Vercel documentation](https://vercel.com/docs/storage#choosing-a-storage-product) was identified sufficient for data type, data size, latency, durability, and consistent performance in this proof of concept; designed for as "real-time" as possible, Edge Config.

The selected database and it's respective [limits and pricing](https://vercel.com/docs/edge-config/edge-config-limits) has been conducted using [Edge Config API Endpoint](https://vercel.com/docs/edge-config/using-edge-config#querying-edge-config-endpoints) to ingest third party API data not otherwise manually scraped, transformed, and loaded into the github repository.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Algorithmic model:
Refactoring previous proprietary financial technology, the minimum viable product for this deliverable will be to feed in financial API data using [Coincap OpenAPI](https://pro.coincap.io/api-docs) to our database and displayed onto the frontend. This will be the basis dataset for fresh data being accumulated overtime upto the storage limitations of the database where "expired" data will be removed.
Depending on availabile captail, a comparison of [treasury data](https://fiscaldata.treasury.gov/api-documentation/) may also be done with respects to a mutual time freqeuency for analyzing trends and predicting the differences between the data sets in a real world fashion to understand the relationship of paper currency to crypto currency.

note: Algorithmic models & methods are inherently static by design.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Agentic model:
As of Dec 2025, Gemini was selected as the LLM due to better support for free features (i.e number of tokens) compared to other providers. Due to the free limitiations, an agentic news letter will be designed as one-way, ran daily; or weekly, depeneding on previous KPI metrics.

More robust agentic models and methods (e.g RAG) are out of scope at this time of a minimally viable product to showcase agentic compentecy and capabilities not in a professional setting.

*(This diagram is live-rendered by GitHub using Mermaid.js)*

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Summary of System Architecture: ETL & Data Flow

This diagram illustrates the automated pipeline moving data from external sources into Vercel Edge Config for low-latency frontend access.

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
<p align="right">(<a href="#readme-top">back to top</a>)</p>