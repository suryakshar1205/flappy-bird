import os


HIGHSCORE_FILE = "data/highscore.txt"
LEADERBOARD_FILE = "data/top_scores.txt"
MAX_LEADERBOARD_SCORES = 5


def _safe_int(value):
    try:
        return int(str(value).strip())
    except Exception:
        return None


def load_highscore():

    scores = load_top_scores()
    if scores:
        return scores[0]

    if not os.path.exists(HIGHSCORE_FILE):
        return 0

    with open(HIGHSCORE_FILE, "r") as file_handle:
        score = _safe_int(file_handle.read())
        return score if score is not None else 0


def save_highscore(score):

    with open(HIGHSCORE_FILE, "w") as file_handle:
        file_handle.write(str(int(score)))


def load_top_scores():

    scores = []

    if os.path.exists(LEADERBOARD_FILE):
        with open(LEADERBOARD_FILE, "r") as file_handle:
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

    if not os.path.exists(HIGHSCORE_FILE):
        return 0

    with open(HIGHSCORE_FILE, "r") as file_handle:
        score = _safe_int(file_handle.read())
        return score if score is not None else 0


def save_score(score):

    score = int(score)
    scores = load_top_scores()
    scores.append(score)
    scores = sorted(scores, reverse=True)[:MAX_LEADERBOARD_SCORES]

    with open(LEADERBOARD_FILE, "w") as file_handle:
        file_handle.write("\n".join(str(saved_score) for saved_score in scores))

    if scores:
        save_highscore(scores[0])

    return scores
