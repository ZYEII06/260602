// ============================================================
// 怪獸獵人 — 彩色砲台射擊遊戲（含關卡難易度）
// ============================================================

// ── 顏色調色盤 ──
const COLORS = [
  { hex: '#7F77DD', name: '紫' },
  { hex: '#1D9E75', name: '綠' },
  { hex: '#D85A30', name: '橘' },
  { hex: '#BA7517', name: '金' },
  { hex: '#D4537E', name: '粉' },
  { hex: '#378ADD', name: '藍' },
  { hex: '#63c5da', name: '青' },
  { hex: '#e8c55a', name: '黃' },
];

// ── 難易度設定 ──
const LEVELS = {
  easy: {
    label: '🌱 簡單',
    desc:  '適合新手，怪獸慢、換彈慢、顏色少',
    duration:      30,
    spawnInterval: 1.4,     // 怪獸生成間隔(秒)
    bulletSpeed:   10,
    reloadTime:    3000,    // 換彈藥間隔(ms)
    ballSpeedMin:  0.6,
    ballSpeedMax:  1.6,
    ballRMin:      28,
    ballRMax:      52,
    colorCount:    4,       // 只用幾種顏色
    killScore:     10,
    wrongPenalty:  -3,
    missPenalty:   0,
    bonusStreak:   3,
    bonusScore:    15,
    bg:            [8, 8, 24],
    accentColor:   '#1D9E75',
  },
  normal: {
    label: '⚔️ 普通',
    desc:  '標準挑戰，平衡的速度與顏色數',
    duration:      30,
    spawnInterval: 0.8,
    bulletSpeed:   9,
    reloadTime:    2200,
    ballSpeedMin:  1.2,
    ballSpeedMax:  2.8,
    ballRMin:      22,
    ballRMax:      48,
    colorCount:    6,
    killScore:     10,
    wrongPenalty:  -5,
    missPenalty:   -2,
    bonusStreak:   3,
    bonusScore:    15,
    bg:            [8, 8, 24],
    accentColor:   '#7F77DD',
  },
  hard: {
    label: '💀 困難',
    desc:  '高速、全色、嚴苛懲罰，挑戰極限',
    duration:      30,
    spawnInterval: 0.45,
    bulletSpeed:   11,
    reloadTime:    1400,
    ballSpeedMin:  2.0,
    ballSpeedMax:  4.5,
    ballRMin:      18,
    ballRMax:      42,
    colorCount:    8,
    killScore:     15,
    wrongPenalty:  -10,
    missPenalty:   -3,
    bonusStreak:   4,
    bonusScore:    25,
    bg:            [20, 5, 5],
    accentColor:   '#D85A30',
  },
};

// ── 全域狀態 ──
let balls     = [];
let bullets   = [];
let particles = [];
let popups    = [];
let turret;
let score         = 0;
let streak        = 0;
let timeLeft      = 30;
let lastSpawn     = 0;
let gameState     = 'select'; // 'select' | 'playing' | 'over'
let startTime     = 0;
let finalScore    = 0;
let shakeMag      = 0;
let currentLevel  = null;   // 當前選擇的 LEVELS 物件
let levelKey      = 'normal';
let activeColors  = [];     // 本局使用的顏色子集

// ============================================================
// Turret
// ============================================================
class Turret {
  constructor() {
    this.x = 0; this.y = 0; this.r = 38;
    this.rid   = random(10000);
    this.color = COLORS[0];
    this.nextColorTimer = 0;
    this.reloadTime = 2200;
    this.angle = 0;
  }

  reset(lvl) {
    this.x = width / 2;
    this.y = height / 2;
    this.reloadTime = lvl.reloadTime;
    this.color = random(activeColors);
    this.nextColorTimer = millis() + this.reloadTime;
  }

  update() {
    this.angle = atan2(mouseY - this.y, mouseX - this.x);
    if (millis() > this.nextColorTimer) {
      // 只從場上現有怪獸的顏色中選
      if (balls.length > 0) {
        this.color = random(balls.map(b => b.color));
      } else {
        this.color = random(activeColors);
      }
      this.nextColorTimer = millis() + this.reloadTime;
    }
  }

  shoot() {
    let bx = this.x + cos(this.angle) * (this.r + 10);
    let by = this.y + sin(this.angle) * (this.r + 10);
    bullets.push(new Bullet(bx, by, this.angle, this.color, currentLevel.bulletSpeed));
  }

