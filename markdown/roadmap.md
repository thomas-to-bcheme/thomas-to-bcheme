# Project Roadmap: ML Engineering, Open Source Embedded Edge AI

## 1. Executive Summary
This project explores the evolution of the AI job market by deploying a comparative Machine Learning study. It contrasts a static model trained on verified 2025 data against a dynamic model that continuously learns from 2026 real-world data.

The project utilizes a **"Code Monolith"** architecture hosted on GitHub to ensure infrastructure resilience, allowing deployment across any provider (Hugging Face, Vercel, AWS, GCP). **Google Vertex AI** serves as the primary monitoring platform to analyze **Model Drift** and performance degradation over time.

---

## 2. Infrastructure & Architecture

### 2.1 The GitHub Monolith
A unified repository designed for portability.
* **Data Versioning:** Integration of **DVC (Data Version Control)** to manage the static Kaggle dataset and the growing 2026 scraped dataset.

### 2.2 The Model Ecosystem
* **Model A (The Control):** A DistilBERT-based classifier trained *only* on the 2025 Kaggle dataset. It represents the "knowledge freeze" of 2025.
* **Model B (The Variable):** An identical architecture that undergoes **Continuous Training (CT)**. It is retrained weekly on new data ingested from LinkedIn.

### 2.3 Monitoring Platform: Google Vertex AI
Chosen for its superior free-tier limits compared to AWS/Azure.
* **Pipeline:** Prediction logs from Hugging Face are sent asynchronously to Vertex AI.
* **Metric:** **Training-Serving Skew**. We monitor how the distribution of keywords (e.g., "Mamba", "Agentic AI") changes in 2026 compared to the 2025 baseline.

---

## 3. Development Phases

### Phase 1: Foundation & Baseline
*Goal: Establish the static baseline using guaranteed data.*

1.  **Data Ingestion:**
    * Import dataset: [700 Jobs Data of AI and Data Fields 2025](https://www.kaggle.com/datasets/princekhunt19/700-jobs-data-of-ai-and-data-fields-2025/code).
    * **Preprocessing:** Clean text, remove stop-words, and tokenize using Hugging Face Tokenizers.
2.  **Target Definition:**
    * Map diverse job titles into binary classes: `0: Software Engineering`, `1: Data Science`.
3.  **Model Training:**
    * Train **Model A** (Static) to >85% accuracy.
    * Serialize and save the model weights (`model_a_v1.pth`).
4.  **Deployment:**
    * Deploy Model A to a Hugging Face Space using Gradio/Streamlit.

### Phase 2: The Continuous Pipeline
*Goal: Activate the self-learning mechanism.*

1.  **Scraper Integration:**
    * Implement [Luminati-io LinkedIn Scraper](https://github.com/luminati-io/LinkedIn-Scraper).
    * **Normalization Layer:** Create a script to map the Scraper's JSON output to match the Kaggle dataset's schema (ensuring feature consistency).
2.  **Pseudo-Labeling Loop:**
    * *Challenge:* Scraped data has no labels.
    * *Solution:* Use a high-confidence threshold approach. New data is labeled by Model A; only samples with >90% confidence are added to the training set for Model B to prevent poisoning the model.
3.  **Automated Retraining (CI/CD):**
    * Configure **GitHub Actions** to run a weekly job: `Scrape -> Normalize -> Retrain Model B -> Push to Hub`.

### Phase 3: Monitoring & Drift Analysis
*Goal: Visualize the degradation of the static model.*

1.  **Vertex AI Setup:**
    * Connect the Hugging Face inference endpoint to Vertex AI.
    * Log all inputs and prediction probabilities.
2.  **The Dashboard:**
    * Create a view comparing **Model A vs. Model B**.
    * **Hypothesis Validation:** Highlight instances where Model A fails (e.g., on new tech stacks like "Mojo" or "LangChain") while Model B succeeds.

---

## 4. Future Outlook: Edge AI

**Project:** Open Source Embedded AI Career Assistant
**Hardware:** [Raspberry Pi 5 + AI HAT+ (Hailo-8 / Hailo-8L)](https://www.raspberrypi.com/news/introducing-the-raspberry-pi-ai-hat-plus-2-generative-ai-on-raspberry-pi-5/)

Moving from the cloud to the edge ensures privacy and offline capability.

1.  **Model Quantization:**
    * Take the mature **Model B** (trained on 2025+2026 data).
    * Apply Post-Training Quantization (PTQ) to convert weights from FP32 to INT8, making it compatible with the Raspberry Pi AI HAT (NPU).
2.  **Local Deployment:**
    * Containerize the quantized model for the Raspberry Pi OS.
    * Develop a local CLI or lightweight web interface allowing users to input job descriptions and receive categorization/career advice without an internet connection.

## 5. ML Engineering vs AI Engineering 
1.  **ML Engineeirng vs. AI Engineering:** open source small language model performance fine-tuned vs. large language model performance and cost associated per call with overhead estimate (MLOps overhead)


---

## 5. Technical Stack Overview

| Component | Technology | Reasoning |
| :--- | :--- | :--- |
| **Language** | Python 3.10+ | Standard for ML/AI. |
| **Initial Data** | Kaggle (CSV) | Verified baseline for 2025. |
| **Live Data** | LinkedIn Scraper | Real-time market trends. |
| **ML Framework** | PyTorch / Hugging Face | Industry standard for NLP. |
| **Monitoring** | **Google Vertex AI** | Best free-tier for drift detection. |
| **Infrastructure** | Docker / GitHub | "Monolith" strategy for portability. |
| **Edge Target** | Raspberry Pi 5 + AI HAT+ | Future-proofing for embedded AI. |