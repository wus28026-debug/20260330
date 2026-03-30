/**
 * 專案名稱：不規則曲線電流急急棒 (p5.js)
 * 核心機制：使用 curveVertex 繪製平滑軌道，偵測滑鼠是否離開安全區域
 */

let gameState = 'WAITING'; // WAITING, PLAYING, LEVEL_CLEAR, FAIL, SUCCESS
let topPath = [];    // 儲存上邊界頂點 (P5.Vector)
let bottomPath = []; // 儲存下邊界頂點 (P5.Vector)
let currentLevel = 1; 
let maxLevels = 3;
let startBtn = { x: 60, y: 0, r: 40 }; // 起始按鈕資訊
let goalBtn = { x: 0, y: 0, r: 40 };   // 終點按鈕資訊
let restartBtn = { x: 0, y: 0, w: 160, h: 50 }; // 失敗後的重開按鈕
let particles = []; // 儲存過關特效粒子
let collisionEnabled = false; // 控制碰撞計算是否啟動
let shakeAmount = 0; // 震動強度

function setup() {
  createCanvas(windowWidth, windowHeight);
  generateTrack();
}

function draw() {
  // 震動特效邏輯：在繪製背景前套用平移
  if (shakeAmount > 0.5) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.85; // 震動隨時間衰減
  }

  background(15, 15, 25); // 深色背景營造電力感

  if (gameState === 'WAITING') {
    drawStartScreen();
  } else if (gameState === 'PLAYING') {
    drawTrack();
    updateGame();
  } else if (gameState === 'LEVEL_CLEAR') {
    drawLevelClearScreen();
  } else if (gameState === 'FAIL') {
    // 失敗時畫面閃爍紅色
    background(100, 0, 0);
    drawEndScreen("挑戰失敗", color(255, 100, 100));
  } else if (gameState === 'SUCCESS') {
    drawSuccessScreen();
  }
}

/**
 * 軌道生成邏輯
 * 使用 noise() 產生平滑隨機值，並存入 Vector 陣列
 */
function generateTrack() {
  topPath = [];
  bottomPath = [];
  
  // 根據關卡調整難度
  // 關卡越高，段數越多(越抖)，寬度越窄
  let segments = 25 + currentLevel * 12; // 增加段數以支援更細緻的蜿蜒感
  let trackWidth = map(currentLevel, 1, 3, height * 0.3, height * 0.15); // 增加寬度，給予更多操作空間
  // 調整 noiseScale 確保蜿蜒感
  let noiseScale = map(currentLevel, 1, 3, 0.4, 0.7); 
  let timeSeed = millis() * 0.0001;

  for (let i = 0; i <= segments; i++) {
    let x = map(i, 0, segments, 0, width);
    let noiseVal = noise(i * noiseScale, currentLevel * 50 + timeSeed);
    let centerY = map(noiseVal, 0, 1, height * 0.2, height * 0.8);
    
    topPath.push(createVector(x, centerY - trackWidth / 2));
    bottomPath.push(createVector(x, centerY + trackWidth / 2));

    // 設定起始按鈕位置在第一個點的中心 (確保點擊時不會立刻出界)
    if (i === 0) {
      startBtn = { x: x + 40, y: centerY, r: 35 };
    }
    // 設定終點按鈕位置在最後一個點的中心
    if (i === segments) {
      goalBtn = { x: x - 40, y: centerY, r: 35 };
    }
  }
}

function drawTrack() {
  // 增加電力霓虹感
  push();
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = color(0, 255, 255);
  noFill();
  strokeWeight(6);
  stroke(0, 255, 255, 220); 

  // 繪製上邊界：使用 curveVertex 達成蜿蜒感
  beginShape();
  if (topPath.length > 0) curveVertex(topPath[0].x, topPath[0].y); // 控制點
  for (let v of topPath) curveVertex(v.x, v.y);
  if (topPath.length > 0) curveVertex(topPath[topPath.length-1].x, topPath[topPath.length-1].y); // 控制點
  endShape();

  // 繪製下邊界：使用 curveVertex 達成蜿蜒感
  beginShape();
  if (bottomPath.length > 0) curveVertex(bottomPath[0].x, bottomPath[0].y); // 控制點
  for (let v of bottomPath) curveVertex(v.x, v.y);
  if (bottomPath.length > 0) curveVertex(bottomPath[bottomPath.length-1].x, bottomPath[bottomPath.length-1].y); // 控制點
  endShape();
  pop();

  // 繪製路徑邊緣的隨機閃電特效
  drawLightningEffect(topPath);
  drawLightningEffect(bottomPath);

  // 顯示當前關卡文字
  fill(255, 200);
  noStroke();
  textSize(24);
  textAlign(LEFT, TOP);
  text("LEVEL: " + currentLevel, 20, 20);

  // 繪製閃爍的 GOAL 按鈕
  push();
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = color(255, 255, 0);
  fill(255, 255, 0);
  ellipse(goalBtn.x, goalBtn.y, goalBtn.r * 2);
  pop();
  
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("GOAL", goalBtn.x, goalBtn.y);
}

