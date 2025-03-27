// Game Globals
let ball; let pole; let targetBox; let gravity; let friction;
let elasticForce = 0.4;
// let maxStretch = 160; // Base value

let gameState = 'aiming'; let currentLevel = 0;

const REF_WIDTH = 1280; const REF_HEIGHT = 720;
let scaleFactor = 1; // Will still be calculated, but not used for element sizes in this version

// Base Sizes (These will be USED directly for now)
const BASE_BALL_RADIUS = 24; const BASE_POLE_THICKNESS = 8;
const BASE_POLE_ANCHOR_OFFSET = -10; const BASE_TARGET_W = 60;
const BASE_TARGET_H = 60; const BASE_MAX_STRETCH = 160;
const BASE_BORDER_WEIGHT = 2.5; const BASE_TEXT_SIZE = 26;
const MIN_TEXT_SIZE = 14;

// *** TEMPORARY: Use BASE values directly for scaled variables ***
let scaledMaxStretch = BASE_MAX_STRETCH;
let scaledBorderStrokeWeight = BASE_BORDER_WEIGHT;
// Note: We will still assign base sizes to object properties like ball.radius later

// Visual Style & Animation (Colors etc. remain the same)
let clrBackground = '#F5EFE4'; let clrText = '#8DA1AD'; let clrTextGlow = '#0B3D42';
let clrMainAccent = '#0B3D42'; let clrSecondaryAccent = '#8DA1AD'; let clrSubtleGlow = '#A8BAC4';
let clrBall = clrMainAccent; let clrBallGlow = clrSecondaryAccent; let clrPoleBase = clrSecondaryAccent;
let clrPoleAccent = '#C0CED7'; let clrGeoShapes = clrSecondaryAccent; let clrGeoShapesGlow = clrSubtleGlow;
let clrGroundParticleGlow = clrSubtleGlow; let clrElasticBase = clrMainAccent;
let clrElasticGlow = clrSecondaryAccent; let clrTarget = clrMainAccent; let clrTargetGlow = clrSecondaryAccent;
let clrSideParticle = clrSecondaryAccent; let clrSideParticleGlow = clrSubtleGlow;
let clrBorderGlow = clrMainAccent;
let pulseSpeed = 0.05; let defaultGlow = 20; let targetPulseIntensity = 8;
let elasticGlowIntensity = 12; let groundLevelY; const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80; const MAX_SIDE_PARTICLES = 100;
let borderBaseGlow = 8; let borderPulseIntensity = 10; let borderPulseSpeedFactor = 0.7;
let geometricShapes = []; let groundParticles = []; let sideParticles = [];
let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let targetMoveSpeedX = 0.015; let targetMoveSpeedY = 0.011;
let poleSwaySpeed = 0.02; let poleSwayAmount = 1.5; let anchorBobSpeed = 0.04; let anchorBobAmount = 1;
let gameFont = 'Georgia';
const TARGET_ASPECT_RATIO = REF_WIDTH / REF_HEIGHT;

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  let canvasSize = calculateCanvasSize();
  let canvas = createCanvas(canvasSize.w, canvasSize.h);
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  console.log(`Canvas created (dynamic): ${width}x${height}`);

  gravity = createVector(0, 0.6); friction = 0.988;

  // Initialize objects using BASE sizes directly
  ball = { pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0), radius: BASE_BALL_RADIUS, isHeld: false };
  pole = { x: 0, y: 0, poleHeight: 0, baseX: 0, anchorYOffset: BASE_POLE_ANCHOR_OFFSET, thickness: BASE_POLE_THICKNESS };
  targetBox = { x: 0, y: 0, w: BASE_TARGET_W, h: BASE_TARGET_H, initialX: 0, initialY: 0 };

  setLayoutDimensions(); // Sets layout (groundY, poleH) and calculates scaleFactor (but doesn't apply it to elements yet)
  setupLevel();
  console.log("Setup finished.");
}

function calculateCanvasSize() { /* ... same as before ... */
  let w = windowWidth; let h = windowHeight; let currentRatio = w / h; let canvasW, canvasH; if (currentRatio > TARGET_ASPECT_RATIO) { canvasH = h; canvasW = h * TARGET_ASPECT_RATIO; } else { canvasW = w; canvasH = w / TARGET_ASPECT_RATIO; } return { w: floor(canvasW), h: floor(canvasH) };
}

// Sets layout variables BUT DOES NOT scale elements in this version
function setLayoutDimensions() {
    scaleFactor = width / REF_WIDTH; // Calculate scale factor (still needed for launch power if uncommented later)
    console.log(`TEMP DEBUG: scaleFactor = ${scaleFactor.toFixed(2)}`);

    groundLevelY = height * 0.85;
    pole.poleHeight = height * 0.2;

    // *** TEMPORARILY SKIPPING SCALED VALUE CALCULATIONS ***
    // Assign BASE values directly to ensure objects have them
    scaledMaxStretch = BASE_MAX_STRETCH;
    scaledBorderStrokeWeight = BASE_BORDER_WEIGHT;
    pole.scaledThickness = BASE_POLE_THICKNESS; // Use a named variable even if base
    pole.scaledAnchorYOffset = BASE_POLE_ANCHOR_OFFSET; // Use a named variable even if base
    targetBox.scaledW = BASE_TARGET_W; // Use a named variable even if base
    targetBox.scaledH = BASE_TARGET_H; // Use a named variable even if base
    ball.scaledRadius = BASE_BALL_RADIUS; // Use a named variable even if base
    console.log(`TEMP DEBUG: Using BASE sizes. Radius = ${ball.scaledRadius}`);

    // Calculate target bounds using BASE target size
    targetMoveBounds.minX = width * 0.35;
    targetMoveBounds.maxX = width * 0.9 - targetBox.scaledW; // Uses BASE_TARGET_W now
    targetMoveBounds.minY = height * 0.1;
    targetMoveBounds.maxY = min(height * 0.6, height - pole.poleHeight - targetBox.scaledH - 20); // Uses BASE_TARGET_H now
    if (targetMoveBounds.maxY < targetMoveBounds.minY) { targetMoveBounds.maxY = targetMoveBounds.minY; }
    if (targetMoveBounds.maxX < targetMoveBounds.minX) { targetMoveBounds.maxX = targetMoveBounds.minX; }

    console.log(`Layout Set (TEMP NO ELEM SCALING): W=${width}, H=${height}`);
}


function windowResized() { /* ... same as before, calls setLayoutDimensions ... */
  console.log("Window resized!"); let canvasSize = calculateCanvasSize(); resizeCanvas(canvasSize.w, canvasSize.h); console.log(`Canvas resized to: ${width}x${height}`); setLayoutDimensions(); setupLevel();
}

function setupLevel() { /* ... same as before, uses base sizes implicitly via objects ... */
    console.log("setupLevel called..."); gameState = 'aiming'; ball.isHeld = false; pole.baseX = width * 0.15; pole.x = pole.baseX; pole.y = height; let minTargetX = pole.x + width * 0.25; let maxTargetX = width - targetBox.w - width * 0.1; if (minTargetX > maxTargetX) { minTargetX = width * 0.5; maxTargetX = width - targetBox.w - width * 0.05; } let minYTarget = height * 0.15; let maxYTarget = height - pole.poleHeight - targetBox.h - height * 0.15; if (maxYTarget < minYTarget) { maxYTarget = minYTarget + 1; } targetBox.initialX = random(minTargetX, maxTargetX); targetBox.initialY = random(minYTarget, maxYTarget); targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; let initialAnchorPos = calculateAnchorPos(0); ball.pos = initialAnchorPos.copy(); ball.vel = createVector(0, 0); ball.acc = createVector(0, 0); generateGeometricPatterns(); console.log(`Level ${currentLevel + 1} setup...`);
}

// calculateAnchorPos uses base offset implicitly via pole object
function calculateAnchorPos(animationFrameCount = frameCount) { /* ... same as before ... */
    let currentPoleX = pole.baseX + sin(animationFrameCount * poleSwaySpeed) * poleSwayAmount; let baseAnchorY = height - pole.poleHeight + pole.anchorYOffset; let currentAnchorY = baseAnchorY + cos(animationFrameCount * anchorBobSpeed) * anchorBobAmount; return createVector(currentPoleX, currentAnchorY);
}

function draw() { /* ... same structure as before ... */
    if (!ball || !pole || !targetBox) { if(frameCount < 10) console.log("Objects not ready..."); return; } background(clrBackground); if (gameState !== 'gameOver') { updateTargetPosition(); } drawGround(); updateAndDrawParticles(); drawPole(); drawTargetBox(); if (gameState === 'aiming') { aimingLogic(); if (ball.isHeld) drawElastic(); drawBall(); } else if (gameState === 'launched') { physicsUpdate(); checkCollisions(); drawBall(); } else if (gameState === 'gameOver') { drawBall(); showGameOver(); } displayScore(); drawGlowingBorder();
}

function updateTargetPosition() { /* ... same as before ... */
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2; let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2; if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) { targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX); targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY); } else { targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; if(frameCount % 60 === 0) console.warn("Using fallback target position."); }
}


// --- Visual Elements Drawing Functions ---
// (applyGlow, removeGlow, drawGround, generateGeometricPatterns) - No scaling needed for them currently
function applyGlow(glowColor, intensity) { if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; } }
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }
function drawGround() { /* ... same as before ... */ push(); noFill(); strokeWeight(1.5); stroke(clrGeoShapes); applyGlow(clrGeoShapesGlow, 8); for (let i = 0; i < geometricShapes.length; i++) { let shape = geometricShapes[i]; shape.angle += 0.008; shape.x += sin(frameCount * 0.025 + i * 0.6) * 0.2; shape.y += cos(frameCount * 0.018 + i * 0.8) * 0.15; shape.y = constrain(shape.y, groundLevelY + 10, height - 20); if (shape.x > width + shape.w) shape.x = -shape.w; if (shape.x < -shape.w) shape.x = width + shape.w; push(); translate(shape.x, shape.y); rotate(shape.angle); rectMode(CENTER); rect(0, 0, shape.w, shape.h); pop(); } removeGlow(); pop(); }
function generateGeometricPatterns() { /* ... same as before ... */ geometricShapes = []; let patternAreaHeight = height - groundLevelY; if (patternAreaHeight <= 0) return; for (let i = 0; i < NUM_GEO_SHAPES; i++) { let shape = { x: random(width), y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8), w: random(20, 150), h: random(10, 80), angle: random(TWO_PI) }; geometricShapes.push(shape); } }

// updateAndDrawParticles - Use BASE particle sizes for now
function updateAndDrawParticles() {
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle();
    for (let i = sideParticles.length - 1; i >= 0; i--) { let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5; if (p.lifespan <= 0) { sideParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6); let baseColor = color(clrSideParticle); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrSideParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size, p.size); removeGlow(); pop(); } } // Use p.size (base)
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle();
    for (let i = groundParticles.length - 1; i >= 0; i--) { let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1; if (p.lifespan <= 0) { groundParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7); let baseColor = color(clrGroundParticleGlow); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrGroundParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size, p.size); removeGlow(); pop(); } } // Use p.size (base)
}
// spawnSideParticle - Store BASE size
function spawnSideParticle() {
    let edgeMargin = width * 0.08; let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width); let yPos = random(height * 0.2, height * 1.1);
    let baseSize = random(1.5, 4); // Calculate base size
    let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)), initialLifespan: random(120, 280), lifespan: 0, size: baseSize }; // Store base size in 'size'
    particle.lifespan = particle.initialLifespan; sideParticles.push(particle);
}
// spawnGroundParticle - Store BASE size
function spawnGroundParticle() {
     if (typeof groundLevelY !== 'number' || groundLevelY >= height) return; let xPos = random(width); let yPos = random(groundLevelY + 5, height - 5);
     let baseSize = random(2, 5); // Calculate base size
     let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)), initialLifespan: random(100, 200), lifespan: 0, size: baseSize }; // Store base size in 'size'
     particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}

// drawPole - Use BASE thickness, BASE offset
function drawPole() {
    push(); let currentPoleX = pole.baseX + sin(frameCount * poleSwaySpeed) * poleSwayAmount;
    let currentAnchor = calculateAnchorPos(); let poleTopVisibleY = height - pole.poleHeight;
    strokeWeight(pole.thickness); stroke(clrPoleBase); line(currentPoleX, height, currentPoleX, poleTopVisibleY); // Use base thickness
    fill(clrPoleAccent); applyGlow(clrSubtleGlow, 5); noStroke();
    ellipse(currentAnchor.x, currentAnchor.y, pole.thickness * 1.8, pole.thickness * 1.8); // Use base thickness
    removeGlow(); pop();
}
// drawTargetBox - Use BASE W/H
function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2; let scaleFactorPulse = map(pulse, 0, 1, 1.0, 1.03);
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2; // Use base w/h for center calc
    let finalW = targetBox.w * scaleFactorPulse; let finalH = targetBox.h * scaleFactorPulse; // Apply pulse to base w/h
    push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke();
    rectMode(CENTER); rect(centerX, centerY, finalW, finalH, 5); removeGlow(); pop(); // Use base corner radius
}
// drawBall - Use BASE radius
function drawBall() {
    push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke();
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2); // Use base radius
    pop();
}
// drawElastic - Use BASE maxStretch, BASE thickness
function drawElastic() {
    let currentAnchor = calculateAnchorPos(); let stretchVector = p5.Vector.sub(ball.pos, currentAnchor);
    let currentStretch = stretchVector.mag(); if (currentStretch < 2 && !ball.isHeld) return;
    let stretchRatio = constrain(currentStretch / BASE_MAX_STRETCH, 0, 1); // Use base max stretch
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity;
    let thickness = map(stretchRatio, 0, 1, 2, 5); // Use base thickness range
    push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(max(1.0, thickness));
    line(currentAnchor.x, currentAnchor.y, ball.pos.x, ball.pos.y); pop();
}
// displayScore - Use BASE text size
function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`; let txtX = width * 0.03; let txtY = height * 0.07;
    let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; push();
    textSize(BASE_TEXT_SIZE); // Use base size
    textFont(gameFont); textAlign(LEFT, TOP); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow);
    text(scoreText, txtX + 1, txtY + 1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop();
}
// showGameOver - Use BASE text size / spacing
function showGameOver() {
    let overlayAlpha = 180; push(); let overlayColor = color(clrBackground); overlayColor.setAlpha(overlayAlpha); fill(overlayColor); noStroke(); rect(0, 0, width, height);
    let mainTxtSize = 60; let subTxtSize = 28; let textY = height / 2; let lineSpacing = 50; // Use base sizes/spacing
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 8 + pulse * 6;
    textFont(gameFont); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrText); textSize(mainTxtSize);
    text('GAME OVER', width / 2, textY - lineSpacing); removeGlow(); applyGlow(clrTextGlow, glowAmount * 0.6);
    fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    removeGlow(); fill(clrText); textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5); pop();
}
// drawGlowingBorder - Use BASE weight
function drawGlowingBorder() {
    push(); let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity; let offset = BASE_BORDER_WEIGHT / 2; // Use base weight
    noFill(); stroke(clrMainAccent); strokeWeight(BASE_BORDER_WEIGHT); applyGlow(clrBorderGlow, currentGlow); // Use base weight
    rect(offset, offset, width - BASE_BORDER_WEIGHT, height - BASE_BORDER_WEIGHT); removeGlow(); pop();
}

// --- Game Mechanics & Physics ---
// aimingLogic - Use BASE maxStretch
function aimingLogic() {
   let currentAnchor = calculateAnchorPos(); if (ball.isHeld) { let currentInputPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(currentInputPos, currentAnchor); let distance = displacement.mag(); if (distance > BASE_MAX_STRETCH) { displacement.setMag(BASE_MAX_STRETCH); ball.pos = p5.Vector.add(currentAnchor, displacement); } else { ball.pos.set(currentInputPos.x, currentInputPos.y); } } else { ball.pos.set(currentAnchor.x, currentAnchor.y); }
}
// physicsUpdate no changes
function physicsUpdate() { /* ... same as before ... */ if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0); }
// checkCollisions - Use BASE radius
function checkCollisions() {
    if (gameState !== 'launched') return; if (didBallHitBox()) { console.log("Target Hit!"); currentLevel++; setupLevel(); return; } let hitBorder = false; let r = ball.radius; if (ball.pos.x - r <= 0) hitBorder = true; else if (ball.pos.x + r >= width) hitBorder = true; else if (ball.pos.y - r <= 0) hitBorder = true; else if (ball.pos.y + r >= height) hitBorder = true; if (hitBorder) { gameState = 'gameOver'; console.log("Hit Border!"); return; }
}
// didBallHitBox - Use BASE radius, BASE target size
function didBallHitBox() {
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h); let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return dSq < pow(ball.radius, 2);
}

// --- Input Event Handlers ---
// mousePressed - Use BASE radius
function mousePressed() {
    if (gameState === 'aiming') { let currentAnchor = calculateAnchorPos(); let d = dist(mouseX, mouseY, currentAnchor.x, currentAnchor.y); if (d < ball.radius * 3.5) { ball.isHeld = true; aimingLogic(); } } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); } return false;
}
// mouseDragged no changes
function mouseDragged() { /* ... same as before ... */ if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } return false; }

// mouseReleased - Calculate effective launch multiplier based on scaleFactor
function mouseReleased() {
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched'; let currentAnchor = calculateAnchorPos();
        let launchVector = p5.Vector.sub(currentAnchor, ball.pos);

        // *** Calculate effective multiplier based on current scaleFactor ***
        const BASE_LAUNCH_MULTIPLIER = 0.7; // Keep base power high
        const MIN_SCALE_FACTOR_FOR_LAUNCH = 0.4; // Prevent excessive force
        let effectiveScaleFactor = max(MIN_SCALE_FACTOR_FOR_LAUNCH, scaleFactor);
        let effectiveMultiplier = BASE_LAUNCH_MULTIPLIER / effectiveScaleFactor;

        ball.vel = launchVector.mult(elasticForce * effectiveMultiplier); ball.acc.mult(0);
        console.log(`Launched: Scale=${scaleFactor.toFixed(2)}, EffMult=${effectiveMultiplier.toFixed(2)}, V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
    return false;
}
// --- End ---
