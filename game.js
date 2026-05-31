"use strict";

/* =========================================================
   スマホ対策
   - 画面固定
   - ダブルタップズーム禁止
   - ピンチズーム禁止
   - スクロール禁止
   - iPhone Safari / Android Chrome 対策
========================================================= */

document.addEventListener(
  "touchmove",
  function (e) {
    e.preventDefault();
  },
  { passive: false }
);

let lastTouchEnd = 0;

document.addEventListener(
  "touchend",
  function (event) {
    const now = Date.now();

    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }

    lastTouchEnd = now;
  },
  false
);

document.addEventListener("gesturestart", function (e) {
  e.preventDefault();
});

document.addEventListener("gesturechange", function (e) {
  e.preventDefault();
});

document.addEventListener("gestureend", function (e) {
  e.preventDefault();
});

window.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});
document.addEventListener("dblclick", function (e) {
  e.preventDefault();
}, { passive: false });


/* =========================================================
   Canvas / UI
========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const jumpBtn = document.getElementById("jumpBtn");
const dashBtn = document.getElementById("dashBtn");
const pauseBtn = document.getElementById("pauseBtn");
const soundBtn = document.getElementById("soundBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");

const scoreValueEl = document.getElementById("scoreValue");
const bestValueEl = document.getElementById("bestValue");
const coinValueEl = document.getElementById("coinValue");
const speedValueEl = document.getElementById("speedValue");

const sprite = new Image();
sprite.src = "assets/robo_dino.png";

const W = canvas.width;
const H = canvas.height;
const groundY = 420;

const hiKey = "ai-robo-dino-run-high-score";

let game;
let soundOn = true;
let audioCtx = null;

/* =========================================================
   効果音
========================================================= */

function beep(freq = 440, duration = 0.06, type = "sine", volume = 0.03) {
  if (!soundOn) return;

  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + duration
    );
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

/* =========================================================
   ゲーム初期化
========================================================= */

function resetGame() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(function () {});
  }

  game = {
    running: true,
    paused: false,
    over: false,

    score: 0,
    coins: 0,
    highScore: Number(localStorage.getItem(hiKey) || 0),

    speed: 6,
    frame: 0,
    combo: 0,

    mission: "コインを10枚集めろ！",
    message: "AI ROBO DINO RUN 起動！",
    messageTimer: 130,

    particles: [],
    obstacles: [],
    coinsList: [],
    powerups: [],
    lasers: [],

    boss: null,

    dino: {
      x: 120,
      y: groundY,
      w: 118,
      h: 132,
      vy: 0,

      onGround: true,
      jumpCount: 0,

      glow: 0,
      dash: 0,
      shield: 0,
      invincible: 0,
    },
  };

  pauseBtn.textContent = "PAUSE";
  updateScoreBoard();
  beep(660, 0.08, "triangle");
}

function say(text) {
  game.message = text;
  game.messageTimer = 110;
}

function getFinalScore() {
  if (!game) return 0;
  return Math.floor(game.score / 10) + game.coins * 5;
}

function updateScoreBoard() {
  if (!game) return;

  const finalScore = getFinalScore();
  const best = Math.max(game.highScore, finalScore);

  if (scoreValueEl) scoreValueEl.textContent = String(finalScore);
  if (bestValueEl) bestValueEl.textContent = String(best);
  if (coinValueEl) coinValueEl.textContent = String(game.coins);
  if (speedValueEl) speedValueEl.textContent = game.speed.toFixed(1);
}

function resetHighScore() {
  localStorage.removeItem(hiKey);

  if (game) {
    game.highScore = 0;
    say("ハイスコアをリセットしました");
    updateScoreBoard();
  }
}

/* =========================================================
   操作
========================================================= */

function jump() {
  if (!game) return;

  if (game.over) {
    resetGame();
    return;
  }

  if (game.paused) return;

  const d = game.dino;

  if (d.onGround || d.jumpCount < 2) {
    d.vy = d.jumpCount === 0 ? -18 : -14;
    d.onGround = false;
    d.jumpCount += 1;
    d.glow = 18;

    say(d.jumpCount === 1 ? "ジャンプ！" : "二段ジャンプ成功！");
    beep(d.jumpCount === 1 ? 520 : 720, 0.05, "square", 0.02);

    addBurst(d.x + 45, groundY - 8, 14, "cyan");
  }
}

