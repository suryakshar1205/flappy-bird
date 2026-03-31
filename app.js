const DEFAULT_SHARED_SETTINGS = {
    WIDTH: 658,
    HEIGHT: 518,
    DEFAULT_SCALE: 2,
    MAX_WINDOW_RATIO: 0.9,
    FPS: 60,
    GRAVITY: 0.19,
    MIN_JUMP_FORCE: -2.3,
    MAX_JUMP_FORCE: -3.6,
    PIPE_GAP: 130,
    PIPE_SPEED: 1.5,
    PIPE_SPAWN_RATE: 100,
    GROUND_HEIGHT: 100,
    MIC_TRIGGER: 0.02,
    MIC_MAX_LEVEL: 0.4,
    JUMP_COOLDOWN: 10,
    START_DELAY_MS: 300,
    ROUND_GRACE_MS: 300,
    MIC_HISTORY_SIZE: 3,
    MIC_RESPONSE_BLEND: 0.45,
    MIC_BLOCKSIZE: 256,
    MIC_INPUT_GAIN: 14.0,
    MIC_NOISE_FLOOR_DECAY: 0.02,
    MIC_NOISE_FLOOR_RISE: 0.14,
    MIC_PEAK_DECAY: 0.992,
    MIC_ATTACK_TRIGGER: 0.025,
    MIC_REARM_RATIO: 0.55,
    TOP_OUT_LIMIT: -60,
};

let CONFIG = null;

const STORAGE_KEYS = {
    leaderboard: "flappy_voice_top_scores_v1",
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusLine = document.getElementById("statusLine");
ctx.imageSmoothingEnabled = false;

const assetPaths = {
    background: "./assets/background-day.png",
    base: "./assets/base.png",
    gameOver: "./assets/gameover.png",
    message: "./assets/message.png",
    pipe: "./assets/pipe-green.png",
    quitButton: "./assets/quit-button.png",
    restartButton: "./assets/restart-button.png",
    startButton: "./assets/start_button.png",
    birdDown: "./assets/bluebird-downflap.png",
    birdMid: "./assets/bluebird-midflap.png",
    birdUp: "./assets/bluebird-upflap.png",
    digits: Array.from({ length: 10 }, (_, index) => `./assets/${index}.png`),
};

function setStatus(message) {
    statusLine.textContent = message;
}

function buildConfig(sharedSettings) {
    return {
        width: sharedSettings.WIDTH,
        height: sharedSettings.HEIGHT,
        fps: sharedSettings.FPS,
        gravity: sharedSettings.GRAVITY,
        minJumpForce: sharedSettings.MIN_JUMP_FORCE,
        maxJumpForce: sharedSettings.MAX_JUMP_FORCE,
        pipeGap: sharedSettings.PIPE_GAP,
        pipeSpeed: sharedSettings.PIPE_SPEED,
        pipeSpawnRate: sharedSettings.PIPE_SPAWN_RATE,
        groundHeight: sharedSettings.GROUND_HEIGHT,
        startDelayMs: sharedSettings.START_DELAY_MS,
        roundGraceMs: sharedSettings.ROUND_GRACE_MS,
        micTrigger: sharedSettings.MIC_TRIGGER,
        micMaxLevel: sharedSettings.MIC_MAX_LEVEL,
        jumpCooldown: sharedSettings.JUMP_COOLDOWN,
        micHistorySize: sharedSettings.MIC_HISTORY_SIZE,
        micResponseBlend: sharedSettings.MIC_RESPONSE_BLEND,
        micInputGain: sharedSettings.MIC_INPUT_GAIN,
        micNoiseFloorDecay: sharedSettings.MIC_NOISE_FLOOR_DECAY,
        micNoiseFloorRise: sharedSettings.MIC_NOISE_FLOOR_RISE,
        micAttackTrigger: sharedSettings.MIC_ATTACK_TRIGGER,
        micRearmRatio: sharedSettings.MIC_REARM_RATIO,
        topOutLimit: sharedSettings.TOP_OUT_LIMIT,
    };
}

async function loadSharedSettings() {
    try {
        const response = await fetch("./shared_settings.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const loaded = await response.json();
        if (!loaded || typeof loaded !== "object") {
            throw new Error("Invalid shared settings payload");
        }

        return { ...DEFAULT_SHARED_SETTINGS, ...loaded };
    } catch {
        return { ...DEFAULT_SHARED_SETTINGS };
    }
}

function applySharedSizing(config) {
    canvas.width = config.width;
    canvas.height = config.height;
    document.documentElement.style.setProperty("--game-width", String(config.width));
    document.documentElement.style.setProperty("--game-height", String(config.height));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function rectContains(rect, x, y) {
    return (
        x >= rect.x
        && x <= rect.x + rect.width
        && y >= rect.y
        && y <= rect.y + rect.height
    );
}

function intersects(a, b) {
    return (
        a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y
    );
}

function getJumpStrength(volume) {
    if (volume <= CONFIG.micTrigger) {
        return null;
    }

    const span = CONFIG.micMaxLevel - CONFIG.micTrigger;
    if (span <= 0) {
        return 0.8;
    }

    const normalized = clamp((volume - CONFIG.micTrigger) / span, 0, 1);
    return Math.min(0.8, normalized * normalized);
}

function loadTopScores() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.leaderboard);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((score) => Number(score))
            .filter((score) => Number.isFinite(score) && score >= 0)
            .sort((left, right) => right - left)
            .slice(0, 5);
    } catch {
        return [];
    }
}