/**
 * 閃電特效輔助函式
 * 在給定的路徑點之間隨機產生閃電電弧
 */
function drawLightningEffect(path) {
  if (path.length < 2) return;
  
  push();
  // 閃電核心發光
  drawingContext.shadowBlur = 25;
  drawingContext.shadowColor = color(255, 255, 255);
  stroke(255, 255, 255, random(100, 255)); // 隨機透明度產生閃爍
  strokeWeight(random(1, 3));
  noFill();

  for (let i = 0; i < path.length - 1; i++) {
    // 隨機觸發電弧，讓閃電看起來是不連續且跳動的
    if (random() > 0.85) {
      let p1 = path[i];
      let p2 = path[i+1];
      
      beginShape();
      let steps = 4;
      for (let j = 0; j <= steps; j++) {
        let t = j / steps;
        let x = lerp(p1.x, p2.x, t) + random(-15, 15);
        let y = lerp(p1.y, p2.y, t) + random(-15, 15);
        vertex(x, y);
      }
      endShape();
    }
  }
  pop();
}

function updateGame() {
  // 繪製玩家位置指示 (始終顯示)
  fill(255, 255, 0);
  noStroke();
  ellipse(mouseX, mouseY, 10, 10);

  // 如果碰撞尚未啟動，提示玩家將滑鼠移到新起點
  if (!collisionEnabled) {
    push();
    // 起點提示特效
    let pulse = sin(frameCount * 0.1) * 10;
    fill(0, 255, 100, 100 + pulse * 5);
    noStroke();
    ellipse(startBtn.x, startBtn.y, startBtn.r * 2 + pulse);
    
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("← 請將滑鼠移至起點以啟動", startBtn.x + 120, startBtn.y);
    pop();

    // 當滑鼠移動到起點範圍內，正式開啟遊戲計算
    if (dist(mouseX, mouseY, startBtn.x, startBtn.y) < startBtn.r) {
      collisionEnabled = true;
    }
    return; // 尚未啟動前，不執行下方的碰撞與勝利判斷
  }

  // 1. 取得滑鼠 X 在陣列中的索引位置，並進行線性插值 (lerp) 取得精確的 Y 邊界
  let sectionWidth = width / (topPath.length - 1);
  let idx = floor(mouseX / sectionWidth);
  
  if (idx >= 0 && idx < topPath.length - 1) {
    // 恢復線性插值判定：精確計算滑鼠所在位置的曲線高度
    let amt = (mouseX % sectionWidth) / sectionWidth;
    let currentTopY = lerp(topPath[idx].y, topPath[idx + 1].y, amt);
    let currentBottomY = lerp(bottomPath[idx].y, bottomPath[idx + 1].y, amt);

    // 2. 碰撞偵測：如果滑鼠 Y 超出上下邊界
    if (mouseY <= currentTopY || mouseY >= currentBottomY) {
      gameState = 'FAIL';
      shakeAmount = 20; // 觸發強烈震動
    }
  } else if (mouseX < 0) {
    gameState = 'FAIL';
    shakeAmount = 20; // 觸發強烈震動
  }

  // 3. 勝利條件：到達最右側
  let distToGoal = dist(mouseX, mouseY, goalBtn.x, goalBtn.y);
  if (distToGoal < goalBtn.r) {
    if (currentLevel < maxLevels) {
      spawnParticles(goalBtn.x, goalBtn.y, 150); // 更多過關粒子
      gameState = 'LEVEL_CLEAR';
    } else {
      spawnParticles(width/2, height/2, 300); // 最終勝利啟動粒子
      gameState = 'SUCCESS';
    }
  }
}

