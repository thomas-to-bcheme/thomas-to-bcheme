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

## Machine Learning Models

This document describes the dual-model salary prediction system implemented in the backend.

---

## 1. Overview

The portfolio includes a salary prediction system demonstrating ML/DL engineering capabilities. Two models are trained in parallel:

- **Random Forest (Scikit-Learn)**: Classical ensemble learning with TF-IDF text vectorization
- **TensorFlow (Keras)**: Deep learning with embeddings and neural architecture

Both models predict annual salary from job attributes: position name, description, and skill keywords.

**Purpose**: Showcase end-to-end ML pipeline design, from feature engineering to production-ready evaluation frameworks.

---

## 2. Model Comparison Matrix

| Aspect | Random Forest | TensorFlow |
|--------|---------------|------------|
| **Framework** | Scikit-Learn | Keras/TensorFlow |
| **Architecture** | TF-IDF + One-Hot Encoding → Random Forest Regressor (100 trees) | TextVectorization → Embedding (dim=64) → Dense Layers (128→64→1) |
| **Text Processing** | TF-IDF (max 1500 features: 1000 keywords + 500 position) | Embedding layer (max tokens=5000, sequence length=100) |
| **Training Time** | Fast (~2-5 seconds for 2000 samples) | Moderate (~30-60 seconds, 15 epochs) |
| **Interpretability** | High (feature importance via Gini impurity) | Low (black-box neural network) |
| **Production Ready** | Yes (no GPU required, low latency) | Requires TensorFlow runtime (CPU/GPU) |
| **Best For** | Tabular data, explainability, resource-constrained environments | Large datasets, unstructured text, complex feature interactions |

---

## 3. Pipeline Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                       DATA LOADING & VALIDATION                        │
│  - Load from CSV or generate sample data (create_sample_data)         │
│  - Validate required columns: positionName, description, keywords      │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PREPROCESSING                                 │
│  data_preprocessing.py                                                 │
│  1. Drop rows with missing salary (target)                            │
│  2. Extract seniority from position title (extract_seniority)         │
│  3. Fill missing text columns with empty strings                      │
│  4. Return (features_df, target_series)                               │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          FEATURE ENGINEERING                           │
│  - Seniority Extraction: Regex patterns for Junior/Mid/Senior/Exec   │
│  - Text Vectorization:                                                │
│    ML: TF-IDF with stop word removal                                 │
│    DL: Tokenization + Padding + Embedding                            │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │   ML PIPELINE         │   │   DL PIPELINE         │
        │   ml_model.py         │   │   dl_model.py         │
        │                       │   │                       │
        │ 1. TF-IDF Keywords    │   │ 1. Concatenate Text   │
        │ 2. TF-IDF Position    │   │ 2. TextVectorization  │
        │ 3. OneHot Seniority   │   │ 3. Embedding Layer    │
        │ 4. RandomForest(100)  │   │ 4. Dense(128→64→1)    │
        │ 5. n_jobs=-1 (all CPU)│   │ 5. Dropout(0.3, 0.2)  │
        └───────────────────────┘   └───────────────────────┘
                        │                         │
                        └────────────┬────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          EVALUATION                                    │
│  evaluation.py - ModelEvaluator                                        │
│  1. Calculate metrics (MAE, RMSE, R², MAPE)                           │
│  2. Generate plots (actual vs predicted, residuals)                   │
│  3. Compare models (bar charts, ranking table)                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Engineering

### 4.1 Seniority Extraction

Regex patterns extract career level from job titles:

```python
# data_preprocessing.py
seniority_patterns = {
    "Junior": ["junior", "jr", "entry", "trainee", "intern"],
    "Mid": ["mid", "associate", "intermediate"],
    "Senior": ["senior", "sr", "lead", "principal", "head"],
    "Executive": ["director", "vp", "vice president", "c-level", "ceo", "cto", "cfo"],
}
```

**Example Mappings:**
- "Junior Software Engineer" → Junior
- "Senior Product Manager" → Senior
- "VP of Engineering" → Executive
- "Data Scientist" → Unknown (defaults to base category)

### 4.2 TF-IDF Vectorization (ML Model)

```python
# ml_model.py
TfidfVectorizer(max_features=1000, stop_words="english")  # Keywords
TfidfVectorizer(max_features=500, stop_words="english")   # Position Name
```

**Configuration:**
- **Keywords**: Max 1000 features (captures skill terms like "python", "kubernetes")
- **Position Name**: Max 500 features (captures role terms like "engineer", "manager")
- **Stop Words**: English stop words removed ("the", "and", "is")

### 4.3 Text Embeddings (DL Model)

```python
# dl_model.py
TextVectorization(max_tokens=5000, output_sequence_length=100)
Embedding(input_dim=5000, output_dim=64)
GlobalAveragePooling1D()
```

**Configuration:**
- **Vocabulary**: Top 5000 most frequent tokens
- **Sequence Length**: 100 tokens (truncate/pad)
- **Embedding Dimension**: 64-dimensional dense vectors
- **Pooling**: Average embeddings to fixed-length representation

