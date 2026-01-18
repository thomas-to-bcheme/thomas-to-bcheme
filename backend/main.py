#!/usr/bin/env python3
"""
Salary Prediction Models - Main Script

This script builds and compares two salary prediction models:
1. Machine Learning Model: Scikit-Learn pipeline with TF-IDF and Random Forest
2. Deep Learning Model: Keras/TensorFlow with TextVectorization and Embeddings

Usage:
    python main.py [--sample-data] [--data-path path/to/data.csv]
"""

import argparse
import sys
import time
import warnings
from pathlib import Path

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

# Import our modules
import pandas as pd
from data_preprocessing import preprocess_data, create_sample_data
from ml_model import SalaryPredictionML
from dl_model import SalaryPredictionDL
from evaluation import ModelEvaluator


def load_data(data_path: str = None, use_sample: bool = True):
    """Load job data from file or create sample data."""
    if use_sample or data_path is None:
        print("Creating sample dataset...")
        df = create_sample_data(n_samples=2000)
        print(f"Created sample dataset with {len(df)} records")
    else:
        print(f"Loading data from {data_path}...")
        try:
            df = pd.read_csv(data_path)
            print(f"Loaded dataset with {len(df)} records")
        except FileNotFoundError:
            print(f"Error: File {data_path} not found!")
            print("Using sample data instead...")
            df = create_sample_data(n_samples=2000)

    return df


def run_ml_pipeline(X_train, X_test, y_train, y_test):
    """Run the Machine Learning pipeline."""
    print("\n" + "=" * 60)
    print("MACHINE LEARNING MODEL")
    print("=" * 60)

    start_time = time.time()

    # Create and train model
    ml_model = SalaryPredictionML()
    ml_model.train(X_train, y_train)

    # Evaluate model
    mae, r2 = ml_model.evaluate(X_test, y_test)

    # Get predictions for detailed evaluation
    y_pred = ml_model.predict(X_test)

    # Calculate comprehensive metrics
    evaluator = ModelEvaluator()
    metrics = evaluator.calculate_metrics(y_test, y_pred)
    metrics["training_time"] = time.time() - start_time

    # Show feature importance
    print("\nTop 10 Important Features:")
    importance = ml_model.get_feature_importance()
    print(importance)

    return ml_model, metrics, y_pred


def run_dl_pipeline(X_train, X_test, y_train, y_test):
    """Run the Deep Learning pipeline."""
    print("\n" + "=" * 60)
    print("DEEP LEARNING MODEL")
    print("=" * 60)

    start_time = time.time()

    # Split training data for validation
    from sklearn.model_selection import train_test_split

    X_train_dl, X_val, y_train_dl, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42
    )

    # Create and train model
    dl_model = SalaryPredictionDL(
        max_tokens=5000, embedding_dim=64, sequence_length=100
    )

    history = dl_model.train(
        X_train_dl, y_train_dl, X_val, y_val, epochs=15, batch_size=32
    )

    # Evaluate model
    mae, r2 = dl_model.evaluate(X_test, y_test)

    # Get predictions for detailed evaluation
    y_pred = dl_model.predict(X_test)

    # Calculate comprehensive metrics
    evaluator = ModelEvaluator()
    metrics = evaluator.calculate_metrics(y_test, y_pred)
    metrics["training_time"] = time.time() - start_time

    return dl_model, metrics, y_pred, history


def compare_models(ml_results, dl_results, y_test, ml_pred, dl_pred):
    """Compare both models and create visualizations."""
    print("\n" + "=" * 60)
    print("MODEL COMPARISON")
    print("=" * 60)

    # Create results dictionary
    models_results = {"Machine Learning": ml_results, "Deep Learning": dl_results}

    # Create comparison table
    evaluator = ModelEvaluator()
    comparison_df = evaluator.create_comparison_table(models_results)
    print("\nModel Performance Comparison:")
    print(comparison_df.round(4))

    # Create comparison plots
    evaluator = ModelEvaluator()
    evaluator.compare_models(models_results)

    # Individual model plots
    evaluator.plot_predictions(y_test, ml_pred, "ML Model")
    evaluator.plot_residuals(y_test, ml_pred, "ML Model")

    evaluator.plot_predictions(y_test, dl_pred, "DL Model")
    evaluator.plot_residuals(y_test, dl_pred, "DL Model")

    return comparison_df


def main():
    """Main function to run both models and compare results."""
    parser = argparse.ArgumentParser(description="Salary Prediction Models")
    parser.add_argument("--data-path", type=str, help="Path to CSV data file")
    parser.add_argument(
        "--sample-data",
        action="store_true",
        default=True,
        help="Use sample data (default: True)",
    )
    parser.add_argument(
        "--no-plots",
        action="store_true",
        help="Skip plotting (useful for headless environments)",
    )

    args = parser.parse_args()

    print("Salary Prediction Models")
    print("=" * 60)
    print("Building and comparing ML and DL models for salary prediction...")

    # Load data
    df = load_data(args.data_path, args.sample_data)

    # Preprocess data
    print("\nPreprocessing data...")
    features, target = preprocess_data(df)
    print(f"Features shape: {features.shape}")
    print(f"Target shape: {target.shape}")

    # Split data
    from sklearn.model_selection import train_test_split

    X_train, X_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42
    )

    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    # Run ML pipeline
    ml_model, ml_results, ml_pred = run_ml_pipeline(X_train, X_test, y_train, y_test)

    # Run DL pipeline
    dl_model, dl_results, dl_pred, dl_history = run_dl_pipeline(
        X_train, X_test, y_train, y_test
    )

    # Compare models
    if not args.no_plots:
        comparison_df = compare_models(ml_results, dl_results, y_test, ml_pred, dl_pred)
    else:
        # Simple text comparison without plots
        print("\nModel Performance Comparison:")
        print(f"{'Metric':<15} {'ML Model':<15} {'DL Model':<15}")
        print("-" * 45)
        for metric in ["MAE", "RMSE", "R2", "MAPE"]:
            ml_val = ml_results[metric]
            dl_val = dl_results[metric]
            if metric in ["MAE", "RMSE"]:
                print(f"{metric:<15} ${ml_val:,.0f}{'':<10} ${dl_val:,.0f}")
            elif metric == "R2":
                print(f"{metric:<15} {ml_val:.4f}{'':<10} {dl_val:.4f}")
            else:  # MAPE
                print(f"{metric:<15} {ml_val:.1f}%{'':<9} {dl_val:.1f}%")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print("Both models have been trained and evaluated successfully!")
    print(f"ML Model - MAE: ${ml_results['MAE']:,.2f}, R²: {ml_results['R2']:.4f}")
    print(f"DL Model - MAE: ${dl_results['MAE']:,.2f}, R²: {dl_results['R2']:.4f}")

    # Determine which model performed better
    if ml_results["MAE"] < dl_results["MAE"]:
        print("\nMachine Learning model performed better on MAE")
    else:
        print("\nDeep Learning model performed better on MAE")

    if ml_results["R2"] > dl_results["R2"]:
        print("Machine Learning model performed better on R²")
    else:
        print("Deep Learning model performed better on R²")

    print("\nModels are ready for prediction!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nScript interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