function saveTopScores(scores) {
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(scores.slice(0, 5)));
}

function addTopScore(score) {
    const scores = loadTopScores();
    if (score > 0) {
        scores.push(score);
    }
    scores.sort((left, right) => right - left);
    const nextScores = scores.slice(0, 5);
    saveTopScores(nextScores);
    return nextScores;
}

function createButtonRect(image, centerX, centerY, maxWidth = null, maxHeight = null) {
    let width = image.width;
    let height = image.height;

    if (maxWidth !== null || maxHeight !== null) {
        const widthScale = maxWidth ? maxWidth / width : 1;
        const heightScale = maxHeight ? maxHeight / height : 1;
        const scale = Math.min(widthScale, heightScale, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    return {
        x: Math.round(centerX - width / 2),
        y: Math.round(centerY - height / 2),
        width,
        height,
    };
}

function drawImageRect(image, rect) {
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function drawDigitNumber(number, right, centerY, digitImages, scale = 1) {
    const digits = String(Math.max(0, Math.floor(number))).split("").map(Number);
    const scaledDigits = digits.map((digit) => {
        const image = digitImages[digit];
        return {
            image,
            width: Math.max(1, Math.round(image.width * scale)),
            height: Math.max(1, Math.round(image.height * scale)),
        };
    });

    const totalWidth = scaledDigits.reduce((sum, digit) => sum + digit.width, 0);
    const maxHeight = scaledDigits.reduce((maxValue, digit) => Math.max(maxValue, digit.height), 0);

    let x = right - totalWidth;
    const y = centerY - maxHeight / 2;

    for (const digit of scaledDigits) {
        ctx.drawImage(
            digit.image,
            x,
            Math.round(y + (maxHeight - digit.height) / 2),
            digit.width,
            digit.height,
        );
        x += digit.width;
    }
}

function drawCenteredScore(score, y, digitImages, scale = 1) {
    const digits = String(Math.max(0, Math.floor(score))).split("").map(Number);
    const totalWidth = digits.reduce((sum, digit) => sum + digitImages[digit].width * scale, 0);
    let x = (CONFIG.width - totalWidth) / 2;

    for (const digit of digits) {
        const image = digitImages[digit];
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        ctx.drawImage(image, Math.round(x), y, width, height);
        x += width;
    }
}

function drawTrophy(x, y, scale = 1) {
    const scaled = (value) => Math.max(1, Math.round(value * scale));

    ctx.fillStyle = "#ad7514";
    ctx.fillRect(x + scaled(8), y + scaled(8), scaled(18), scaled(10));

    ctx.fillStyle = "#f4b42a";
    ctx.beginPath();
    ctx.moveTo(x + scaled(4), y + scaled(8));
    ctx.lineTo(x + scaled(30), y + scaled(8));
    ctx.lineTo(x + scaled(24), y + scaled(25));
    ctx.lineTo(x + scaled(10), y + scaled(25));
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(x + scaled(14), y + scaled(25), scaled(6), scaled(10));
    ctx.fillRect(x + scaled(10), y + scaled(34), scaled(14), scaled(5));

    ctx.lineWidth = Math.max(1, scaled(3));
    ctx.strokeStyle = "#f4b42a";
    ctx.beginPath();
    ctx.arc(x + scaled(5), y + scaled(16), scaled(6), 1.2, 5.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + scaled(29), y + scaled(16), scaled(6), -2.0, 2.0);
    ctx.stroke();

    ctx.fillStyle = "#ffdd61";
    ctx.fillRect(x + scaled(10), y + scaled(11), scaled(10), scaled(4));
}

class MicController {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.stream = null;
        this.data = null;
        this.ready = false;
        this.status = this.getInitialStatus();
        this.volume = 0;
        this.rawVolume = 0;
        this.noiseFloor = 0;
        this.history = [];
        this.triggerLevel = 0;
        this.previousLevel = 0;
        this.triggerArmed = true;
    }

    getInitialStatus() {
        if (!window.isSecureContext) {
            return "This address is not secure. Voice input needs HTTPS or localhost. Tap play still works.";
        }

        return "Tap Start to allow microphone access. Tap-only play still works.";
    }

    async ensureStarted() {
        if (this.ready) {
            return true;
        }

        if (!window.isSecureContext) {
            this.status = "Microphone is blocked here because the page is not HTTPS or localhost. Use tap mode or open a secure URL.";
            return false;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.status = "Microphone is not supported here. Tap to jump instead.";
            return false;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                },
            });

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = this.audioContext ?? new AudioContextClass();
            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 1024;
            this.data = new Float32Array(this.analyser.fftSize);
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.analyser);

            this.history = [];
            this.volume = 0;
            this.rawVolume = 0;
            this.noiseFloor = 0;
            this.triggerLevel = 0;
            this.previousLevel = 0;
            this.triggerArmed = true;
            this.ready = true;
            this.status = "Voice control ready. Loud nearby chatter is filtered as much as possible.";
            return true;
        } catch (error) {
            this.ready = false;
            this.status = "Microphone access was denied or unavailable. Tap to jump instead.";
            return false;
        }
    }

    update() {
        if (!this.ready || !this.analyser || !this.data) {
            return;
        }

        this.analyser.getFloatTimeDomainData(this.data);

        let sum = 0;
        for (const sample of this.data) {
            sum += sample * sample;
        }

        const rms = Math.sqrt(sum / this.data.length);
        this.rawVolume = rms;

        if (this.noiseFloor === 0) {
            this.noiseFloor = rms;
        }

        const blend = rms <= this.noiseFloor
            ? CONFIG.micNoiseFloorRise
            : CONFIG.micNoiseFloorDecay;

        this.noiseFloor = (this.noiseFloor * (1 - blend)) + (rms * blend);

        const adjusted = Math.max(0, rms - this.noiseFloor);
        const amplified = adjusted * CONFIG.micInputGain;

        this.history.push(amplified);
        if (this.history.length > CONFIG.micHistorySize) {
            this.history.shift();
        }

        const smoothed = this.history.reduce((sumValue, value) => sumValue + value, 0) / Math.max(1, this.history.length);
        this.volume = amplified > smoothed
            ? amplified
            : (amplified * (1 - CONFIG.micResponseBlend)) + (smoothed * CONFIG.micResponseBlend);

        const attack = Math.max(0, this.volume - this.previousLevel);
        if (
            this.triggerArmed
            && this.volume >= CONFIG.micTrigger
            && attack >= CONFIG.micAttackTrigger
        ) {
            this.triggerLevel = this.volume;
            this.triggerArmed = false;
        } else if (this.volume <= CONFIG.micTrigger * CONFIG.micRearmRatio) {
            this.triggerArmed = true;
        }

        this.previousLevel = this.volume;
    }

    consumeTriggerLevel() {
        const level = this.triggerLevel;
        this.triggerLevel = 0;
        return level;
    }
}

