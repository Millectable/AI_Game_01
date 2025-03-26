// Game Globals
let ball;
let pole;
let targetBox;
let gravity;
let friction;
let elasticForce = 0.4;
let maxStretch = 160;

let gameState = 'aiming';
let currentLevel = 0;

// --- Visual Style & Animation ---
// Color Palette
let clrBackground = '#1a1a2e';
let clrBall = '#00ffff';
let clrBallGlow = '#00ffff';
let clrPoleBase = '#aaaaaa';
let clrPoleAccent = '#dddddd';
let clrGround = '#00ced1';
let clrGroundGlow = '#00ffff'; // Good candidate for border glow
let clrElasticBase = '#4d4dff';
let clrElasticGlow = '#8080ff';
let clrTarget = '#ffd700';
let clrTargetGlow = '#ffd700';
let clrText = '#f0f0f0';
let clrTextGlow = '#a0a0f0';
let clrSideParticle = '#ffcc00';
let clrSideParticleGlow = '#ffd700';
let clrBorderGlow = '#00ffff'; // Explicit color for border glow (can be same as ground)

// Animation & Element Parameters
let pulseSpeed = 0.05;
let targetPulseIntensity = 5;
let elasticGlowIntensity = 15;
let defaultGlow = 15;
let groundLevelY;
const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 100;
const MAX_SIDE_PARTICLES = 150;

// *** NEW: Border parameters ***
let borderStrokeWeight = 2.5;
let borderBaseGlow = 8;
let borderPulseIntensity = 12;
let borderPulseSpeedFactor = 0.7; // Slightly different speed

// Arrays for shapes and particles
let geometricShapes = [];
let groundParticles = [];
let sideParticles = [];


// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  createCanvas(1280, 720); // Fixed canvas size
  console.log(`Canvas created (fixed): ${width}x${height}`);

  gravity = createVector(0, 0.6);
  friction = 0.985;
  groundLevelY = height * 0.85;

  ball = {
    pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0),
    radius: 18, isHeld: false,
  };
  pole = {
    x: 0, y: 0, poleHeight: 80, anchorYOffset: -10, thickness: 8,
  };
  targetBox = { x: 0, y: 0, w: 60, h: 60 };

  setupLevel();
  console.log("Setup finished.");
}

function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming';
  ball.isHeld = false;
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = groundLevelY;
  let minTargetX = pole.x + 250;
  let maxTargetX = width - targetBox.w - 70;
  if (minTargetX > maxTargetX) {
      minTargetX = width * 0.5;
      maxTargetX = width - targetBox.w - 30;
  }
  targetBox.x = random(minTargetX, maxTargetX);
  targetBox.y = random(height * 0.15, groundLevelY - targetBox.h - 50);
  let anchorX = pole.x;
  let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0);
  ball.acc = createVector(0, 0);
  generateGeometricPatterns();
  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target(${targetBox.x.toFixed(0)}, ${targetBox.y.toFixed(0)})`);
}

// Main draw loop
function draw() {
    if (!ball || !pole || !targetBox) return; // Safety check

  background(clrBackground);

  // --- Draw Background Elements ---
  drawGround();
  updateAndDrawParticles(); // Handles both ground and side particles

  // --- Draw Game Elements ---
  drawPole();
  drawTargetBox();

  // --- Game State Logic & Dynamic Drawing ---
  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic();
    drawBall(); // Draw ball on top during aiming
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions();
    drawBall(); // Draw moving ball
  } else if (gameState === 'gameOver') {
    drawBall(); // Draw ball's final position
    showGameOver(); // Draw overlay last typically, but border can be over it
  }

  // --- Draw UI Elements ---
  displayScore();

  // --- *** NEW: Draw the animated glowing border *** ---
  // Drawn last so it frames everything, including UI like score/game over text
  drawGlowingBorder();
}


// --- Visual Elements Drawing Functions ---

function applyGlow(glowColor, intensity) {
    if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; }
}
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }

function drawGround() {
    push();
    strokeWeight(3);
    stroke(clrGround);
    applyGlow(clrGroundGlow, 15);
    line(0, groundLevelY, width, groundLevelY);
    removeGlow();
    noFill();
    strokeWeight(1.5);
    stroke(clrGround);
    applyGlow(clrGroundGlow, 10);
    for (const shape of geometricShapes) {
        push();
        translate(shape.x, shape.y);
        rotate(shape.angle);
        rect(0, 0, shape.w, shape.h);
        pop();
    }
    removeGlow();
    pop();
}

function generateGeometricPatterns() {
    geometricShapes = [];
    let patternAreaHeight = height - groundLevelY;
    for (let i = 0; i < NUM_GEO_SHAPES; i++) {
        let shape = {
            x: random(width),
            y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.9),
            w: random(20, 150),
            h: random(10, 80),
            angle: random(TWO_PI)
        };
        geometricShapes.push(shape);
    }
}

function updateAndDrawParticles() {
    // Side Particles
    if (frameCount % 2 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle();
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5;
        if (p.lifespan <= 0) sideParticles.splice(i, 1);
        else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 255);
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 8);
            fill(red(clrSideParticle), green(clrSideParticle), blue(clrSideParticle), alpha);
            applyGlow(clrSideParticleGlow, glowAmount); noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
        }
    }
    // Ground Particles
    if (frameCount % 4 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle();
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1;
        if (p.lifespan <= 0) groundParticles.splice(i, 1);
        else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 150);
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 10);
             fill(red(clrGroundGlow), green(clrGroundGlow), blue(clrGroundGlow), alpha);
            applyGlow(clrGroundGlow, glowAmount); noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
        }
    }
}

function spawnSideParticle() {
    let edgeMargin = width * 0.08;
    let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width);
    let yPos = random(height * 0.2, height * 1.1);
    let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.8, -1.8)), initialLifespan: random(100, 250), lifespan: 0, size: random(2, 5), };
    particle.lifespan = particle.initialLifespan; sideParticles.push(particle);
}
function spawnGroundParticle() {
    let xPos = random(width); let yPos = random(groundLevelY + 10, height - 10);
    let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.4, 0.4), random(-0.2, 0.2)), initialLifespan: random(80, 180), lifespan: 0, size: random(3, 6), };
    particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}

function drawPole() {
    push(); let poleTopY = pole.y - pole.poleHeight; strokeWeight(pole.thickness); stroke(clrPoleBase); line(pole.x, pole.y, pole.x, poleTopY);
    let anchorX = pole.x; let anchorY = poleTopY + pole.anchorYOffset; fill(clrBall); applyGlow(clrBallGlow, defaultGlow); noStroke();
    ellipse(anchorX, anchorY, pole.thickness * 1.8, pole.thickness * 1.8); removeGlow(); pop();
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
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset; let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY)); let currentStretch = stretchVector.mag(); if (currentStretch < 2 && !ball.isHeld) return;
    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1); let glowAmount = 5 + stretchRatio * elasticGlowIntensity; let thickness = map(stretchRatio, 0, 1, 2, 5);
    push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(thickness); line(anchorX, anchorY, ball.pos.x, ball.pos.y); pop();
}

function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`; let txtX = 30; let txtY = 40; let glowAmount = 5 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 3;
    push(); textSize(26); textFont('monospace'); textAlign(LEFT, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow); text(scoreText, txtX+1, txtY+1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop();
}

