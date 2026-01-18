import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Tuple, Any


class ModelEvaluator:
    """Class for evaluating and comparing model performance."""

    @staticmethod
    def calculate_metrics(y_true, y_pred) -> Dict[str, float]:
        """Calculate comprehensive evaluation metrics."""
        metrics = {
            "MAE": mean_absolute_error(y_true, y_pred),
            "RMSE": np.sqrt(mean_squared_error(y_true, y_pred)),
            "R2": r2_score(y_true, y_pred),
            "MAPE": np.mean(np.abs((y_true - y_pred) / y_true)) * 100,
        }
        return metrics

    @staticmethod
    def print_metrics(metrics: Dict[str, float], model_name: str = "Model"):
        """Print formatted metrics."""
        print(f"\n{model_name} Performance:")
        print("-" * 40)
        print(f"Mean Absolute Error (MAE): ${metrics['MAE']:,.2f}")
        print(f"Root Mean Squared Error (RMSE): ${metrics['RMSE']:,.2f}")
        print(f"R-squared (R²): {metrics['R2']:.4f}")
        print(f"Mean Absolute Percentage Error (MAPE): {metrics['MAPE']:.2f}%")
        print("-" * 40)

    @staticmethod
    def plot_predictions(
        y_true, y_pred, model_name: str = "Model", save_path: str = None
    ):
        """Plot actual vs predicted values."""
        plt.figure(figsize=(10, 6))

        # Scatter plot
        plt.scatter(y_true, y_pred, alpha=0.6, s=30)

        # Perfect prediction line
        min_val = min(y_true.min(), y_pred.min())
        max_val = max(y_true.max(), y_pred.max())
        plt.plot(
            [min_val, max_val],
            [min_val, max_val],
            "r--",
            lw=2,
            label="Perfect Prediction",
        )

        plt.xlabel("Actual Salary ($)")
        plt.ylabel("Predicted Salary ($)")
        plt.title(f"{model_name}: Actual vs Predicted Salary")
        plt.legend()
        plt.grid(True, alpha=0.3)

        # Format axis to show currency
        plt.gca().xaxis.set_major_formatter(
            plt.FuncFormatter(lambda x, p: f"${x:,.0f}")
        )
        plt.gca().yaxis.set_major_formatter(
            plt.FuncFormatter(lambda x, p: f"${x:,.0f}")
        )

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches="tight")

        plt.show()

    @staticmethod
    def plot_residuals(
        y_true, y_pred, model_name: str = "Model", save_path: str = None
    ):
        """Plot residual analysis."""
        residuals = y_true - y_pred

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))

        # Residual vs Predicted
        ax1.scatter(y_pred, residuals, alpha=0.6, s=30)
        ax1.axhline(y=0, color="r", linestyle="--")
        ax1.set_xlabel("Predicted Salary ($)")
        ax1.set_ylabel("Residuals ($)")
        ax1.set_title(f"{model_name}: Residuals vs Predicted")
        ax1.grid(True, alpha=0.3)

        # Histogram of residuals
        ax2.hist(residuals, bins=30, alpha=0.7, edgecolor="black")
        ax2.set_xlabel("Residuals ($)")
        ax2.set_ylabel("Frequency")
        ax2.set_title(f"{model_name}: Residual Distribution")
        ax2.grid(True, alpha=0.3)

        # Format currency
        ax1.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"${x:,.0f}"))
        ax2.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"${x:,.0f}"))

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches="tight")

        plt.show()

    @staticmethod
    def compare_models(
        models_results: Dict[str, Dict[str, Any]], save_path: str = None
    ):
        """Compare multiple models and create comparison plots."""
        # Extract metrics for comparison
        model_names = list(models_results.keys())
        metrics = ["MAE", "RMSE", "R2", "MAPE"]

        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        axes = axes.flatten()

        for i, metric in enumerate(metrics):
            values = [models_results[model][metric] for model in model_names]

            # Create bar plot
            bars = axes[i].bar(model_names, values, alpha=0.7)

            # Add value labels on bars
            for bar, value in zip(bars, values):
                height = bar.get_height()
                if metric == "R2":
                    label = f"{value:.3f}"
                elif metric == "MAPE":
                    label = f"{value:.1f}%"
                else:
                    label = f"${value:,.0f}"

                axes[i].text(
                    bar.get_x() + bar.get_width() / 2.0,
                    height,
                    label,
                    ha="center",
                    va="bottom",
                )

            axes[i].set_title(f"{metric} Comparison")
            axes[i].set_ylabel(metric)
            axes[i].grid(True, alpha=0.3)

            # Rotate x labels if needed
            if len(model_names) > 3:
                axes[i].tick_params(axis="x", rotation=45)

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches="tight")

        plt.show()

    @staticmethod
    def create_comparison_table(
        models_results: Dict[str, Dict[str, float]],
    ) -> pd.DataFrame:
        """Create a comparison table of model performance."""
        df = pd.DataFrame(models_results).T

        # Add ranking for each metric
        for metric in ["MAE", "RMSE", "MAPE"]:  # Lower is better
            df[f"{metric}_rank"] = df[metric].rank(method="min")

        df["R2_rank"] = df["R2"].rank(method="min", ascending=False)  # Higher is better

        # Calculate overall rank
        rank_columns = [f"{metric}_rank" for metric in ["MAE", "RMSE", "R2", "MAPE"]]
        df["overall_rank"] = df[rank_columns].mean(axis=1)

        # Sort by overall rank
        df = df.sort_values("overall_rank")

        return df


def evaluate_model_performance(y_true, y_pred, model_name: str = "Model"):
    """Convenience function to evaluate a single model."""
    evaluator = ModelEvaluator()

    # Calculate metrics
    metrics = evaluator.calculate_metrics(y_true, y_pred)

    # Print metrics
    evaluator.print_metrics(metrics, model_name)

    # Create plots
    evaluator.plot_predictions(y_true, y_pred, model_name)
    evaluator.plot_residuals(y_true, y_pred, model_name)

    return metrics


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)

    # Create sample data
    n_samples = 1000
    y_true = np.random.normal(80000, 25000, n_samples)
    y_pred = y_true + np.random.normal(0, 10000, n_samples)  # Add some noise

    # Evaluate
    metrics = evaluate_model_performance(y_true, y_pred, "Sample Model")

    print(f"\nSample metrics: {metrics}")
