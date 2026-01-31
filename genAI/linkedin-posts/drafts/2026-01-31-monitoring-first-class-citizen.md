---
date: 2026-01-31
topic: Monitoring as a First-Class Citizen - Lessons from ML Ops
target_audience: DevOps Engineers, ML Engineers, SREs
---

Hello World, I've been thinking about how ML Ops taught me that monitoring isn't a feature you add later - it's how you detect when reality diverges from expectations.

In machine learning, we obsess over data drift detection because models degrade silently. Your training data says users behave one way, but six months into production, behavior shifts and your predictions become noise. You don't know until you measure the gap between expected and actual performance.

What surprised me: this pattern isn't ML-specific. It's everywhere in software.

APIs degrade as upstream dependencies change their schemas. UX degrades as user cohorts evolve and edge cases accumulate. Feature flags degrade as the codebase around them mutates. The gap between "what we designed for" and "what's actually happening" grows over time - monitoring is how you detect it before users complain.

I'm researching how ML Ops patterns translate to traditional software stacks. Concepts like prediction drift metrics [1] map cleanly to API response time degradation. Model performance dashboards map to user journey analytics. Automated retraining pipelines map to automated rollback triggers. The tooling differs, but the philosophy is identical: production is where assumptions go to die, so measure continuously [2].

For engineers building infrastructure, treating monitoring as a first-class citizen means designing systems that expose their health by default. Not as an afterthought, but as part of the contract. If you can't observe it degrading, you can't prevent outages - you can only react to them.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design during this transition period.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Google Cloud - Detecting Training-Serving Skew - https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning
[2] AWS - Monitoring Machine Learning Models in Production - https://aws.amazon.com/blogs/machine-learning/monitoring-in-production-ml-models-at-large-scale-using-amazon-sagemaker-model-monitor/

#SoftwareEngineering #OpenToWork #MLOps #DevOps
