// Game Globals
// ... (ball, pole, targetBox, gravity, friction, elasticForce, maxStretch) ...
let gameState = 'aiming'; let currentLevel = 0;

const REF_WIDTH = 1280; const REF_HEIGHT = 720;
let scaleFactor = 1;

// --- Base Sizes/Constants ---
// ... (BASE_BALL_RADIUS, BASE_POLE_THICKNESS, etc.) ...
const BASE_LAUNCH_MULTIPLIER = 0.7; // The multiplier that felt good at REF_WIDTH
const MIN_SCALE_FACTOR_FOR_LAUNCH = 0.4; // Prevent excessive force on tiny screens

// Scaled versions
let scaledMaxStretch; let scaledBorderStrokeWeight;
// ... (other scaled variables) ...

// --- Visual Style & Animation ---
// ... (colors, animation params, arrays, target params, pole params) ...
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
  ball = { /*...*/ radius: BASE_BALL_RADIUS /*...*/ };
  pole = { /*...*/ poleHeight: 0, baseX: 0, anchorYOffset: BASE_POLE_ANCHOR_OFFSET, thickness: BASE_POLE_THICKNESS };
  targetBox = { /*...*/ w: BASE_TARGET_W, h: BASE_TARGET_H /*...*/ };

  setLayoutDimensions(); // Calculates initial scaleFactor and scaled values
  setupLevel();
  console.log("Setup finished.");
}

function calculateCanvasSize() { /* ... same as before ... */
  let w = windowWidth; let h = windowHeight; let currentRatio = w / h; let canvasW, canvasH; if (currentRatio > TARGET_ASPECT_RATIO) { canvasH = h; canvasW = h * TARGET_ASPECT_RATIO; } else { canvasW = w; canvasH = w / TARGET_ASPECT_RATIO; } return { w: floor(canvasW), h: floor(canvasH) };
}

// Sets layout AND calculates scaling factor / scaled values
function setLayoutDimensions() {
    scaleFactor = width / REF_WIDTH; // Calculate current scale factor

    groundLevelY = height * 0.85;
    pole.poleHeight = height * 0.2;

    // Calculate scaled values based on the new scaleFactor
    scaledMaxStretch = BASE_MAX_STRETCH * scaleFactor;
    scaledBorderStrokeWeight = max(1.0, BASE_BORDER_WEIGHT * scaleFactor);
    pole.scaledThickness = max(2, BASE_POLE_THICKNESS * scaleFactor);
    pole.scaledAnchorYOffset = BASE_POLE_ANCHOR_OFFSET * scaleFactor;
    targetBox.scaledW = BASE_TARGET_W * scaleFactor;
    targetBox.scaledH = BASE_TARGET_H * scaleFactor;
    ball.scaledRadius = max(5, BASE_BALL_RADIUS * scaleFactor);

    // Target bounds use scaled sizes
    targetMoveBounds.minX = width * 0.35; targetMoveBounds.maxX = width * 0.9 - targetBox.scaledW;
    targetMoveBounds.minY = height * 0.1; targetMoveBounds.maxY = min(height * 0.6, height - pole.poleHeight - targetBox.scaledH - 20);
    if (targetMoveBounds.maxY < targetMoveBounds.minY) { targetMoveBounds.maxY = targetMoveBounds.minY; }
    if (targetMoveBounds.maxX < targetMoveBounds.minX) { targetMoveBounds.maxX = targetMoveBounds.minX; }

    console.log(`Layout Set: ScaleFactor=${scaleFactor.toFixed(2)}, Radius=${ball.scaledRadius.toFixed(1)}`);
}

function windowResized() { /* ... same as before, calls setLayoutDimensions ... */
  console.log("Window resized!"); let canvasSize = calculateCanvasSize(); resizeCanvas(canvasSize.w, canvasSize.h); console.log(`Canvas resized to: ${width}x${height}`); setLayoutDimensions(); setupLevel();
}

function setupLevel() { /* ... same as before, uses scaled values where needed ... */
    console.log("setupLevel called..."); gameState = 'aiming'; ball.isHeld = false; pole.baseX = width * 0.15; pole.x = pole.baseX; pole.y = height; let minTargetX = pole.x + width * 0.25; let maxTargetX = width - targetBox.scaledW - width * 0.1; if (minTargetX > maxTargetX) { minTargetX = width * 0.5; maxTargetX = width - targetBox.scaledW - width * 0.05; } let minYTarget = height * 0.15; let maxYTarget = height - pole.poleHeight - targetBox.scaledH - height * 0.15; if (maxYTarget < minYTarget) { maxYTarget = minYTarget + 1; } targetBox.initialX = random(minTargetX, maxTargetX); targetBox.initialY = random(minYTarget, maxYTarget); targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; let initialAnchorPos = calculateAnchorPos(0); ball.pos = initialAnchorPos.copy(); ball.vel = createVector(0, 0); ball.acc = createVector(0, 0); generateGeometricPatterns(); console.log(`Level ${currentLevel + 1} setup...`);
}

