$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
$pyLauncher = Get-Command py -ErrorAction SilentlyContinue

if (-not (Test-Path ".venv")) {
    if ($pythonCommand) {
        python -m venv .venv
    }
    elseif ($pyLauncher) {
        py -3.11 -m venv .venv
    }
    else {
        throw "Python was not found. Install Python 3.11 first."
    }
}

$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"

& $pythonExe -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "Failed to upgrade pip." }

& $pythonExe -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Failed to install project requirements." }

& $pythonExe -m pip install pyinstaller
if ($LASTEXITCODE -ne 0) { throw "Failed to install PyInstaller." }

& $pythonExe -m PyInstaller --noconfirm flappy_bird.spec
if ($LASTEXITCODE -ne 0) { throw "PyInstaller build failed." }

Write-Host ""
Write-Host "Windows build ready:"
Write-Host "  $projectRoot\dist\FlappyBirdVoice"