function dash() {
  if (!game || game.over || game.paused) return;

  const d = game.dino;

  if (d.dash <= 0) {
    d.dash = 22;
    d.invincible = Math.max(d.invincible, 16);
    d.glow = 28;

    say("ブーストダッシュ！短時間無敵！");
    beep(180, 0.09, "sawtooth", 0.025);

    addBurst(d.x + 30, d.y - 60, 24, "blue");
  }
}

function togglePause() {
  if (!game || game.over) return;

  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? "RESUME" : "PAUSE";
}

/* =========================================================
   生成処理
========================================================= */

function addBurst(x, y, n, color = "cyan") {
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.8) * 7,
      life: 20 + Math.random() * 20,
      color,
    });
  }
}

function spawnObstacle() {
  const r = Math.random();

  if (r < 0.2 && game.score > 500) {
    game.obstacles.push({
      x: W + 40,
      y: groundY - 120,
      w: 60,
      h: 34,
      type: "drone",
    });
  } else {
    const h = 42 + Math.random() * 62;
    const w = 32 + Math.random() * 34;

    game.obstacles.push({
      x: W + 40,
      y: groundY - h,
      w,
      h,
      type: r > 0.55 ? "rock" : "cone",
    });
  }
}

function spawnCoinLine() {
  const baseY = groundY - 90 - Math.random() * 110;

  for (let i = 0; i < 5; i++) {
    game.coinsList.push({
      x: W + i * 38,
      y: baseY + Math.sin(i) * 18,
      r: 12,
      taken: false,
    });
  }
}

function spawnPowerup() {
  const type = Math.random() > 0.5 ? "shield" : "magnet";

  game.powerups.push({
    x: W + 40,
    y: groundY - 150 - Math.random() * 80,
    w: 34,
    h: 34,
    type,
  });
}

function spawnBoss() {
  game.boss = {
    x: W + 80,
    y: 95,
    hp: 3,
    cooldown: 50,
    active: true,
  };

  say("警告：ボスドローン接近！");
  beep(110, 0.25, "sawtooth", 0.035);
}

/* =========================================================
   当たり判定
========================================================= */

function rectsHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function circleHitRect(c, r) {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));

  return Math.hypot(c.x - nx, c.y - ny) < c.r;
}

function playerBox() {
  const d = game.dino;

  return {
    x: d.x + 28,
    y: d.y - d.h + 20,
    w: d.w - 45,
    h: d.h - 28,
  };
}

function hitDamage() {
  const d = game.dino;

  if (d.invincible > 0) return;

  if (d.shield > 0) {
    d.shield = 0;
    d.invincible = 70;

    say("シールドが身代わりになった！");
    beep(260, 0.12, "triangle", 0.035);

    addBurst(d.x + 60, d.y - 70, 30, "shield");
    return;
  }

  game.over = true;
  game.running = false;

  const final = Math.floor(game.score / 10) + game.coins * 5;

  if (final > game.highScore) {
    localStorage.setItem(hiKey, String(final));
    game.highScore = final;
    say("NEW RECORD！ハイスコア更新！");
  } else {
    say("システム停止！RESTARTで再起動");
  }

  updateScoreBoard();
  beep(90, 0.35, "sawtooth", 0.04);
}

/* =========================================================
   更新処理
========================================================= */

