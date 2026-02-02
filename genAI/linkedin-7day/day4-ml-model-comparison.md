---
date: 2026-01-31
topic: ML Model Comparison
target_audience: Data Scientists, ML Engineers
series: linkedin-7day
day: 4
---

Hello World, this is Day 4 of my 7-day series on building in public. To anyone transitioning into software: build something that proves it. https://thomas-to-bcheme-github-io.vercel.app/

I trained an ML model on job descriptions to predict salary ranges, deployed it to the Google Chrome Marketplace—then pivoted to building Claude Code's open source ecosystem instead.

The original vision: a Chrome extension that analyzes LinkedIn job postings in real-time, extracts required skills, and predicts expected salary ranges. Random Forest achieved **8% MAPE** on the job description dataset while TensorFlow hit **12%**. Classical ML won for structured tabular data with moderate samples [1].

I deployed the model to Hugging Face Spaces and started building the Chrome extension. Feature engineering was solid: TF-IDF vectorization, location encoding, seniority classification. The pipeline worked. But applying first principles, I asked: where does the highest leverage lie?

The pivot came from recognizing opportunity cost. Building a Chrome extension serves job seekers. Building an open source Claude Code plugin marketplace serves the entire AI developer ecosystem. Phase 3 became: establish a robust plugin architecture that others can extend—git workflows, specialized agents, content automation [2].

This wasn't abandoning the ML work—it was sequencing priorities. The salary prediction model remains deployed on Hugging Face. The Chrome extension architecture is documented. But Phase 3's Claude Code marketplace has broader impact: 15 plugins published, multi-agent orchestration patterns, and a framework other developers can fork and extend.

Phase 4 is next: taking these patterns into production environments and contributing to the broader agentic AI ecosystem.

One thing I learned: building in public means being transparent about pivots. The pivot taught me that first principles thinking beats sunk cost fallacy.

Have you pivoted mid-project? How did you decide what to prioritize?

Happy to connect and discuss AI/ML/Software Engineering, career transitions, or open source contributions.

Tomorrow: Multi-agent plugin architecture.

References:
[1] Salary Prediction Model
[2] Claude Code Plugin Marketplace https://github.com/thomas-to-bcheme/thomas-to-bcheme/tree/main/plugins
[3] Portfolio https://github.com/thomas-to-bcheme/thomas-to-bcheme

#MLOps #BuildInPublic #OpenToWork #FirstPrinciples