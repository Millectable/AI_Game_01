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

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

// --- Visual Style & Animation ---
let clrBackground = '#F5EFE4';
let clrText = '#8DA1AD';
let clrTextGlow = '#0B3D42';
let clrMainAccent = '#0B3D42';
let clrSecondaryAccent = '#8DA1AD';
let clrSubtleGlow = '#A8BAC4';
let clrBall = clrMainAccent;
let clrBallGlow = clrSecondaryAccent;
let clrPoleBase = clrSecondaryAccent;
let clrPoleAccent = '#C0CED7'; // Anchor point color
let clrGeoShapes = clrSecondaryAccent;
let clrGeoShapesGlow = clrSubtleGlow;
let clrGroundParticleGlow = clrSubtleGlow;
let clrElasticBase = clrMainAccent;
let clrElasticGlow = clrSecondaryAccent;
let clrTarget = clrMainAccent;
let clrTargetGlow = clrSecondaryAccent;
let clrSideParticle = clrSecondaryAccent;
let clrSideParticleGlow = clrSubtleGlow;
let clrBorderGlow = clrMainAccent;

let pulseSpeed = 0.05;
let defaultGlow = 20;
let targetPulseIntensity = 8;
let elasticGlowIntensity = 12;
let groundLevelY;
const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80;
const MAX_SIDE_PARTICLES = 100;

let borderStrokeWeight = 2.5;
let borderBaseGlow = 8;
let borderPulseIntensity = 10;
let borderPulseSpeedFactor = 0.7;

let geometricShapes = [];
let groundParticles = [];
let sideParticles = [];

let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let targetMoveSpeedX = 0.015;
let targetMoveSpeedY = 0.011;

let gameFont = 'Georgia';

// *** NEW: Pole Animation Parameters ***
let poleSwaySpeed = 0.02;
let poleSwayAmount = 1.5; // Pixels left/right sway
let anchorBobSpeed = 0.04;
let anchorBobAmount = 1; // Pixels up/down bob

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  console.log(`Canvas created (fixed): ${width}x${height}`);

  groundLevelY = height * 0.85; // For shape positioning

  gravity = createVector(0, 0.6);
  friction = 0.988;

  ball = { pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0), radius: 24, isHeld: false };
  pole = {
    x: 0, y: 0, // Base position set in setupLevel
    // *** ADJUSTED POLE HEIGHT ***
    poleHeight: height * 0.2, // Pole is bottom 20% of height
    baseX: 0, // Store base X for animation reference
    anchorYOffset: -10, thickness: 8,
  };
  targetBox = { x: 0, y: 0, w: 60, h: 60, initialX: 0, initialY: 0 };

  // Define target bounds AFTER pole is defined
  setTargetBounds();

  setupLevel();
  console.log("Setup finished.");
}

function setTargetBounds() {
    targetMoveBounds.minX = width * 0.35;
    targetMoveBounds.maxX = width * 0.9 - targetBox.w;
    targetMoveBounds.minY = height * 0.1;
    // Max Y should be well above the new, shorter pole's anchor
    targetMoveBounds.maxY = min(height * 0.6, height - pole.poleHeight - targetBox.h - 30); // Added more padding

     if (targetMoveBounds.maxY < targetMoveBounds.minY) {
        console.warn("Calculated target maxY is less than minY. Adjusting bounds.");
        targetMoveBounds.maxY = targetMoveBounds.minY;
    }
     if (targetMoveBounds.maxX < targetMoveBounds.minX) {
        console.warn("Calculated target maxX is less than minX. Adjusting bounds.");
        targetMoveBounds.maxX = targetMoveBounds.minX;
    }
    console.log(`Target Bounds Set: (${targetMoveBounds.minX.toFixed(0)}, ${targetMoveBounds.minY.toFixed(0)}) to (${targetMoveBounds.maxX.toFixed(0)}, ${targetMoveBounds.maxY.toFixed(0)})`);
}

function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming';
  ball.isHeld = false;

  // Set FIXED base pole position
  pole.baseX = width * 0.15; // Store base X for animation
  pole.x = pole.baseX;     // Current X starts at base X
  pole.y = height;          // Base is at the bottom edge

  // Calculate initial target position
  let minTargetX = pole.x + width * 0.25; let maxTargetX = width - targetBox.w - width * 0.1;
  if (minTargetX > maxTargetX) { minTargetX = width * 0.5; maxTargetX = width - targetBox.w - width * 0.05; }
  let minYTarget = height * 0.15; let maxYTarget = height - pole.poleHeight - targetBox.h - height * 0.15; // Ensure reasonable target Y range
   if (maxYTarget < minYTarget) { maxYTarget = minYTarget + 1; console.warn("Adjusted initial target Y range"); }
  targetBox.initialX = random(minTargetX, maxTargetX);
  targetBox.initialY = random(minYTarget, maxYTarget);
  targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY;

  // Place ball at the initial (non-animated) anchor point
  let initialAnchorPos = calculateAnchorPos(0); // Calculate with animation offset 0 initially
  ball.pos = initialAnchorPos.copy(); // Use copy to avoid reference issues
  ball.vel = createVector(0, 0); ball.acc = createVector(0, 0);

  generateGeometricPatterns();
  console.log(`Level ${currentLevel + 1} setup: FIXED Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Initial Anchor(${initialAnchorPos.x.toFixed(0)}, ${initialAnchorPos.y.toFixed(0)})`);
}

// *** NEW: Helper function to calculate current anchor position including animation ***
function calculateAnchorPos(animationFrameCount = frameCount) {
    let currentPoleX = pole.baseX + sin(animationFrameCount * poleSwaySpeed) * poleSwayAmount;
    let baseAnchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    let currentAnchorY = baseAnchorY + cos(animationFrameCount * anchorBobSpeed) * anchorBobAmount;
    return createVector(currentPoleX, currentAnchorY);
}

// Main draw loop
function draw() {
  if (!ball || !pole || !targetBox) {
       if(frameCount < 10) console.log("Objects not ready, returning from draw(). Frame:", frameCount);
       return;
  }
  background(clrBackground);

  if (gameState !== 'gameOver') {
      updateTargetPosition();
  }

  // --- Draw Background / Foreground Elements ---
  // Draw shapes first so pole can potentially sway over them
  drawGround();
  updateAndDrawParticles();

  drawPole(); // Draws animated pole
  drawTargetBox();

  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic(); // Draws based on current animated anchor
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
  drawGlowingBorder();
}

// Updates the target's position smoothly
function updateTargetPosition() { /* ... same as before ... */
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2;
    let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2;
    if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) {
        targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX);
        targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY);
    } else { targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; if(frameCount % 60 === 0) console.warn("Using fallback target position."); }
}

