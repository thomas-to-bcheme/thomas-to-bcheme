import pandas as pd
import numpy as np
import re
from typing import Tuple


def extract_seniority(title: str) -> str:
    """Extract seniority level from job title."""
    if pd.isna(title):
        return "Unknown"

    title = str(title).lower()

    seniority_patterns = {
        "Junior": ["junior", "jr", "entry", "trainee", "intern"],
        "Mid": ["mid", "associate", "intermediate"],
        "Senior": ["senior", "sr", "lead", "principal", "head"],
        "Executive": [
            "director",
            "vp",
            "vice president",
            "c-level",
            "ceo",
            "cto",
            "cfo",
        ],
    }

    for level, patterns in seniority_patterns.items():
        for pattern in patterns:
            if pattern in title:
                return level

    return "Unknown"


def preprocess_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Preprocess the job dataset.

    Args:
        df: Input dataframe with columns: positionName, description, keywords, salary

    Returns:
        Tuple of (features_df, target_series)
    """
    # Make a copy to avoid modifying original
    df = df.copy()

    # Drop rows with missing salary
    df = df.dropna(subset=["salary"])

    # Extract seniority feature
    df["seniority"] = df["positionName"].apply(extract_seniority)

    # Fill missing text data with empty strings
    text_columns = ["description", "keywords"]
    for col in text_columns:
        df[col] = df[col].fillna("")

    # Create features dataframe
    features = df[["positionName", "description", "keywords", "seniority"]]
    target = df["salary"]

    return features, target


def create_sample_data(n_samples: int = 1000) -> pd.DataFrame:
    """Create sample job data for testing."""
    np.random.seed(42)

    positions = [
        "Software Engineer",
        "Senior Software Engineer",
        "Junior Developer",
        "Data Scientist",
        "Senior Data Scientist",
        "Product Manager",
        "Senior Product Manager",
        "UX Designer",
        "Senior UX Designer",
        "DevOps Engineer",
        "Senior DevOps Engineer",
        "Backend Developer",
    ]

    descriptions = [
        "Develop and maintain software applications",
        "Build machine learning models and analyze data",
        "Manage product development and roadmap",
        "Design user interfaces and experiences",
        "Deploy and monitor infrastructure",
    ]

    keywords = [
        "python, java, javascript, react, node.js",
        "machine learning, python, pandas, numpy, tensorflow",
        "product management, agile, scrum, roadmap",
        "ui, ux, figma, design thinking, prototyping",
        "docker, kubernetes, aws, cloud, devops",
    ]

    # Generate sample data
    data = {
        "positionName": np.random.choice(positions, n_samples),
        "description": np.random.choice(descriptions, n_samples),
        "keywords": np.random.choice(keywords, n_samples),
        "salary": np.random.normal(80000, 25000, n_samples).clip(30000, 200000),
    }

    return pd.DataFrame(data)


if __name__ == "__main__":
    # Test preprocessing with sample data
    df = create_sample_data(100)
    features, target = preprocess_data(df)

    print(f"Original data shape: {df.shape}")
    print(f"Features shape: {features.shape}")
    print(f"Target shape: {target.shape}")
    print(f"\nSeniority distribution:")
    print(features["seniority"].value_counts())
    print(f"\nSalary statistics:")
    print(target.describe())
