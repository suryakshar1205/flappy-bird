# Flappy Bird Voice

> A voice-controlled Flappy Bird remake built with Python, Pygame, and real-time microphone input.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Pygame](https://img.shields.io/badge/Pygame-2.6.1-1E7F3F?style=for-the-badge&logo=pygame&logoColor=white)
![Audio Input](https://img.shields.io/badge/Control-Microphone%20Input-EA4335?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows%20Ready-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Status](https://img.shields.io/badge/Status-Playable-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-Not%20Specified-lightgrey?style=for-the-badge)

## 🚀 Overview

**Flappy Bird Voice** turns a familiar arcade game into a hands-free interaction experiment. Instead of tapping or clicking to stay alive, the bird reacts to live microphone input and converts loudness spikes into jump strength.

This matters because it transforms a simple game loop into a more accessible and technically interesting input system. The project combines gameplay, audio signal processing, device handling, and desktop packaging in a compact, easy-to-run codebase.

## ✨ Key Features

- Voice-driven gameplay powered by real-time microphone input
- Dynamic jump strength based on detected audio intensity
- Smart microphone selection with device cycling support
- Noise-floor smoothing to reduce false triggers from ambient sound
- Resizable game window with scaled viewport rendering
- Start menu, game-over overlay, restart flow, and return-to-menu controls
- Persistent high score and top-5 leaderboard storage
- Windows packaging support via PyInstaller
- Dedicated microphone test utility for setup and debugging

## 🛠️ Tech Stack

### Frontend

- `Pygame` for rendering, input handling, sprites, UI overlays, and animation

### Backend

- `Python` for game logic, physics, audio-trigger interpretation, and local score persistence
- Local file-based storage for highscores and leaderboard history
- Single-process desktop architecture with no external server dependency

### Tools / Libraries

- `NumPy` for RMS-based microphone volume analysis
- `sounddevice` for microphone stream capture and device management
- `PyInstaller` for Windows executable packaging
- `PowerShell` build automation for local Windows releases

## 📂 Project Structure

```text
flappy_bird/
|-- main.py                # Main game loop, menus, rendering pipeline, event handling
|-- audio_input.py         # Microphone capture, smoothing, trigger detection, device selection
|-- bird.py                # Bird physics, jump behavior, animation, collision data
|-- pipes.py               # Pipe spawning, movement, drawing, collision checks
|-- ui.py                  # Scoreboard, overlays, text, meter, and menu UI components
|-- score_manager.py       # Highscore and leaderboard persistence
|-- settings.py            # Tunable gameplay, microphone, and UI constants
|-- app_paths.py           # Runtime-safe asset and user-data path helpers
|-- mic_test.py            # CLI utility for validating microphone input levels
|-- build_windows.ps1      # Windows build script using PyInstaller
|-- flappy_bird.spec       # PyInstaller packaging configuration
|-- assets/                # Game sprites, digits, backgrounds, and buttons
|-- data/                  # Seed score files used in development/builds
`-- WINDOWS_RELEASE.md     # Windows release and distribution notes
```

## ⚙️ Installation & Setup

### Prerequisites

- Python `3.11` recommended
- A working microphone or headset mic
- Windows, macOS, or Linux for development

### 1. Clone the repository

```bash
git clone https://github.com/suryakshar1205/flappy-bird.git
cd flappy-bird
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

### 3. Activate the environment

#### Windows

```powershell
.\.venv\Scripts\Activate.ps1
```

#### macOS / Linux

```bash
source .venv/bin/activate
```

### 4. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Optional: validate your microphone

```bash
python mic_test.py
```

Use this if you want to confirm that your input device is detected and producing visible volume output before launching the game.

## ▶️ Usage

### Run the game

```bash
python main.py
```

### Basic flow

1. Launch the game and allow the microphone to initialize.
2. On the start screen, press `Space` or click the start button.
3. Make short voice bursts, claps, or other mic-detected sounds to lift the bird.
4. Avoid the pipes and ground to increase your score.
5. Restart after a loss or return to the menu to begin another round.

### Controls

- `Space`: Start from the main menu
- `R`: Restart after game over
- `Q`: Return to menu during gameplay or from the game-over screen
- `M`: Reinitialize the microphone
- `[` / `]`: Cycle through available microphone devices
- Mouse / touch: Use on-screen buttons in menus
- `Esc`: Quit from the game-over screen

### Score persistence

- In development mode, scores are stored in the local `data/` directory
- In packaged Windows builds, scores are stored in `%LOCALAPPDATA%\FlappyBirdVoice\data`

## 📸 Screenshots / Demo

Add real gameplay captures here to make the repository more compelling for recruiters and users.

- `docs/screenshot-start-menu.png` - Start screen
- `docs/screenshot-gameplay.png` - Voice-controlled gameplay
- `docs/screenshot-game-over.png` - Score and leaderboard view

Example markdown:

```md
![Start Menu](docs/screenshot-start-menu.png)
![Gameplay](docs/screenshot-gameplay.png)
![Game Over](docs/screenshot-game-over.png)
```

## 💡 Unique Selling Points

- **Voice as the primary control mechanic:** The core interaction is not a keyboard clone. The microphone directly drives gameplay.
- **More than a novelty input swap:** The project includes trigger arming, noise-floor adaptation, smoothing, and jump scaling to make audio control actually usable.
- **Strong showcase value:** It demonstrates game programming, signal-based interaction design, state management, and desktop distribution in one repository.
- **Recruiter-friendly scope:** Small enough to understand quickly, but interesting enough to stand out from standard tutorial clones.

## 🚧 Future Improvements

- Add an in-game settings panel for microphone sensitivity and gain tuning
- Introduce sound effects and background music with mute/volume controls
- Support keyboard and voice hybrid mode for accessibility and testing
- Add pause support and richer round statistics
- Capture screenshots or GIF demos for the README
- Add automated tests around score persistence and audio trigger utilities
- Publish versioned releases with changelogs and downloadable binaries

## 🤝 Contributing

Contributions are welcome, especially around gameplay polish, audio tuning, UI improvements, and packaging.

1. Fork the repository
2. Create a feature branch
3. Make focused, well-documented changes
4. Test the game and microphone flow locally
5. Open a pull request with a clear summary of what changed

If you contribute UI or gameplay changes, include a short demo clip or screenshots when possible.

## 📄 License

This repository currently does **not** include a formal license file.

If you plan to distribute, reuse, or accept outside contributions for this project, adding a license such as `MIT` would be a strong next step.
