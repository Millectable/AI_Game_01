// Game Globals
let ball;
let pole;
let targetBox;
let gravity;
let friction;
let elasticForce = 0.4;
// let maxStretch = 160; // Base value

let gameState = 'aiming';
let currentLevel = 0;

// --- Reference dimensions for scaling ---
const REF_WIDTH = 1280;
const REF_HEIGHT = 720; // Can be useful for vertical scaling if needed
let scaleFactor = 1; // Global scaling factor

// --- Base Sizes (will be scaled) ---
const BASE_BALL_RADIUS = 24;
const BASE_POLE_THICKNESS = 8;
const BASE_POLE_ANCHOR_OFFSET = -10;
const BASE_TARGET_W = 60;
const BASE_TARGET_H = 60;
const BASE_MAX_STRETCH = 160;
const BASE_BORDER_WEIGHT = 2.5;
const BASE_TEXT_SIZE = 26;
const MIN_TEXT_SIZE = 14; // Minimum readable text size

// Scaled versions (calculated in setLayoutDimensions)
let scaledMaxStretch = BASE_MAX_STRETCH;
let scaledBorderStrokeWeight = BASE_BORDER_WEIGHT;


// --- Visual Style & Animation ---
// (Color definitions remain the same)
let clrBackground = '#F5EFE4'; let clrText = '#8DA1AD'; let clrTextGlow = '#0B3D42';
let clrMainAccent = '#0B3D42'; let clrSecondaryAccent = '#8DA1AD'; let clrSubtleGlow = '#A8BAC4';
let clrBall = clrMainAccent; let clrBallGlow = clrSecondaryAccent; let clrPoleBase = clrSecondaryAccent;
let clrPoleAccent = '#C0CED7'; let clrGeoShapes = clrSecondaryAccent; let clrGeoShapesGlow = clrSubtleGlow;
let clrGroundParticleGlow = clrSubtleGlow; let clrElasticBase = clrMainAccent;
let clrElasticGlow = clrSecondaryAccent; let clrTarget = clrMainAccent; let clrTargetGlow = clrSecondaryAccent;
let clrSideParticle = clrSecondaryAccent; let clrSideParticleGlow = clrSubtleGlow;
let clrBorderGlow = clrMainAccent;

// (Animation parameters remain the same)
let pulseSpeed = 0.05; let defaultGlow = 20; let targetPulseIntensity = 8;
let elasticGlowIntensity = 12; let groundLevelY; const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80; const MAX_SIDE_PARTICLES = 100;
let borderBaseGlow = 8; let borderPulseIntensity = 10;
let borderPulseSpeedFactor = 0.7;

let geometricShapes = []; let groundParticles = []; let sideParticles = [];

// (Target movement parameters remain the same)
let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let targetMoveSpeedX = 0.015; let targetMoveSpeedY = 0.011;

// (Pole animation parameters remain the same)
let poleSwaySpeed = 0.02; let poleSwayAmount = 1.5; // Keep animation small pixels
let anchorBobSpeed = 0.04; let anchorBobAmount = 1;

let gameFont = 'Georgia';
const TARGET_ASPECT_RATIO = REF_WIDTH / REF_HEIGHT;

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  let canvasSize = calculateCanvasSize();
  let canvas = createCanvas(canvasSize.w, canvasSize.h);
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  console.log(`Canvas created (dynamic): ${width}x${height}`);

  gravity = createVector(0, 0.6); // Keep gravity fixed for consistent feel? Or scale slightly?
  friction = 0.988;

  // Initialize objects (base sizes set globally)
  ball = { pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0), radius: BASE_BALL_RADIUS, isHeld: false };
  pole = { x: 0, y: 0, poleHeight: 0, baseX: 0, anchorYOffset: BASE_POLE_ANCHOR_OFFSET, thickness: BASE_POLE_THICKNESS };
  targetBox = { x: 0, y: 0, w: BASE_TARGET_W, h: BASE_TARGET_H, initialX: 0, initialY: 0 };

  // Set initial layout and calculate initial scale factor
  setLayoutDimensions();

  setupLevel();
  console.log("Setup finished.");
}

function calculateCanvasSize() {
  let w = windowWidth; let h = windowHeight; let currentRatio = w / h; let canvasW, canvasH;
  if (currentRatio > TARGET_ASPECT_RATIO) { canvasH = h; canvasW = h * TARGET_ASPECT_RATIO; }
  else { canvasW = w; canvasH = w / TARGET_ASPECT_RATIO; }
  return { w: floor(canvasW), h: floor(canvasH) };
}

// Sets layout variables AND calculates scaling factor / scaled values
function setLayoutDimensions() {
    // *** Calculate Scale Factor ***
    scaleFactor = width / REF_WIDTH; // Scale based on width ratio

    // Calculate layout based on current height
    groundLevelY = height * 0.85;
    pole.poleHeight = height * 0.2; // Keep pole height relative to current height

    // *** Calculate Scaled Values ***
    scaledMaxStretch = BASE_MAX_STRETCH * scaleFactor;
    scaledBorderStrokeWeight = max(1.0, BASE_BORDER_WEIGHT * scaleFactor); // Ensure minimum weight
    pole.scaledThickness = max(2, BASE_POLE_THICKNESS * scaleFactor); // Scale thickness, min 2
    pole.scaledAnchorYOffset = BASE_POLE_ANCHOR_OFFSET * scaleFactor; // Scale offset
    targetBox.scaledW = BASE_TARGET_W * scaleFactor; // Scale target width
    targetBox.scaledH = BASE_TARGET_H * scaleFactor; // Scale target height
    ball.scaledRadius = max(5, BASE_BALL_RADIUS * scaleFactor); // Scale ball radius, min 5

    // Calculate target bounds using scaled target size
    targetMoveBounds.minX = width * 0.35;
    targetMoveBounds.maxX = width * 0.9 - targetBox.scaledW; // Use scaled width
    targetMoveBounds.minY = height * 0.1;
    targetMoveBounds.maxY = min(height * 0.6, height - pole.poleHeight - targetBox.scaledH - 20); // Use scaled height

     // Validity checks
    if (targetMoveBounds.maxY < targetMoveBounds.minY) { targetMoveBounds.maxY = targetMoveBounds.minY; }
    if (targetMoveBounds.maxX < targetMoveBounds.minX) { targetMoveBounds.maxX = targetMoveBounds.minX; }

    console.log(`Layout Set: ScaleFactor=${scaleFactor.toFixed(2)}, groundY=${groundLevelY.toFixed(0)}, poleH=${pole.poleHeight.toFixed(0)}`);
    console.log(`Scaled: Radius=${ball.scaledRadius.toFixed(1)}, TargetW=${targetBox.scaledW.toFixed(1)}, MaxStretch=${scaledMaxStretch.toFixed(0)}`);
}

function windowResized() {
  console.log("Window resized!");
  let canvasSize = calculateCanvasSize();
  resizeCanvas(canvasSize.w, canvasSize.h);
  console.log(`Canvas resized to: ${width}x${height}`);
  // Recalculate layout and scaling factor
  setLayoutDimensions();
  // Reset level elements
  setupLevel();
}

// setupLevel uses dynamic dimensions and scaled values
function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming'; ball.isHeld = false;
  pole.baseX = width * 0.15; pole.x = pole.baseX; pole.y = height;

  // Target position calculation uses scaled target size
  let minTargetX = pole.x + width * 0.25; let maxTargetX = width - targetBox.scaledW - width * 0.1;
  if (minTargetX > maxTargetX) { minTargetX = width * 0.5; maxTargetX = width - targetBox.scaledW - width * 0.05; }
  let minYTarget = height * 0.15; let maxYTarget = height - pole.poleHeight - targetBox.scaledH - height * 0.15;
   if (maxYTarget < minYTarget) { maxYTarget = minYTarget + 1; }
  targetBox.initialX = random(minTargetX, maxTargetX); targetBox.initialY = random(minYTarget, maxYTarget);
  targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY;

  // Ball position uses scaled offset
  let initialAnchorPos = calculateAnchorPos(0);
  ball.pos = initialAnchorPos.copy();
  ball.vel = createVector(0, 0); ball.acc = createVector(0, 0);

  generateGeometricPatterns(); // Needs scaled shapes? Maybe keep fixed size. Let's test first.
  console.log(`Level ${currentLevel + 1} setup: Initial Anchor(${initialAnchorPos.x.toFixed(0)}, ${initialAnchorPos.y.toFixed(0)})`);
}

// calculateAnchorPos uses scaled offset
function calculateAnchorPos(animationFrameCount = frameCount) {
    let currentPoleX = pole.baseX + sin(animationFrameCount * poleSwaySpeed) * poleSwayAmount; // Keep animation pixel based
    // Use scaled offset
    let baseAnchorY = height - pole.poleHeight + pole.scaledAnchorYOffset;
    let currentAnchorY = baseAnchorY + cos(animationFrameCount * anchorBobSpeed) * anchorBobAmount; // Keep animation pixel based
    return createVector(currentPoleX, currentAnchorY);
}

// draw loop remains the same structure
function draw() { /* ... same structure as before ... */
    if (!ball || !pole || !targetBox) { if(frameCount < 10) console.log("Objects not ready..."); return; }
    background(clrBackground);
    if (gameState !== 'gameOver') { updateTargetPosition(); }
    drawGround(); updateAndDrawParticles(); drawPole(); drawTargetBox();
    if (gameState === 'aiming') { aimingLogic(); if (ball.isHeld) drawElastic(); drawBall(); }
    else if (gameState === 'launched') { physicsUpdate(); checkCollisions(); drawBall(); }
    else if (gameState === 'gameOver') { drawBall(); showGameOver(); }
    displayScore(); drawGlowingBorder();
}

// updateTargetPosition uses scaled bounds
function updateTargetPosition() { /* ... same as before ... */
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2; let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2; if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) { targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX); targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY); } else { targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; if(frameCount % 60 === 0) console.warn("Using fallback target position."); }
}


// --- Visual Elements Drawing Functions ---
// applyGlow, removeGlow remain the same
function applyGlow(glowColor, intensity) { if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; } }
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }

// drawGround - Keep shape sizes fixed for now, or scale w/h? Let's keep fixed.
function drawGround() { /* ... same as before, using BASE_GEO_W/H would scale ... */
    push(); noFill(); strokeWeight(1.5); stroke(clrGeoShapes); applyGlow(clrGeoShapesGlow, 8);
    for (let i = 0; i < geometricShapes.length; i++) {
        let shape = geometricShapes[i]; shape.angle += 0.008;
        shape.x += sin(frameCount * 0.025 + i * 0.6) * 0.2;
        shape.y += cos(frameCount * 0.018 + i * 0.8) * 0.15;
        shape.y = constrain(shape.y, groundLevelY + 10, height - 20);
        if (shape.x > width + shape.w) shape.x = -shape.w; if (shape.x < -shape.w) shape.x = width + shape.w;
        push(); translate(shape.x, shape.y); rotate(shape.angle); rectMode(CENTER);
        // Use the original random w/h for shapes, don't scale them yet.
        rect(0, 0, shape.w, shape.h);
        pop();
    } removeGlow(); pop();
}
// generateGeometricPatterns - Keep shape w/h fixed for now
function generateGeometricPatterns() { /* ... same as before ... */
    geometricShapes = []; let patternAreaHeight = height - groundLevelY; if (patternAreaHeight <= 0) return; for (let i = 0; i < NUM_GEO_SHAPES; i++) { let shape = { x: random(width), y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8), w: random(20, 150), h: random(10, 80), angle: random(TWO_PI) }; geometricShapes.push(shape); }
}

// updateAndDrawParticles - Scale particle sizes
function updateAndDrawParticles() {
    // Side Particles
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle(); // Spawns scaled sizes
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5;
        if (p.lifespan <= 0) { sideParticles.splice(i, 1); }
        else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6); let baseColor = color(clrSideParticle); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrSideParticleGlow, glowAmount); noStroke();
               // *** Use scaled size ***
               ellipse(p.pos.x, p.pos.y, p.scaledSize, p.scaledSize); removeGlow(); pop(); }
    }
    // Ground Particles
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle(); // Spawns scaled sizes
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1;
        if (p.lifespan <= 0) { groundParticles.splice(i, 1); }
        else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7); let baseColor = color(clrGroundParticleGlow); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrGroundParticleGlow, glowAmount); noStroke();
              // *** Use scaled size ***
              ellipse(p.pos.x, p.pos.y, p.scaledSize, p.scaledSize); removeGlow(); pop(); }
    }
}

// spawnSideParticle - Calculate and store scaled size
function spawnSideParticle() {
    let edgeMargin = width * 0.08; let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width);
    let yPos = random(height * 0.2, height * 1.1);
    let baseSize = random(1.5, 4); // Base size range
    let particle = {
        pos: createVector(xPos, yPos), vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)),
        initialLifespan: random(120, 280), lifespan: 0,
        // *** Store scaled size ***
        scaledSize: max(1, baseSize * scaleFactor), // Ensure min size 1
    };
    particle.lifespan = particle.initialLifespan; sideParticles.push(particle);
}
// spawnGroundParticle - Calculate and store scaled size
function spawnGroundParticle() {
     if (typeof groundLevelY !== 'number' || groundLevelY >= height) return;
    let xPos = random(width); let yPos = random(groundLevelY + 5, height - 5);
    let baseSize = random(2, 5); // Base size range
    let particle = {
        pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)),
        initialLifespan: random(100, 200), lifespan: 0,
        // *** Store scaled size ***
        scaledSize: max(1.5, baseSize * scaleFactor), // Ensure min size 1.5
    };
    particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}

// drawPole - Use scaled thickness and offset
function drawPole() {
    push();
    let currentPoleX = pole.baseX + sin(frameCount * poleSwaySpeed) * poleSwayAmount;
    let currentAnchor = calculateAnchorPos(); // Uses scaled offset internally
    let poleTopVisibleY = height - pole.poleHeight;
    // *** Use scaled thickness ***
    strokeWeight(pole.scaledThickness); stroke(clrPoleBase);
    line(currentPoleX, height, currentPoleX, poleTopVisibleY);
    fill(clrPoleAccent); applyGlow(clrSubtleGlow, 5); noStroke();
    // *** Scale anchor ellipse visual ***
    ellipse(currentAnchor.x, currentAnchor.y, pole.scaledThickness * 1.8, pole.scaledThickness * 1.8);
    removeGlow(); pop();
}

// drawTargetBox - Use scaled width/height
function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2;
    // *** Use scaled base size for scaling factor calculation ***
    let scaleFactorPulse = map(pulse, 0, 1, 1.0, 1.03);
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    // *** Calculate center based on unscaled position and SCALED size ***
    let centerX = targetBox.x + targetBox.scaledW / 2;
    let centerY = targetBox.y + targetBox.scaledH / 2;
    // *** Apply pulse scaling to the already scaled size ***
    let finalW = targetBox.scaledW * scaleFactorPulse;
    let finalH = targetBox.scaledH * scaleFactorPulse;
    push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke();
    rectMode(CENTER); rect(centerX, centerY, finalW, finalH, 5 * scaleFactor); // Scale corner radius too
    removeGlow(); pop();
}

// drawBall - Use scaled radius
function drawBall() {
    push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke();
    // *** Use scaled radius ***
    ellipse(ball.pos.x, ball.pos.y, ball.scaledRadius * 2, ball.scaledRadius * 2);
    pop();
}

// drawElastic - Use scaled anchor pos and scaled thickness? (thickness already scales)
function drawElastic() {
    let currentAnchor = calculateAnchorPos();
    let stretchVector = p5.Vector.sub(ball.pos, currentAnchor); let currentStretch = stretchVector.mag();
    if (currentStretch < 2 && !ball.isHeld) return;
    // *** Use scaledMaxStretch for ratio calculation ***
    let stretchRatio = constrain(currentStretch / scaledMaxStretch, 0, 1);
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity;
    // *** Scale thickness based on base size ***
    let thickness = map(stretchRatio, 0, 1, 2 * scaleFactor, 5 * scaleFactor); // Scale min/max thickness too
    push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(max(1.0, thickness)); // Ensure min thickness
    line(currentAnchor.x, currentAnchor.y, ball.pos.x, ball.pos.y);
    pop();
}

