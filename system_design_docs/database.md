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

## Data Architecture

This document describes the data architecture for the portfolio project, which uses a **"GitHub as Data Warehouse"** pattern instead of a traditional database.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE GITHUB MONOLITH                           │
│                 (Central Source of Truth)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  External Sources ──► GitHub CRON ──► Data Processing ──► Deploy │
│  (APIs, Scrapers)    (30-min ETL)    (Transform)        (Vercel) │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why "GitHub as Database"?

### Design Constraint: Zero-Cost Architecture
This project must remain free of charge indefinitely. Traditional databases (PostgreSQL, MongoDB, DynamoDB) have operational costs. GitHub provides:

- **Version Control**: Every data change is tracked
- **Free Storage**: For public repositories
- **CI/CD Integration**: GitHub Actions for ETL
- **Static Hosting**: JSON files served as static assets

### Trade-offs

| Aspect | Traditional DB | GitHub-as-DB |
|--------|---------------|--------------|
| Query Speed | Fast (indexed) | N/A (static files) |
| Real-time Updates | Yes | No (build-time) |
| Cost | Pay per usage | Free |
| Scalability | High | Limited |
| Version History | Manual | Automatic (Git) |

---

## Data Flow

### The 3-Tier Environment Model

Data moves through three environments within the GitHub repository:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SANDBOX   │ ──► │   QUALITY   │ ──► │ PRODUCTION  │
│  (Raw Data) │     │ (Validated) │     │ (Optimized) │
└─────────────┘     └─────────────┘     └─────────────┘
```

**1. Sandbox Environment**
- Raw data ingestion from external APIs
- Testing new parsers and scrapers
- No schema enforcement

**2. Quality Environment**
- Data cleaning and normalization
- Schema validation
- Deduplication and error handling

**3. Production Environment**
- Optimized, compressed data
- Ready for deployment to Vercel
- Minimal payload for fast loading

---

## Data Stages (CLAUDE.md Alignment)

Following the project's data integrity directives:

### Stage 1: Raw JSON (Authoritative Source)
- Untransformed data from external sources
- Preserved exactly as received
- Used for debugging and reprocessing

### Stage 3: Parsed/Transformed (Final Structure)
- Clean, validated data
- Project-specific schema
- Consumed by frontend components

**Rule:** Never mix stages. Stage 1 data should never be used directly in production code.

---

## ETL Pipeline

### Trigger: GitHub Actions CRON
```yaml
# Runs every 30 minutes
schedule:
  - cron: '*/30 * * * *'
```

### Pipeline Stages

1. **Extract**: Pull data from external APIs/scrapers
2. **Transform**: Clean, validate, normalize
3. **Load**: Commit to repository → triggers Vercel deploy

### Flow Diagram
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   EXTRACT   │     │  TRANSFORM  │     │    LOAD     │
│             │     │             │     │             │
│ - API calls │ ──► │ - Cleaning  │ ──► │ - git add   │
│ - Scrapers  │     │ - Validate  │     │ - git commit│
│ - webhooks  │     │ - Schema    │     │ - git push  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   VERCEL    │
                                        │  (Deploy)   │
                                        └─────────────┘
```

---

## Data Types in This Project

### Static Content (No ETL)
Most content is static TypeScript/JSON embedded at build time:

| Data | Location | Type |
|------|----------|------|
| Resume context | `src/data/AiSystemInformation.tsx` | TypeScript constant |
| Component data | `src/components/*.tsx` | Inline props |
| Project info | `src/data/*.ts` | TypeScript modules |

### Dynamic Content (Future)
For ML model features (see `roadmap.md`):

| Data | Source | Frequency |
|------|--------|-----------|
| Job postings | LinkedIn Scraper | Weekly |
| Model predictions | Hugging Face | On-demand |
| Performance metrics | Vertex AI | Daily |

---

## Schema Patterns

### TypeScript as Schema
Instead of SQL schemas, this project uses TypeScript interfaces:

```typescript
// Example: Job data schema
interface JobPosting {
  id: string;
  title: string;
  company: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  skills: string[];
  datePosted: string;
}
```

### Validation Strategy
- **Build-time**: TypeScript compiler catches type errors
- **Runtime**: Zod or similar for API inputs (if applicable)

---

## Storage Locations

| Content Type | Location | Managed By |
|--------------|----------|------------|
| Source code | `src/` | Developers |
| Static data | `src/data/` | Developers |
| ML models | Hugging Face | CI/CD pipeline |
| Documentation | `system_design_docs/` | Developers |
| RAG context | `src/data/AiSystemInformation.tsx` | Developers |

---

## Future Considerations

### Scaling Beyond GitHub

If data needs exceed GitHub's capabilities:

1. **Vector Database** (for RAG): Pinecone, Weaviate, or Supabase pgvector
2. **Time-series Data**: InfluxDB or TimescaleDB
3. **User Data**: Supabase, PlanetScale, or Neon (Postgres)

### Migration Path
```
GitHub (Current)
    │
    ├──► Supabase (User data + Postgres)
    │
    └──► Pinecone (Vector embeddings for RAG)
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/data/AiSystemInformation.tsx` | Primary data context |
| `.github/workflows/` | ETL automation (future) |
| `.claude/agents/backend.md` | Backend agent guidance |
| `system_design_docs/architecture.md` | Platform KPIs |
