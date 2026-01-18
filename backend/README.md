# Salary Prediction Models

This project implements and compares two salary prediction models for job descriptions:

## Models

### 1. Machine Learning Model (Scikit-Learn)
- **Features**: TF-IDF vectorization on keywords, One-hot encoding for seniority
- **Algorithm**: Random Forest Regressor
- **File**: `ml_model.py`

### 2. Deep Learning Model (Keras/TensorFlow)
- **Features**: TextVectorization layer, Embedding layer
- **Architecture**: TextVectorization → Embedding → GlobalAveragePooling1D → Dense layers
- **File**: `dl_model.py`

## Data Requirements

Input dataset should contain these columns:
- `positionName`: Job title
- `description`: Job description text
- `keywords`: Comma-separated keywords
- `salary`: Target salary value

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Run with sample data:
```bash
python main.py
```

### Run with your own data:
```bash
python main.py --data-path path/to/your/data.csv
```

### Run without plots (headless environments):
```bash
python main.py --no-plots
```

## Project Structure

```
backend/
├── main.py                 # Main script to run both models
├── data_preprocessing.py   # Data cleaning and feature engineering
├── ml_model.py            # Scikit-Learn Random Forest model
├── dl_model.py            # Keras/TensorFlow Deep Learning model
├── evaluation.py          # Model evaluation and comparison utilities
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

## Features

### Data Preprocessing
- Handles missing values by dropping rows with no salary
- Extracts seniority levels from job titles (Junior, Mid, Senior, Executive)
- Combines text features for better representation

### Model Evaluation
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- R-squared (R²)
- Mean Absolute Percentage Error (MAPE)
- Visual comparisons and residual analysis

### Feature Engineering
- **ML Model**: TF-IDF on keywords + position names, One-hot on seniority
- **DL Model**: TextVectorization on combined keywords + description

## Example Output

```
Machine Learning Model Evaluation:
Mean Absolute Error: $8,234.56
R-squared: 0.8234

Deep Learning Model Evaluation:
Mean Absolute Error: $7,892.34
R-squared: 0.8456

Model Performance Comparison:
               MAE      RMSE      R2    MAPE
Deep Learning   7892.34  11234.56  0.8456  9.8
Machine Learning 8234.56  11892.34  0.8234  10.2
```

## Customization

You can customize:
- Model hyperparameters in respective model files
- Feature engineering in `data_preprocessing.py`
- Evaluation metrics in `evaluation.py`
- Text preprocessing parameters (max_tokens, sequence_length, etc.)