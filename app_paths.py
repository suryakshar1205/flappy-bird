from pathlib import Path
import os
import sys


APP_NAME = "FlappyBirdVoice"


def resource_path(*parts):
    if hasattr(sys, "_MEIPASS"):
        base_path = Path(sys._MEIPASS)
    else:
        base_path = Path(__file__).resolve().parent

    return str(base_path.joinpath(*parts))


def user_data_dir():
    local_app_data = os.getenv("LOCALAPPDATA")

    if local_app_data:
        base_path = Path(local_app_data)
    else:
        base_path = Path.home() / ".local" / "share"

    data_path = base_path / APP_NAME
    data_path.mkdir(parents=True, exist_ok=True)
    return data_path