function showGameOver() {
    // Keep overlay slightly transparent so border can pulse behind/through it
    let overlayAlpha = 160; // Reduced slightly from 180
    push();
    fill(100, 0, 20, overlayAlpha); noStroke(); rect(0, 0, width, height);
    let mainTxtSize = 60; let subTxtSize = 28; let textY = height / 2; let lineSpacing = 50;
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 15 + pulse * 10;
    textFont('monospace'); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrText); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing); removeGlow();
    applyGlow('#FF5555', 10); fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5);
    pop();
}

// --- *** NEW: Function to draw the animated glowing border *** ---
function drawGlowingBorder() {
    push();
    let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2; // 0 to 1 range
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity;
    let offset = borderStrokeWeight / 2; // Offset to draw fully inside bounds

    noFill();
    stroke(clrBorderGlow); // Use the border glow color
    strokeWeight(borderStrokeWeight);
    applyGlow(clrBorderGlow, currentGlow); // Apply the animated glow

    // Draw rect inset slightly so the whole stroke is visible
    rect(offset, offset, width - borderStrokeWeight, height - borderStrokeWeight);

    removeGlow();
    pop();
}

// --- Game Mechanics & Physics ---

function aimingLogic() {
   let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
   if (ball.isHeld) {
     let desiredPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(desiredPos, createVector(anchorX, anchorY)); let distance = displacement.mag();
     if (distance > maxStretch) { displacement.setMag(maxStretch); ball.pos = p5.Vector.add(createVector(anchorX, anchorY), displacement); }
     else { ball.pos.set(mouseX, mouseY); }
   } else { ball.pos.set(anchorX, anchorY); }
}
function physicsUpdate() { if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0); }
function checkCollisions() {
    if (gameState !== 'launched') return;
    if (didBallHitBox()) { console.log("Target Hit!"); currentLevel++; setupLevel(); return; }
    if (ball.pos.y + ball.radius >= groundLevelY) { console.log("Hit ground!"); gameState = 'gameOver'; ball.vel.y *= -0.5; ball.vel.x *= 0.8; ball.pos.y = groundLevelY - ball.radius; }
    if (ball.pos.x + ball.radius < 0 || ball.pos.x - ball.radius > width || ball.pos.y + ball.radius < 0) { console.log("Off screen!"); gameState = 'gameOver'; }
}
function didBallHitBox() { let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h); let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return dSq < pow(ball.radius, 2); }

// --- Input Event Handlers ---
function mousePressed() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming') { let d = dist(mouseX, mouseY, anchorX, anchorY); if (d < ball.radius * 3) { ball.isHeld = true; aimingLogic(); } }
    else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); }
}
function mouseDragged() { if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } }
function mouseReleased() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched'; let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);
        ball.vel = launchVector.mult(elasticForce); ball.acc.mult(0); console.log(`Launched: V(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
}
// --- End ---