// --- Visual Elements Drawing Functions ---
function applyGlow(glowColor, intensity) { if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; } }
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }
function drawGround() { /* ... same as before ... */
    push(); noFill(); strokeWeight(1.5); stroke(clrGeoShapes); applyGlow(clrGeoShapesGlow, 8);
    for (let i = 0; i < geometricShapes.length; i++) { let shape = geometricShapes[i]; shape.angle += 0.008; shape.x += sin(frameCount * 0.025 + i * 0.6) * 0.2; shape.y += cos(frameCount * 0.018 + i * 0.8) * 0.15; shape.y = constrain(shape.y, groundLevelY + 10, height - 20); if (shape.x > width + shape.w) shape.x = -shape.w; if (shape.x < -shape.w) shape.x = width + shape.w; push(); translate(shape.x, shape.y); rotate(shape.angle); rectMode(CENTER); rect(0, 0, shape.w, shape.h); pop(); } removeGlow(); pop();
}
function generateGeometricPatterns() { /* ... same as before ... */
    geometricShapes = []; let patternAreaHeight = height - groundLevelY; if (patternAreaHeight <= 0) return;
    for (let i = 0; i < NUM_GEO_SHAPES; i++) { let shape = { x: random(width), y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8), w: random(20, 150), h: random(10, 80), angle: random(TWO_PI) }; geometricShapes.push(shape); }
}
function updateAndDrawParticles() { /* ... same as before ... */
    // Side Particles
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle();
    for (let i = sideParticles.length - 1; i >= 0; i--) { let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5; if (p.lifespan <= 0) { sideParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6); let baseColor = color(clrSideParticle); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrSideParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size, p.size); removeGlow(); pop(); } }
    // Ground Particles
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle();
    for (let i = groundParticles.length - 1; i >= 0; i--) { let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1; if (p.lifespan <= 0) { groundParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7); let baseColor = color(clrGroundParticleGlow); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrGroundParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size, p.size); removeGlow(); pop(); } }
}
function spawnSideParticle() { /* ... same as before ... */
    let edgeMargin = width * 0.08; let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width); let yPos = random(height * 0.2, height * 1.1); let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)), initialLifespan: random(120, 280), lifespan: 0, size: random(1.5, 4), }; particle.lifespan = particle.initialLifespan; sideParticles.push(particle);
}
function spawnGroundParticle() { /* ... same as before ... */
     if (typeof groundLevelY !== 'number' || groundLevelY >= height) return; let xPos = random(width); let yPos = random(groundLevelY + 5, height - 5); let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)), initialLifespan: random(100, 200), lifespan: 0, size: random(2, 5), }; particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}

// Draws the animated pole
function drawPole() {
    push();
    // Calculate current animated X position for the pole line
    let currentPoleX = pole.baseX + sin(frameCount * poleSwaySpeed) * poleSwayAmount;
    pole.x = currentPoleX; // Update pole's current x if needed elsewhere

    // Calculate current animated anchor position using helper function
    let currentAnchor = calculateAnchorPos(); // Uses current frameCount

    // Calculate top Y based on pole height from BASE (bottom of screen)
    let poleTopVisibleY = pole.y - pole.poleHeight; // This might be above the anchor if bobbing

    // Draw main pole line with sway
    strokeWeight(pole.thickness); stroke(clrPoleBase);
    line(currentPoleX, pole.y, currentPoleX, poleTopVisibleY); // Line from bottom up to top extent

    // Draw anchor point visual at its current bobbing position
    fill(clrPoleAccent); applyGlow(clrSubtleGlow, 5); noStroke();
    ellipse(currentAnchor.x, currentAnchor.y, pole.thickness * 1.8, pole.thickness * 1.8);
    removeGlow();
    pop();
}

function drawTargetBox() { /* ... same as before ... */
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2; let scaleFactor = map(pulse, 0, 1, 1.0, 1.03); let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity); let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2; let scaledW = targetBox.w * scaleFactor; let scaledH = targetBox.h * scaleFactor; push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke(); rectMode(CENTER); rect(centerX, centerY, scaledW, scaledH, 5); removeGlow(); pop();
}
function drawBall() { /* ... same as before ... */
    push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke(); ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2); pop();
}

// Draws the elastic band using the current animated anchor position
function drawElastic() {
    let currentAnchor = calculateAnchorPos(); // Get current animated anchor
    let stretchVector = p5.Vector.sub(ball.pos, currentAnchor);
    let currentStretch = stretchVector.mag();
    if (currentStretch < 2 && !ball.isHeld) return;
    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1);
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity; let thickness = map(stretchRatio, 0, 1, 2, 5);
    push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(thickness);
    line(currentAnchor.x, currentAnchor.y, ball.pos.x, ball.pos.y); // Use current anchor pos
    pop();
}

