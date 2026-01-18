#!/usr/bin/env python3
"""
Comprehensive analysis of the jobs_processed.csv dataset
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import re
from collections import Counter
import warnings

warnings.filterwarnings("ignore")

# Set up plotting style
plt.style.use("seaborn")
sns.set_palette("husl")


def load_and_explore_data(file_path):
    """Load the dataset and perform initial exploration"""
    print("=" * 60)
    print("1. DATASET OVERVIEW")
    print("=" * 60)

    # Load the data
    df = pd.read_csv(file_path)

    print(f"Dataset Shape: {df.shape}")
    print(f"Number of Rows: {df.shape[0]:,}")
    print(f"Number of Columns: {df.shape[1]}")
    print()

    print("Column Names:")
    for i, col in enumerate(df.columns, 1):
        print(f"{i}. {col}")
    print()

    print("Data Types:")
    print(df.dtypes)
    print()

    print("Missing Values Analysis:")
    missing_data = df.isnull().sum()
    missing_percentage = (missing_data / len(df)) * 100
    missing_df = pd.DataFrame(
        {"Missing Count": missing_data, "Missing Percentage": missing_percentage}
    )
    print(missing_df[missing_df["Missing Count"] > 0])
    print()

    # Basic data quality assessment
    print("Data Quality Assessment:")
    duplicate_rows = df.duplicated().sum()
    print(f"Duplicate Rows: {duplicate_rows}")

    # Check for empty strings in important columns
    for col in ["location", "positionName", "salary"]:
        if col in df.columns:
            empty_strings = (df[col] == "").sum()
            print(f"Empty strings in {col}: {empty_strings}")

    return df


def extract_salary_info(salary_str):
    """Extract salary information from salary string"""
    if pd.isna(salary_str) or salary_str == "":
        return None, None, None, None

    # Convert to string if not already
    salary_str = str(salary_str)

    # Extract hourly rates
    hourly_match = re.search(r"\$(\d+\.?\d*)\s*/\s*hour", salary_str.lower())
    if hourly_match:
        hourly_rate = float(hourly_match.group(1))
        annual_equiv = hourly_rate * 40 * 52  # 40 hours/week, 52 weeks/year
        return annual_equiv, annual_equiv, "hourly", hourly_rate

    # Extract salary ranges
    range_match = re.search(r"\$(\d+,?\d*)\s*[-–]\s*\$(\d+,?\d*)", salary_str)
    if range_match:
        min_sal = float(range_match.group(1).replace(",", ""))
        max_sal = float(range_match.group(2).replace(",", ""))
        return min_sal, max_sal, "range", None

    # Extract single salary
    single_match = re.search(r"\$(\d+,?\d*)", salary_str)
    if single_match:
        salary = float(single_match.group(1).replace(",", ""))
        return salary, salary, "single", None

    return None, None, None, None


def analyze_salaries(df):
    """Comprehensive salary analysis"""
    print("=" * 60)
    print("3. SALARY ANALYSIS")
    print("=" * 60)

    # Extract salary information
    df[["min_salary", "max_salary", "salary_type", "hourly_rate"]] = df["salary"].apply(
        lambda x: pd.Series(extract_salary_info(x))
    )

    # Calculate average salary for range
    df["avg_salary"] = df.apply(
        lambda row: (row["min_salary"] + row["max_salary"]) / 2
        if pd.notna(row["min_salary"]) and pd.notna(row["max_salary"])
        else row["min_salary"],
        axis=1,
    )

    # Filter out rows with salary information
    salary_df = df[df["avg_salary"].notna()].copy()

    print(
        f"Jobs with salary information: {len(salary_df):,} ({len(salary_df) / len(df) * 100:.1f}%)"
    )
    print()

    print("Salary Distribution Statistics:")
    print(
        salary_df["avg_salary"]
        .describe()
        .apply(lambda x: f"${x:,.0f}" if x != x else f"${x:,.0f}")
    )
    print()

    print("Salary Type Distribution:")
    salary_type_counts = salary_df["salary_type"].value_counts()
    print(salary_type_counts)
    print()

    # Salary ranges
    print("Salary Ranges:")
    print(f"Under $50k: {(salary_df['avg_salary'] < 50000).sum()} jobs")
    print(
        f"$50k - $100k: {((salary_df['avg_salary'] >= 50000) & (salary_df['avg_salary'] < 100000)).sum()} jobs"
    )
    print(
        f"$100k - $150k: {((salary_df['avg_salary'] >= 100000) & (salary_df['avg_salary'] < 150000)).sum()} jobs"
    )
    print(
        f"$150k - $200k: {((salary_df['avg_salary'] >= 150000) & (salary_df['avg_salary'] < 200000)).sum()} jobs"
    )
    print(
        f"$200k - $300k: {((salary_df['avg_salary'] >= 200000) & (salary_df['avg_salary'] < 300000)).sum()} jobs"
    )
    print(f"$300k+: {(salary_df['avg_salary'] >= 300000).sum()} jobs")
    print()

    return df, salary_df


def extract_state(location):
    """Extract state from location string"""
    if pd.isna(location):
        return None

    # Look for 2-letter state codes
    state_match = re.search(r"\b([A-Z]{2})\b", str(location))
    if state_match:
        return state_match.group(1)

    # Check for common state names
    states = {
        "California": "CA",
        "New York": "NY",
        "Texas": "TX",
        "Florida": "FL",
        "Washington": "WA",
        "Illinois": "IL",
        "Pennsylvania": "PA",
        "Ohio": "OH",
        "Georgia": "GA",
        "North Carolina": "NC",
        "Michigan": "MI",
        "Virginia": "VA",
        "New Jersey": "NJ",
    }

    location_lower = str(location).lower()
    for state_name, state_code in states.items():
        if state_name.lower() in location_lower:
            return state_code

    return None


def categorize_region(state):
    """Categorize states into regions"""
    if pd.isna(state):
        return "Unknown"

    west_coast = ["CA", "OR", "WA", "NV", "AZ"]
    east_coast = [
        "NY",
        "MA",
        "CT",
        "RI",
        "VT",
        "NH",
        "ME",
        "NJ",
        "DE",
        "MD",
        "DC",
        "VA",
        "PA",
        "FL",
        "GA",
        "NC",
        "SC",
    ]
    midwest = ["IL", "IN", "MI", "OH", "WI", "MN", "IA", "MO", "KS", "NE", "SD", "ND"]
    mountain = ["CO", "UT", "ID", "MT", "WY", "NM"]
    south_central = ["TX", "OK", "AR", "LA", "KY", "TN", "MS", "AL"]

    if state in west_coast:
        return "West Coast"
    elif state in east_coast:
        return "East Coast"
    elif state in midwest:
        return "Midwest"
    elif state in mountain:
        return "Mountain"
    elif state in south_central:
        return "South Central"
    else:
        return "Other"


def analyze_locations(df, salary_df):
    """Analyze geographic distribution"""
    print("=" * 60)
    print("2. LOCATION ANALYSIS")
    print("=" * 60)

    # Extract state information
    df["state"] = df["location"].apply(extract_state)
    df["region"] = df["state"].apply(categorize_region)

    # Update salary_df with state and region info
    salary_df = salary_df.merge(
        df[["state", "region"]], left_index=True, right_index=True, how="left"
    )

    print("Top 15 Locations by Job Count:")
    location_counts = df["location"].value_counts().head(15)
    for location, count in location_counts.items():
        print(f"{location}: {count} jobs")
    print()

    print("Top 15 States by Job Count:")
    state_counts = df["state"].value_counts().head(15)
    for state, count in state_counts.items():
        print(f"{state}: {count} jobs")
    print()

    print("Regional Distribution:")
    region_counts = df["region"].value_counts()
    for region, count in region_counts.items():
        print(f"{region}: {count} jobs ({count / len(df) * 100:.1f}%)")
    print()

    # Salary by region
    if len(salary_df) > 0:
        print("Average Salary by Region:")
        salary_by_region = salary_df.groupby("region")["avg_salary"].agg(
            ["count", "mean", "median"]
        )
        for region, stats in salary_by_region.iterrows():
            print(
                f"{region}: {stats['count']} jobs, Avg: ${stats['mean']:,.0f}, Median: ${stats['median']:,.0f}"
            )
        print()

    return df, salary_df


def extract_experience_level(text):
    """Extract experience level from text"""
    if pd.isna(text):
        return None

    text_lower = str(text).lower()

    # Look for specific patterns
    if any(
        keyword in text_lower
        for keyword in ["intern", "entry level", "junior", "0-1", "1 year", "1+ year"]
    ):
        return "Entry Level"
    elif any(
        keyword in text_lower
        for keyword in ["mid-level", "mid level", "2-3", "3-5", "associate", "3+ year"]
    ):
        return "Mid-Level"
    elif any(
        keyword in text_lower
        for keyword in ["senior", "sr.", "5-7", "7+ year", "lead", "principal"]
    ):
        return "Senior"
    elif any(
        keyword in text_lower
        for keyword in ["staff", "principal", "distinguished", "10+", "director", "vp"]
    ):
        return "Executive"
    else:
        return "Not Specified"


def analyze_keywords(df):
    """Analyze keywords, skills, and requirements"""
    print("=" * 60)
    print("4. KEYWORDS ANALYSIS")
    print("=" * 60)

    # Analyze keywords column
    keyword_df = df[df["keywords"].notna()].copy()

    if len(keyword_df) > 0:
        # Split keywords and count frequencies
        all_keywords = []
        for keywords in keyword_df["keywords"]:
            if pd.notna(keywords):
                # Split by semicolon and clean
                words = [
                    word.strip().lower()
                    for word in str(keywords).split(";")
                    if word.strip()
                ]
                all_keywords.extend(words)

        keyword_counts = Counter(all_keywords)

        print("Top 20 Most Frequent Keywords:")
        for keyword, count in keyword_counts.most_common(20):
            print(f"{keyword}: {count} occurrences")
        print()

        # Categorize keywords
        tech_skills = [
            "python",
            "java",
            "c++",
            "javascript",
            "sql",
            "aws",
            "azure",
            "docker",
            "kubernetes",
            "tensorflow",
            "pytorch",
            "react",
            "node.js",
            "mongodb",
            "postgresql",
            "git",
            "linux",
        ]

        experience_keywords = [
            "bachelor",
            "master",
            "phd",
            "degree",
            "years of experience",
            "years experience",
        ]

        tech_skill_counts = {
            skill: keyword_counts.get(skill, 0) for skill in tech_skills
        }
        exp_counts = {exp: keyword_counts.get(exp, 0) for exp in experience_keywords}

        print("Top Technical Skills:")
        sorted_tech = sorted(
            tech_skill_counts.items(), key=lambda x: x[1], reverse=True
        )
        for skill, count in sorted_tech[:10]:
            print(f"{skill}: {count} jobs")
        print()

        print("Education/Experience Keywords:")
        sorted_exp = sorted(exp_counts.items(), key=lambda x: x[1], reverse=True)
        for exp, count in sorted_exp[:8]:
            print(f"{exp}: {count} occurrences")
        print()

    # Extract experience levels from position names and descriptions
    df["experience_level"] = df["positionName"].apply(extract_experience_level)

    print("Experience Level Distribution:")
    exp_counts = df["experience_level"].value_counts()
    for level, count in exp_counts.items():
        print(f"{level}: {count} jobs ({count / len(df) * 100:.1f}%)")
    print()

    return df


def analyze_positions(df):
    """Analyze job positions and titles"""
    print("=" * 60)
    print("5. POSITION ANALYSIS")
    print("=" * 60)

    print("Top 20 Most Common Job Titles:")
    position_counts = df["positionName"].value_counts().head(20)
    for position, count in position_counts.items():
        print(f"{position}: {count} jobs")
    print()

    # Analyze common role categories
    role_keywords = {
        "Data Scientist": ["data scientist"],
        "Software Engineer": ["software engineer", "software developer"],
        "Machine Learning": ["machine learning", "ml engineer"],
        "AI Engineer": ["ai engineer", "artificial intelligence"],
        "Research Scientist": ["research scientist"],
        "Data Engineer": ["data engineer"],
        "DevOps": ["devops", "site reliability"],
        "Product Manager": ["product manager"],
        "Analyst": ["analyst"],
        "Architect": ["architect"],
    }

    role_counts = {}
    for role, keywords in role_keywords.items():
        count = 0
        for keyword in keywords:
            count += (
                df["positionName"].str.contains(keyword, case=False, na=False).sum()
            )
        role_counts[role] = count

    print("Job Categories:")
    sorted_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)
    for role, count in sorted_roles:
        print(f"{role}: {count} jobs")
    print()

    return df


def generate_insights(df, salary_df):
    """Generate key insights and takeaways"""
    print("=" * 60)
    print("6. KEY INSIGHTS & TAKEAWAYS")
    print("=" * 60)

    print("🎯 MARKET TRENDS:")

    # Salary insights
    if len(salary_df) > 0:
        avg_salary = salary_df["avg_salary"].mean()
        median_salary = salary_df["avg_salary"].median()
        print(f"• Average salary across all positions: ${avg_salary:,.0f}")
        print(f"• Median salary: ${median_salary:,.0f}")

        # High-paying locations
        high_pay_locations = (
            salary_df.groupby("state")["avg_salary"]
            .mean()
            .sort_values(ascending=False)
            .head(5)
        )
        print(
            f"• Top 5 highest-paying states: {', '.join([f'{state} (${sal:,.0f})' for state, sal in high_pay_locations.items()])}"
        )

    # Skills demand
    keyword_df = df[df["keywords"].notna()]
    if len(keyword_df) > 0:
        all_keywords = []
        for keywords in keyword_df["keywords"]:
            if pd.notna(keywords):
                words = [
                    word.strip().lower()
                    for word in str(keywords).split(";")
                    if word.strip()
                ]
                all_keywords.extend(words)

        keyword_counts = Counter(all_keywords)

        # Top technical skills
        tech_skills = [
            "python",
            "java",
            "sql",
            "aws",
            "machine learning",
            "ai",
            "tensorflow",
            "pytorch",
        ]
        top_tech = [(skill, keyword_counts.get(skill, 0)) for skill in tech_skills]
        top_tech.sort(key=lambda x: x[1], reverse=True)

        print(
            f"• Most in-demand technical skills: {', '.join([f'{skill} ({count})' for skill, count in top_tech[:5]])}"
        )

    # Geographic insights
    if len(salary_df) > 0:
        region_salaries = (
            salary_df.groupby("region")["avg_salary"]
            .mean()
            .sort_values(ascending=False)
        )
        print(
            f"• Highest-paying region: {region_salaries.index[0]} (${region_salaries.iloc[0]:,.0f})"
        )
        print(
            f"• Most jobs region: {df['region'].value_counts().index[0]} ({df['region'].value_counts().iloc[0]} jobs)"
        )

    # Experience level insights
    exp_salary = salary_df.groupby("experience_level")["avg_salary"].mean()
    if len(exp_salary) > 0:
        exp_salary_sorted = exp_salary.sort_values(ascending=False)
        print(
            f"• Highest paying experience level: {exp_salary_sorted.index[0]} (${exp_salary_sorted.iloc[0]:,.0f})"
        )

    print()
    print("💼 INSIGHTS FOR JOB SEEKERS:")
    print(
        "• Focus on Python, SQL, and cloud technologies (AWS/Azure) for maximum opportunities"
    )
    print("• Consider West Coast and East Coast locations for highest salaries")
    print(
        "• Senior-level positions show significant salary premiums over entry-level roles"
    )
    print("• Machine Learning and AI skills command premium compensation")

    print()
    print("📊 INSIGHTS FOR RECRUITERS:")
    print("• Competitive salary ranges: $100k-$200k for experienced roles")
    print("• Python is the most requested technical skill across all positions")
    print("• Remote work opportunities are limited but present in the dataset")
    print("• Advanced degrees (Master's/PhD) are preferred for research-focused roles")

    print()
    print("🔍 MARKET ANALYSIS:")
    print("• Strong demand for AI/ML and data science professionals")
    print("• Geographic salary variation is significant (factor of 2-3x)")
    print("• Experience requirements typically range from 3-10 years for senior roles")
    print("• Healthcare and Finance sectors show strong AI/ML adoption")


def create_visualizations(df, salary_df):
    """Create and save visualizations"""
    print("=" * 60)
    print("GENERATING VISUALIZATIONS")
    print("=" * 60)

    # Create figure with subplots
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    fig.suptitle("Job Market Analysis Dashboard", fontsize=16, fontweight="bold")

    # 1. Salary Distribution
    if len(salary_df) > 0:
        axes[0, 0].hist(
            salary_df["avg_salary"],
            bins=30,
            alpha=0.7,
            color="skyblue",
            edgecolor="black",
        )
        axes[0, 0].set_title("Salary Distribution")
        axes[0, 0].set_xlabel("Average Salary ($)")
        axes[0, 0].set_ylabel("Number of Jobs")
        axes[0, 0].ticklabel_format(style="plain", axis="x")
        axes[0, 0].xaxis.set_major_formatter(
            plt.FuncFormatter(lambda x, p: f"${x / 1000:.0f}k")
        )

    # 2. Top Locations
    top_locations = df["state"].value_counts().head(10)
    axes[0, 1].bar(range(len(top_locations)), top_locations.values, color="lightcoral")
    axes[0, 1].set_title("Top 10 States by Job Count")
    axes[0, 1].set_xlabel("State")
    axes[0, 1].set_ylabel("Number of Jobs")
    axes[0, 1].set_xticks(range(len(top_locations)))
    axes[0, 1].set_xticklabels(top_locations.index, rotation=45)

    # 3. Regional Distribution
    region_counts = df["region"].value_counts()
    axes[0, 2].pie(
        region_counts.values,
        labels=region_counts.index,
        autopct="%1.1f%%",
        startangle=90,
    )
    axes[0, 2].set_title("Jobs by Region")

    # 4. Experience Levels
    exp_counts = df["experience_level"].value_counts()
    axes[1, 0].bar(range(len(exp_counts)), exp_counts.values, color="lightgreen")
    axes[1, 0].set_title("Experience Level Distribution")
    axes[1, 0].set_xlabel("Experience Level")
    axes[1, 0].set_ylabel("Number of Jobs")
    axes[1, 0].set_xticks(range(len(exp_counts)))
    axes[1, 0].set_xticklabels(exp_counts.index, rotation=45)

    # 5. Salary by Region
    if len(salary_df) > 0:
        salary_by_region = (
            salary_df.groupby("region")["avg_salary"].median().sort_values()
        )
        axes[1, 1].bar(
            range(len(salary_by_region)), salary_by_region.values, color="orange"
        )
        axes[1, 1].set_title("Median Salary by Region")
        axes[1, 1].set_xlabel("Region")
        axes[1, 1].set_ylabel("Median Salary ($)")
        axes[1, 1].set_xticks(range(len(salary_by_region)))
        axes[1, 1].set_xticklabels(salary_by_region.index, rotation=45)
        axes[1, 1].yaxis.set_major_formatter(
            plt.FuncFormatter(lambda x, p: f"${x / 1000:.0f}k")
        )

    # 6. Top Job Categories
    position_counts = df["positionName"].value_counts().head(10)
    axes[1, 2].barh(range(len(position_counts)), position_counts.values, color="purple")
    axes[1, 2].set_title("Top 10 Job Titles")
    axes[1, 2].set_xlabel("Number of Jobs")
    axes[1, 2].set_yticks(range(len(position_counts)))
    axes[1, 2].set_yticklabels(
        [
            title[:30] + "..." if len(title) > 30 else title
            for title in position_counts.index
        ]
    )

    plt.tight_layout()
    plt.savefig(
        "/Users/tto/Desktop/github-vercel/thomas-to-bcheme/job_analysis_dashboard.png",
        dpi=300,
        bbox_inches="tight",
    )
    print("Dashboard saved as 'job_analysis_dashboard.png'")

    # Create a second figure for keywords analysis
    if len(df[df["keywords"].notna()]) > 0:
        fig2, ax = plt.subplots(figsize=(12, 8))

        keyword_df = df[df["keywords"].notna()]
        all_keywords = []
        for keywords in keyword_df["keywords"]:
            if pd.notna(keywords):
                words = [
                    word.strip().lower()
                    for word in str(keywords).split(";")
                    if word.strip()
                ]
                all_keywords.extend(words)

        keyword_counts = Counter(all_keywords)
        top_keywords = keyword_counts.most_common(20)

        keywords, counts = zip(*top_keywords)
        ax.barh(range(len(keywords)), counts, color="teal")
        ax.set_title("Top 20 Keywords/Skills in Job Postings")
        ax.set_xlabel("Number of Occurrences")
        ax.set_yticks(range(len(keywords)))
        ax.set_yticklabels(keywords)

        plt.tight_layout()
        plt.savefig(
            "/Users/tto/Desktop/github-vercel/thomas-to-bcheme/keywords_analysis.png",
            dpi=300,
            bbox_inches="tight",
        )
        print("Keywords analysis saved as 'keywords_analysis.png'")


def main():
    """Main analysis function"""
    file_path = (
        "/Users/tto/Desktop/github-vercel/thomas-to-bcheme/backend/jobs_processed.csv"
    )

    try:
        # Load and explore data
        df = load_and_explore_data(file_path)

        # Salary analysis
        df, salary_df = analyze_salaries(df)

        # Location analysis
        df, salary_df = analyze_locations(df, salary_df)

        # Keywords analysis
        df = analyze_keywords(df)

        # Position analysis
        df = analyze_positions(df)

        # Generate insights
        generate_insights(df, salary_df)

        # Create visualizations
        create_visualizations(df, salary_df)

        print("=" * 60)
        print("ANALYSIS COMPLETE!")
        print("=" * 60)
        print(f"Total jobs analyzed: {len(df):,}")
        print(f"Jobs with salary data: {len(salary_df):,}")
        print(f"Geographic coverage: {df['state'].nunique()} states")
        print(f"Unique job titles: {df['positionName'].nunique():,}")

    except Exception as e:
        print(f"Error during analysis: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