function calculateAnchorPos(animationFrameCount = frameCount) { /* ... same as before, uses scaled offset ... */
    let currentPoleX = pole.baseX + sin(animationFrameCount * poleSwaySpeed) * poleSwayAmount; let baseAnchorY = height - pole.poleHeight + pole.scaledAnchorYOffset; let currentAnchorY = baseAnchorY + cos(animationFrameCount * anchorBobSpeed) * anchorBobAmount; return createVector(currentPoleX, currentAnchorY);
}

function draw() { /* ... same structure as before ... */
    if (!ball || !pole || !targetBox) { if(frameCount < 10) console.log("Objects not ready..."); return; } background(clrBackground); if (gameState !== 'gameOver') { updateTargetPosition(); } drawGround(); updateAndDrawParticles(); drawPole(); drawTargetBox(); if (gameState === 'aiming') { aimingLogic(); if (ball.isHeld) drawElastic(); drawBall(); } else if (gameState === 'launched') { physicsUpdate(); checkCollisions(); drawBall(); } else if (gameState === 'gameOver') { drawBall(); showGameOver(); } displayScore(); drawGlowingBorder();
}

function updateTargetPosition() { /* ... same as before ... */
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2; let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2; if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) { targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX); targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY); } else { targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; if(frameCount % 60 === 0) console.warn("Using fallback target position."); }
}


// --- Visual Elements Drawing Functions ---
// (applyGlow, removeGlow, drawGround, generateGeometricPatterns, updateAndDrawParticles, spawnSideParticle, spawnGroundParticle, drawPole, drawTargetBox, drawBall, drawElastic, displayScore, showGameOver, drawGlowingBorder)
// Ensure these use the scaled variables calculated in setLayoutDimensions where appropriate (e.g., ball.scaledRadius, targetBox.scaledW, etc.) - they should already from the previous step.
// (Example confirmation for drawBall)
function drawBall() {
    push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke();
    // *** Use scaled radius ***
    ellipse(ball.pos.x, ball.pos.y, ball.scaledRadius * 2, ball.scaledRadius * 2);
    pop();
}
// ... (Make sure other drawing functions like drawPole, drawTargetBox, drawElastic, drawGlowingBorder, displayScore, showGameOver, updateAndDrawParticles also use their respective scaled variables) ...


// --- Game Mechanics & Physics ---
// aimingLogic uses scaledMaxStretch
function aimingLogic() { /* ... same as before ... */
   let currentAnchor = calculateAnchorPos(); if (ball.isHeld) { let currentInputPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(currentInputPos, currentAnchor); let distance = displacement.mag(); if (distance > scaledMaxStretch) { displacement.setMag(scaledMaxStretch); ball.pos = p5.Vector.add(currentAnchor, displacement); } else { ball.pos.set(currentInputPos.x, currentInputPos.y); } } else { ball.pos.set(currentAnchor.x, currentAnchor.y); }
}
// physicsUpdate no changes
function physicsUpdate() { /* ... same as before ... */
  if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0);
}
// checkCollisions uses scaled radius
function checkCollisions() { /* ... same as before ... */
    if (gameState !== 'launched') return; if (didBallHitBox()) { console.log("Target Hit!"); currentLevel++; setupLevel(); return; } let hitBorder = false; let r = ball.scaledRadius; if (ball.pos.x - r <= 0) hitBorder = true; else if (ball.pos.x + r >= width) hitBorder = true; else if (ball.pos.y - r <= 0) hitBorder = true; else if (ball.pos.y + r >= height) hitBorder = true; if (hitBorder) { gameState = 'gameOver'; console.log("Hit Border!"); return; }
}
// didBallHitBox uses scaled radius and target size
function didBallHitBox() { /* ... same as before ... */
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.scaledW); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.scaledH); let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return dSq < pow(ball.scaledRadius, 2);
}

// --- Input Event Handlers ---
// mousePressed uses scaled radius
function mousePressed() { /* ... same as before ... */
    if (gameState === 'aiming') { let currentAnchor = calculateAnchorPos(); let d = dist(mouseX, mouseY, currentAnchor.x, currentAnchor.y); if (d < ball.scaledRadius * 3.5) { ball.isHeld = true; aimingLogic(); } } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); } return false;
}
// mouseDragged no changes
function mouseDragged() { /* ... same as before ... */
  if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } return false;
}

// mouseReleased - Calculate and use effective launch multiplier
function mouseReleased() {
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched';
        let currentAnchor = calculateAnchorPos();
        let launchVector = p5.Vector.sub(currentAnchor, ball.pos);

        // *** Calculate effective multiplier based on scale factor ***
        // Divide base multiplier by scaleFactor, but prevent division by too small a number
        let effectiveScaleFactor = max(MIN_SCALE_FACTOR_FOR_LAUNCH, scaleFactor); // Use constrained scale factor
        let effectiveMultiplier = BASE_LAUNCH_MULTIPLIER / effectiveScaleFactor;

        ball.vel = launchVector.mult(elasticForce * effectiveMultiplier);
        ball.acc.mult(0);
        console.log(`Launched: Scale=${scaleFactor.toFixed(2)}, EffMult=${effectiveMultiplier.toFixed(2)}, V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
    return false;
}
// --- End ---

// Ensure all drawing functions are copied correctly from the previous step where scaling was added
// (Adding full versions for clarity, ensure these replace any older versions)

function drawPole() {
    push(); let currentPoleX = pole.baseX + sin(frameCount * poleSwaySpeed) * poleSwayAmount;
    let currentAnchor = calculateAnchorPos(); let poleTopVisibleY = height - pole.poleHeight;
    strokeWeight(pole.scaledThickness); stroke(clrPoleBase); line(currentPoleX, height, currentPoleX, poleTopVisibleY);
    fill(clrPoleAccent); applyGlow(clrSubtleGlow, 5); noStroke();
    ellipse(currentAnchor.x, currentAnchor.y, pole.scaledThickness * 1.8, pole.scaledThickness * 1.8);
    removeGlow(); pop();
}
function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2; let scaleFactorPulse = map(pulse, 0, 1, 1.0, 1.03);
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    let centerX = targetBox.x + targetBox.scaledW / 2; let centerY = targetBox.y + targetBox.scaledH / 2;
    let finalW = targetBox.scaledW * scaleFactorPulse; let finalH = targetBox.scaledH * scaleFactorPulse;
    push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke();
    rectMode(CENTER); rect(centerX, centerY, finalW, finalH, 5 * scaleFactor); removeGlow(); pop();
}
function drawElastic() {
    let currentAnchor = calculateAnchorPos(); let stretchVector = p5.Vector.sub(ball.pos, currentAnchor);
    let currentStretch = stretchVector.mag(); if (currentStretch < 2 && !ball.isHeld) return;
    let stretchRatio = constrain(currentStretch / scaledMaxStretch, 0, 1);
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity; let thickness = map(stretchRatio, 0, 1, 2 * scaleFactor, 5 * scaleFactor);
    push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(max(1.0, thickness));
    line(currentAnchor.x, currentAnchor.y, ball.pos.x, ball.pos.y); pop();
}
function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`; let txtX = width * 0.03; let txtY = height * 0.07;
    let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; push();
    let scaledSize = max(MIN_TEXT_SIZE, BASE_TEXT_SIZE * scaleFactor); textSize(scaledSize);
    textFont(gameFont); textAlign(LEFT, TOP); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow);
    text(scoreText, txtX + 1, txtY + 1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop();
}
function showGameOver() {
    let overlayAlpha = 180; push(); let overlayColor = color(clrBackground); overlayColor.setAlpha(overlayAlpha); fill(overlayColor); noStroke(); rect(0, 0, width, height);
    let mainTxtSize = max(MIN_TEXT_SIZE * 1.5, 60 * scaleFactor); let subTxtSize = max(MIN_TEXT_SIZE, 28 * scaleFactor);
    let textY = height / 2; let lineSpacing = max(20, 50 * scaleFactor);
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 8 + pulse * 6;
    textFont(gameFont); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrText); textSize(mainTxtSize);
    text('GAME OVER', width / 2, textY - lineSpacing); removeGlow(); applyGlow(clrTextGlow, glowAmount * 0.6);
    fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    removeGlow(); fill(clrText); textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5); pop();
}
function drawGlowingBorder() {
    push(); let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity; let offset = scaledBorderStrokeWeight / 2;
    noFill(); stroke(clrMainAccent); strokeWeight(scaledBorderStrokeWeight); applyGlow(clrBorderGlow, currentGlow);
    rect(offset, offset, width - scaledBorderStrokeWeight, height - scaledBorderStrokeWeight); removeGlow(); pop();
}