  draw() {
    push();
    translate(this.x, this.y);

    // 觸角
    stroke(this.color.hex); strokeWeight(2); noFill();
    for (let a = 0; a < TWO_PI; a += TWO_PI / 6) {
      push(); rotate(a);
      beginShape();
      for (let i = 0; i < 20; i++) {
        vertex(this.r * 0.55 + i * 1.6, sin(i / 4 + frameCount / 8 + this.rid) * 7);
      }
      endShape(); pop();
    }

    // 身體
    noStroke(); fill(this.color.hex);
    ellipse(0, 0, this.r * 2, this.r * 2);

    // 眼睛（朝向滑鼠）
    let ex = cos(this.angle) * 7, ey = sin(this.angle) * 7;
    fill(20);
    circle(ex - 8 + cos(this.angle + HALF_PI) * 9, ey - 8 + sin(this.angle + HALF_PI) * 9, 11);
    circle(ex - 8 + cos(this.angle - HALF_PI) * 9, ey - 8 + sin(this.angle - HALF_PI) * 9, 11);
    fill(255, 255, 255, 220);
    circle(ex - 6 + cos(this.angle + HALF_PI) * 9, ey - 10 + sin(this.angle + HALF_PI) * 9, 4);
    circle(ex - 6 + cos(this.angle - HALF_PI) * 9, ey - 10 + sin(this.angle - HALF_PI) * 9, 4);

    // 砲管
    push(); rotate(this.angle);
    fill(40); noStroke();
    rect(this.r - 4, -6, 22, 12, 3);
    fill(this.color.hex);
    rect(this.r + 6, -4, 14, 8, 2);
    pop();

    // 彈藥標籤
    noStroke(); fill(this.color.hex + 'cc');
    rect(-30, -this.r - 30, 60, 20, 6);
    fill(255); textAlign(CENTER, CENTER); textSize(11);
    text('▶ ' + this.color.name + ' 彈', 0, -this.r - 20);

    pop();
  }
}

// ============================================================
// Bullet
// ============================================================
class Bullet {
  constructor(x, y, angle, color, spd) {
    this.x = x; this.y = y;
    this.vx = cos(angle) * spd;
    this.vy = sin(angle) * spd;
    this.color = color; this.r = 8; this.alive = true;
    this.trail = [];
  }
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.alive = false;
  }
  draw() {
    for (let i = 0; i < this.trail.length; i++) {
      let alpha = map(i, 0, this.trail.length, 30, 160);
      let sz    = map(i, 0, this.trail.length, 3, this.r * 1.8);
      noStroke(); fill(this.color.hex + hex(floor(alpha), 2));
      circle(this.trail[i].x, this.trail[i].y, sz);
    }
    noStroke(); fill(this.color.hex);
    circle(this.x, this.y, this.r * 2);
    fill(255, 255, 255, 180);
    circle(this.x - 2, this.y - 2, this.r * 0.7);
  }
}

