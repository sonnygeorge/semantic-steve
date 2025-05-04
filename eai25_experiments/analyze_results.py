import os
from typing import Literal, TypeAlias

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.image import imread
from collections import Counter
import numpy as np


from constants import SCORE_MAP, DATA_DIR


Scores: TypeAlias = dict[str, dict[Literal["human_scores", "gpt_scores"], list[float]]]


def load_scores() -> Scores:
    annotations_df = pd.read_csv(os.path.join(DATA_DIR, "annotations.csv"))
    gpt_scores_df = pd.read_csv(os.path.join(DATA_DIR, "gpt_scores.csv"))
    screenshot_subjects = list(annotations_df.columns)[1:]  # 1st col = annatator_name
    scores = {}
    for subject in screenshot_subjects:
        human_scores = [SCORE_MAP[s.lower()] for s in annotations_df[subject]]
        gpt_scores = gpt_scores_df[subject].tolist()
        scores[subject] = {"human_scores": human_scores, "gpt_scores": gpt_scores}
    return scores


def summarize_scores(scores: Scores) -> pd.DataFrame:
    rows = []
    for subject, data in scores.items():
        mean_human = sum(data["human_scores"]) / len(data["human_scores"])
        mean_gpt_score = sum(data["gpt_scores"]) / len(data["gpt_scores"])
        rows.append(
            {
                "subject": subject,
                "abs_diff_of_means": abs(mean_gpt_score - mean_human),
                "human_scores": str(data["human_scores"]),
                "human_scores_mean": mean_human,
                "human_scores_std": np.std(data["human_scores"]),
                "gpt_scores": str(data["gpt_scores"]),
                "gpt_scores_mean": mean_gpt_score,
                "gpt_scores_std": np.std(data["gpt_scores"]),
            }
        )
    df = pd.DataFrame(rows)
    df = df.sort_values("abs_diff_of_means", ascending=False).reset_index(drop=True)
    pearson_corr, p_value = pearsonr(df["human_scores_mean"], df["gpt_scores_mean"])
    print(f"Pearson correlation: {pearson_corr:.2f}, p-value: {p_value:.2e}")
    return df


def plot_distributions(
    left_human_vals,
    left_gpt_vals,
    right_human_vals,
    right_gpt_vals,
    left_img_path,
    right_img_path,
    left_text,
    right_text,
):
    categories = [0, 0.25, 0.5, 0.75, 1]

    def calculate_percentages(data):
        counts = Counter(data)
        total = len(data)
        if total == 0:
            return [0] * len(categories)
        return [counts[cat] / total * 100 for cat in categories]

    def setup_axis(ax, percentages, is_left=False):
        # Create bars
        bars = ax.barh(
            range(len(categories)),
            percentages,
            height=1.0,
            edgecolor="black",
            color="skyblue" if is_left else "lightcoral",
            align="center",
        )

        # Set axis limits and remove ticks
        if is_left:
            ax.invert_xaxis()
            ax.set_xlim(140, 0)  # Inverted
        else:
            ax.set_xlim(0, 140)

        ax.set_ylim(-0.5, 4.5)
        ax.tick_params(axis="y", length=0)
        ax.set_xticks([])

        # Add percentage labels
        for i, pct in enumerate(percentages):
            if pct > 0:
                if is_left:
                    ax.text(
                        pct + 1,
                        i,
                        f"{pct:.0f}%",
                        ha="right",
                        va="center",
                        fontsize=11,
                        alpha=0.7,
                    )
                else:
                    ax.text(
                        pct + 1,
                        i,
                        f"{pct:.0f}%",
                        ha="left",
                        va="center",
                        fontsize=11,
                        alpha=0.7,
                    )

        # Add grid lines and stripes
        for pos in [0.5, 1.5, 2.5, 3.5]:
            ax.axhline(y=pos, color="gray", linestyle="-", alpha=0.3, zorder=0)

        stripe_ranges = [(-0.5, 0.5), (0.5, 1.5), (1.5, 2.5), (2.5, 3.5), (3.5, 4.5)]
        for i, (bottom, top) in enumerate(stripe_ranges):
            if i % 2 == 0:  # Every other range (0, 2, 4, ...)
                ax.axhspan(bottom, top, facecolor="#f5f5f5", alpha=0.5, zorder=0)

    # Calculate percentages for all datasets
    left_human_percentages = calculate_percentages(left_human_vals)
    left_gpt_percentages = calculate_percentages(left_gpt_vals)
    right_human_percentages = calculate_percentages(right_human_vals)
    right_gpt_percentages = calculate_percentages(right_gpt_vals)

    # Create figure with 4 subplots (2 pairs of mirrored plots)
    fig, axes = plt.subplots(1, 4, figsize=(10, 6), sharey=True)

    # Key change: Set wspace to 0 for all subplots
    plt.subplots_adjust(wspace=0, bottom=0.3)  # Increase bottom margin for images

    # Set up the first pair (left comparison)
    setup_axis(axes[0], left_human_percentages, is_left=True)
    setup_axis(axes[1], left_gpt_percentages, is_left=False)

    # Set up the second pair (right comparison)
    setup_axis(axes[2], right_human_percentages, is_left=True)
    setup_axis(axes[3], right_gpt_percentages, is_left=False)

    # Remove unnecessary spacing between the two pairs of plots (positions 1 and 2)
    # This is important - we need to adjust the subplot boundaries manually
    pos1 = axes[1].get_position()
    pos2 = axes[2].get_position()
    pos2.x0 = pos1.x1
    axes[2].set_position(pos2)

    # Adjust other positions to ensure all plots are connected
    pos3 = axes[3].get_position()
    pos3.x0 = pos2.x1
    axes[3].set_position(pos3)

    fig.suptitle(
        "Statement: the screenshot evidences that the player has fulfilled the task, 'take a screenshot of _____'",
        fontsize=14,
        y=0.94,
    )

    # Calculate the center positions for each pair of plots
    left_center = (axes[0].get_position().x1 + axes[1].get_position().x0) / 2
    right_center = (axes[2].get_position().x1 + axes[3].get_position().x0) / 2

    # Add y-tick labels for the furthest left plot
    axes[0].set_yticks([0, 1, 2, 3, 4])
    axes[0].set_yticklabels(
        [
            "disagree\n0.0",
            "somewhat\ndisagree\n0.25",
            "neutral\n0.5",
            "somewhat\nagree\n0.75",
            "agree\n1.0",
        ],
        fontsize=13,
        x=-0.02,
        # rotation=45,
    )

    # Add text labels beneath the plot pairs
    fig.text(left_center, 0.25, left_text, ha="center", va="center", fontsize=14)
    fig.text(right_center, 0.25, right_text, ha="center", va="center", fontsize=14)

    # Add images beneath the text labels
    img_width = 0.18  # Width of each image in figure coordinates
    img_height = 0.22  # Height of each image in figure coordinates

    # Add left image
    left_img = imread(left_img_path)
    left_img_ax = fig.add_axes([left_center - img_width / 2, 0.0, img_width, img_height])
    left_img_ax.imshow(left_img)
    left_img_ax.axis("off")

    # Add right image
    right_img = imread(right_img_path)
    right_img_ax = fig.add_axes([right_center - img_width / 2, 0.0, img_width, img_height])
    right_img_ax.imshow(right_img)
    right_img_ax.axis("off")

    # Add legend
    legend_elements = [
        mpatches.Patch(color="skyblue", label="Human"),
        mpatches.Patch(color="lightcoral", label="GPT-4.1"),
    ]
    axes[3].legend(
        handles=legend_elements,
        # Lower right corner
        loc="lower right",
        bbox_to_anchor=(1.0, 0.0),
        fontsize=14,
    )

    plt.savefig(os.path.join(DATA_DIR, "../", "distributions.png"), dpi=800)


