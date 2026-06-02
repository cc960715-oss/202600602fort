let stars = [];
let bullets = [];
let explosions = [];
let props = [];
let backgroundPlanets = [];
let gameState = 'START'; // START, PLAYING, END
let score = 0;
let gameDuration = 60; // 60 秒
let gameStartTime = 0;
let startButton;
let ammo = 60;
let maxAmmo = 60;
let isReloading = false;
let reloadStartTime = 0;
let reloadDuration = 1000; // 1000 毫秒 = 1 秒
let lastShotTime = 0;
let fireDelay = 150; // 連發延遲（毫秒），數字越小發射越快
let freezeEndTime = 0; // 星星凍結結束時間
let infiniteAmmoEndTime = 0; // 無限子彈結束時間
let lastPropSpawnTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 建立開始按鈕
  startButton = createButton('開始遊戲');
  startButton.position(width / 2 - 50, height / 2 + 40);
  startButton.style('padding', '10px 20px');
  startButton.style('font-size', '20px');
  startButton.mousePressed(startGame);

  // 初始化背景星球圖案
  for (let i = 0; i < 5; i++) {
    backgroundPlanets.push(new BackgroundPlanet());
  }
}

function draw() {
  background(0); // 黑色背景

  // 繪製背景星球
  for (let p of backgroundPlanets) {
    p.display();
  }

  if (gameState === 'START') {
    drawStartScreen();
    return;
  }

  if (gameState === 'END') {
    drawEndScreen();
    return;
  }

  // --- 以下為 PLAYING 狀態的邏輯 ---

  // 檢查時間是否結束
  let timeLeft = gameDuration - (millis() - gameStartTime) / 1000;
  if (timeLeft <= 0) {
    gameState = 'END';
    startButton.html('重新開始');
    startButton.show();
  }

  // 隨機產生道具 (機率增加：每 4 秒嘗試產生一次，機率提高至 0.6)
  if (millis() - lastPropSpawnTime > 4000) {
    if (random() < 0.6) props.push(new Prop());
    lastPropSpawnTime = millis();
  }

  for (let s of stars) {
    s.update();
    s.display();
  }

  // 更新與繪製道具
  for (let i = props.length - 1; i >= 0; i--) {
    props[i].update();
    props[i].display();
    // 移除超出畫面的道具 (主要是針對不反彈的炸彈)
    if (props[i].isOffScreen()) {
      props.splice(i, 1);
    }
  }

  // 更新與繪製子彈
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.update();
    b.display();

    // 碰撞偵測：檢查子彈是否打到任何一顆星星
    for (let j = stars.length - 1; j >= 0; j--) {
      let s = stars[j];
      let d = dist(b.x, b.y, s.x, s.y);
      if (d < s.size) { // 判定擊中
        // 產生爆炸效果
        explosions.push(new Explosion(s.x, s.y, s.color));
        score++; // 增加分數
        // 移除星星與子彈
        stars.splice(j, 1);
        bullets.splice(i, 1);
        
        // 補一顆新星星（可選，讓畫面不會變空）
        if (gameState === 'PLAYING') {
          setTimeout(() => {
            if (gameState === 'PLAYING') stars.push(new Star());
          }, 2000);
        }
        break; 
      }
    }

    // 碰撞偵測：檢查子彈是否打到道具
    for (let k = props.length - 1; k >= 0; k--) {
      let p = props[k];
      let hit = false;
      if (p.type === 'circle' || p.type === 'triangle' || p.type === 'bomb') {
        // 子彈半徑改為 12 (大小 24)，因此碰撞判定調整為 p.size/2 + 12
        if (dist(b.x, b.y, p.x, p.y) < p.size / 2 + 12) hit = true;
      } else if (p.type === 'square') {
        if (b.x > p.x - p.size/2 && b.x < p.x + p.size/2 && b.y > p.y - p.size/2 && b.y < p.y + p.size/2) hit = true;
      }

      if (hit) {
        if (p.type === 'circle') {
          freezeEndTime = millis() + 10000; // 凍結 10 秒
        } else if (p.type === 'square') {
          infiniteAmmoEndTime = millis() + 10000; // 無限子彈 10 秒 (範例設定 10 秒)
        } else if (p.type === 'triangle') {
          gameDuration += 5; // 增加 5 秒遊戲時間
        } else if (p.type === 'bomb') {
          gameDuration -= 3; // 擊中炸彈，扣除 3 秒時間
        }
        props.splice(k, 1);
        bullets.splice(i, 1);
        break;
      }
    }

    // 移除超出畫面的子彈
    if (bullets[i] && bullets[i].isOffScreen()) {
      bullets.splice(i, 1);
    }
  }

  // 更新與繪製爆炸效果
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    explosions[i].display();
    if (explosions[i].isFinished()) {
      explosions.splice(i, 1);
    }
  }

  drawTurret();
  drawUI();
  handleReloading();
  handleFiring();
}