function displayScore() { /* ... same as before ... */
    let scoreText = `Level: ${currentLevel + 1}`; let txtX = width * 0.03; let txtY = height * 0.07; let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; push(); let baseSize = 26; textSize(baseSize); textFont(gameFont); textAlign(LEFT, TOP); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow); text(scoreText, txtX + 1, txtY + 1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop();
}
function showGameOver() { /* ... same as before ... */
    let overlayAlpha = 180; push(); let overlayColor = color(clrBackground); overlayColor.setAlpha(overlayAlpha); fill(overlayColor); noStroke(); rect(0, 0, width, height); let mainTxtSize = 60; let subTxtSize = 28; let textY = height / 2; let lineSpacing = 50; let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 8 + pulse * 6; textFont(gameFont); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrText); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing); removeGlow(); applyGlow(clrTextGlow, glowAmount * 0.6); fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5); removeGlow(); fill(clrText); textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5); pop();
}
function drawGlowingBorder() { /* ... same as before ... */
    push(); let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2; let currentGlow = borderBaseGlow + pulse * borderPulseIntensity; let offset = borderStrokeWeight / 2; noFill(); stroke(clrMainAccent); strokeWeight(borderStrokeWeight); applyGlow(clrBorderGlow, currentGlow); rect(offset, offset, width - borderStrokeWeight, height - borderStrokeWeight); removeGlow(); pop();
}

// --- Game Mechanics & Physics ---

// Aiming logic uses the current animated anchor position
function aimingLogic() {
   let currentAnchor = calculateAnchorPos(); // Get current animated anchor
   if (ball.isHeld) {
     let currentInputPos = createVector(mouseX, mouseY);
     let displacement = p5.Vector.sub(currentInputPos, currentAnchor); // Use current anchor
     let distance = displacement.mag();
     if (distance > maxStretch) {
       displacement.setMag(maxStretch);
       ball.pos = p5.Vector.add(currentAnchor, displacement); // Position relative to current anchor
     } else {
       ball.pos.set(currentInputPos.x, currentInputPos.y);
     }
   } else {
     // Snap ball back to the current animated anchor position when not held
     ball.pos.set(currentAnchor.x, currentAnchor.y);
   }
}

function physicsUpdate() { /* ... same as before ... */
  if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0);
}
function checkCollisions() { /* ... same as before ... */
    if (gameState !== 'launched') return; if (didBallHitBox()) { console.log("Target Hit!"); currentLevel++; setupLevel(); return; } let hitBorder = false; if (ball.pos.x - ball.radius <= 0) hitBorder = true; else if (ball.pos.x + ball.radius >= width) hitBorder = true; else if (ball.pos.y - ball.radius <= 0) hitBorder = true; else if (ball.pos.y + ball.radius >= height) hitBorder = true; if (hitBorder) { gameState = 'gameOver'; console.log("Hit Border!"); return; }
}
function didBallHitBox() { /* ... same as before ... */
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h); let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return dSq < pow(ball.radius, 2);
}

// --- Input Event Handlers ---

// mousePressed uses the current animated anchor position for distance check
function mousePressed() {
    if (gameState === 'aiming') {
      let currentAnchor = calculateAnchorPos(); // Get current animated anchor
      let d = dist(mouseX, mouseY, currentAnchor.x, currentAnchor.y); // Check dist to current anchor
      if (d < ball.radius * 3.0) { ball.isHeld = true; aimingLogic(); }
    } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); }
    return false;
}
function mouseDragged() { /* ... same as before ... */
  if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } return false;
}

// mouseReleased uses the current animated anchor position for launch vector
function mouseReleased() {
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched';
        let currentAnchor = calculateAnchorPos(); // Get current animated anchor for launch
        let launchVector = p5.Vector.sub(currentAnchor, ball.pos); // Vector from ball to anchor
        let launchMultiplier = 0.7; // Keep high power
        ball.vel = launchVector.mult(elasticForce * launchMultiplier); ball.acc.mult(0);
        console.log(`Launched: Anchor(${currentAnchor.x.toFixed(1)},${currentAnchor.y.toFixed(1)}), V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
    return false;
}
// --- End ---