function update() {
  if (!game || !game.running || game.paused) return;

  game.frame++;
  game.score += 1 + game.combo * 0.02;
  game.speed = Math.min(16, 6 + game.score / 850 + game.coins / 60);

  const d = game.dino;

  d.vy += 0.85;
  d.y += d.vy;

  if (d.y >= groundY) {
    d.y = groundY;
    d.vy = 0;
    d.onGround = true;
    d.jumpCount = 0;
  }

  if (d.glow > 0) d.glow--;
  if (d.dash > 0) d.dash--;
  if (d.shield > 0) d.shield--;
  if (d.invincible > 0) d.invincible--;

  const boost = d.dash > 0 ? 5 : 0;
  const moveSpeed = game.speed + boost;

  if (game.frame % Math.max(42, Math.floor(105 - game.speed * 4)) === 0) {
    spawnObstacle();
  }

  if (game.frame % 150 === 0) {
    spawnCoinLine();
  }

  if (game.frame % 520 === 0) {
    spawnPowerup();
  }

  if (game.score > 1400 && !game.boss && Math.floor(game.score) % 1500 < 3) {
    spawnBoss();
  }

  for (const o of game.obstacles) {
    o.x -= moveSpeed;
  }

  game.obstacles = game.obstacles.filter((o) => o.x + o.w > -60);

  for (const c of game.coinsList) {
    c.x -= moveSpeed;

    if (d.shield > 0 && Math.abs(c.x - d.x) < 180) {
      c.x += (d.x + 60 - c.x) * 0.08;
      c.y += (d.y - 70 - c.y) * 0.08;
    }
  }

  game.coinsList = game.coinsList.filter((c) => c.x > -40 && !c.taken);

  for (const p of game.powerups) {
    p.x -= moveSpeed;
  }

  game.powerups = game.powerups.filter((p) => p.x > -50);

  for (const l of game.lasers) {
    l.x -= moveSpeed + 3;
  }

  game.lasers = game.lasers.filter((l) => l.x + l.w > -40);

  for (const p of game.particles) {
    p.x += p.vx - moveSpeed * 0.25;
    p.y += p.vy;
    p.vy += 0.25;
    p.life--;
  }

  game.particles = game.particles.filter((p) => p.life > 0);

  if (game.boss) {
    game.boss.x -= 0.35;
    game.boss.y = 95 + Math.sin(game.frame / 28) * 30;
    game.boss.cooldown--;

    if (game.boss.cooldown <= 0) {
      game.lasers.push({
        x: game.boss.x,
        y: game.boss.y + 28,
        w: 80,
        h: 10,
      });

      game.boss.cooldown = Math.max(32, 80 - game.speed * 3);
      say("レーザー回避！");
    }

    if (game.boss.x < -120) {
      game.boss = null;
    }
  }

  const box = playerBox();

  for (const o of game.obstacles) {
    if (rectsHit(box, o)) hitDamage();
  }

  for (const l of game.lasers) {
    if (rectsHit(box, l)) hitDamage();
  }

  for (const c of game.coinsList) {
    if (circleHitRect(c, box)) {
      c.taken = true;
      game.coins++;
      game.combo++;

      say(game.combo >= 10 ? `COMBO ${game.combo}！` : "コイン取得！");
      beep(760 + Math.min(game.combo, 12) * 28, 0.04, "triangle", 0.018);

      addBurst(c.x, c.y, 8, "coin");

      if (game.coins === 10) say("ミッション達成！次は30枚だ！");
      if (game.coins === 30) say("AI評価：超優秀プレイヤー！");
    }
  }

  for (const p of game.powerups) {
    if (!p.taken && rectsHit(box, p)) {
      p.taken = true;

      if (p.type === "shield") {
        d.shield = 600;
        say("シールド展開！一度だけ守る！");
      } else {
        d.shield = 420;
        say("マグネット起動！コインを吸引！");
      }

      beep(980, 0.1, "sine", 0.03);
      addBurst(p.x, p.y, 24, "shield");
    }
  }

  game.powerups = game.powerups.filter((p) => !p.taken);

  updateScoreBoard();

  if (Math.floor(game.score) % 700 === 0) {
    say("AI難易度、自動上昇中！");
  }
}

/* =========================================================
   描画
========================================================= */

