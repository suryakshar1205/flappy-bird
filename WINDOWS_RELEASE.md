# Windows Release Steps

## 1. Install Python

Install Python 3.11 for Windows from the official installer and make sure `python` or `py` works:

```powershell
python --version
```

## 2. Build the game

From the project root:

```powershell
cd c:\Users\surya\Desktop\flappy_bird
.\build_windows.ps1
```

That script will:

- create `.venv` if needed
- install `requirements.txt`
- install `pyinstaller`
- build the Windows app with `flappy_bird.spec`

Your release folder will be:

```text
dist\FlappyBirdVoice
```

## 3. Test the built app

Run:

```powershell
.\dist\FlappyBirdVoice\FlappyBirdVoice.exe
```

Check:

- the game opens
- all images load correctly
- the microphone works
- the bird responds to voice
- `Q` returns to the menu during gameplay
- scores still save after closing and reopening

Saved scores are written to:

```text
%LOCALAPPDATA%\FlappyBirdVoice\data
```

## 4. Upload to itch.io

Create a downloadable Windows project on itch.io, then install `butler` and log in:

```powershell
butler version
butler login
```

Upload the build:

```powershell
butler push dist\FlappyBirdVoice yourname/flappy-bird:windows --userversion 1.0.0 --hidden
```

Then review the upload on itch.io and publish it when ready.
