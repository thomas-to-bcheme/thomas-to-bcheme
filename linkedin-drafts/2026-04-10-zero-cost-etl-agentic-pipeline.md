---
date: 2026-04-10
topic: Zero-Cost ETL Data Warehouse and Agentic AI Stack
target_audience: Research Engineering, Life Sciences Software, Data Platform Teams
---

Hello World, I built a zero-cost data warehouse and AI agent stack processing scientific and operational data on free-tier cloud infrastructure.

The problem: I needed to operationalize ML models and an AI chat agent without infrastructure costs, while maintaining data integrity across pipeline stages. The architecture uses GitHub Actions as the CRON orchestrator, feeding a three-tier ETL warehouse: Sandbox, Quality, Production. Every 30 minutes, raw data flows through validation and transformation layers before reaching the production tier. The frontend deploys automatically on Vercel when the production data layer commits.

The ML layer runs a dual-model salary prediction system trained on 2,000+ job records. A Random Forest model and a TensorFlow neural network run in parallel, each evaluated on MAE, RMSE, R², and MAPE metrics. The evaluation pipeline ranks both models and generates residual analysis to inform production serving decisions. TF-IDF with 1,500 features and 64-dimensional embedding layers handle text encoding. The entire Python ML backend lives in four modules and hosts on Hugging Face free tier.

The AI agent uses Google Gemini's streaming API with a RAG context layer. Instead of a vector database, I encoded structured domain knowledge directly into the system prompt as a 17KB context document. The agent handles quota errors, validates inputs with Zod schemas at the API boundary, and passes correlation IDs through the stack for request tracing. Structured JSON logs capture context alongside every error.

The most reusable pattern for other engineers: GitHub Actions handles scheduled tasks blocked by Vercel Hobby's daily CRON limit. The Actions job processes data and commits the result. Vercel detects the commit and redeploys. Hourly pipeline execution on a zero-dollar budget.

The stack is React 19, Next.js 16, TypeScript, and Tailwind CSS on the frontend. AWS SDK with DynamoDB on the backend. GitHub Actions for CI/CD and ETL orchestration. All code is public [1].

My background spans wet lab and dry lab work. I studied Biochemical Engineering at UC Davis before moving into fullstack infrastructure and agentic AI systems. The combination shapes how I think about data pipelines: scientific data has provenance requirements, transformation integrity matters, and the collection system must be as reliable as the analysis consuming it [2].

Happy to connect and chat about what you're building!

References:
[1] Portfolio Repository - https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io
[2] GitHub Actions Scheduled Events - https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule
