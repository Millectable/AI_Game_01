// --- Globals ---
let ball, pole, targetBox;
let gravity, friction;
let elasticForce = 0.4;
// let maxStretch = 160; // Base value defined below

let gameState = 'aiming';
let currentLevel = 0;

// --- Reference & Scaling ---
// *** UPDATED Dimensions ***
const REF_WIDTH = 960;  // Design reference width
const REF_HEIGHT = 640; // Design reference height
const TARGET_ASPECT_RATIO = REF_WIDTH / REF_HEIGHT; // Recalculate (3:2 ratio)
let scaleFactor = 1;

// --- Base Sizes (relative to NEW REF_WIDTH) ---
// Keep these visually appropriate for the 960x640 design
const BASE_BALL_RADIUS = 20; // Slightly smaller base? Adjust as needed
const BASE_POLE_THICKNESS = 7;
const BASE_POLE_ANCHOR_OFFSET = -8;
const BASE_TARGET_W = 50;
const BASE_TARGET_H = 50;
const BASE_MAX_STRETCH = 140; // Maybe slightly less stretch needed?
const BASE_BORDER_WEIGHT = 2;
const BASE_TEXT_SIZE = 22; // Slightly smaller base text
const MIN_TEXT_SIZE = 12; // Keep a minimum
const BASE_LAUNCH_MULTIPLIER = 0.7; // Base power (may need tuning)
const MIN_SCALE_FACTOR_FOR_LAUNCH = 0.4;

// --- Style & Colors ---
// (Color definitions remain the same)
const clrBackground = '#F5EFE4'; const clrText = '#8DA1AD'; const clrTextGlow = '#0B3D42';
const clrMainAccent = '#0B3D42'; const clrSecondaryAccent = '#8DA1AD'; const clrSubtleGlow = '#A8BAC4';
const clrBall = clrMainAccent; const clrBallGlow = clrSecondaryAccent; const clrPoleBase = clrSecondaryAccent;
const clrPoleAccent = '#C0CED7'; const clrGeoShapes = clrSecondaryAccent; const clrGeoShapesGlow = clrSubtleGlow;
const clrGroundParticleGlow = clrSubtleGlow; const clrElasticBase = clrMainAccent;
const clrElasticGlow = clrSecondaryAccent; const clrTarget = clrMainAccent; const clrTargetGlow = clrSecondaryAccent;
const clrSideParticle = clrSecondaryAccent; const clrSideParticleGlow = clrSubtleGlow;
const clrBorderGlow = clrMainAccent;

// --- Animation & Other Params ---
// (Remain the same logic, values may effectively change due to scaling)
const pulseSpeed = 0.05; const defaultGlow = 20; const targetPulseIntensity = 8;
const elasticGlowIntensity = 12; const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80; const MAX_SIDE_PARTICLES = 100;
const borderBaseGlow = 8; const borderPulseIntensity = 10; const borderPulseSpeedFactor = 0.7;
const poleSwaySpeed = 0.02; const poleSwayAmount = 1.5; const anchorBobSpeed = 0.04; const anchorBobAmount = 1;
const targetMoveSpeedX = 0.015; const targetMoveSpeedY = 0.011;
let groundLevelY;
let geometricShapes = []; let groundParticles = []; let sideParticles = [];
let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let gameFont = 'Georgia';

// ========================================================
// SETUP & RESIZING
// ========================================================

function setup() {
  console.log("Setup starting...");
  let canvasSize = calculateCanvasSize(); // Calculates based on new aspect ratio
  let canvas = createCanvas(canvasSize.w, canvasSize.h);
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  console.log(`Canvas created (dynamic): ${width}x${height}`);

  gravity = createVector(0, 0.6); friction = 0.988;

  ball = { pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0), radius: BASE_BALL_RADIUS, isHeld: false };
  pole = { x: 0, y: 0, poleHeight: 0, baseX: 0, anchorYOffset: BASE_POLE_ANCHOR_OFFSET, thickness: BASE_POLE_THICKNESS };
  targetBox = { x: 0, y: 0, w: BASE_TARGET_W, h: BASE_TARGET_H, initialX: 0, initialY: 0 };

  // Calculate initial layout AND scale element properties based on new REF_WIDTH
  setLayoutAndScaling();

  setupLevel();
  console.log("Setup finished.");
}

function windowResized() {
  console.log("Window resized!");
  let canvasSize = calculateCanvasSize(); // Uses new aspect ratio
  resizeCanvas(canvasSize.w, canvasSize.h);
  console.log(`Canvas resized to: ${width}x${height}`);
  // Recalculate layout AND scale element properties
  setLayoutAndScaling();
  setupLevel();
}

function calculateCanvasSize() { // Uses new TARGET_ASPECT_RATIO
  let w = windowWidth; let h = windowHeight; let currentRatio = w / h; let canvasW, canvasH;
  if (currentRatio > TARGET_ASPECT_RATIO) { canvasH = h; canvasW = h * TARGET_ASPECT_RATIO; }
  else { canvasW = w; canvasH = w / TARGET_ASPECT_RATIO; }
  canvasW = max(canvasW, 100); canvasH = max(canvasH, 100 / TARGET_ASPECT_RATIO); // Ensure min size
  return { w: floor(canvasW), h: floor(canvasH) };
}

// Sets layout AND calculates scaling factor / scaled values based on new REF_WIDTH
function setLayoutAndScaling() {
  if (width <= 0 || height <= 0) { console.error("Invalid dimensions:", width, height); return; }

  scaleFactor = width / REF_WIDTH; // Scale factor relative to 960px
  groundLevelY = height * 0.85;
  pole.poleHeight = height * 0.2; // Pole height relative to current height

  // Update object properties with scaled values
  ball.radius = max(5, BASE_BALL_RADIUS * scaleFactor);
  pole.thickness = max(2, BASE_POLE_THICKNESS * scaleFactor);
  pole.anchorYOffset = BASE_POLE_ANCHOR_OFFSET * scaleFactor;
  targetBox.w = BASE_TARGET_W * scaleFactor;
  targetBox.h = BASE_TARGET_H * scaleFactor;
  // Update global scaled variables if needed elsewhere
  scaledMaxStretch = BASE_MAX_STRETCH * scaleFactor; // Use global for this one
  scaledBorderStrokeWeight = max(1.0, BASE_BORDER_WEIGHT * scaleFactor);

  // Update target movement bounds
  targetMoveBounds.minX = width * 0.35;
  targetMoveBounds.maxX = width * 0.9 - targetBox.w;
  targetMoveBounds.minY = height * 0.1;
  targetMoveBounds.maxY = min(height * 0.6, height - pole.poleHeight - targetBox.h - 20);
  if (targetMoveBounds.maxY <= targetMoveBounds.minY) { targetMoveBounds.maxY = targetMoveBounds.minY + 1; }
  if (targetMoveBounds.maxX <= targetMoveBounds.minX) { targetMoveBounds.maxX = targetMoveBounds.minX + 1; }

  console.log(`Layout/Scale Set: SF=${scaleFactor.toFixed(2)}, BallR=${ball.radius.toFixed(1)}, TargetW=${targetBox.w.toFixed(1)}`);
}

// ========================================================
// LEVEL SETUP & ELEMENT POSITIONING
// ========================================================

function setupLevel() { /* ... same logic, uses updated scaled values from setLayoutAndScaling ... */
    console.log("setupLevel called..."); gameState = 'aiming'; ball.isHeld = false; pole.baseX = width * 0.15; pole.x = pole.baseX; pole.y = height; let minTargetX = pole.x + width * 0.25; let maxTargetX = width - targetBox.w - width * 0.1; if (minTargetX >= maxTargetX) { minTargetX = width * 0.5; maxTargetX = width - targetBox.w - width * 0.05; } let minYTarget = height * 0.15; let maxYTarget = height - pole.poleHeight - targetBox.h - height * 0.15; if (maxYTarget <= minYTarget) { maxYTarget = minYTarget + 1; } targetBox.initialX = random(minTargetX, maxTargetX); targetBox.initialY = random(minYTarget, maxYTarget); targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; let initialAnchorPos = calculateAnchorPos(0); if (initialAnchorPos) { ball.pos = initialAnchorPos.copy(); ball.vel = createVector(0, 0); ball.acc = createVector(0, 0); } else { console.error("Failed anchor pos in setupLevel!"); ball.pos = createVector(pole.baseX, height - pole.poleHeight); } generateGeometricPatterns(); console.log(`Level ${currentLevel + 1} setup complete.`);
}

function calculateAnchorPos(animationFrameCount = frameCount) { /* ... same logic, uses updated scaled pole properties ... */
    if (!pole || typeof pole.baseX !== 'number' || typeof height !== 'number' || typeof pole.poleHeight !== 'number' || typeof pole.anchorYOffset !== 'number') { console.warn("Invalid pole data in calculateAnchorPos, returning null."); return null; } let currentPoleX = pole.baseX + sin(animationFrameCount * poleSwaySpeed) * poleSwayAmount; let baseAnchorY = height - pole.poleHeight + pole.anchorYOffset; let currentAnchorY = baseAnchorY + cos(animationFrameCount * anchorBobSpeed) * anchorBobAmount; return createVector(currentPoleX, currentAnchorY);
}

// ========================================================
// DRAW LOOP & UPDATE FUNCTIONS
// ========================================================

function draw() { /* ... same structure, drawing functions use updated scaled properties ... */
  if (!ball || !pole || !targetBox || !width || !height || width <= 0 || height <= 0) { if (frameCount < 60) console.log("Waiting..."); return; } background(clrBackground); if (gameState !== 'gameOver') updateTargetPosition(); drawGround(); updateAndDrawParticles(); drawPole(); drawTargetBox(); if (gameState === 'aiming') { aimingLogic(); if (ball.isHeld) drawElastic(); drawBall(); } else if (gameState === 'launched') { physicsUpdate(); checkCollisions(); drawBall(); } else if (gameState === 'gameOver') { drawBall(); showGameOver(); } displayScore(); drawGlowingBorder();
}
function updateTargetPosition() { /* ... same as before ... */
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2; let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2; if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) { targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX); targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY); } else { targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; if(frameCount % 60 === 0) console.warn("Using fallback target position."); }
}