class FlappyVoiceGame {
    constructor(images) {
        this.images = images;
        this.mic = new MicController();
        this.topScores = loadTopScores();
        this.highscore = this.topScores[0] ?? 0;
        this.lastTimestamp = performance.now();
        this.screen = "menu";
        this.menuTime = 0;
        this.birdX = 80;
        this.birdY = CONFIG.height / 2;
        this.birdVelocity = 0;
        this.birdAngle = 0;
        this.birdFrameFloat = 0;
        this.floatOffset = 0;
        this.score = 0;
        this.baseX = 0;
        this.jumpTimer = 0;
        this.pipeFrameCounter = 0;
        this.pipes = [];
        this.countdownStart = 0;
        this.roundStartTime = 0;
        this.startButtonRect = createButtonRect(this.images.startButton, CONFIG.width / 2, 338, 180, 64);
        this.restartButtonRect = createButtonRect(this.images.restartButton, CONFIG.width / 2, 300);
        this.quitButtonRect = {
            x: Math.round(CONFIG.width / 2 - 45),
            y: Math.round(370 - 15),
            width: 90,
            height: 30,
        };
        this.updateStatus();
    }

    updateStatus() {
        if (this.screen === "menu") {
            setStatus(this.mic.status);
            return;
        }

        if (this.screen === "playing" || this.screen === "countdown") {
            if (this.mic.ready) {
                setStatus("Voice mode is active. You can still tap the screen if needed.");
            } else {
                setStatus(this.mic.status);
            }
            return;
        }

        if (this.screen === "gameover") {
            setStatus("Restart to play again or Quit to return to the start page.");
        }
    }