function startGame() {
  gameState = 'PLAYING';
  score = 0;
  gameStartTime = millis();
  startButton.hide();
  
  // 重置遊戲物件
  stars = [];
  for (let i = 0; i < 15; i++) {
    stars.push(new Star());
  }
  bullets = [];
  props = [];
  explosions = [];
  ammo = maxAmmo;
  isReloading = false;
}

function drawStartScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(50);
  text('星際射擊遊戲', width / 2, height / 2 - 100);
  textSize(20);
  text('使用滑鼠瞄準並發射，打中星星得分', width / 2, height / 2 - 20);
}

function drawEndScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(50);
  text('遊戲結束', width / 2, height / 2 - 80);
  textSize(32);
  text(`最終得分：${score}`, width / 2, height / 2);

  // 煙花效果：在背景隨機產生彩色爆炸
  if (frameCount % 15 === 0) {
    let x = random(width * 0.1, width * 0.9);
    let y = random(height * 0.1, height * 0.5);
    let colors = ['#FF5252', '#FFEB3B', '#2196F3', '#4CAF50', '#FF4081', '#E040FB', '#00E5FF'];
    explosions.push(new Explosion(x, y, random(colors)));
  }

  // 更新與繪製煙花
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    explosions[i].display();
    if (explosions[i].isFinished()) {
      explosions.splice(i, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  startButton.position(width / 2 - 50, height / 2 + 40);
}

function handleFiring() {
  if (gameState !== 'PLAYING') return;
  // 偵測滑鼠左鍵是否長按，且彈藥足夠、非裝填狀態
  if (mouseIsPressed && mouseButton === LEFT && ammo > 0 && !isReloading) {
    // 檢查距離上次發射是否已經過了足夠的時間
    if (millis() - lastShotTime > fireDelay) {
      let angle = atan2(mouseY - height / 2, mouseX - width / 2);
      
      // 計算砲管末端（長度 50）的位置，讓子彈從砲口發射
      let muzzleX = width / 2 + cos(angle) * 50;
      let muzzleY = height / 2 + sin(angle) * 50;
      
      bullets.push(new Bullet(muzzleX, muzzleY, angle));
      // 如果不在無限子彈時間內，才扣彈藥
      if (millis() > infiniteAmmoEndTime) ammo--;
      lastShotTime = millis(); // 更新最後發射時間
    }
  }
}

function keyPressed() {
  if ((key === 'r' || key === 'R') && ammo < maxAmmo && !isReloading) {
    startReload();
  }
}

function startReload() {
  isReloading = true;
  reloadStartTime = millis();
}

function handleReloading() {
  if (isReloading) {
    let elapsed = millis() - reloadStartTime;
    if (elapsed >= reloadDuration) {
      ammo = maxAmmo;
      isReloading = false;
    }
  }
}

function drawTurret() {
  push();
  translate(width / 2, height / 2);
  let angle = atan2(mouseY - height / 2, mouseX - width / 2);
  rotate(angle);
  
  // 砲身
  fill(100);
  stroke(150);
  strokeWeight(2);
  rect(0, -15, 50, 30);
  // 砲座
  fill(150);
  ellipse(0, 0, 40, 40);

  // 在砲座中心顯示剩餘彈藥數字
  rotate(-angle); // 抵消砲管旋轉，使文字保持水平
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  text(ammo, 0, 0);

  pop();
}

function drawUI() {
  fill(255);
  noStroke();
  textSize(20);
  textAlign(LEFT, TOP);
  text(`Ammo: ${ammo} / ${maxAmmo}`, 20, 20);
  text(`Score: ${score}`, 20, 50);

  // 顯示剩餘時間
  let timeLeft = max(0, gameDuration - (millis() - gameStartTime) / 1000);
  textAlign(CENTER, TOP);
  textSize(24);
  fill(timeLeft < 10 ? color(255, 0, 0) : 255); // 最後十秒變紅色
  text(`時間剩餘: ${timeLeft.toFixed(1)}s`, width / 2, 20);

  if (isReloading) {
    let remaining = (reloadDuration - (millis() - reloadStartTime)) / 1000;
    textAlign(CENTER, CENTER);
    textSize(32);
    text(`Reloading: ${max(0, remaining).toFixed(2)}s`, width / 2, height / 2 + 80);
  } else if (ammo === 0) {
    textAlign(CENTER, CENTER);
    fill(255, 0, 0);
    text("PRESS 'R' TO RELOAD", width / 2, height / 2 + 80);
  }

  // 顯示道具狀態
  textAlign(RIGHT, TOP);
  textSize(16);
  if (millis() < freezeEndTime) {
    fill(0, 255, 255);
    text(`FREEZE: ${((freezeEndTime - millis()) / 1000).toFixed(1)}s`, width - 20, 20);
  }
  if (millis() < infiniteAmmoEndTime) {
    fill(255, 0, 255);
    text(`INFINITE AMMO: ${((infiniteAmmoEndTime - millis()) / 1000).toFixed(1)}s`, width - 20, 45);
  }
}

class Prop {
  constructor() {
    this.x = random(100, width - 100);
    this.y = random(100, height - 100);
    
    // 確保物件有明顯的移動速度，避免停在原地
    let speed = random(2, 4);
    let angle = random(TWO_PI);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;

    this.size = 30;
    this.type = random(['circle', 'square', 'triangle', 'bomb']);
    
    if (this.type === 'circle') this.color = color(0, 255, 255); // 青色：凍結
    else if (this.type === 'square') this.color = color(255, 0, 255); // 洋紅色：無限彈藥
    else if (this.type === 'triangle') this.color = color(255, 255, 0); // 黃色：增加時間
    else {
      this.color = color(255, 0, 0); // 紅色：炸彈 (減少時間)
      this.vx *= 1.8; // 讓炸彈飛得明顯比其他道具快，強化「直接穿過」的感覺
      this.vy *= 1.8;
    }
    this.history = []; // 紀錄歷史座標以製作拖影
    this.spawnTime = millis(); // 記錄產生時間
  }

  update() {
    // 儲存目前位置到歷史紀錄
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 8) {
      this.history.shift(); // 只保留最近 8 幀的紀錄
    }

    // 根據遊戲進行時間增加速度倍率 (每 20 秒增加 1 倍速)
    let speedMult = 1 + (millis() - gameStartTime) / 20000;

    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;

    // 牆壁反彈 (判斷類型，炸彈不執行反彈邏輯)
    if (this.type !== 'bomb') {
      if (this.x < this.size / 2 || this.x > width - this.size / 2) this.vx *= -1;
      if (this.y < this.size / 2 || this.y > height - this.size / 2) this.vy *= -1;
    }
  }

  display() {
    push();
    
    // 繪製拖影
    noStroke();
    for (let i = 0; i < this.history.length; i++) {
      let pos = this.history[i];
      let alpha = map(i, 0, this.history.length, 20, 150);
      let trailColor = color(red(this.color), green(this.color), blue(this.color), alpha);
      fill(trailColor);
      if (this.type === 'circle' || this.type === 'bomb') {
        ellipse(pos.x, pos.y, this.size * (i / this.history.length));
      } else if (this.type === 'square') {
        rectMode(CENTER);
        rect(pos.x, pos.y, this.size * (i / this.history.length), this.size * (i / this.history.length));
      } else if (this.type === 'triangle') {
        let s = this.size * (i / this.history.length);
        triangle(pos.x, pos.y - s/2, pos.x - s/2, pos.y + s/2, pos.x + s/2, pos.y + s/2);
      }
    }

    // 繪製本體
    fill(this.color);
    stroke(255);
    strokeWeight(2);
    if (this.type === 'circle' || this.type === 'bomb') {
      ellipse(this.x, this.y, this.size);
    } else if (this.type === 'square') {
      rectMode(CENTER);
      rect(this.x, this.y, this.size, this.size);
    } else if (this.type === 'triangle') {
      triangle(this.x, this.y - this.size/2, this.x - this.size/2, this.y + this.size/2, this.x + this.size/2, this.y + this.size/2);
    }
    pop();
  }

  // 檢查是否超出畫面或炸彈時間到
  isOffScreen() {
    // 如果是炸彈，檢查是否超過 15 秒
    if (this.type === 'bomb' && millis() - this.spawnTime > 15000) {
      return true;
    }
    return (this.x < -this.size || this.x > width + this.size || this.y < -this.size || this.y > height + this.size);
  }
}