// ========================================================
// VISUAL DRAWING FUNCTIONS (Using Scaled Properties)
// ========================================================
function applyGlow(glowColor, intensity) { if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; } }
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }
function drawGround() { /* ... same as before, shapes not scaled ... */
    push(); noFill(); strokeWeight(1.5); stroke(clrGeoShapes); applyGlow(clrGeoShapesGlow, 8); for (let i = 0; i < geometricShapes.length; i++) { let shape = geometricShapes[i]; shape.angle += 0.008; shape.x += sin(frameCount * 0.025 + i * 0.6) * 0.2; shape.y += cos(frameCount * 0.018 + i * 0.8) * 0.15; shape.y = constrain(shape.y, groundLevelY + 10, height - 20); if (shape.x > width + shape.w) shape.x = -shape.w; if (shape.x < -shape.w) shape.x = width + shape.w; push(); translate(shape.x, shape.y); rotate(shape.angle); rectMode(CENTER); rect(0, 0, shape.w, shape.h); pop(); } removeGlow(); pop();
}
function generateGeometricPatterns() { /* ... same as before, shapes not scaled ... */
    geometricShapes = []; let patternAreaHeight = height - groundLevelY; if (patternAreaHeight <= 0) return; for (let i = 0; i < NUM_GEO_SHAPES; i++) { let shape = { x: random(width), y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8), w: random(20, 150), h: random(10, 80), angle: random(TWO_PI) }; geometricShapes.push(shape); }
}
function updateAndDrawParticles() { // Uses scaleFactor for drawing size
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle(); for (let i = sideParticles.length - 1; i >= 0; i--) { let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5; if (p.lifespan <= 0) { sideParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6); let baseColor = color(clrSideParticle); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrSideParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size * scaleFactor, p.size * scaleFactor); removeGlow(); pop(); } }
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle(); for (let i = groundParticles.length - 1; i >= 0; i--) { let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1; if (p.lifespan <= 0) { groundParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7); let baseColor = color(clrGroundParticleGlow); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrGroundParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size * scaleFactor, p.size * scaleFactor); removeGlow(); pop(); } }
}
function spawnSideParticle() { // Stores base size
    let edgeMargin = width * 0.08; let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width); let yPos = random(height * 0.2, height * 1.1); let baseSize = random(1.5, 4); let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)), initialLifespan: random(120, 280), lifespan: 0, size: baseSize }; particle.lifespan = particle.initialLifespan; sideParticles.push(particle);
}
function spawnGroundParticle() { // Stores base size
     if (typeof groundLevelY !== 'number' || groundLevelY >= height) return; let xPos = random(width); let yPos = random(groundLevelY + 5, height - 5); let baseSize = random(2, 5); let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)), initialLifespan: random(100, 200), lifespan: 0, size: baseSize }; particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}
function drawPole() { // Uses scaled pole.thickness
    push(); let currentPoleX = pole.baseX + sin(frameCount * poleSwaySpeed) * poleSwayAmount; let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return; let poleTopVisibleY = height - pole.poleHeight; strokeWeight(pole.thickness); stroke(clrPoleBase); line(currentPoleX, height, currentPoleX, poleTopVisibleY); fill(clrPoleAccent); applyGlow(clrSubtleGlow, 5); noStroke(); ellipse(currentAnchor.x, currentAnchor.y, pole.thickness * 1.8, pole.thickness * 1.8); removeGlow(); pop();
}
function drawTargetBox() { // Uses scaled targetBox.w/h
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2; let scaleFactorPulse = map(pulse, 0, 1, 1.0, 1.03); let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity); let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2; let finalW = targetBox.w * scaleFactorPulse; let finalH = targetBox.h * scaleFactorPulse; push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke(); rectMode(CENTER); rect(centerX, centerY, finalW, finalH, 5 * scaleFactor); removeGlow(); pop();
}
function drawBall() { // Uses scaled ball.radius
    push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke(); ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2); pop();
}
function drawElastic() { // Uses scaledMaxStretch and scaled thickness range
    let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return; let stretchVector = p5.Vector.sub(ball.pos, currentAnchor); let currentStretch = stretchVector.mag(); if (currentStretch < 2 && !ball.isHeld) return; let stretchRatio = constrain(currentStretch / scaledMaxStretch, 0, 1); let glowAmount = 4 + stretchRatio * elasticGlowIntensity; let minThickness = max(1.0, 2 * scaleFactor); let maxThickness = max(minThickness + 1, 5 * scaleFactor); let thickness = map(stretchRatio, 0, 1, minThickness, maxThickness); push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(thickness); line(currentAnchor.x, currentAnchor.y, ball.pos.x, ball.pos.y); pop();
}
function displayScore() { // Scales text size
    let scoreText = `Level: ${currentLevel + 1}`; let txtX = width * 0.03; let txtY = height * 0.07; let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; push(); let scaledSize = max(MIN_TEXT_SIZE, BASE_TEXT_SIZE * scaleFactor); textSize(scaledSize); textFont(gameFont); textAlign(LEFT, TOP); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow); text(scoreText, txtX + 1, txtY + 1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop();
}
function showGameOver() { // Scales text sizes and spacing
    let overlayAlpha = 180; push(); let overlayColor = color(clrBackground); overlayColor.setAlpha(overlayAlpha); fill(overlayColor); noStroke(); rect(0, 0, width, height); let mainTxtSize = max(MIN_TEXT_SIZE * 1.5, 60 * scaleFactor); let subTxtSize = max(MIN_TEXT_SIZE, 28 * scaleFactor); let textY = height / 2; let lineSpacing = max(20, 50 * scaleFactor); let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 8 + pulse * 6; textFont(gameFont); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrText); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing); removeGlow(); applyGlow(clrTextGlow, glowAmount * 0.6); fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5); removeGlow(); fill(clrText); textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5); pop();
}
function drawGlowingBorder() { // Uses scaledBorderStrokeWeight
    push(); let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2; let currentGlow = borderBaseGlow + pulse * borderPulseIntensity; let offset = scaledBorderStrokeWeight / 2; noFill(); stroke(clrMainAccent); strokeWeight(scaledBorderStrokeWeight); applyGlow(clrBorderGlow, currentGlow); rect(offset, offset, width - scaledBorderStrokeWeight, height - scaledBorderStrokeWeight); removeGlow(); pop();
}

