(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlaySubtitle = document.getElementById("overlay-subtitle");
  const startBtn = document.getElementById("start-btn");
  const voiceBtn = document.getElementById("voice-btn");
  const scoreChip = document.getElementById("score-chip");
  const bestChip = document.getElementById("best-chip");
  const voiceStatus = document.getElementById("voice-status");

  const W = canvas.width;
  const H = canvas.height;

  const GROUND_H = 110;
  const BIRD_X = 118;
  const BIRD_R = 16;
  const GRAVITY = 1650;
  const FLAP_V = -430;
  const PIPE_W = 64;
  const PIPE_SPEED = 175;
  const PIPE_GAP = 170;
  const PIPE_INTERVAL = 1450;
  const VOICE_COOLDOWN_MS = 300;

  const state = {
    phase: "ready", // ready, playing, gameover
    birdY: H * 0.44,
    birdV: 0,
    birdRot: 0,
    pipes: [],
    spawnMs: 0,
    score: 0,
    best: Number(localStorage.getItem("flappy_voice_best") || 0),
    lastTs: 0,
    lastVoiceMs: 0,
    voiceEnabled: false,
    voiceSupported: false,
    shouldAutoRestartVoice: false,
  };

  bestChip.textContent = `Best: ${state.best}`;

  function resetRun() {
    state.birdY = H * 0.44;
    state.birdV = 0;
    state.birdRot = 0;
    state.pipes = [];
    state.spawnMs = 0;
    state.score = 0;
    scoreChip.textContent = "Score: 0";
  }

  function setOverlay(visible, title = "", subtitle = "") {
    overlay.style.display = visible ? "flex" : "none";
    if (title) overlayTitle.textContent = title;
    if (subtitle) overlaySubtitle.innerHTML = subtitle;
  }

  function startGame() {
    resetRun();
    state.phase = "playing";
    setOverlay(false);
  }

  function endGame() {
    state.phase = "gameover";
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("flappy_voice_best", String(state.best));
      bestChip.textContent = `Best: ${state.best}`;
    }
    setOverlay(
      true,
      "Game Over",
      `Score: <strong>${state.score}</strong><br/>Press <strong>R</strong> to restart or <strong>Q</strong> for menu`
    );
  }

  function flap(source = "manual") {
    const now = performance.now();
    if (source === "voice" && now - state.lastVoiceMs < VOICE_COOLDOWN_MS) return;
    if (source === "voice") state.lastVoiceMs = now;

    if (state.phase === "ready") startGame();
    if (state.phase !== "playing") return;

    state.birdV = FLAP_V;
  }

  function addPipe() {
    const minGapY = 120;
    const maxGapY = H - GROUND_H - 120;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);
    state.pipes.push({
      x: W + 20,
      gapY,
      passed: false,
    });
  }

  function birdHitsPipe(pipe) {
    const topH = pipe.gapY - PIPE_GAP / 2;
    const bottomY = pipe.gapY + PIPE_GAP / 2;
    const birdLeft = BIRD_X - BIRD_R;
    const birdRight = BIRD_X + BIRD_R;
    const birdTop = state.birdY - BIRD_R;
    const birdBottom = state.birdY + BIRD_R;
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_W;

    const overlapX = birdRight > pipeLeft && birdLeft < pipeRight;
    if (!overlapX) return false;
    return birdTop < topH || birdBottom > bottomY;
  }

  function update(dt) {
    if (state.phase !== "playing") return;

    state.spawnMs += dt * 1000;
    if (state.spawnMs >= PIPE_INTERVAL) {
      state.spawnMs = 0;
      addPipe();
    }

    state.birdV += GRAVITY * dt;
    state.birdY += state.birdV * dt;
    state.birdRot = Math.max(-0.6, Math.min(1.1, state.birdV / 600));

    for (const pipe of state.pipes) {
      pipe.x -= PIPE_SPEED * dt;
      if (!pipe.passed && pipe.x + PIPE_W < BIRD_X) {
        pipe.passed = true;
        state.score += 1;
        scoreChip.textContent = `Score: ${state.score}`;
      }
      if (birdHitsPipe(pipe)) {
        endGame();
        return;
      }
    }

    state.pipes = state.pipes.filter((pipe) => pipe.x + PIPE_W > -2);

    if (state.birdY - BIRD_R < 0 || state.birdY + BIRD_R > H - GROUND_H) {
      endGame();
    }
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#86d9ff");
    g.addColorStop(1, "#4eb8ea");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawGround() {
    ctx.fillStyle = "#6fd56d";
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.fillStyle = "#5ec25c";
    ctx.fillRect(0, H - GROUND_H, W, 18);
  }

  function drawPipes() {
    ctx.fillStyle = "#58c75f";
    ctx.strokeStyle = "#2f8d3a";
    ctx.lineWidth = 4;

    for (const pipe of state.pipes) {
      const topH = pipe.gapY - PIPE_GAP / 2;
      const bottomY = pipe.gapY + PIPE_GAP / 2;
      const bottomH = H - GROUND_H - bottomY;

      ctx.fillRect(pipe.x, 0, PIPE_W, topH);
      ctx.strokeRect(pipe.x, 0, PIPE_W, topH);

      ctx.fillRect(pipe.x, bottomY, PIPE_W, bottomH);
      ctx.strokeRect(pipe.x, bottomY, PIPE_W, bottomH);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(BIRD_X, state.birdY);
    ctx.rotate(state.birdRot);
    ctx.fillStyle = "#ffd45a";
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cc9e24";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ff8a30";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(23, -4);
    ctx.lineTo(23, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(4, -5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    drawSky();
    drawPipes();
    drawGround();
    drawBird();
  }

  function gameLoop(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min((ts - state.lastTs) / 1000, 0.034);
    state.lastTs = ts;

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  function setupVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceStatus.textContent = "Voice: Not supported";
      voiceBtn.disabled = true;
      return null;
    }

    state.voiceSupported = true;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (!result || !result[0]) return;
      const spoken = result[0].transcript.toLowerCase().trim();
      if (spoken.includes("jump")) flap("voice");
    };

    rec.onerror = () => {
      voiceStatus.textContent = "Voice: Error";
    };

    rec.onend = () => {
      if (state.voiceEnabled && state.shouldAutoRestartVoice) {
        try {
          rec.start();
        } catch (_e) {
          // Ignore if browser refuses immediate restart.
        }
      }
    };

    return rec;
  }

  const recognition = setupVoice();

  function setVoiceEnabled(enabled) {
    state.voiceEnabled = enabled;
    if (!state.voiceSupported || !recognition) {
      voiceStatus.textContent = "Voice: Not supported";
      return;
    }

    if (enabled) {
      state.shouldAutoRestartVoice = true;
      try {
        recognition.start();
        voiceStatus.textContent = 'Voice: Listening for "jump"';
        voiceBtn.textContent = "Disable Voice";
      } catch (_e) {
        voiceStatus.textContent = "Voice: Start failed";
      }
    } else {
      state.shouldAutoRestartVoice = false;
      recognition.stop();
      voiceStatus.textContent = "Voice: Off";
      voiceBtn.textContent = "Enable Voice";
    }
  }

  startBtn.addEventListener("click", () => startGame());
  voiceBtn.addEventListener("click", () => setVoiceEnabled(!state.voiceEnabled));

  canvas.addEventListener("pointerdown", () => {
    if (state.phase === "gameover") return;
    flap("manual");
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      flap("manual");
    } else if (e.key.toLowerCase() === "r") {
      if (state.phase === "gameover") startGame();
    } else if (e.key.toLowerCase() === "q") {
      state.phase = "ready";
      resetRun();
      setOverlay(true, "Ready", 'Say <strong>jump</strong> or press <strong>Space</strong> to flap');
    }
  });

  setOverlay(true, "Ready", 'Say <strong>jump</strong> or press <strong>Space</strong> to flap');
  requestAnimationFrame(gameLoop);
})();
