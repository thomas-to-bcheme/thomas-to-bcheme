---
date: 2026-01-31
topic: ML Model Comparison
target_audience: Data Scientists, ML Engineers
---

Hello World, I trained a machine learning model to predict salary ranges, then abandoned it for something with greater impact.

The original vision: a Chrome extension analyzing LinkedIn job postings in real-time, extracting required skills, and predicting expected salary ranges. I trained two models on job description data. Random Forest achieved 8% MAPE while TensorFlow hit 12%. Classical ML won for structured tabular data with moderate samples [1].

I deployed the model to Hugging Face Spaces and started building the Chrome extension. Feature engineering was solid: TF-IDF vectorization, location encoding, seniority classification. The pipeline worked.

Then I applied first principles thinking. Building a Chrome extension serves job seekers. Building an open source Claude Code plugin marketplace serves the entire AI developer ecosystem. The opportunity cost became clear: narrow tooling versus extensible infrastructure.

The pivot: establish a plugin architecture others extend. Git workflows, specialized agents, content automation [2]. This approach had broader impact. 15 plugins published, multi-agent orchestration patterns, and a framework other developers fork and extend.

This was not abandoning the ML work. It was sequencing priorities. The salary prediction model remains deployed on Hugging Face. The Chrome extension architecture is documented. The pivot taught me first principles thinking beats sunk cost fallacy.

The next phase: taking these patterns into production environments and contributing to the broader agentic AI ecosystem.

Building in public means being transparent about pivots. When you recognize opportunity cost early, you preserve momentum instead of defending past decisions.

Happy to connect and discuss AI/ML/Software Engineering, career transitions, or open source contributions.

References:
[1] Salary Prediction Model - https://huggingface.co/spaces/thomas-to-bcheme/salary-prediction
[2] Claude Code Plugin Marketplace - https://github.com/thomas-to-bcheme/thomas-to-bcheme/tree/main/plugins