    resetRound() {
        this.birdY = CONFIG.height / 2;
        this.birdVelocity = 0;
        this.birdAngle = 0;
        this.birdFrameFloat = 0;
        this.floatOffset = 0;
        this.score = 0;
        this.baseX = 0;
        this.jumpTimer = 0;
        this.pipeFrameCounter = 0;
        this.pipes = [];
        this.countdownStart = performance.now();
        this.roundStartTime = performance.now();
        this.screen = "countdown";
        this.updateStatus();
    }

    async beginFromMenu() {
        await this.mic.ensureStarted();
        this.resetRound();
    }

    restartRound() {
        this.resetRound();
    }

    goToMenu() {
        this.screen = "menu";
        this.menuTime = 0;
        this.updateStatus();
    }

    endRound() {
        this.screen = "gameover";
        this.topScores = addTopScore(this.score);
        this.highscore = this.topScores[0] ?? 0;
        this.updateStatus();
    }

    applyJump(strength) {
        const clamped = clamp(strength, 0, 1);
        const jumpForce = CONFIG.minJumpForce + (CONFIG.maxJumpForce - CONFIG.minJumpForce) * clamped;
        this.birdVelocity = jumpForce;
        this.jumpTimer = CONFIG.jumpCooldown;
    }

    queueTapJump() {
        if ((this.screen === "playing" || this.screen === "countdown") && this.jumpTimer <= 0) {
            this.applyJump(0.72);
        }
    }

    spawnPipe() {
        const gapMargin = 40;
        const minGapY = 80 + CONFIG.pipeGap / 2;
        const maxGapY = CONFIG.height - CONFIG.groundHeight - gapMargin - CONFIG.pipeGap / 2;
        const gapY = minGapY >= maxGapY
            ? (minGapY + maxGapY) / 2
            : minGapY + Math.random() * (maxGapY - minGapY);

        this.pipes.push({
            x: CONFIG.width,
            gapY,
            passed: false,
        });
    }

    getBirdFrame() {
        const frames = [this.images.birdDown, this.images.birdMid, this.images.birdUp];

        if (this.screen === "menu") {
            const index = Math.floor(this.menuTime * 6) % frames.length;
            return frames[index];
        }

        const index = Math.floor(this.birdFrameFloat) % frames.length;
        return frames[index];
    }

    getBirdRect() {
        const frame = this.getBirdFrame();
        const hitboxScale = 0.72;
        const width = frame.width * hitboxScale;
        const height = frame.height * hitboxScale;
        return {
            x: this.birdX - width / 2,
            y: this.birdY - height / 2,
            width,
            height,
            top: this.birdY - height / 2,
        };
    }

    handlePipeCollisions(birdRect) {
        const pipeWidth = this.images.pipe.width;
        const pipeHeight = this.images.pipe.height;

        for (const pipe of this.pipes) {
            const topRect = {
                x: pipe.x,
                y: pipe.gapY - CONFIG.pipeGap / 2 - pipeHeight,
                width: pipeWidth,
                height: pipeHeight,
            };
            const bottomRect = {
                x: pipe.x,
                y: pipe.gapY + CONFIG.pipeGap / 2,
                width: pipeWidth,
                height: pipeHeight,
            };

            if (intersects(birdRect, topRect) || intersects(birdRect, bottomRect)) {
                return true;
            }
        }

        return false;
    }

