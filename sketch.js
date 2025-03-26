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
  console.log("Setup starting...");
  // --- CHANGE: Use a fixed canvas size for scaling in iFrame ---
  createCanvas(1280, 720); // Example: 720p resolution
  // createCanvas(windowWidth, windowHeight); // Previous line - commented out
  // ---------------------------------------------------------
  console.log(`Canvas created (fixed): ${width}x${height}`);

  gravity = createVector(0, 0.6); // Gravity force
  friction = 0.985;             // Air resistance / damping

  ball = {
    pos: createVector(0, 0), // Position (set in setupLevel)
    vel: createVector(0, 0), // Velocity
    acc: createVector(0, 0), // Acceleration
    radius: 18,              // Ball size
    isHeld: false,
  };

  pole = {
    x: 0,                 // X position (set in setupLevel)
    y: 0,                 // Top Y of base (set in setupLevel)
    baseHeight: 150,      // Visual height of pole structure
    anchorYOffset: 5,     // Y offset from pole.y where elastic attaches
    thickness: 10,        // Width of the pole base
  };

  targetBox = {
    x: 0, y: 0,           // Position (set in setupLevel)
    w: 60, h: 60          // Size
  };

  // Initialize the first level using current canvas dimensions (which are now fixed)
  setupLevel();
  console.log("Setup finished.");
}

// Sets up positions for a new level based on the FIXED canvas size
function setupLevel() {
  // console.log("setupLevel called...");
  gameState = 'aiming';
  ball.isHeld = false;

  // --- Place Pole --- Uses fixed 'width' and 'height' ---
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = height - pole.baseHeight - 10;

  // --- Place Target Box --- Uses fixed 'width' and 'height' ---
  let minTargetX = pole.x + 250;
  let maxTargetX = width - targetBox.w - 70;
  // This check should be less likely needed with fixed size, but keep for safety
  if (minTargetX > maxTargetX) {
      minTargetX = width * 0.5;
      maxTargetX = width - targetBox.w - 30;
  }
  targetBox.x = random(minTargetX, maxTargetX);
  targetBox.y = random(height * 0.15, height - targetBox.h - 50);

  // --- Place Ball ---
  let anchorX = pole.x;
  let anchorY = pole.y + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0);
  ball.acc = createVector(0, 0);

  console.log(`Level ${currentLevel + 1} setup: Screen(${width}x${height}), Pole(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target(${targetBox.x.toFixed(0)}, ${targetBox.y.toFixed(0)})`);
}

// Main draw loop, runs every frame
function draw() {
    // Belt-and-suspenders check - make sure objects exist
    if (!ball || !pole || !targetBox) {
        // console.warn("Draw loop called before setup finished or objects missing");
        return; // Exit draw if essential elements aren't ready
    }

  background(clrBackground);

  drawAnimatedBorder(); // Drawn relative to fixed canvas size
  drawPole();           // Drawn relative to fixed canvas size
  drawTargetBox();      // Drawn relative to fixed canvas size

  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic();
    drawBall();
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions(); // Uses fixed 'height' for ground check
    drawBall();
  } else if (gameState === 'gameOver') {
    drawBall();
    showGameOver(); // Uses fixed 'width'/'height' for centering text
  }

  displayScore(); // Drawn at fixed top-left position
}

// --- Enhanced Drawing Functions with Glow Effects --- (Unchanged)

function applyGlow(glowColor, intensity) {
    if(drawingContext) { // Basic check for safety
        drawingContext.shadowBlur = intensity;
        drawingContext.shadowColor = glowColor;
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
    // These use 'width' and 'height' which are now the fixed canvas dimensions
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
    let overlayAlpha = 180; push(); noStroke(); fill(100, 0, 20, overlayAlpha); rect(0, 0, width, height); // uses fixed w/h
    let mainTxtSize = 60; let subTxtSize = 28; let textY = height / 2; // uses fixed height
    let lineSpacing = 50;
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 15 + pulse * 10; textFont('monospace'); textAlign(CENTER, CENTER);
    applyGlow(clrBorder, glowAmount); fill(clrBorder); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing); // uses fixed w/h
    removeGlow(); applyGlow('#FF5555', 10); fill(clrText); textSize(subTxtSize);
    text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5); // uses fixed w/h
    textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5); // uses fixed w/h
    pop();
}


// --- Game Mechanics & Physics --- (Unchanged)

function aimingLogic() {
   let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; if (ball.isHeld) { let desiredPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(desiredPos, createVector(anchorX, anchorY)); let distance = displacement.mag(); if (distance > maxStretch) { displacement.setMag(maxStretch); ball.pos = p5.Vector.add(createVector(anchorX, anchorY), displacement); } else { ball.pos.set(mouseX, mouseY); } } else { ball.pos.set(anchorX, anchorY); }
}
function physicsUpdate() { if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0); }

function checkCollisions() {
    if (gameState !== 'launched') return;
    // Check Win
    if (didBallHitBox()) { console.log("Target Hit - Level Cleared!"); currentLevel++; setupLevel(); return; }
    // Check Ground (uses fixed 'height')
    if (ball.pos.y + ball.radius >= height) { console.log("Hit ground - Game Over!"); gameState = 'gameOver'; ball.vel.mult(0); ball.pos.y = height - ball.radius; }
    // Check Offscreen (L/R/T - uses fixed 'width')
    if (ball.pos.x + ball.radius < 0 || ball.pos.x - ball.radius > width || ball.pos.y + ball.radius < 0) { console.log("Off screen - Game Over!"); gameState = 'gameOver'; }
}
function didBallHitBox() { let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h); let distanceSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return distanceSq < pow(ball.radius, 2); }


// --- Input Event Handlers --- (Unchanged)
function mousePressed() { let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; if (gameState === 'aiming') { let d = dist(mouseX, mouseY, anchorX, anchorY); if (d < ball.radius * 3) { ball.isHeld = true; aimingLogic(); } } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); } }
function mouseDragged() { if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } }
function mouseReleased() { let anchorX = pole.x; let anchorY = pole.y + pole.anchorYOffset; if (gameState === 'aiming' && ball.isHeld) { ball.isHeld = false; gameState = 'launched'; let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos); ball.vel = launchVector.mult(elasticForce); ball.acc.mult(0); console.log(`Launched with velocity: (${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`); } }


// --- Window Resize Handler --- (REMOVED)
// function windowResized() {
//   // This function is no longer needed as the canvas size is fixed.
//   // The scaling is handled by CSS within the iFrame's container.
//   // resizeCanvas(windowWidth, windowHeight);
//   // console.log(`Window resized function called but does nothing now.`);
// }
// ------------------------------
