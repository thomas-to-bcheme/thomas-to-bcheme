---
date: 2026-04-10
topic: Genentech Application - Alt 3 - Open-Source Agentic Architecture Anchor
angle: Portfolio as architectural proof of concept, grounded by life sciences professional track record
word_target: 300
---

The project I am most proud of is the agentic AI and data warehouse system I built in my open-source portfolio. Every architectural decision reflects what I have learned building scientific data systems in life sciences environments.

The architecture is a three-tier warehouse: Sandbox, Quality, and Production. GitHub Actions orchestrates data ingestion every 30 minutes. Records flow through validation and transformation stages before promoting to production. AWS DynamoDB backs the NoSQL layer. The AI layer uses a RAG system with structured domain knowledge encoded into the system prompt, Zod schema validation at the API boundary, correlation ID tracing through the stack, and a dual-model ML pipeline (Random Forest and TensorFlow) with automated evaluation across MAE, RMSE, R², and MAPE metrics selecting the production model each run. Multi-agent orchestration is built with LangGraph, which is called out directly in the preferred qualifications for this role.

What the portfolio demonstrates in architecture, my professional work demonstrates in outcomes. At Canventa Life Sciences, I fine-tuned a large language model on five years of handwritten laboratory records with 95%+ accuracy and built ETL/ELT pipelines with Python and dbt into Snowflake, reducing daily calculation time by 87%. At Genentech's Digital Transformation Office, I built scientific knowledge management platforms on MongoDB and PostgreSQL that improved document retrieval speed by 60% for research biology teams. As a Process Engineer at the Vacaville site, I reduced manufacturing data processing time by over 99% with automated Python pipelines.

My Biochemical Engineering degree from UC Davis means I understand how laboratory data is generated and where a platform earns or loses the trust of the scientists depending on it.

The portfolio shows how I think. The professional history shows I have shipped the same class of system inside life sciences organizations with real stakes.
