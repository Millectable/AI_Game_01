// Game Globals
let ball;
let pole;
let targetBox;
let gravity;
let friction;
let elasticForce = 0.4; // Launch power multiplier
let maxStretch = 160;  // Max distance ball can be pulled

let gameState = 'aiming'; // 'aiming', 'launched', 'gameOver'
let currentLevel = 0;

// --- Visual Style & Animation ---
// Color Palette
let clrBackground = '#1a1a2e'; // Deep cosmic navy
let clrBall = '#00ffff';       // Bright Cyan
let clrBallGlow = '#00ffff';
let clrPoleBase = '#4a4e69';   // Muted purple/gray
let clrPoleAccent = '#9a8c98'; // Lighter muted purple
let clrPoleGlow = '#e0aaff';   // Light magenta/lavender glow
let clrElasticBase = '#4d4dff'; // Electric Blue
let clrElasticGlow = '#8080ff';
let clrTarget = '#ffd700';     // Gold
let clrTargetGlow = '#ffd700';
let clrText = '#f0f0f0';       // Off-white
let clrTextGlow = '#a0a0f0';   // Subtle lavender glow for text
let clrBorder = '#f0f';         // Magenta for border pulses

// Animation parameters
let pulseSpeed = 0.05;          // General pulsing speed
let borderPulseSpeed = 0.03;
let targetPulseIntensity = 5;   // Glow intensity variation for target
let elasticGlowIntensity = 15;  // Max glow blur for stretched elastic
let defaultGlow = 15;           // Standard glow blur amount

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting..."); // Add log
  createCanvas(windowWidth, windowHeight);
  console.log(`Canvas created: ${windowWidth}x${windowHeight}`); // Add log

  gravity = createVector(0, 0.6);
  friction = 0.985;

  ball = {
    pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0),
    radius: 18, isHeld: false,
  };

  pole = {
    x: 0, y: 0, baseHeight: 150, anchorYOffset: 5, thickness: 10,
  };

  targetBox = {
    x: 0, y: 0, w: 60, h: 60
  };

  setupLevel(); // Initialize the first level
  console.log("Setup finished."); // Add log
}

// Sets up positions for a new level based on current canvas size
function setupLevel() {
  // console.log("setupLevel called..."); // Can add more logs if needed
  gameState = 'aiming';
  ball.isHeld = false;

  // Place Pole
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = height - pole.baseHeight - 10;

  // Place Target Box
  let minTargetX = pole.x + 250;
  let maxTargetX = width - targetBox.w - 70;
  if (minTargetX > maxTargetX) {
      minTargetX = width * 0.5;
      maxTargetX = width - targetBox.w - 30;
  }
  targetBox.x = random(minTargetX, maxTargetX);
  targetBox.y = random(height * 0.15, height - targetBox.h - 50);

  // Place Ball
  let anchorX = pole.x;
  let anchorY = pole.y + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0);
  ball.acc = createVector(0, 0);

  console.log(`Level ${currentLevel + 1} setup: Screen(${width}x${height}), Pole(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target(${targetBox.x.toFixed(0)}, ${targetBox.y.toFixed(0)})`);
}

// Main draw loop, runs every frame
function draw() {
    // First check if objects needed for drawing exist (Belt-and-suspenders check)
    if (!ball || !pole || !targetBox) {
        // console.error("Draw loop called before objects initialized!"); // Should not happen if setup completes
        return; // Do nothing if setup hasn't finished properly
    }

  background(clrBackground);

  drawAnimatedBorder();
  drawPole();
  drawTargetBox();

  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic();
    drawBall();
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions();
    drawBall();
  } else if (gameState === 'gameOver') {
    drawBall();
    showGameOver();
  }

  displayScore();
}

// --- Enhanced Drawing Functions with Glow Effects ---

function applyGlow(glowColor, intensity) {
    // Basic check if drawingContext is available
    if(drawingContext) {
        drawingContext.shadowBlur = intensity;
        drawingContext.shadowColor = glowColor;
    } else {
        // console.warn("drawingContext not available for glow"); // May happen very briefly at start
    }
}

function removeGlow() {
    if(drawingContext) {
        drawingContext.shadowBlur = 0;
    }
}

function drawAnimatedBorder() {
    let pulse = (sin(frameCount * borderPulseSpeed) + 1) / 2;
    let thickness = map(pulse, 0, 1, 2, 5);
    let glowAmount = map(pulse, 0, 1, 5, 15);
    let cornerSize = 30 + map(pulse, 0, 1, 0, 10);
    push(); applyGlow(clrBorder, glowAmount); noFill(); stroke(clrBorder); strokeWeight(thickness);
    let cs = cornerSize;
    line(0, cs, 0, 0); line(cs, 0, 0, 0); line(width - cs, 0, width, 0); line(width, cs, width, 0);
    line(0, height - cs, 0, height); line(cs, height, 0, height); line(width - cs, height, width, height); line(width, height - cs, width, height);
    pop();
}