function drawStartScreen() {
  // 在背景隨機產生大範圍的閃電特效，增加視覺張力
  if (random() > 0.6) {
    let x1 = random(width);
    let y1 = random(height);
    let x2 = x1 + random(-400, 400);
    let y2 = y1 + random(-400, 400);
    drawLightningEffect([createVector(x1, y1), createVector(x2, y2)]);
  }

  // 繪製「電流急急棒」標題與電流特效
  push();
  textAlign(CENTER, CENTER);
  
  // 利用隨機位移產生震動感 (電流不穩定效果)
  let shakeX = random(-2, 2);
  let shakeY = random(-2, 2);
  
  // 設定發光特效
  drawingContext.shadowBlur = 35;
  drawingContext.shadowColor = color(0, 255, 255);
  
  // 標題大字
  textSize(100);
  textStyle(BOLD);
  fill(200, 255, 255, 200 + random(55)); // 隨機透明度產生閃爍感
  text("電流急急棒", width / 2 + shakeX, height / 3 + shakeY);
  pop();

  // 繪製啟動按鈕
  fill(0, 255, 100); // 改為綠色按鈕
  noStroke();
  ellipse(startBtn.x, startBtn.y, startBtn.r * 2);
  
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  textSize(16);
  text("START", startBtn.x, startBtn.y);
  textSize(24);
  text("不要碰到邊界！通過 3 個關卡以獲勝", width / 2, height * 0.6);
}

function drawLevelClearScreen() {
  background(15, 15, 25, 150); // 半透明背景以顯示粒子
  updateAndDrawParticles();

  textAlign(CENTER, CENTER);
  fill(50, 255, 150);
  textSize(64);
  textStyle(BOLD);
  
  // 增加隨機鼓勵語
  let praises = ["太強了！", "手超穩！", "簡直是神！"];
  text(praises[currentLevel-1], width / 2, height / 3);
  
  textSize(24);
  fill(255);
  text("LEVEL " + currentLevel + " 挑戰成功", width / 2, height / 2);
  
  // 繪製下一關的啟動按鈕
  fill(0, 255, 100);
  ellipse(startBtn.x, startBtn.y, startBtn.r * 2);
  fill(255);
  textSize(16);
  textStyle(NORMAL);
  text("START L" + (currentLevel + 1), startBtn.x, startBtn.y);
}

function drawSuccessScreen() {
  background(10, 10, 25);
  updateAndDrawParticles();

  // 持續產生誇張煙火
  if (frameCount % 15 === 0) {
    spawnParticles(random(width), random(height), 80);
  }

  push();
  textAlign(CENTER, CENTER);
  drawingContext.shadowBlur = 50;
  drawingContext.shadowColor = color(255, 215, 0);
  fill(255, 215, 0);
  textSize(120);
  textStyle(BOLD);
  text("挑戰成功！", width / 2, height / 2);
  
  drawingContext.shadowBlur = 0;
  fill(255);
  textSize(24);
  text("你是真正的電力大師", width / 2, height / 2 + 100);
  text("點擊畫面回到首頁", width / 2, height / 2 + 150);
  pop();
}

/**
 * 粒子特效系統：產生彩色紙屑
 */
function spawnParticles(x, y, count = 100) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-8, 8),
      vy: random(-15, -2),
      size: random(4, 12),
      color: color(random(255), random(255), random(255)),
      gravity: 0.2,
      life: 255
    });
  }
}

/**
 * 更新並繪製所有粒子
 */
function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.life -= 4; // 粒子逐漸消失
    
    // 增加粒子閃爍感
    push();
    if (p.life > 100) drawingContext.shadowBlur = 5;
    drawingContext.shadowColor = p.color;
    noStroke();
    fill(red(p.color), green(p.color), blue(p.color), p.life);
    rect(p.x, p.y, p.size, p.size);
    pop();
    
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawEndScreen(msg, clr) {
  updateAndDrawParticles();
  fill(clr);
  textSize(64);
  textAlign(CENTER, CENTER);
  text(msg, width / 2, height / 2 - 20);
  fill(255);
  textSize(20);
  text("點擊畫面任何地方重新開始", width / 2, height / 2 + 60);
}

function mousePressed() {
  if (gameState === 'WAITING' || gameState === 'LEVEL_CLEAR') {
    let d = dist(mouseX, mouseY, startBtn.x, startBtn.y);
    if (d < startBtn.r) {
      if (gameState === 'LEVEL_CLEAR') currentLevel++; 
      particles = []; // 進入新關卡時清空特效
      generateTrack(); // 重新生成/更新地圖
      gameState = 'PLAYING';
      collisionEnabled = false; // 關卡開始時先關閉碰撞偵測，等待滑鼠就位
    }
  } else if (gameState === 'FAIL' || gameState === 'SUCCESS') {
    currentLevel = 1;
    gameState = 'WAITING';
    generateTrack();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateTrack();
}