// ============================================================
// Ball
// ============================================================
class Ball {
  constructor(args) {
    this.r     = args.r || 40;
    this.p     = args.p || { x: random(width), y: random(height) };
    this.v     = { x: random(-2, 2), y: random(-2, 2) };
    this.a     = args.a || { x: 0, y: 0 };
    this.color = args.color || random(activeColors);
    this.mode  = random(['happy', 'bad']);
    this.rid   = random(10000);
    this.alive = true;
    this.flash = 0;
    this.scale = 0.1;
  }
  update() {
    if (this.scale < 1) this.scale = min(1, this.scale + 0.08);
    this.v.x += this.a.x; this.v.y += this.a.y;
    this.v.x *= 0.97;     this.v.y *= 0.97;
    if (this.mode === 'happy') this.p.y += sin(frameCount / 10 + this.rid) * 1.2;
    this.p.x += this.v.x; this.p.y += this.v.y;
    if (this.p.x < this.r) { this.p.x = this.r; this.v.x *= -1; }
    if (this.p.x > width - this.r) { this.p.x = width - this.r; this.v.x *= -1; }
    if (this.p.y < this.r) { this.p.y = this.r; this.v.y *= -1; }
    if (this.p.y > height - this.r) { this.p.y = height - this.r; this.v.y *= -1; }
    if (this.flash > 0) this.flash--;
  }
  draw() {
    push(); translate(this.p.x, this.p.y); scale(this.scale);
    let dc = (this.flash > 0 && this.flash % 4 < 2) ? '#ff3333' : this.color.hex;
    // 腳
    stroke(dc); strokeWeight(2); noFill();
    for (let a = 0; a < TWO_PI; a += TWO_PI / 8) {
      push(); rotate(a);
      beginShape();
      for (let i = 0; i < 25; i++) {
        vertex(this.r / 2 + i * 1.8, sin(i / 5 + frameCount / 10 + this.rid) * 8);
      }
      endShape(); pop();
    }
    // 色環
    noFill(); stroke(dc); strokeWeight(3);
    circle(0, 0, this.r * 2 + 10);
    // 身體
    noStroke(); fill(dc);
    circle(0, 0, this.r * 2);
    // 眼睛
    fill(20); noStroke();
    if (this.mode === 'happy') {
      circle(-this.r / 3, -this.r / 5, this.r / 3.2);
      circle( this.r / 3, -this.r / 5, this.r / 3.2);
      fill(255, 220);
      circle(-this.r / 3 + 2, -this.r / 5 - 2, this.r / 9);
      circle( this.r / 3 + 2, -this.r / 5 - 2, this.r / 9);
    } else {
      arc(-this.r / 3, -this.r / 5, this.r / 3.2, this.r / 3.2, PI, TWO_PI);
      arc( this.r / 3, -this.r / 5, this.r / 3.2, this.r / 3.2, PI, TWO_PI);
    }
    // 嘴巴
    noFill(); stroke(20); strokeWeight(2.5);
    if (this.mode === 'happy') arc(0, this.r / 5, this.r / 2, this.r / 3.5, 0, PI);
    else arc(0, this.r / 3.5, this.r / 2, this.r / 3.5, PI, TWO_PI);
    pop();
  }
  hitByBullet(b) { return dist(b.x, b.y, this.p.x, this.p.y) < this.r + b.r; }
  clickedAt(mx, my) { return dist(mx, my, this.p.x, this.p.y) < this.r; }
}

// ============================================================
// Particle & Popup
// ============================================================
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = random(-6, 6); this.vy = random(-8, 2);
    this.color = color; this.life = 255; this.r = random(3, 9);
  }
  update() { this.x += this.vx; this.y += this.vy; this.vy += 0.3; this.life -= 8; }
  draw() {
    noStroke(); fill(this.color + hex(max(0, floor(this.life)), 2));
    circle(this.x, this.y, this.r * 2);
  }
}

class Popup {
  constructor(x, y, txt, col) {
    this.x = x; this.y = y; this.txt = txt; this.col = col;
    this.life = 255; this.vy = -2;
  }
  update() { this.y += this.vy; this.life -= 6; this.vy *= 0.96; }
  draw() {
    textAlign(CENTER, CENTER); textSize(18); textStyle(BOLD);
    fill(this.col + hex(max(0, floor(this.life)), 2));
    noStroke(); text(this.txt, this.x, this.y); textStyle(NORMAL);
  }
}

function explode(x, y, colorHex, count) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, colorHex));
}

// ============================================================
// setup / draw
// ============================================================
function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('game-canvas');
  textFont('monospace');
  turret = new Turret();
}

function draw() {
  let sx = 0, sy = 0;
  if (shakeMag > 0) {
    sx = random(-shakeMag, shakeMag); sy = random(-shakeMag, shakeMag);
    shakeMag *= 0.85; if (shakeMag < 0.5) shakeMag = 0;
  }
  push(); translate(sx, sy);

  let bg = currentLevel ? currentLevel.bg : [8, 8, 24];
  fill(bg[0], bg[1], bg[2], 35);
  noStroke(); rect(0, 0, width, height);

  if      (gameState === 'select')  drawSelectScreen();
  else if (gameState === 'playing') { updateGame(); drawGame(); drawHUD(); }
  else if (gameState === 'over')    drawOverScreen();

  pop();
}

// ============================================================
// Game logic
// ============================================================
function updateGame() {
  let lvl = currentLevel;
  timeLeft = lvl.duration - floor((millis() - startTime) / 1000);
  if (timeLeft <= 0) {
    timeLeft = 0; finalScore = score; gameState = 'over'; return;
  }

  turret.update();

  if (millis() - lastSpawn > lvl.spawnInterval * 1000) {
    spawnBall(); lastSpawn = millis();
  }

  for (let b of bullets) b.update();

  for (let ball of balls) {
    ball.update();
    for (let b of bullets) {
      if (!b.alive || !ball.alive) continue;
      if (ball.hitByBullet(b)) {
        b.alive = false;
        if (b.color.hex === ball.color.hex) {
          killBall(ball);
        } else {
          ball.flash = 18;
          score = max(0, score + lvl.wrongPenalty);
          streak = 0;
          popups.push(new Popup(ball.p.x, ball.p.y - ball.r,
            '✗ 顏色錯 ' + lvl.wrongPenalty, '#ff5555'));
          shakeMag = 6;
        }
      }
    }
  }

  bullets   = bullets.filter(b => b.alive);
  balls     = balls.filter(b => b.alive);
  particles = particles.filter(p => p.life > 0);
  popups    = popups.filter(p => p.life > 0);
  for (let p of particles) p.update();
  for (let p of popups)    p.update();
}