function drawPole() {
    let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; let baseThickness = pole.thickness;
    push(); noStroke(); fill(clrPoleBase); rect(pole.x - baseThickness / 2, pole.y, baseThickness, pole.baseHeight);
    rect(pole.x - baseThickness, height - 10, baseThickness * 2, 10); rect(pole.x - baseThickness * 0.7, pole.y - 5, baseThickness * 1.4, 5);
    strokeWeight(2); let pulse = (sin(frameCount * pulseSpeed * 0.5) + 1) / 2; let accentColor = lerpColor(color(clrPoleAccent), color(clrPoleGlow), pulse); stroke(accentColor);
    line(pole.x, pole.y, pole.x, pole.y + pole.baseHeight); let anchorGlowSize = 15 + map(pulse, 0, 1, 0, 5); applyGlow(clrPoleGlow, anchorGlowSize); fill(clrPoleGlow);
    ellipse(anchorX, anchorY, baseThickness * 0.8, baseThickness * 0.8); removeGlow(); pop();
}

function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2; let scaleFactor = map(pulse, 0, 1, 1.0, 1.05); let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2; let scaledW = targetBox.w * scaleFactor; let scaledH = targetBox.h * scaleFactor;
    push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke(); rect(centerX - scaledW / 2, centerY - scaledH / 2, scaledW, scaledH, 5); removeGlow(); pop();
}

function drawBall() {
    push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke(); ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2); pop();
}

function drawElastic() {
    let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY)); let currentStretch = stretchVector.mag(); if (currentStretch < 2 && !ball.isHeld) return;
    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1); let glowAmount = 5 + stretchRatio * elasticGlowIntensity; let thickness = map(stretchRatio, 0, 1, 2, 5);
    push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(thickness); line(anchorX, anchorY, ball.pos.x, ball.pos.y); pop();
}

function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`; let txtX = 30; let txtY = 40; let glowAmount = 5 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 3;
    push(); textSize(26); textFont('monospace'); textAlign(LEFT, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow);
    text(scoreText, txtX+1, txtY+1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop();
}

function showGameOver() {
    let overlayAlpha = 180; push(); noStroke(); fill(100, 0, 20, overlayAlpha); rect(0, 0, width, height); let mainTxtSize = 60; let subTxtSize = 28; let textY = height / 2; let lineSpacing = 50;
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 15 + pulse * 10; textFont('monospace'); textAlign(CENTER, CENTER);
    applyGlow(clrBorder, glowAmount); fill(clrBorder); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing); removeGlow();
    applyGlow('#FF5555', 10); fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5); pop();
}


// --- Game Mechanics & Physics ---

function aimingLogic() {
   let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; if (ball.isHeld) { let desiredPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(desiredPos, createVector(anchorX, anchorY)); let distance = displacement.mag(); if (distance > maxStretch) { displacement.setMag(maxStretch); ball.pos = p5.Vector.add(createVector(anchorX, anchorY), displacement); } else { ball.pos.set(mouseX, mouseY); } } else { ball.pos.set(anchorX, anchorY); }
}
function physicsUpdate() { if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0); }

function checkCollisions() {
    if (gameState !== 'launched') return;
    // Check Win
    if (didBallHitBox()) { console.log("Target Hit - Level Cleared!"); currentLevel++; setupLevel(); return; }
    // Check Ground
    if (ball.pos.y + ball.radius >= height) { console.log("Hit ground - Game Over!"); gameState = 'gameOver'; ball.vel.mult(0); ball.pos.y = height - ball.radius; }
    // Check Offscreen (L/R/T)
    if (ball.pos.x + ball.radius < 0 || ball.pos.x - ball.radius > width || ball.pos.y + ball.radius < 0) { console.log("Off screen - Game Over!"); gameState = 'gameOver'; }
}
function didBallHitBox() { let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h); let distanceSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return distanceSq < pow(ball.radius, 2); }


// --- Input Event Handlers ---
function mousePressed() { let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; if (gameState === 'aiming') { let d = dist(mouseX, mouseY, anchorX, anchorY); if (d < ball.radius * 3) { ball.isHeld = true; aimingLogic(); } } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); } }
function mouseDragged() { if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } }
function mouseReleased() { let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; if (gameState === 'aiming' && ball.isHeld) { ball.isHeld = false; gameState = 'launched'; let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos); ball.vel = launchVector.mult(elasticForce); ball.acc.mult(0); console.log(`Launched with velocity: (${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`); } }


// --- Window Resize Handler ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  console.log(`Window resized to: ${windowWidth}x${windowHeight}`);
  // Elements reposition on next level via setupLevel()
}