    async handlePointerDown(x, y) {
        if (this.screen === "menu") {
            if (rectContains(this.startButtonRect, x, y)) {
                await this.beginFromMenu();
            }
            return;
        }

        if (this.screen === "playing" || this.screen === "countdown") {
            this.queueTapJump();
            return;
        }

        if (this.screen === "gameover") {
            if (rectContains(this.restartButtonRect, x, y)) {
                this.restartRound();
            } else if (rectContains(this.quitButtonRect, x, y)) {
                this.goToMenu();
            }
        }
    }

    async handleKeyDown(event) {
        if (event.code === "Space") {
            event.preventDefault();
            if (this.screen === "menu") {
                await this.beginFromMenu();
            } else if (this.screen === "playing" || this.screen === "countdown") {
                this.queueTapJump();
            } else if (this.screen === "gameover") {
                this.restartRound();
            }
        }

        if (event.code === "KeyR" && this.screen === "gameover") {
            this.restartRound();
        }

        if ((event.code === "Escape" || event.code === "KeyQ") && this.screen === "gameover") {
            this.goToMenu();
        }
    }

    update(timestamp) {
        const dt = Math.min(0.033, (timestamp - this.lastTimestamp) / 1000);
        this.lastTimestamp = timestamp;
        const frameScale = dt * CONFIG.fps;

        this.mic.update();
        this.menuTime += dt;
        this.floatOffset = Math.sin(this.menuTime * 3.3) * 10;

        if (this.screen === "menu") {
            this.render();
            return;
        }

        this.jumpTimer = Math.max(0, this.jumpTimer - frameScale);

        if (this.screen === "countdown" && timestamp - this.countdownStart >= CONFIG.startDelayMs) {
            this.screen = "playing";
            this.roundStartTime = timestamp;
            this.updateStatus();
        }

        const graceActive = this.screen !== "playing"
            ? true
            : (timestamp - this.roundStartTime) < CONFIG.roundGraceMs;

        const triggerVolume = this.mic.consumeTriggerLevel();
        const jumpStrength = getJumpStrength(triggerVolume);
        if (jumpStrength !== null && this.jumpTimer <= 0 && this.screen !== "gameover") {
            this.applyJump(jumpStrength);
        }

        if (this.screen === "countdown" || this.screen === "playing") {
            if (!graceActive) {
                this.birdVelocity += CONFIG.gravity * frameScale;
                this.birdVelocity = clamp(this.birdVelocity, -4.5, 4);
                this.birdY += this.birdVelocity * frameScale;
                this.birdFrameFloat = (this.birdFrameFloat + frameScale * 0.18) % 3;
            }

            if (this.birdVelocity < 0) {
                this.birdAngle = 25;
            } else {
                this.birdAngle = Math.max(this.birdAngle - (3 * frameScale), -90);
            }

            this.baseX -= CONFIG.pipeSpeed * frameScale;
            if (this.baseX <= -this.images.base.width) {
                this.baseX += this.images.base.width;
            }

            if (!graceActive) {
                this.pipeFrameCounter += frameScale;
                if (this.pipeFrameCounter >= CONFIG.pipeSpawnRate) {
                    this.pipeFrameCounter -= CONFIG.pipeSpawnRate;
                    this.spawnPipe();
                }

                for (const pipe of this.pipes) {
                    pipe.x -= CONFIG.pipeSpeed * frameScale;
                    if (!pipe.passed && pipe.x + this.images.pipe.width < this.birdX) {
                        pipe.passed = true;
                        this.score += 1;
                    }
                }

                this.pipes = this.pipes.filter((pipe) => pipe.x > -this.images.pipe.width - 20);

                const birdRect = this.getBirdRect();
                if (
                    birdRect.top <= CONFIG.topOutLimit
                    || this.birdY > CONFIG.height - CONFIG.groundHeight
                    || this.handlePipeCollisions(birdRect)
                ) {
                    this.endRound();
                }
            }
        }

        this.render();
    }

    drawBackground() {
        ctx.drawImage(this.images.background, 0, 0, CONFIG.width, CONFIG.height);
    }

    drawBase() {
        const y = CONFIG.height - CONFIG.groundHeight;
        const tileCount = Math.ceil(CONFIG.width / this.images.base.width) + 3;

        for (let index = 0; index < tileCount; index += 1) {
            const x = this.baseX + index * this.images.base.width;
            ctx.drawImage(this.images.base, x, y);
        }
    }

