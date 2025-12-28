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

## System Design Key Performance Indicators (KPI):
| Feature | **GitHub Public Repo (Free)** | **Vercel Hobby (Free)** |
| :--- | :--- | :--- |
| **Usage Limit** | **Unlimited Minutes** | **2 Cron Jobs Total** |
| **Reset Logic** | **Fixed Date** (Billing Cycle Start) | **Rolling Window** (24h & 30d) |
| **Max Frequency** | Every 5 minutes | **Once per Day** (24 hours) |
| **Execution Time** | Up to **6 hours** per run | Max **10–60 seconds** |
| **Precision** | Low (delay 5–30 mins) | Low (delay up to 1 hour) |
| **Resource Access** | Full VM (Filesystem, CLI, Docker) | HTTP Endpoint only (Serverless) |
| **Overages** | N/A (Always free for public) | **None** (Hard stop at limit) |

### ⏳ KPI 1: Platform Reset Windows for Time Design Considerations

When architecting your data pipeline, it is critical to understand *how* your limits reset, as this dictates your deployment strategy.

### 1. Vercel: The "Moving Target" (Traffic Strategy)
Vercel does **not** reset on the 1st of the month. It uses a **Rolling Window**.
* **Daily Limits (100 deploys):** Reset exactly **24 hours** after the specific activity occurred. If you deploy 50 times at 2:00 PM today, you don't get those 50 slots back until 2:00 PM tomorrow.
* **Monthly Limits (Bandwidth/Builds):** Usage drops off exactly **30 days** after it was accrued.
* **Design Implication:** You cannot "sprint" at the end of the month. High activity today will "penalize" your quota for exactly 30 days. You must smooth out your deployments to avoid hitting a hard stop.

### 2. GitHub: The "Clean Slate" (Calendar Strategy)
GitHub operates on a **Fixed Billing Date**.
* **Reset Date:** All usage counters (minutes, storage caps) reset to zero on your account's specific monthly billing day (usually the day you created your account).
* **Design Implication:** This is predictable. If you have a heavy data processing job (like a monthly migration), schedule it for the first day of your billing cycle to maximize available resources.

---
### ⏳ KPI 2: Maximizing Automation (CRON) Frequency
Both platforms mutually reset per their respective 30 day window. While the design and delivery of a product may not impact this window, this initial minimal viable product aims to identify the maximum allowable frequency for as "real-time" as the free data pipeline can support. As this project goes on, monitoring feature scalability overtime will support whether or not additional "real-time" data will or will not be supported but lower impact & overhead deliverables can be supported (e.g static pages, no API calls, "hard-coded" to deployment)

### Architecture Comparison: GitHub (CI) vs. Vercel (CD)

| Key Performance Indicator (KPI) | GitHub (Logic Engine) | Vercel (Rendering Engine) |
| :--- | :--- | :--- |
| **1. Costing Structure** | **Unlimited Usage**<br>For public repositories, there are no execution limits. | **Hard Limits**<br>No overage fees. If limits are hit, deployment pauses until the window resets. |
| **2. Deployment Thresholds** | **No Hard Count Limit**<br>Limited only by concurrent job slots. | **Quantity Capped**<br>• **Daily:** 100 deployments (rolling 24h)<br>• **Monthly:** ~3,000 deployments (30-day window) |
| **3. Execution Duration** | **Up to 6 Hours**<br>Ideal for long-running processes. | **10–60 Seconds**<br>Serverless functions time out immediately. |
| **Strategic Role** | **The ETL Layer**<br>Handles web scraping, complex data transformation, and API aggregation. | **The Presentation Layer**<br>Receives final, pre-processed JSON for fast static rendering. |

### The "Cron" Problem
Vercel's Hobby plan limits Cron Jobs to **once per day**. This is insufficient for real-time or hourly data updates.

### The "Vercel-Pinger" Solution (Technical Hack)
To bypass the Vercel scheduling limit, we utilize the **GitHub Action -> Vercel Webhook** pattern:
1.  **Schedule:** Set GitHub Action to run hourly (or desired frequency).
2.  **Execute:** GitHub performs the ETL (Scraping/API Calls).
3.  **Trigger:** GitHub commits the new data file (`data.json`) to the repo.
4.  **Deploy:** The commit automatically triggers a Vercel deployment.

*Result:* We achieve high-frequency updates using GitHub's scheduler, bypassing Vercel's Cron limits entirely.

---

## 4. Final Verdict: Maximum Allowable Frequency

To ensure the system never hits a "Hard Stop," we calculate the safe frequency based on Vercel's daily limit of **100 deployments**.

### The Calculation
* **Limit:** 100 Deployments / 24 Hours.
* **Safety Buffer:** Leave 20% headroom for manual hotfixes/commits (20 deploys).
* **Available Slots:** 80 Deployments / 24 Hours.

### Recommendation
**Safe Maximum Frequency: Hourly (24 Deployments/Day)**

* **Cost:** $0.00 (Free).
* **Capacity Used:** 24% of daily limit.
* **Risk:** Extremely Low. Even if multiple commits occur, the rolling window will easily absorb 24 automated deploys plus manual work.

**Warning:** Do **not** exceed a frequency of **Every 15 Minutes** (96 deploys/day). This creates a "Red Zone" risk where a single manual commit could lock your project for 24 hours.