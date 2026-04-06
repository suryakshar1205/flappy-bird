import shutil
from pathlib import Path

from app_paths import user_data_dir


APP_DATA_DIR = user_data_dir() / "data"
LEGACY_DATA_DIR = Path(__file__).resolve().parent / "data"
HIGHSCORE_FILE = APP_DATA_DIR / "highscore.txt"
LEADERBOARD_FILE = APP_DATA_DIR / "top_scores.txt"
LEGACY_HIGHSCORE_FILE = LEGACY_DATA_DIR / "highscore.txt"
LEGACY_LEADERBOARD_FILE = LEGACY_DATA_DIR / "top_scores.txt"
MAX_LEADERBOARD_SCORES = 5


def _ensure_data_files():
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not LEADERBOARD_FILE.exists() and LEGACY_LEADERBOARD_FILE.exists():
        shutil.copy2(LEGACY_LEADERBOARD_FILE, LEADERBOARD_FILE)

    if not HIGHSCORE_FILE.exists() and LEGACY_HIGHSCORE_FILE.exists():
        shutil.copy2(LEGACY_HIGHSCORE_FILE, HIGHSCORE_FILE)


def _safe_int(value):
    try:
        return int(str(value).strip())
    except Exception:
        return None


def load_highscore():
    _ensure_data_files()

    scores = load_top_scores()
    if scores:
        return scores[0]

    if not HIGHSCORE_FILE.exists():
        return 0

    with HIGHSCORE_FILE.open("r", encoding="utf-8") as file_handle:
        score = _safe_int(file_handle.read())
        return score if score is not None else 0


def save_highscore(score):
    _ensure_data_files()

    with HIGHSCORE_FILE.open("w", encoding="utf-8") as file_handle:
        file_handle.write(str(int(score)))


def load_top_scores():
    _ensure_data_files()

    scores = []

    if LEADERBOARD_FILE.exists():
        with LEADERBOARD_FILE.open("r", encoding="utf-8") as file_handle:
            for line in file_handle:
                score = _safe_int(line)
                if score is not None:
                    scores.append(score)

    if not scores:
        fallback_highscore = load_highscore_from_legacy_file()
        if fallback_highscore > 0:
            scores = [fallback_highscore]

    scores = sorted(scores, reverse=True)[:MAX_LEADERBOARD_SCORES]
    return scores


def load_highscore_from_legacy_file():
    _ensure_data_files()

    if not LEGACY_HIGHSCORE_FILE.exists():
        return 0

    with LEGACY_HIGHSCORE_FILE.open("r", encoding="utf-8") as file_handle:
        score = _safe_int(file_handle.read())
        return score if score is not None else 0


def save_score(score):
    _ensure_data_files()

    score = int(score)
    scores = load_top_scores()
    scores.append(score)
    scores = sorted(scores, reverse=True)[:MAX_LEADERBOARD_SCORES]

    with LEADERBOARD_FILE.open("w", encoding="utf-8") as file_handle:
        file_handle.write("\n".join(str(saved_score) for saved_score in scores))

    if scores:
        save_highscore(scores[0])

    return scores
