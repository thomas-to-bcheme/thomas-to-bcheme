---
date: 2026-04-10
topic: Genentech Senior Software Engineer Research Biology - Application Response
prompt: "Tell us about a project you are proud of that highlights why you are a good fit for this role."
word_target: 450
---

The project I am most proud of is the scientific data digitization and agentic AI system I built at Canventa Life Sciences. It represents the direct intersection of what this role requires: structured scientific data ingestion, LLM fine-tuning on laboratory records, and production-reliable ETL pipelines feeding downstream analytics and machine learning.

The problem was concrete. Over five years of handwritten laboratory data lived in physical notebooks with no digital structure. Research workflows depended on manual calculation and tribal knowledge, introducing error and delaying decisions. My charter was to eliminate manual data capture entirely.

I approached it in three layers. First, I fine-tuned a large language model (Snowflake Arctic-TILT) on the handwritten lab documents to extract and structure scientific records. The model achieved 95%+ accuracy on legacy data digitization, converting unstructured entries into validated records for downstream analytics. Second, I architected ETL/ELT pipelines in Python with dbt transformations loading into Snowflake, with quality checks and error handling enforced at each stage. Third, I deployed a fullstack SaaS application on GCP with Docker containerization and CI/CD automation, converting serial workflows to concurrent execution. The outcome was an 87% reduction in daily calculation time (40 minutes saved per day) and production forecasts accurate within 3 units of actual output.

This work maps directly to the DDC team's mission. Collecting, structuring, and storing diverse scientific and operational data to enable ML and AI adoption is precisely what I built at Canventa. The agentic AI systems I subsequently developed extend this further. Using LangGraph and LangChain, I built multi-agent orchestration pipelines with RAG retrieval for domain-specific scientific workflows, the same architecture the team is implementing for scientific data management. My open-source portfolio adds a third layer: a zero-cost three-tier data warehouse (Sandbox, Quality, Production) orchestrated on GitHub Actions with AWS DynamoDB, demonstrating the same data integrity principles at scale without enterprise infrastructure.

What makes the fit strong is the combination of wet lab context and dry lab execution. My Biochemical Engineering degree from UC Davis means I understand how laboratory data is generated, why provenance requirements matter, and what scientists actually need from a data platform. That understanding informed every architectural decision at Canventa and in my earlier role as a Process Engineer at Genentech Vacaville, where I reduced data processing time by over 99% by automating Python pipelines for manufacturing research operations.

I have built scientific data systems, fine-tuned models on laboratory records, and shipped agentic AI pipelines in life sciences environments. I already understand the domain, the infrastructure, and the research context this team works in every day.