function killBall(ball) {
  ball.alive = false; streak++;
  let gained = currentLevel.killScore;
  let isCombo = streak > 0 && streak % currentLevel.bonusStreak === 0;
  if (isCombo) {
    gained += currentLevel.bonusScore;
    popups.push(new Popup(ball.p.x, ball.p.y - ball.r - 30,
      '🔥 COMBO x' + streak + ' +' + gained + '!', '#FFD700'));
    shakeMag = 3;
  } else {
    popups.push(new Popup(ball.p.x, ball.p.y - ball.r,
      '+' + gained, '#ffffff'));
  }
  score += gained;
  explode(ball.p.x, ball.p.y, ball.color.hex, 18);
}

function spawnBall() {
  let lvl  = currentLevel;
  let side = floor(random(4));
  let x, y;
  if      (side === 0) { x = random(width);  y = -30; }
  else if (side === 1) { x = width + 30;     y = random(height); }
  else if (side === 2) { x = random(width);  y = height + 30; }
  else                 { x = -30;            y = random(height); }

  let col  = random(activeColors);
  let r    = random(lvl.ballRMin, lvl.ballRMax);
  let ball = new Ball({ r, p: { x, y }, color: col });
  let ang  = atan2(height / 2 - y, width / 2 - x) + random(-0.5, 0.5);
  let spd  = random(lvl.ballSpeedMin, lvl.ballSpeedMax);
  ball.v   = { x: cos(ang) * spd, y: sin(ang) * spd };
  balls.push(ball);
}

// ============================================================
// HUD
// ============================================================
function drawGame() {
  for (let p of particles) p.draw();
  for (let ball of balls)  ball.draw();
  for (let b of bullets)   b.draw();
  turret.draw();
  for (let p of popups) p.draw();
}

function drawHUD() {
  let lvl = currentLevel;

  // 頂部 HUD
  noStroke(); fill(0, 0, 0, 140);
  rect(0, 0, width, 52);

  // 分數
  fill(255); textAlign(LEFT, CENTER); textSize(14);
  text('SCORE', 20, 16);
  textSize(26); textStyle(BOLD); fill('#e8c55a');
  text(score, 20, 38); textStyle(NORMAL);

  // 難度標籤
  fill(lvl.accentColor + 'cc');
  textAlign(LEFT, CENTER); textSize(12);
  text(lvl.label, 130, 26);

  // 連殺
  if (streak >= 2) {
    fill('#FFD700'); textAlign(LEFT, CENTER); textSize(13);
    text('🔥 STREAK x' + streak, 130, 42);
  }

  // 換彈進度條（中央）
  let reloadProgress = 1 - (turret.nextColorTimer - millis()) / lvl.reloadTime;
  reloadProgress = constrain(reloadProgress, 0, 1);
  let barW = 180, barX = width / 2 - barW / 2;
  fill(40, 40, 60); rect(barX, 14, barW, 10, 5);
  fill(turret.color.hex); rect(barX, 14, barW * reloadProgress, 10, 5);
  fill(255, 200); textAlign(CENTER, CENTER); textSize(11);
  text('▼ 換彈藥中 ▼', width / 2, 36);

  // 倒數（右）
  let timeColor = timeLeft <= 10 ? '#ff5555' : '#ffffff';
  fill(timeColor); textAlign(RIGHT, CENTER); textSize(14);
  text('TIME', width - 20, 16);
  textSize(26); textStyle(BOLD); fill(timeColor);
  text(timeLeft + 's', width - 20, 38); textStyle(NORMAL);

  // 顏色圖例（底部）
  drawColorLegend();
}

