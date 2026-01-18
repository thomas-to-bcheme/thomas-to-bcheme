import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score
from data_preprocessing import preprocess_data, create_sample_data


class SalaryPredictionML:
    """Machine Learning model for salary prediction using Scikit-Learn."""

    def __init__(self):
        self.pipeline = None
        self.is_trained = False

    def build_pipeline(self):
        """Build the Scikit-Learn pipeline with TF-IDF and Random Forest."""
        # Define preprocessing for different column types
        preprocessor = ColumnTransformer(
            transformers=[
                # TF-IDF for keywords text
                (
                    "keywords_tfidf",
                    TfidfVectorizer(max_features=1000, stop_words="english"),
                    "keywords",
                ),
                # One-hot encoding for seniority
                (
                    "seniority_onehot",
                    OneHotEncoder(handle_unknown="ignore"),
                    ["seniority"],
                ),
                # TF-IDF for position name (optional, can help capture role-specific info)
                (
                    "position_tfidf",
                    TfidfVectorizer(max_features=500, stop_words="english"),
                    "positionName",
                ),
            ],
            remainder="drop",  # Drop other columns not specified
        )

        # Create the full pipeline
        self.pipeline = Pipeline(
            [
                ("preprocessor", preprocessor),
                (
                    "regressor",
                    RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
                ),
            ]
        )

    def train(self, X_train, y_train):
        """Train the model."""
        if self.pipeline is None:
            self.build_pipeline()

        self.pipeline.fit(X_train, y_train)
        self.is_trained = True
        print("ML model trained successfully!")

    def predict(self, X):
        """Make predictions."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        return self.pipeline.predict(X)

    def evaluate(self, X_test, y_test):
        """Evaluate the model and return metrics."""
        if not self.is_trained:
            raise ValueError("Model must be trained before evaluation")

        y_pred = self.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print(f"ML Model Evaluation:")
        print(f"Mean Absolute Error: ${mae:,.2f}")
        print(f"R-squared: {r2:.4f}")

        return mae, r2

    def get_feature_importance(self):
        """Get feature importance from the trained Random Forest."""
        if not self.is_trained:
            raise ValueError("Model must be trained first")

        # Get the Random Forest regressor from pipeline
        rf = self.pipeline.named_steps["regressor"]

        # Get feature names from preprocessor
        preprocessor = self.pipeline.named_steps["preprocessor"]
        feature_names = []

        # TF-IDF keywords features
        keywords_tfidf = preprocessor.named_transformers_["keywords_tfidf"]
        feature_names.extend(
            [f"keyword_{name}" for name in keywords_tfidf.get_feature_names_out()]
        )

        # One-hot seniority features
        seniority_onehot = preprocessor.named_transformers_["seniority_onehot"]
        feature_names.extend(
            [f"seniority_{name}" for name in seniority_onehot.get_feature_names_out()]
        )

        # TF-IDF position features
        position_tfidf = preprocessor.named_transformers_["position_tfidf"]
        feature_names.extend(
            [f"position_{name}" for name in position_tfidf.get_feature_names_out()]
        )

        # Create importance dataframe
        importance_df = pd.DataFrame(
            {"feature": feature_names, "importance": rf.feature_importances_}
        ).sort_values("importance", ascending=False)

        return importance_df.head(10)  # Return top 10 features


def test_ml_model():
    """Test the ML model with sample data."""
    print("Testing ML Model...")

    # Create sample data
    df = create_sample_data(1000)
    features, target = preprocess_data(df)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42
    )

    # Create and train model
    model = SalaryPredictionML()
    model.train(X_train, y_train)

    # Evaluate model
    mae, r2 = model.evaluate(X_test, y_test)

    # Show feature importance
    print("\nTop 10 Important Features:")
    importance = model.get_feature_importance()
    print(importance)

    return model, mae, r2


if __name__ == "__main__":
    test_ml_model()