function drawBackground() {
  ctx.clearRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#f8feff");
  sky.addColorStop(0.58, "#e0f9ff");
  sky.addColorStop(1, "#0f2b42");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(0, 220, 255, 0.16)";

  for (let i = 0; i < 9; i++) {
    const x = i * 150 - ((game.frame * game.speed * 0.22) % 150);

    ctx.beginPath();
    ctx.arc(x, 95 + Math.sin((game.frame + i * 20) / 40) * 18, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(0, 130, 180, 0.25)";

  for (let x = -120; x < W + 120; x += 120) {
    const sx = x - ((game.frame * game.speed * 0.5) % 120);

    ctx.beginPath();
    ctx.moveTo(sx, 260);
    ctx.lineTo(sx + 60, 210);
    ctx.lineTo(sx + 120, 260);
    ctx.stroke();
  }

  ctx.fillStyle = "#143248";
  ctx.fillRect(0, groundY, W, H - groundY);

  ctx.strokeStyle = "rgba(0, 238, 255, 0.7)";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(W, groundY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0, 238, 255, 0.25)";

  for (let x = -80; x < W + 80; x += 80) {
    const sx = x - ((game.frame * game.speed) % 80);

    ctx.beginPath();
    ctx.moveTo(sx, groundY + 36);
    ctx.lineTo(sx + 42, groundY + 36);
    ctx.stroke();
  }
}

function drawDino() {
  const d = game.dino;
  const runBob = d.onGround ? Math.sin(game.frame * 0.32) * 5 : 0;
  const tilt = d.onGround ? Math.sin(game.frame * 0.22) * 0.03 : d.vy * 0.012;
  const scaleY = d.onGround ? 1 + Math.sin(game.frame * 0.32) * 0.025 : 1;

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#001827";
  ctx.beginPath();
  ctx.ellipse(d.x + d.w / 2, groundY + 12, 58, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (d.glow > 0 || d.shield > 0 || d.invincible > 0) {
    ctx.save();

    ctx.shadowColor = d.shield > 0 ? "#00ff99" : "#00eaff";
    ctx.shadowBlur = 35;
    ctx.strokeStyle = d.shield > 0 ? "rgba(0,255,153,.75)" : "rgba(0,234,255,.45)";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.arc(d.x + 60, d.y - 70, 72 + Math.sin(game.frame / 8) * 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.save();

  ctx.translate(d.x + d.w / 2, d.y - d.h / 2 + runBob);
  ctx.rotate(tilt);
  ctx.scale(d.dash > 0 ? 1.08 : 1, scaleY);
  ctx.globalAlpha = d.invincible > 0 && game.frame % 6 < 3 ? 0.45 : 1;
  ctx.drawImage(sprite, -d.w / 2, -d.h / 2, d.w, d.h);

  ctx.restore();
}

function drawObstacles() {
  for (const o of game.obstacles) {
    ctx.save();

    if (o.type === "rock") {
      ctx.fillStyle = "#263849";
      ctx.strokeStyle = "#00dfff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 8);
      ctx.fill();
      ctx.stroke();
    } else if (o.type === "drone") {
      ctx.fillStyle = "#111a2b";
      ctx.strokeStyle = "#ff4df0";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ff4df0";

      ctx.beginPath();
      ctx.arc(o.x + 15, o.y + 17, 5, 0, Math.PI * 2);
      ctx.arc(o.x + 45, o.y + 17, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ffb000";

      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2, o.y);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.lineTo(o.x, o.y + o.h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawCoinsPowerupsBoss() {
  for (const c of game.coinsList) {
    ctx.save();

    ctx.translate(c.x, c.y);
    ctx.rotate(game.frame * 0.08);

    ctx.fillStyle = "#ffd84d";
    ctx.strokeStyle = "#fff7b0";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#9b6b00";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("AI", 0, 5);

    ctx.restore();
  }

  for (const p of game.powerups) {
    ctx.save();

    ctx.fillStyle = p.type === "shield" ? "#00ff99" : "#00e5ff";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 10);
    ctx.fill();

    ctx.fillStyle = "#062130";
    ctx.font = "bold 20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(p.type === "shield" ? "S" : "M", p.x + p.w / 2, p.y + 24);

    ctx.restore();
  }

  if (game.boss) {
    const b = game.boss;

    ctx.save();

    ctx.fillStyle = "#151528";
    ctx.strokeStyle = "#ff45e6";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.roundRect(b.x, b.y, 110, 62, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ff45e6";

    ctx.beginPath();
    ctx.arc(b.x + 35, b.y + 32, 8, 0, Math.PI * 2);
    ctx.arc(b.x + 75, b.y + 32, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  for (const l of game.lasers) {
    ctx.save();

    ctx.fillStyle = "rgba(255, 30, 180, 0.85)";
    ctx.shadowColor = "#ff2edb";
    ctx.shadowBlur = 18;

    ctx.fillRect(l.x, l.y, l.w, l.h);

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.save();

    ctx.globalAlpha = Math.max(0, p.life / 34);
    ctx.fillStyle =
      p.color === "coin"
        ? "#ffd84d"
        : p.color === "shield"
          ? "#00ff99"
          : "rgba(0, 230, 255, .8)";

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawUI() {
  const finalScore = getFinalScore();

  // ゲーム画面内の常時スコアパネルは廃止。
  // SCORE / BEST / COIN / SPEED はタイトル下のDOMに表示する。

  if (game.messageTimer > 0) {
    game.messageTimer--;

    const messageWidth = Math.min(620, W - 48);
    const messageX = (W - messageWidth) / 2;

    ctx.save();
    ctx.fillStyle = "rgba(0,28,45,.78)";
    ctx.beginPath();
    ctx.roundRect(messageX, 18, messageWidth, 48, 16);
    ctx.fill();

    ctx.fillStyle = "#bfffff";
    ctx.textAlign = "center";
    ctx.font = "bold 20px system-ui";
    ctx.fillText(game.message, W / 2, 49);
    ctx.restore();
  }

  if (game.paused) {
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 52px system-ui";
    ctx.fillText("PAUSE", W / 2, H / 2);

    ctx.textAlign = "left";
  }

  if (game.over) {
    ctx.fillStyle = "rgba(0,0,0,.62)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";

    ctx.font = "bold 56px system-ui";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 55);

    ctx.font = "bold 26px system-ui";
    ctx.fillText(`SCORE ${finalScore}`, W / 2, H / 2 - 6);

    ctx.font = "bold 22px system-ui";
    ctx.fillText(`BEST ${Math.max(game.highScore, finalScore)}`, W / 2, H / 2 + 28);

    ctx.font = "20px system-ui";
    ctx.fillText("START / RESTARTで再挑戦", W / 2, H / 2 + 66);

    ctx.textAlign = "left";
  }
}
function draw() {
  if (!game) resetGame();

  drawBackground();
  drawParticles();
  drawCoinsPowerupsBoss();
  drawObstacles();
  drawDino();
  drawUI();
}

/* =========================================================
   ループ
========================================================= */

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* =========================================================
   イベント
========================================================= */

function addFastButton(button, action) {
  button.addEventListener(
    "touchstart",
    function (e) {
      e.preventDefault();
      action();
    },
    { passive: false }
  );

  button.addEventListener(
    "pointerdown",
    function (e) {
      if (e.pointerType === "touch") return;
      e.preventDefault();
      action();
    },
    { passive: false }
  );
}

addFastButton(startBtn, resetGame);
addFastButton(jumpBtn, jump);
addFastButton(dashBtn, dash);
addFastButton(pauseBtn, togglePause);
addFastButton(soundBtn, function () {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
});
addFastButton(resetScoreBtn, function () {
  if (confirm("ハイスコアをリセットしますか？")) {
    resetHighScore();
  }
});


window.addEventListener("keydown", function (e) {
  if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
    e.preventDefault();
    jump();
  }

  if (["ShiftLeft", "ShiftRight", "ArrowDown", "KeyS"].includes(e.code)) {
    e.preventDefault();
    dash();
  }

  if (e.code === "Enter") {
    e.preventDefault();
    resetGame();
  }

  if (e.code === "KeyP") {
    e.preventDefault();
    togglePause();
  }
});

canvas.addEventListener(
  "touchstart",
  function (e) {
    e.preventDefault();
    jump();
  },
  { passive: false }
);

canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();
  jump();
});

/* =========================================================
   古いブラウザ向け roundRect 対策
========================================================= */

if (CanvasRenderingContext2D.prototype.roundRect === undefined) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

/* =========================================================
   起動
========================================================= */

resetGame();

sprite.onload = function () {
  requestAnimationFrame(loop);
};

sprite.onerror = function () {
  requestAnimationFrame(loop);
};

const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const helpText=document.getElementById("helpText");
if(helpText){
 helpText.innerHTML=isMobile
 ? "スマホ操作: 画面タップ/JUMP=ジャンプ・DASH=ダッシュ"
 : "PC操作: Space=ジャンプ・Shift=ダッシュ・P=一時停止";
}