// displayScore - Use scaled text size
function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`; let txtX = width * 0.03; let txtY = height * 0.07;
    let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; push();
    // *** Use scaled text size ***
    let scaledSize = max(MIN_TEXT_SIZE, BASE_TEXT_SIZE * scaleFactor);
    textSize(scaledSize);
    textFont(gameFont); textAlign(LEFT, TOP); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow);
    text(scoreText, txtX + 1, txtY + 1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop();
}

// showGameOver - Use scaled text size and spacing
function showGameOver() {
    let overlayAlpha = 180; push(); let overlayColor = color(clrBackground);
    overlayColor.setAlpha(overlayAlpha); fill(overlayColor); noStroke(); rect(0, 0, width, height);
    // *** Use scaled text sizes and spacing ***
    let mainTxtSize = max(MIN_TEXT_SIZE * 1.5, 60 * scaleFactor); // Scale base size 60
    let subTxtSize = max(MIN_TEXT_SIZE, 28 * scaleFactor);     // Scale base size 28
    let textY = height / 2;
    let lineSpacing = max(20, 50 * scaleFactor); // Scale base spacing 50

    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 8 + pulse * 6;
    textFont(gameFont); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount);
    fill(clrText); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing);
    removeGlow(); applyGlow(clrTextGlow, glowAmount * 0.6); fill(clrText); textSize(subTxtSize);
    text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    removeGlow(); fill(clrText); textSize(subTxtSize * 0.9);
    text('Click to Restart', width / 2, textY + lineSpacing * 1.5); pop();
}

// drawGlowingBorder - Use scaled stroke weight
function drawGlowingBorder() {
    push(); let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity;
    // *** Use scaled stroke weight ***
    let offset = scaledBorderStrokeWeight / 2;
    noFill(); stroke(clrMainAccent); strokeWeight(scaledBorderStrokeWeight); applyGlow(clrBorderGlow, currentGlow);
    rect(offset, offset, width - scaledBorderStrokeWeight, height - scaledBorderStrokeWeight); // Adjust rect size by scaled weight
    removeGlow(); pop();
}

// --- Game Mechanics & Physics ---
// aimingLogic - Use scaledMaxStretch
function aimingLogic() {
   let currentAnchor = calculateAnchorPos(); if (ball.isHeld) {
     let currentInputPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(currentInputPos, currentAnchor);
     let distance = displacement.mag();
     // *** Use scaled max stretch ***
     if (distance > scaledMaxStretch) {
       displacement.setMag(scaledMaxStretch); ball.pos = p5.Vector.add(currentAnchor, displacement);
     } else { ball.pos.set(currentInputPos.x, currentInputPos.y); }
   } else { ball.pos.set(currentAnchor.x, currentAnchor.y); }
}

// physicsUpdate no changes needed for scaling itself
function physicsUpdate() { /* ... same as before ... */
  if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0);
}

// checkCollisions - Use scaled radius
function checkCollisions() {
    if (gameState !== 'launched') return;
    // *** Use scaled radius/target size for hit check ***
    if (didBallHitBox()) { console.log("Target Hit!"); currentLevel++; setupLevel(); return; }
    let hitBorder = false;
    // *** Use scaled radius for border check ***
    let r = ball.scaledRadius;
    if (ball.pos.x - r <= 0) hitBorder = true; else if (ball.pos.x + r >= width) hitBorder = true;
    else if (ball.pos.y - r <= 0) hitBorder = true; else if (ball.pos.y + r >= height) hitBorder = true;
    if (hitBorder) { gameState = 'gameOver'; console.log("Hit Border!"); return; }
}

// didBallHitBox - Use scaled radius and target size
function didBallHitBox() {
  // *** Use scaled target dimensions for constrain ***
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.scaledW);
  let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.scaledH);
  let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2);
  // *** Use scaled radius for check ***
  return dSq < pow(ball.scaledRadius, 2);
}

// --- Input Event Handlers ---
// mousePressed - Use scaled radius for grab check
function mousePressed() {
    if (gameState === 'aiming') {
      let currentAnchor = calculateAnchorPos();
      let d = dist(mouseX, mouseY, currentAnchor.x, currentAnchor.y);
      // *** Use scaled radius for grab distance ***
      // Make grab radius slightly larger relative to ball
      if (d < ball.scaledRadius * 3.5) {
          ball.isHeld = true; aimingLogic();
      }
    } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); }
    return false;
}

// mouseDragged no changes needed
function mouseDragged() { /* ... same as before ... */
  if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } return false;
}
// mouseReleased no changes needed (launch force relative to stretch)
function mouseReleased() { /* ... same as before ... */
    if (gameState === 'aiming' && ball.isHeld) { ball.isHeld = false; gameState = 'launched'; let currentAnchor = calculateAnchorPos(); let launchVector = p5.Vector.sub(currentAnchor, ball.pos); let launchMultiplier = 0.7; ball.vel = launchVector.mult(elasticForce * launchMultiplier); ball.acc.mult(0); console.log(`Launched: Anchor(${currentAnchor.x.toFixed(1)},${currentAnchor.y.toFixed(1)}), V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`); } return false;
}
// --- End ---
