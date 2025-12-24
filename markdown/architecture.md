## [GitHub Free Plan Features](https://github.com/pricing)

The GitHub Free plan provides a comprehensive suite of tools for individuals and organizations to build, deploy, and manage software. Below is a collection of the known features included at no cost ($0 USD/month).

## Core Code Management
* **Unlimited Public Repositories:** Host open-source projects accessible to anyone.
* **Unlimited Private Repositories:** Host proprietary code accessible only to you and your collaborators.
* **Unlimited Collaborators:** Invite an unlimited number of users to work on both public and private repositories.
* **Git LFS:** Basic support for Large File Storage.

## CI/CD & Automation (GitHub Actions)
* **Unlimited Minutes for Public Repositories:** Automation workflows for public projects do not count against your monthly limit.
* **2,000 Minutes/Month for Private Repositories:** A monthly allowance of execution time for building, testing, and deploying code in private repos.

## Package Hosting (GitHub Packages)
* **Unlimited Storage for Public Repositories:** Host software packages for public projects for free.
* **500 MB Storage for Private Repositories:** Storage allowance for hosting private software packages.

## Security & Compliance
* **Dependabot:** Automated security and version updates for dependencies.
* **Two-Factor Authentication (2FA):** Enforced security for account protection.
* **Vulnerability Alerts:** Notifications for known vulnerabilities in your project dependencies.

## Project Management
* **Issues:** Track bugs, enhancements, and tasks.
* **Projects:** Kanban-style boards and tables to organize and prioritize work.
* **Discussions:** Community forums within repositories for Q&A and open-ended conversations.

## Developer Environments
* **GitHub Codespaces:** Access to cloud-based development environments (includes a monthly free usage tier for personal accounts).
* **VS Code Integration:** Seamless editing of code directly from the repository web interface (`dev` domain).

## Community & Support
* **Community Support:** Access to the GitHub Community Forum for troubleshooting and questions.
* **GitHub Sponsors:** Ability to receive funding from the community for open-source work.

## Features Exclusive to Public Repositories (on Free Plan)
*While these are paid features for private repos, they are free for public ones:*
* **Code Owners:** Automatically request reviews from specific owners.
* **Branch Protection Rules:** Enforce restrictions on how code is merged.
* **Multiple Pull Request Reviewers:** Assign multiple peers to review code.
* **Draft Pull Requests:** Collaborate on work-in-progress code.
* **Repository Insights:** Visual analytics on contributions and activity.
* **Pages:** Host static websites for your projects (public repos).

# GitHub Free Plan: Costing Thresholds & Limitations

While the GitHub Free plan is generous, it imposes specific hard limits (thresholds) and feature restrictions (limitations), particularly for **private repositories**.

## 📉 Hard Cost Thresholds (Quotas)
*Exceeding these limits requires upgrading to a paid plan (Pro/Team) or purchasing additional packs.*

### 1. GitHub Actions (CI/CD)
* **Limit:** **2,000 minutes per month** (Private repositories only).
* **Overage:** Workflows will fail to run once the quota is exhausted unless a spending limit is increased.
* **Note:** Public repositories have unlimited minutes and do not consume this quota.

### 2. GitHub Packages (Storage)
* **Limit:** **500 MB of storage** (Private repositories only).
* **Data Transfer:** 1 GB of data transfer out per month is free.
* **Note:** Public repositories have unlimited package storage.

### 3. GitHub Codespaces
* **Limit:** **60 hours per month** (on a 2-core machine) or **30 hours per month** (on a 4-core machine).
* **Storage Limit:** 15 GB of Codespaces storage per month.
* **Constraint:** These free usage hours are for **personal accounts** only, not organizations.

### 4. Git Large File Storage (LFS)
* **Limit:** **1 GB of storage** and **1 GB of bandwidth** per month.
* **Cost:** Additional data packs must be purchased for $5/month per 50 GB.

---

## 🚫 Feature Limitations (Private Repositories)
*The following features are disabled or restricted for private repositories on the Free plan, but are often available for public repositories.*

### Collaborative Features
* **No "Code Owners":** You cannot enforce file ownership or automatic review requests.
* **No Multiple Reviewers:** Pull requests cannot typically be assigned to multiple specific reviewers (limited collaboration flow).
* **No Draft Pull Requests:** You cannot open a "Draft" PR; all PRs are immediately open for review.
* **No Wikis:** Private repositories do not include the Wiki feature (Public repos do).
* **No Pages for Private Repos:** You cannot publish a GitHub Pages site from a private repository (requires GitHub Pro/Team).