    drawBird() {
        const image = this.getBirdFrame();
        ctx.save();
        ctx.translate(this.birdX, this.birdY);
        ctx.rotate((this.birdAngle * Math.PI) / 180);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);
        ctx.restore();
    }

    drawPipes() {
        const pipeImage = this.images.pipe;
        for (const pipe of this.pipes) {
            const topY = pipe.gapY - CONFIG.pipeGap / 2 - pipeImage.height;
            const bottomY = pipe.gapY + CONFIG.pipeGap / 2;

            ctx.save();
            ctx.translate(pipe.x, topY + pipeImage.height);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImage, 0, 0);
            ctx.restore();

            ctx.drawImage(pipeImage, pipe.x, bottomY);
        }
    }

    drawMicMeter() {
        const meterWidth = 100;
        const meterHeight = 15;
        const meter = clamp(Math.round(this.mic.volume * 100), 0, 100);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, meterWidth, meterHeight);
        ctx.fillStyle = "#f05555";
        ctx.fillRect(10, 10, meter, meterHeight);
    }

    drawHud() {
        drawCenteredScore(this.score, 40, this.images.digits, 1);
        this.drawMicMeter();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`Best ${this.highscore}`, CONFIG.width - 10, 22);
        ctx.textAlign = "left";
        ctx.fillText(`Mic ${this.mic.volume.toFixed(2)}`, 10, 40);
        ctx.fillText(this.mic.ready ? "Voice mode ready" : "Tap mode active", 10, 58);
    }

    drawScoreCard() {
        const topScores = [...this.topScores];
        while (topScores.length < 5) {
            topScores.push(0);
        }

        const panelWidth = 196;
        const panelRect = {
            x: Math.round((CONFIG.width - panelWidth) / 2),
            y: 394,
            width: panelWidth,
            height: 102,
        };
        const innerRect = {
            x: panelRect.x + 10,
            y: panelRect.y + 10,
            width: panelRect.width - 20,
            height: panelRect.height - 20,
        };

        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.fillRect(panelRect.x + 5, panelRect.y + 6, panelRect.width, panelRect.height);

        ctx.fillStyle = "#439636";
        ctx.fillRect(panelRect.x, panelRect.y, panelRect.width, panelRect.height);
        ctx.fillStyle = "#2e451f";
        ctx.fillRect(panelRect.x + 3, panelRect.y + 3, panelRect.width - 6, panelRect.height - 6);
        ctx.fillStyle = "#89d65a";
        ctx.fillRect(panelRect.x + 5, panelRect.y + 5, panelRect.width - 10, panelRect.height - 10);
        ctx.fillStyle = "#d6c898";
        ctx.fillRect(innerRect.x, innerRect.y, innerRect.width, innerRect.height);
        ctx.fillStyle = "#f8f3dd";
        ctx.fillRect(innerRect.x + 3, innerRect.y + 3, innerRect.width - 6, innerRect.height - 6);

        ctx.strokeStyle = "rgba(255, 255, 240, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(innerRect.x + 12, innerRect.y + 10);
        ctx.lineTo(innerRect.x + innerRect.width - 32, innerRect.y + 10);
        ctx.stroke();

        ctx.fillStyle = "#212121";
        ctx.font = "bold 15px Arial";
        ctx.textAlign = "center";
        ctx.fillText("SCORE CARD", panelRect.x + panelRect.width / 2 - 8, panelRect.y + 23);
        ctx.textAlign = "left";
        drawTrophy(panelRect.x + panelRect.width - 30, panelRect.y + 8, 0.5);

        const rowTop = innerRect.y + 24;
        const rowStep = 11;
        const rankX = innerRect.x + 14;
        const scoreRight = innerRect.x + innerRect.width - 16;

        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "#1d1d1d";
        for (let index = 0; index < topScores.length; index += 1) {
            const rowCenter = rowTop + (index * rowStep);
            ctx.textBaseline = "middle";
            ctx.fillText(`${index + 1}.`, rankX, rowCenter);
            drawDigitNumber(topScores[index], scoreRight, rowCenter, this.images.digits, 0.23);
        }

        ctx.textBaseline = "alphabetic";
    }

    drawMenu() {
        this.drawBackground();
        this.drawBase();

        const birdFrame = this.getBirdFrame();
        ctx.drawImage(
            birdFrame,
            this.birdX - birdFrame.width / 2,
            220 + this.floatOffset - birdFrame.height / 2,
        );

        const messageX = (CONFIG.width - this.images.message.width) / 2;
        const messageY = 156 - this.images.message.height / 2;
        ctx.drawImage(this.images.message, messageX, messageY);

        drawImageRect(this.images.startButton, this.startButtonRect);
        this.drawScoreCard();
    }

    drawCountdown() {
        this.drawBackground();
        this.drawBase();
        this.drawBird();
        this.drawHud();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Get ready...", CONFIG.width / 2, 120);
        ctx.textAlign = "left";
    }

    drawGameOver() {
        this.drawBackground();
        this.drawPipes();
        this.drawBird();
        this.drawBase();
        drawCenteredScore(this.score, 40, this.images.digits, 1);

        const overlayRect = {
            x: 36,
            y: 118,
            width: CONFIG.width - 72,
            height: 240,
        };

        ctx.fillStyle = "rgba(12, 18, 24, 0.78)";
        ctx.fillRect(overlayRect.x, overlayRect.y, overlayRect.width, overlayRect.height);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(overlayRect.x, overlayRect.y, overlayRect.width, overlayRect.height);

        const overX = (CONFIG.width - this.images.gameOver.width) / 2;
        ctx.drawImage(this.images.gameOver, overX, 142 - this.images.gameOver.height / 2);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Score: ${this.score}`, CONFIG.width / 2, 208);
        ctx.fillStyle = "#ffcf54";
        ctx.font = "bold 18px Arial";
        ctx.fillText(`Best: ${this.highscore}`, CONFIG.width / 2, 236);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.fillText("Restart or return to the start page.", CONFIG.width / 2, 270);
        ctx.textAlign = "left";

        drawImageRect(this.images.restartButton, this.restartButtonRect);
        drawImageRect(this.images.quitButton, this.quitButtonRect);
    }

    render() {
        ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

        if (this.screen === "menu") {
            this.drawMenu();
            return;
        }

        if (this.screen === "countdown") {
            this.drawCountdown();
            return;
        }

        this.drawBackground();
        this.drawPipes();
        this.drawBird();
        this.drawBase();
        this.drawHud();

        if (this.screen === "gameover") {
            this.drawGameOver();
        }
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load asset: ${src}`));
        image.src = src;
    });
}