def plot_histogram_with_rug(values: dict[str, float]):
    data = list(values.values())
    plt.figure(figsize=(6, 3))
    plt.hist(
        data,
        bins=np.arange(0, 1.1, 0.075),
        color="mediumpurple",
        edgecolor="black",
    )
    plt.xlim(0, 1)

    for pos in [5, 10, 15, 20, 25]:
        plt.axhline(y=pos, color="gray", linestyle="-", alpha=0.3, zorder=0)

    stripe_ranges = [(0, 5), (5, 10), (10, 15), (15, 20), (20, 25), (25, 30)]
    for i, (bottom, top) in enumerate(stripe_ranges):
        if i % 2 == 0:
            plt.axhspan(bottom, top, facecolor="#f5f5f5", alpha=0.5, zorder=0)

    plt.xlabel("Absolute discrepancy in mean score", labelpad=20)
    plt.ylabel("Count of task-screenshot pairs")

    ax = plt.gca()
    plt.text(
        0, -0.15, "More", ha="left", va="top", transform=ax.get_xaxis_transform(), fontsize=8
    )
    plt.text(
        0.5,
        -0.15,
        "Agreement b/w humans & GPT-4.1",
        ha="center",
        va="top",
        transform=ax.get_xaxis_transform(),
        fontsize=8,
    )
    ax.text(
        1,
        -0.15,
        "Less",
        ha="right",
        va="top",
        transform=ax.get_xaxis_transform(),
        fontsize=8,
    )

    plt.tight_layout()
    plt.savefig(os.path.join(DATA_DIR, "../", "discrepancy_distribution.png"), dpi=800)


if __name__ == "__main__":
    scores = load_scores()
    df = summarize_scores(scores)
    df.to_csv(os.path.join(DATA_DIR, "summary.csv"), index=False)
    plot_histogram_with_rug(
        {subject: score for subject, score in zip(df["subject"], df["abs_diff_of_means"])}
    )
    dist1 = "something organic and orange"
    dist2 = "an animal whose enclosure gives it a reason to be happy"
    plot_distributions(
        left_human_vals=scores[dist1]["human_scores"],
        left_gpt_vals=scores[dist1]["gpt_scores"],
        right_human_vals=scores[dist2]["human_scores"],
        right_gpt_vals=scores[dist2]["gpt_scores"],
        left_img_path=os.path.join(DATA_DIR, f"{dist1}.png"),
        right_img_path=os.path.join(DATA_DIR, f"{dist2}.png"),
        left_text=f"'{dist1}'",
        right_text="'an animal whose enclosure gives\nit a reason to be happy'",
    )
