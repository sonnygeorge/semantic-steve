import os

SCORE_MAP = {
    "disagree": 0.0,
    "somewhat disagree": 0.25,
    "neutral": 0.5,
    "somewhat agree": 0.75,
    "agree": 1.0,
}
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