async function loadAssets() {
    const [
        background,
        base,
        gameOver,
        message,
        pipe,
        quitButton,
        restartButton,
        startButton,
        birdDown,
        birdMid,
        birdUp,
        ...digitImages
    ] = await Promise.all([
        loadImage(assetPaths.background),
        loadImage(assetPaths.base),
        loadImage(assetPaths.gameOver),
        loadImage(assetPaths.message),
        loadImage(assetPaths.pipe),
        loadImage(assetPaths.quitButton),
        loadImage(assetPaths.restartButton),
        loadImage(assetPaths.startButton),
        loadImage(assetPaths.birdDown),
        loadImage(assetPaths.birdMid),
        loadImage(assetPaths.birdUp),
        ...assetPaths.digits.map((path) => loadImage(path)),
    ]);

    return {
        background,
        base,
        gameOver,
        message,
        pipe,
        quitButton,
        restartButton,
        startButton,
        birdDown,
        birdMid,
        birdUp,
        digits: digitImages,
    };
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.width / rect.width;
    const scaleY = CONFIG.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
    };
}

async function bootstrap() {
    try {
        const sharedSettings = await loadSharedSettings();
        CONFIG = buildConfig(sharedSettings);
        applySharedSizing(CONFIG);

        const images = await loadAssets();
        const game = new FlappyVoiceGame(images);

        canvas.addEventListener("pointerdown", async (event) => {
            const point = getCanvasPoint(event);
            await game.handlePointerDown(point.x, point.y);
        });

        window.addEventListener("keydown", async (event) => {
            await game.handleKeyDown(event);
        });

        const loop = (timestamp) => {
            game.update(timestamp);
            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    } catch (error) {
        console.error(error);
        setStatus("The web build could not load all assets. Check the console for details.");
        ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
        ctx.fillStyle = "#10253a";
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Asset loading failed", CONFIG.width / 2, CONFIG.height / 2 - 12);
        ctx.font = "18px Arial";
        ctx.fillText("Open the browser console for details.", CONFIG.width / 2, CONFIG.height / 2 + 22);
        ctx.textAlign = "left";
    }
}

bootstrap();