### Governance & Security
* **Limited Branch Protection:** You cannot use advanced branch protection rules (e.g., requiring specific status checks to pass before merging) on private repositories.
* **No Environment Protection Rules:** You cannot gate deployments to specific environments (like "Production") with approval rules.
* **No Email Support:** Support is limited to the Community Forum; there is no direct email or web-ticket support from GitHub staff.
---
## [Vercel Hobby Plan Features](https://vercel.com/pricing)

The Vercel Hobby plan is designed for personal, non-commercial projects, offering a serverless deployment experience with "zero configuration" defaults. Below are the known features included at no cost ($0 USD/month).

## Core Infrastructure & Hosting
* **Global Edge Network:** Automatic content delivery via a global CDN.
* **Automatic HTTPS/SSL:** Free SSL certificates for every deployment (including custom domains).
* **Unlimited Custom Domains:** Connect as many custom domains as needed (up to 50 per project).
* **Framework Presets:** Optimized build settings for Next.js, React, Vue, Svelte, and 30+ other frameworks.
* **Image Optimization:** Automatic resizing and format optimization (5,000 source images/month).

## CI/CD & Automation
* **Git Integration:** Automatic deployments upon `git push` (GitHub, GitLab, Bitbucket).
* **Preview Deployments:** Unique URL generated for every pull request to preview changes.
* **Instant Rollbacks:** Revert to any previous deployment instantly.
* **Web Analytics:** Privacy-friendly visitor analytics (2,500 events/month).

## Serverless & Edge Functions
* **Serverless Functions:** Run backend logic (Node.js, Go, Python, Ruby) on-demand.
* **Edge Middleware:** Execute logic at the edge before a request is processed (1,000,000 invocations/month).
* **Incremental Static Regeneration (ISR):** Update static content after deployment without rebuilding the entire site.

## Storage (Vercel Storage)
* **Vercel KV:** Serverless Redis-compatible database (Daily request/storage limits apply).
* **Vercel Postgres:** Serverless SQL database (256 MB compute, 256 MB storage).
* **Vercel Blob:** Object storage for files (1 GB storage, 10 GB bandwidth).

## Developer Experience
* **Environment Variables:** Securely manage API keys and secrets (Encrypted).
* **Vercel CLI:** Deploy and manage projects from the command line.
* **DDOS Protection:** Automated mitigation for common attacks.

# Vercel Hobby Plan: Costing Thresholds & Limitations

The Hobby plan is strictly for **personal, non-commercial use**. Exceeding these limits typically results in a pause of service until the next billing cycle, rather than an overage charge.

## 📉 Hard Cost Thresholds (Quotas)

### 1. Build & Deployment Limits (The "Kill Switch")
* **Deployments per Day:** **100** (This includes every `git push` that triggers a build).
* **Build Minutes:** **6,000 minutes per month**.
* **Concurrent Builds:** **1** (Only one build can run at a time; others queue).

### 2. Serverless Function Limits
* **Execution Duration (Timeout):** **10 seconds** (default) to **60 seconds** (maximum).
    * *Note: You cannot run long ETL jobs on Vercel Hobby functions.*
* **Memory:** **1024 MB** (1 GB) per function.
* **Payload Size:** **4.5 MB** body size limit for incoming requests.

### 3. Bandwidth & Traffic
* **Fast Data Transfer:** **100 GB per month**.
* **Edge Requests:** **1,000,000 per month**.
* **Image Optimization:** **5,000 source images per month**.

### 4. Cron Jobs (Native Vercel Cron)
* **Limit:** **1 Cron Job per project**.
* **Frequency:** Can only run **once per day** (Daily).
    * *Note: This prevents using Vercel Native Cron for 15-minute intervals.*

---

## 🚫 Critical Restrictions
* **No Commercial Usage:** You cannot use the Hobby plan for a business site, affiliate marketing, or any site intended to make money.
* **No "Team" Features:** You cannot invite other developers to collaborate on a Hobby team.
* **No Support SLA:** Support is community-based only; no guaranteed response times.

---
# 📑 Engineering Report: Data-Driven CI/CD Pipeline Analysis

**Subject:** Feasibility Study of 15-Minute Atomic Deployments  
**Architecture:** GitHub Actions (CI) → Vercel (CD)  
**Schedule:** 15-Minute Interval (`*/15 * * * *`)  
**Methodology:** Full Pipeline Execution (No `[skip ci]`)

