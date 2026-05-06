---
date: 2026-04-10
topic: Genentech Application - Alt 1 - Canventa LLM on Lab Data Anchor
angle: Fine-tuning LLMs on handwritten scientific records at a life sciences company
word_target: 300
---

The project I am most proud of is the scientific data digitization system I built at Canventa Life Sciences. It eliminated all manual data capture in the laboratory, structured five years of handwritten scientific records with 95%+ accuracy, and reduced daily calculation time by 87%.

Five years of handwritten laboratory notebooks had no digital equivalent. Scientists relied on manual transcription and institutional memory for every production decision. I approached the problem in three stages.

First, I built ETL/ELT pipelines in Python and Google Apps Script to capture incoming data at the point of entry. Second, I fine-tuned Snowflake Arctic-TILT on the handwritten lab documents, building a labeled training set from physical records and defining the output schema to match the downstream analytics structure. The model held above 95% accuracy on the validation set. Third, I implemented Python dbt transformations loading structured records into Snowflake, with quality checks enforced at each stage before any record reached the analytics layer.

The deployed system runs on GCP with Docker and CI/CD automation. Daily calculation time dropped by 87%. Production forecasts landed within 3 units of actual output.

This maps directly to the DDC team's responsibilities: collecting, structuring, and storing diverse scientific data, enforcing transformation integrity across a multi-stage pipeline, and integrating ingestion systems with downstream data management infrastructure.

The agentic AI work I have done since builds on this foundation. I built multi-agent orchestration systems using LangGraph and LangChain with RAG pipelines for domain-specific scientific workflows, directly aligned with the agentic components described in this role.

My Biochemical Engineering degree from UC Davis and prior work as a Process Engineer at Genentech Vacaville, where I reduced manufacturing data processing time by over 99%, provide the scientific context this team operates in every day.