class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.speed = 10;
    this.vx = cos(angle) * this.speed;
    this.vy = sin(angle) * this.speed;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
  display() {
    fill(255, 255, 0);
    noStroke();
    ellipse(this.x, this.y, 24, 24);
  }
  isOffScreen() {
    return this.x < 0 || this.x > width || this.y < 0 || this.y > height;
  }
}

class Explosion {
  constructor(x, y, color) {
    this.particles = [];
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isFinished()) {
        this.particles.splice(i, 1);
      }
    }
  }
  display() {
    for (let p of this.particles) {
      p.display();
    }
  }
  isFinished() {
    return this.particles.length === 0;
  }
}

class Particle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.vx = random(-3, 3);
    this.vy = random(-3, 3);
    this.alpha = 255;
    this.color = col;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 5; // 逐漸透明
  }
  display() {
    push();
    let c = color(this.color);
    fill(red(c), green(c), blue(c), this.alpha);
    noStroke();
    ellipse(this.x, this.y, 4, 4);
    pop();
  }
  isFinished() {
    return this.alpha <= 0;
  }
}

class Star {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.vx = random(-2, 2); // X 軸移動速度
    this.vy = random(-2, 2); // Y 軸移動速度
    this.size = random(30, 60); // 星星大小
    let colors = ['#F7AF9D', '#F7E3AF', '#C7EBF0', '#B6465F', '#BEA7E5'];
    this.color = color(random(colors));
    this.history = []; // 紀錄歷史座標以製作拖影
  }

  update() {
    // 如果目前處於凍結狀態（當前時間小於結束時間），則跳過位置更新
    if (millis() < freezeEndTime) return;

    // 儲存目前位置到歷史紀錄
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 6) {
      this.history.shift(); // 拖影長度設定為 6 幀
    }

    // 根據遊戲進行時間增加速度倍率 (每 20 秒增加 1 倍速)
    let speedMult = 1 + (millis() - gameStartTime) / 20000;

    // 更新位置
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;

    // 碰到牆壁反彈
    if (this.x < this.size || this.x > width - this.size) this.vx *= -1;
    if (this.y < this.size || this.y > height - this.size) this.vy *= -1;
  }

  display() {
    // 繪製拖影
    noStroke();
    for (let i = 0; i < this.history.length; i++) {
      let pos = this.history[i];
      let alpha = map(i, 0, this.history.length, 10, 120); // 越遠越透明
      let trailColor = color(red(this.color), green(this.color), blue(this.color), alpha);
      fill(trailColor);
      // 拖影使用簡單的圓形，效能較好且有流星感
      ellipse(pos.x, pos.y, this.size * 0.6 * (i / this.history.length));
    }

    push();
    translate(this.x, this.y);
    
    // 判斷滑鼠與星星的距離
    let d = dist(mouseX, mouseY, this.x, this.y);
    let isScared = d < 120; // 距離小於 120 像素時進入驚恐狀態

    // 繪製五角星本體
    fill(this.color);
    noStroke();
    this.drawStar(0, 0, this.size / 2.5, this.size, 5);

    // 計算眼睛跟隨鼠標的方向
    let angle = atan2(mouseY - this.y, mouseX - this.x);
    let lookDist = this.size * 0.08; // 眼睛跟隨的偏移強度
    let lookX = cos(angle) * lookDist;
    let lookY = sin(angle) * lookDist;

    // 畫眼睛
    fill(0);
    let eyeOffset = this.size * 0.2;
    let eyeSize = isScared ? this.size * 0.25 : this.size * 0.15; // 驚恐時眼睛變大
    ellipse(-eyeOffset + lookX, -eyeOffset / 2 + lookY, eyeSize, eyeSize); // 左眼
    ellipse(eyeOffset + lookX, -eyeOffset / 2 + lookY, eyeSize, eyeSize);  // 右眼

    if (isScared) {
      // 驚恐時的 O 型嘴巴
      fill(0);
      noStroke();
      ellipse(0, this.size * 0.15, this.size * 0.2, this.size * 0.3);
    } else {
      // 平時的微笑
      noFill();
      stroke(0);
      strokeWeight(2);
      // 畫一個小弧線當作嘴巴
      arc(0, 0, this.size * 0.4, this.size * 0.3, 0.2, PI - 0.2);
    }
    
    pop();
  }

  // 繪製星形的輔助函式
  drawStar(x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
      let sx = x + cos(a) * radius2;
      let sy = y + sin(a) * radius2;
      vertex(sx, sy);
      sx = x + cos(a + halfAngle) * radius1;
      sy = y + sin(a + halfAngle) * radius1;
      vertex(sx, sy);
    }
    endShape(CLOSE);
  }
}

class BackgroundPlanet {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.size = random(100, 250);
    // 使用較暗、飽和度較低的顏色，以免干擾遊戲物件
    this.color = color(random(20, 60), random(20, 60), random(20, 60));
    this.hasRing = random() > 0.6; // 60% 機率有行星環
    this.craters = [];
    // 隨機產生一些隕石坑座標
    for (let i = 0; i < 5; i++) {
      this.craters.push({
        x: random(-this.size / 3, this.size / 3),
        y: random(-this.size / 3, this.size / 3),
        s: random(this.size / 10, this.size / 5)
      });
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    noStroke();

    // 繪製星球本體
    fill(this.color);
    ellipse(0, 0, this.size);

    // 繪製隕石坑 (深色半透明陰影)
    fill(0, 40);
    for (let c of this.craters) {
      ellipse(c.x, c.y, c.s);
    }

    // 繪製外圈微光
    noFill();
    stroke(255, 10);
    strokeWeight(10);
    ellipse(0, 0, this.size + 5);

    // 繪製行星環
    if (this.hasRing) {
      noFill();
      stroke(255, 30);
      strokeWeight(this.size / 20);
      ellipse(0, 0, this.size * 1.6, this.size * 0.4);
    }
    pop();
  }
}