---

## 1. System Parameters & Assumptions

To perform a stress test on the "Free Tier" limits of both platforms, we assume the following operational baseline:

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **CRON Schedule** | `*/15 * * * *` | Runs every 15 minutes exactly. |
| **Daily Cycles** | **96** | 4 runs/hour × 24 hours. |
| **Monthly Cycles** | **2,880** | 96 runs/day × 30 days. |
| **CI Duration (GitHub)** | ~1 min | Scripts round up to nearest minute. |
| **CD Duration (Vercel)** | ~2 mins | Standard Next.js static build time. |

---

## 2. Component A: GitHub Actions (The CI Layer)

*Calculation of backend data extraction costs.*

### The Math
* **Billing Unit:** Rounded up to the nearest minute.
* **Monthly Consumption:** 2,880 Cycles × 1 Minute = **2,880 Minutes/Month**.

### The Limits (Free Tier)
* **Public Repository Limit:** Unlimited free minutes.
* **Private Repository Limit:** 2,000 minutes/month.

### 📉 Result
| Repository Type | Status | Failure Point |
| :--- | :--- | :--- |
| **Public** | ✅ **SUSTAINABLE** | N/A |
| **Private** | ❌ **CRITICAL FAILURE** | Fails on **Day 20** (Over budget by 880 mins). |

---

## 3. Component B: Vercel (The CD Layer)

*Calculation of frontend build and deployment costs.*

### The Math (Deployment Count)
* **Daily Usage:** 96 CRON Deployments.
* **Platform Limit:** 100 Deployments per day (Fair Use Policy).
* **Buffer Remaining:** **4 Slots** (96 used / 100 limit).

### The Math (Build Minutes)
* **Daily Consumption:** 96 Builds × 2 Minutes = **192 Minutes/Day**.
* **Monthly Consumption:** 192 Minutes × 30 Days = **5,760 Minutes/Month**.
* **Platform Limit:** 6,000 Minutes per month.
* **Capacity Utilization:** **96%** of total monthly allowance.

### 📉 Result
| Metric | Utilization | Status | Risk |
| :--- | :--- | :--- | :--- |
| **Daily Deploys** | **96%** | ⚠️ **HIGH RISK** | 5 manual pushes will block deployments for 24h. |
| **Build Minutes** | **96%** | ⚠️ **HIGH RISK** | Any build slowness (>2m) triggers monthly cap overage. |

---

## 4. Failure Scenarios (The "Kill Chain")

If this architecture is deployed without modification, the following scenarios are statistically guaranteed:

### 🔴 The "10:00 AM" Lockout
1.  **00:00 - 10:00:** System runs 40 CRON jobs perfectly.
2.  **10:05:** You fix a typo and push code (1 Manual Build).
3.  **10:10:** You realize you missed a file and push again (1 Manual Build).
4.  **Result:** By end of day, Total Builds = 96 (CRON) + Manual Pushes.
5.  **Impact:** If Manual Pushes > 4, **Vercel pauses all deployments**. Your portfolio cannot be updated until the 24-hour rolling window resets.

### 🔴 The Queue Collision
1.  **Scenario:** GitHub triggers a build at 12:00. Vercel experiences minor platform latency.
2.  **Impact:** Build takes 16 minutes to queue and install.
3.  **Result:** The 12:15 CRON job fires before the 12:00 job finishes.
4.  **Consequence:** Multiple builds queue up, burning "Concurrent Build" slots and confusing the deployment history.

---

## 5. Final Verdict

### Status: ❌ UNSUSTAINABLE (For Free Tier)

While conceptually "pure," a 15-minute full CI/CD pipeline exceeds the operational safety margins of Vercel's Hobby Tier. It leaves **zero room** for actual software development (manual pushes) and operates at **96% capacity** perpetually.

### 🛠 Recommended Engineering Fix
To maintain the 15-minute data freshness without breaking the pipeline:

1.  **Decouple Data from Code:**
    * **GitHub Action:** Fetch Data → Upload to **Vercel Blob** (Do NOT commit).
    * **Next.js Frontend:** Fetch from Blob at runtime.
2.  **Result:**
    * **Vercel Builds:** 0 per day (triggered only by code changes).
    * **Data Latency:** 15 minutes (maintained).
    * **Cost:** $0.