function drawColorLegend() {
  let total  = activeColors.length;
  let bw     = 70, bh = 22;
  let startX = width / 2 - (total * bw) / 2;
  let y      = height - 30;
  for (let i = 0; i < total; i++) {
    let c = activeColors[i];
    let isCurrent = (c.hex === turret.color.hex);
    noStroke();
    if (isCurrent) { fill(c.hex + 'dd'); stroke(255); strokeWeight(2); }
    else           { fill(c.hex + '55'); noStroke(); }
    rect(startX + i * bw, y, bw - 4, bh, 4);
    fill(isCurrent ? '#ffffff' : c.hex + 'cc');
    textAlign(CENTER, CENTER); textSize(11); noStroke();
    text(c.name, startX + i * bw + bw / 2 - 2, y + bh / 2);
  }
}

// ============================================================
// 難度選擇畫面
// ============================================================
function drawSelectScreen() {
  // 暗背景
  fill(8, 8, 24, 210); noStroke(); rect(0, 0, width, height);

  // 標題
  textAlign(CENTER, CENTER);
  fill('#e8c55a'); textSize(44); textStyle(BOLD);
  text('怪獸獵人', width / 2, height / 2 - 210);
  fill('#aaa'); textSize(15); textStyle(NORMAL);
  text('選擇難度開始遊戲', width / 2, height / 2 - 165);

  // 三張難度卡片
  let keys    = ['easy', 'normal', 'hard'];
  let cardW   = 200, cardH = 230, gap = 30;
  let totalW  = keys.length * cardW + (keys.length - 1) * gap;
  let startX  = width / 2 - totalW / 2;
  let cardY   = height / 2 - 110;

  for (let i = 0; i < keys.length; i++) {
    let k   = keys[i];
    let lvl = LEVELS[k];
    let cx  = startX + i * (cardW + gap);
    let hover = mouseX > cx && mouseX < cx + cardW &&
                mouseY > cardY && mouseY < cardY + cardH;

    // 卡片背景
    noStroke();
    if (hover) {
      fill(lvl.accentColor + '33');
      stroke(lvl.accentColor); strokeWeight(2);
    } else {
      fill(20, 20, 40);
      stroke(60, 60, 80); strokeWeight(1);
    }
    rect(cx, cardY, cardW, cardH, 14);

    // 難度名稱
    fill(hover ? lvl.accentColor : '#ddd');
    textAlign(CENTER, CENTER); textSize(18); textStyle(BOLD);
    text(lvl.label, cx + cardW / 2, cardY + 30); textStyle(NORMAL);

    // 描述
    fill(hover ? '#eee' : '#888');
    textSize(11);
    // 手動換行
    let words = lvl.desc.split('，');
    for (let w = 0; w < words.length; w++) {
      text(words[w] + (w < words.length - 1 ? '，' : ''), cx + cardW / 2, cardY + 60 + w * 18);
    }

    // 數值表格
    let stats = [
      ['生成間隔', lvl.spawnInterval + ' 秒'],
      ['換彈速度', (lvl.reloadTime / 1000).toFixed(1) + ' 秒'],
      ['顏色種數', lvl.colorCount + ' 色'],
      ['擊殺得分', '+' + lvl.killScore],
      ['錯誤懲罰', lvl.wrongPenalty],
      ['COMBO條件', '連殺 ' + lvl.bonusStreak + ' 隻'],
    ];
    textSize(11);
    for (let s = 0; s < stats.length; s++) {
      let sy = cardY + 108 + s * 19;
      fill(hover ? '#bbb' : '#666');
      textAlign(LEFT, CENTER);
      text(stats[s][0], cx + 16, sy);
      fill(hover ? lvl.accentColor : '#aaa');
      textAlign(RIGHT, CENTER);
      text(stats[s][1], cx + cardW - 16, sy);
    }

    // 選擇按鈕
    let btnY = cardY + cardH - 32;
    noStroke();
    fill(hover ? lvl.accentColor : lvl.accentColor + '55');
    rect(cx + 20, btnY, cardW - 40, 26, 8);
    fill(255); textAlign(CENTER, CENTER); textSize(13); textStyle(BOLD);
    text('選擇', cx + cardW / 2, btnY + 13); textStyle(NORMAL);
  }
}

