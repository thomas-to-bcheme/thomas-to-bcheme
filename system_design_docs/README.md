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

## System Design Documentation

Overview of the portfolio architecture documentation.

## Quick Navigation

| Document | Description | When to Read |
|----------|-------------|--------------|
| [architecture.md](./architecture.md) | Platform KPIs, deployment limits, CRON strategy | Before infrastructure changes |
| [api.md](./api.md) | Chat API specification, streaming, security | Before API work |
| [database.md](./database.md) | GitHub-as-warehouse pattern, ETL pipeline | Before data changes |
| [deployment.md](./deployment.md) | CI/CD pipeline, Vercel config, rollback | Before deployments |
| [roadmap.md](./roadmap.md) | ML engineering vision, future phases | Planning features |
| [frontend.md](./frontend.md) | React component architecture, patterns | Before UI work |
| [ml-models.md](./ml-models.md) | Python ML implementation details | Before ML work |

## Related Documentation

| Location | Description |
|----------|-------------|
| `.claude/agents/` | Agent-specific guidance for Claude Code |
| `my_marketplace/docs/` | Plugin marketplace documentation |
| `README.md` (root) | Project overview |
| `CLAUDE.md` | Development directives |

## Reading Order

For new contributors:
1. Root README.md - Project overview
2. CLAUDE.md - Development principles
3. architecture.md - Platform constraints
4. Specific area docs as needed

## Architecture Overview

This portfolio demonstrates a zero-cost, production-grade fullstack system using:

- **Frontend**: Next.js 16 + React 19 + TypeScript 5
- **AI Integration**: Google Gemini API with RAG context
- **ML Backend**: Python (TensorFlow, scikit-learn) for salary prediction
- **Infrastructure**: Vercel (frontend), GitHub Actions (CI/CD, CRON)

### Data Flow

```
GitHub CRON (30-min) → ETL Processing → Data Warehouse (Sandbox → Quality → Production) → Vercel
```

### Key Constraints

- Vercel: 100 deploys/24h (safe max: 24/day for hourly CRON)
- Zero-cost architecture using free-tier services
- GitHub Actions for scheduled tasks (Vercel Hobby limits CRON to daily)

## Document Maintenance

When updating documentation:
- Keep tables aligned and readable
- Update timestamps when making significant changes
- Cross-reference related documents
- Validate external links quarterly