---

## 5. Evaluation Framework

Comprehensive metrics from `evaluation.py`:

### 5.1 Core Metrics

| Metric | Formula | Interpretation | Ideal Value |
|--------|---------|----------------|-------------|
| **MAE** | `mean(|y_true - y_pred|)` | Average absolute error in dollars | Lower = Better |
| **RMSE** | `sqrt(mean((y_true - y_pred)²))` | Root mean squared error, penalizes large errors | Lower = Better |
| **R²** | `1 - (SS_res / SS_tot)` | Proportion of variance explained (0-1) | Higher = Better (1 = perfect) |
| **MAPE** | `mean(|y_true - y_pred| / y_true) × 100` | Mean absolute percentage error | Lower = Better |

### 5.2 Visualization Suite

1. **Actual vs Predicted Scatter Plot**: Perfect prediction line (y=x) for reference
2. **Residual Plot**: Detect systematic bias or heteroscedasticity
3. **Residual Histogram**: Check for normality (Gaussian distribution indicates unbiased predictions)
4. **Model Comparison Bar Charts**: Side-by-side MAE, RMSE, R², MAPE

### 5.3 Ranking System

`ModelEvaluator.create_comparison_table()` generates:

```python
# evaluation.py
for metric in ["MAE", "RMSE", "MAPE"]:  # Lower is better
    df[f"{metric}_rank"] = df[metric].rank(method="min")
df["R2_rank"] = df["R2"].rank(method="min", ascending=False)  # Higher is better
df["overall_rank"] = df[rank_columns].mean(axis=1)
```

---

## 6. Technical Decisions

### 6.1 Why Two Models?

| Decision | Rationale |
|----------|-----------|
| **Random Forest** | Production-ready baseline. No GPU required, fast inference, interpretable feature importance. Suitable for Portfolio Hosting (Hugging Face Spaces CPU-only tier). |
| **TensorFlow** | Demonstrates deep learning proficiency. Better for unstructured text and large datasets. Showcases modern NLP techniques (embeddings, attention). |
| **Dual Comparison** | Validates results through ensemble agreement. Highlights trade-offs (speed vs complexity, interpretability vs accuracy). |

### 6.2 Key Hyperparameters

**Random Forest** (`ml_model.py`):
```python
RandomForestRegressor(
    n_estimators=100,      # Sufficient for stable predictions
    random_state=42,       # Reproducibility
    n_jobs=-1              # Use all CPU cores
)
```

**TensorFlow** (`dl_model.py`):
```python
model.compile(
    optimizer="adam",      # Adaptive learning rate
    loss="mse",            # Mean squared error for regression
    metrics=["mae"]        # Track MAE during training
)
# Training config
epochs=15                  # Balanced convergence vs overfitting
batch_size=32              # Standard mini-batch size
dropout=[0.3, 0.2]         # Regularization to prevent overfitting
```

### 6.3 Data Integrity Constraints

Following **CLAUDE.md Directive #3**:

- **No Magic Numbers**: All hyperparameters use named constants
- **Fail Fast**: Validate required columns before preprocessing
- **Immutable Transforms**: `df.copy()` prevents modifying original data
- **Explicit NaN Handling**: Fill text with empty strings, drop missing targets

---

## 7. Future Evolution

Current implementation: **Phase 1 - Foundation**

See [roadmap.md](./roadmap.md) for planned enhancements:

- **Phase 2**: Deploy to Hugging Face Spaces with REST API endpoint
- **Phase 3**: Add hyperparameter tuning (GridSearchCV, Bayesian Optimization)
- **Phase 4**: Implement model versioning and A/B testing framework
- **Phase 5**: Integrate with live job market data (LinkedIn API, Indeed scraping)

---

## 8. Related Files

### Backend Implementation
- [`backend/ml_model.py`](/backend/ml_model.py) - Random Forest pipeline with TF-IDF
- [`backend/dl_model.py`](/backend/dl_model.py) - TensorFlow neural network
- [`backend/data_preprocessing.py`](/backend/data_preprocessing.py) - Seniority extraction and feature engineering
- [`backend/evaluation.py`](/backend/evaluation.py) - Metrics calculation and visualization
- [`backend/main.py`](/backend/main.py) - Pipeline orchestrator and CLI interface
- [`backend/requirements.txt`](/backend/requirements.txt) - Python dependencies

### System Design Documentation
- [roadmap.md](./roadmap.md) - Future phases and model improvements
- [api.md](./api.md) - API endpoints and integration patterns
- [architecture.md](./architecture.md) - Overall system architecture

### Usage
```bash
cd backend

# Train with sample data
python main.py

# Train with custom CSV
python main.py --data-path data.csv

# Skip plots (headless environments)
python main.py --no-plots
```

---

**Last Updated**: 2026-01-26
**Maintainer**: Thomas To
**Status**: Production-ready (Phase 1 complete)