// ============================================================
// 結算畫面
// ============================================================
function drawOverScreen() {
  for (let p of particles) { p.update(); p.draw(); }
  for (let b of balls)     b.draw();

  fill(8, 8, 24, 210); noStroke(); rect(0, 0, width, height);

  textAlign(CENTER, CENTER);

  // 難度標籤
  fill(currentLevel.accentColor); textSize(16);
  text(currentLevel.label + ' 模式', width / 2, height / 2 - 170);

  fill('#e8c55a'); textSize(42); textStyle(BOLD);
  text('時間到！', width / 2, height / 2 - 130); textStyle(NORMAL);

  fill(255); textSize(18);
  text('最終得分', width / 2, height / 2 - 85);
  fill('#7F77DD'); textSize(72); textStyle(BOLD);
  text(finalScore, width / 2, height / 2 - 20); textStyle(NORMAL);

  // 評語（依難度調整門檻）
  let thresholds = levelKey === 'easy'
    ? [150, 90, 50, 20]
    : levelKey === 'normal'
    ? [200, 120, 60, 20]
    : [250, 150, 80, 30];
  let comments = ['🏆 傳奇獵人！', '🥇 優秀！怪獸剋星！', '🥈 不錯！', '🥉 加油！', '😅 慘敗...'];
  let ci = comments.length - 1;
  for (let t = 0; t < thresholds.length; t++) {
    if (finalScore >= thresholds[t]) { ci = t; break; }
  }
  fill(200); textSize(17);
  text(comments[ci], width / 2, height / 2 + 55);

  // 兩個按鈕：再玩 / 換難度
  let bx1 = width / 2 - 100, bx2 = width / 2 + 100, by = height / 2 + 130;
  let hov1 = dist(mouseX, mouseY, bx1, by) < 70;
  let hov2 = dist(mouseX, mouseY, bx2, by) < 70;

  noStroke();
  fill(hov1 ? currentLevel.accentColor : currentLevel.accentColor + '55');
  rect(bx1 - 80, by - 22, 160, 44, 10);
  fill(255); textSize(16); textStyle(BOLD);
  text('再玩一次', bx1, by); textStyle(NORMAL);

  fill(hov2 ? '#7F77DD' : '#3a3670');
  rect(bx2 - 80, by - 22, 160, 44, 10);
  fill(255); textSize(16); textStyle(BOLD);
  text('換難度', bx2, by); textStyle(NORMAL);
}

// ============================================================
// 輸入
// ============================================================
function mousePressed() {
  if (gameState === 'select') {
    let keys   = ['easy', 'normal', 'hard'];
    let cardW  = 200, cardH = 230, gap = 30;
    let totalW = keys.length * cardW + (keys.length - 1) * gap;
    let startX = width / 2 - totalW / 2;
    let cardY  = height / 2 - 110;
    for (let i = 0; i < keys.length; i++) {
      let cx = startX + i * (cardW + gap);
      if (mouseX > cx && mouseX < cx + cardW &&
          mouseY > cardY && mouseY < cardY + cardH) {
        levelKey = keys[i];
        startGame(levelKey);
        return;
      }
    }
    return;
  }

  if (gameState === 'over') {
    let bx1 = width / 2 - 100, bx2 = width / 2 + 100, by = height / 2 + 130;
    if (dist(mouseX, mouseY, bx1, by) < 70) { startGame(levelKey); return; }
    if (dist(mouseX, mouseY, bx2, by) < 70) { gameState = 'select'; return; }
    return;
  }

  if (gameState === 'playing') {
    turret.shoot();
    let hit = false;
    for (let ball of balls) {
      if (ball.clickedAt(mouseX, mouseY)) {
        hit = true;
        if (ball.color.hex === turret.color.hex) {
          killBall(ball);
        } else {
          ball.flash = 18;
          score = max(0, score + currentLevel.wrongPenalty);
          streak = 0;
          popups.push(new Popup(ball.p.x, ball.p.y - ball.r,
            '✗ 顏色錯！', '#ff5555'));
          shakeMag = 7;
        }
        break;
      }
    }
    if (!hit && currentLevel.missPenalty < 0) {
      score = max(0, score + currentLevel.missPenalty);
      popups.push(new Popup(mouseX, mouseY, currentLevel.missPenalty, '#888888'));
    }
  }
}

function startGame(key) {
  levelKey     = key;
  currentLevel = LEVELS[key];
  // 建立本局顏色子集
  let shuffled = [...COLORS].sort(() => random() - 0.5);
  activeColors = shuffled.slice(0, currentLevel.colorCount);

  balls = []; bullets = []; particles = []; popups = [];
  score = 0; streak = 0;
  timeLeft  = currentLevel.duration;
  startTime = millis();
  lastSpawn = millis();
  gameState = 'playing';
  turret.reset(currentLevel);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (turret) { turret.x = width / 2; turret.y = height / 2; }
}