// ========================================================
// GAME MECHANICS & PHYSICS (Using Scaled Properties)
// ========================================================
function aimingLogic() { // Uses scaledMaxStretch
   let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return; if (ball.isHeld) { let currentInputPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(currentInputPos, currentAnchor); let distance = displacement.mag(); if (distance > scaledMaxStretch) { displacement.setMag(scaledMaxStretch); ball.pos = p5.Vector.add(currentAnchor, displacement); } else { ball.pos.set(currentInputPos.x, currentInputPos.y); } } else { ball.pos.set(currentAnchor.x, currentAnchor.y); }
}
function physicsUpdate() { /* ... no changes needed ... */ if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0); }
function checkCollisions() { // Uses scaled ball.radius
    if (gameState !== 'launched') return; if (didBallHitBox()) { console.log("Target Hit!"); currentLevel++; setupLevel(); return; } let hitBorder = false; let r = ball.radius; if (ball.pos.x - r <= 0) hitBorder = true; else if (ball.pos.x + r >= width) hitBorder = true; else if (ball.pos.y - r <= 0) hitBorder = true; else if (ball.pos.y + r >= height) hitBorder = true; if (hitBorder) { gameState = 'gameOver'; console.log("Hit Border!"); return; }
}
function didBallHitBox() { // Uses scaled ball.radius, targetBox.w/h
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h); let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return dSq < pow(ball.radius, 2);
}

// ========================================================
// INPUT HANDLERS (Using Scaled Properties)
// ========================================================
function mousePressed() { // Uses scaled ball.radius
    if (gameState === 'aiming') { let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return false; let d = dist(mouseX, mouseY, currentAnchor.x, currentAnchor.y); if (d < ball.radius * 3.5) { ball.isHeld = true; aimingLogic(); } }
    else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); } return false;
}
function mouseDragged() { if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } return false; }
function mouseReleased() { // Uses scaleFactor to adjust launch power
    if (gameState === 'aiming' && ball.isHeld) { ball.isHeld = false; gameState = 'launched'; let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return false; let launchVector = p5.Vector.sub(currentAnchor, ball.pos);
        let effectiveScaleFactor = max(MIN_SCALE_FACTOR_FOR_LAUNCH, scaleFactor); let effectiveMultiplier = BASE_LAUNCH_MULTIPLIER / effectiveScaleFactor;
        ball.vel = launchVector.mult(elasticForce * effectiveMultiplier); ball.acc.mult(0); console.log(`Launched: Scale=${scaleFactor.toFixed(2)}, EffMult=${effectiveMultiplier.toFixed(2)}, V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    } return false;
}
// --- End ---
