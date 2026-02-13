---
date: 2027-02-23
topic: Monitoring and Observability in Personal AI Projects
target_audience: ML Engineers, AI Engineers, Solo Developers
---

Hello World, I added production-grade monitoring to my portfolio ML project using Google Vertex AI for model drift detection and structured logging across the pipeline.

Personal projects fail silently. You deploy a model, it works for a week, then predictions degrade without warning. By the time you notice, your portfolio demo shows stale results to anyone visiting. The problem is treating side projects as throwaway code when they represent your engineering skills to the community.

The monitoring architecture uses Google Vertex AI for model drift detection on a salary prediction model trained on 2025 LinkedIn job descriptions [1]. I track feature distribution shifts, prediction confidence intervals, and output accuracy against new job postings. When drift exceeds a threshold, the system alerts me to retrain. Structured logging uses correlation IDs across the pipeline. Every request gets a unique ID passed from data ingestion through ETL processing to model inference. When something breaks, I trace the exact request through each stage using log aggregation.

What surprised me was how monitoring taught me production habits early. When you add observability to portfolio work, you start thinking about failure modes before deployment. I learned to instrument code for debugging, set up alerts for anomalies, and design systems assuming components will fail. These habits transferred directly to conversations about system design and operational excellence.

This benefits developers building ML projects for portfolios or learning. The monitoring setup is documented in my repository with examples of model performance tracking, data quality checks, and structured logging patterns [2]. The architecture runs on Google Cloud free tier, making it accessible for personal projects without ongoing costs.

Monitoring personal projects taught me production habits early. If you have set up observability for side projects or portfolio work, I would be interested in learning your approach. Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Google Vertex AI Model Monitoring - https://cloud.google.com/vertex-ai/docs/model-monitoring/overview
[2] ML Pipeline Observability Patterns - https://github.com/thomas-to-bcheme/thomas-to-bcheme/blob/main/backend/ml_monitoring.py
