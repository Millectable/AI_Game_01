// --- Globals ---
let ball, pole, targetBox;
let gravity, friction;
let elasticForce = 0.4;
let gameState = 'aiming'; // aiming, launched, exploding, gameOver
let currentLevel = 0;

// --- Reference & Scaling ---
const REF_WIDTH = 960;
const REF_HEIGHT = 640;
const TARGET_ASPECT_RATIO = REF_WIDTH / REF_HEIGHT;
let scaleFactor = 1;

// --- Base Sizes ---
const BASE_BALL_RADIUS = 20;
const BASE_POLE_THICKNESS = 7;
const BASE_POLE_ANCHOR_OFFSET = -8;
const BASE_TARGET_W = 50;
const BASE_TARGET_H = 50;
const BASE_MAX_STRETCH = 140;
const BASE_BORDER_WEIGHT = 2;
const BASE_TEXT_SIZE = 22;
const MIN_TEXT_SIZE = 12;
const BASE_LAUNCH_MULTIPLIER = 0.85; // Base power for 1/sqrt(SF)
const MIN_SCALE_FACTOR_FOR_LAUNCH = 0.4;

// --- Style & Colors ---
const clrBackground = '#F5EFE4'; const clrText = '#8DA1AD'; const clrTextGlow = '#0B3D42';
const clrMainAccent = '#0B3D42'; const clrSecondaryAccent = '#8DA1AD'; const clrSubtleGlow = '#A8BAC4';
const clrBall = clrMainAccent; const clrBallGlow = clrSecondaryAccent;
const clrPoleBase = clrMainAccent; // Dark Teal pole
const clrPoleAccent = '#C0CED7';
const clrGeoShapes = clrSecondaryAccent; const clrGeoShapesGlow = clrSubtleGlow;
const clrGroundParticleGlow = clrSubtleGlow; const clrElasticBase = clrMainAccent;
const clrElasticGlow = clrSecondaryAccent; const clrTarget = clrMainAccent; const clrTargetGlow = clrSecondaryAccent;
const clrSideParticle = clrSecondaryAccent; const clrSideParticleGlow = clrSubtleGlow;
const clrBorderGlow = clrMainAccent;

// --- Animation & Other Params ---
const pulseSpeed = 0.05; const defaultGlow = 20; const targetPulseIntensity = 8;
const elasticGlowIntensity = 12; const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80; const MAX_SIDE_PARTICLES = 100;
const borderBaseGlow = 8; const borderPulseIntensity = 10; const borderPulseSpeedFactor = 0.7;
const poleSwaySpeed = 0.02; const poleSwayAmount = 1.5; const anchorBobSpeed = 0.04; const anchorBobAmount = 1;
const targetMoveSpeedX = 0.015; const targetMoveSpeedY = 0.011;
let groundLevelY;
let geometricShapes = []; let groundParticles = []; let sideParticles = [];
let explosionParticles = []; // Array for explosion particles
const NUM_EXPLOSION_PARTICLES = 40; const EXPLOSION_LIFESPAN_MIN = 20;
const EXPLOSION_LIFESPAN_MAX = 55; const EXPLOSION_SPEED_MIN = 2;
const EXPLOSION_SPEED_MAX = 7; const EXPLOSION_PARTICLE_SIZE_MIN = 3;
const EXPLOSION_PARTICLE_SIZE_MAX = 9;
let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let gameFont = 'Georgia';
let scaledMaxStretch, scaledBorderStrokeWeight;

// ========================================================
// SETUP & RESIZING
// ========================================================

function setup() {
  console.log("Setup starting...");
  let canvasSize = calculateCanvasSize();
  let canvas = createCanvas(canvasSize.w, canvasSize.h);
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  console.log(`Canvas created (dynamic): ${width}x${height}`);
  gravity = createVector(0, 0.6); friction = 0.988;
  ball = { pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0), radius: BASE_BALL_RADIUS, isHeld: false };
  pole = { x: 0, y: 0, poleHeight: 0, baseX: 0, anchorYOffset: BASE_POLE_ANCHOR_OFFSET, thickness: BASE_POLE_THICKNESS };
  targetBox = { x: 0, y: 0, w: BASE_TARGET_W, h: BASE_TARGET_H, initialX: 0, initialY: 0 };
  setLayoutAndScaling();
  setupLevel();
  console.log("Setup finished.");
}

function windowResized() {
  console.log("Window resized!");
  let canvasSize = calculateCanvasSize();
  if (canvasSize.w !== width || canvasSize.h !== height) {
      resizeCanvas(canvasSize.w, canvasSize.h);
      console.log(`Canvas resized to: ${width}x${height}`);
      setLayoutAndScaling(); setupLevel();
  } else { console.log("Skipping resize - dimensions unchanged."); }
}

function calculateCanvasSize() {
  let w = windowWidth; let h = windowHeight; let currentRatio = w / h; let canvasW, canvasH;
  if (currentRatio > TARGET_ASPECT_RATIO) { canvasH = h; canvasW = h * TARGET_ASPECT_RATIO; }
  else { canvasW = w; canvasH = w / TARGET_ASPECT_RATIO; }
  canvasW = max(canvasW, 100); canvasH = max(canvasH, 100 / TARGET_ASPECT_RATIO);
  return { w: floor(canvasW), h: floor(canvasH) };
}

function setLayoutAndScaling() {
  if (width <= 0 || height <= 0) { console.error("Invalid dimensions:", width, height); return; }
  scaleFactor = width / REF_WIDTH; groundLevelY = height * 0.85; pole.poleHeight = height * 0.2;
  ball.radius = max(5, BASE_BALL_RADIUS * scaleFactor); pole.thickness = max(2, BASE_POLE_THICKNESS * scaleFactor);
  pole.anchorYOffset = BASE_POLE_ANCHOR_OFFSET * scaleFactor; targetBox.w = BASE_TARGET_W * scaleFactor;
  targetBox.h = BASE_TARGET_H * scaleFactor; scaledMaxStretch = BASE_MAX_STRETCH * scaleFactor;
  scaledBorderStrokeWeight = max(1.0, BASE_BORDER_WEIGHT * scaleFactor);
  targetMoveBounds.minX = width * 0.35; targetMoveBounds.maxX = width * 0.9 - targetBox.w;
  targetMoveBounds.minY = height * 0.1; targetMoveBounds.maxY = min(height * 0.6, height - pole.poleHeight - targetBox.h - 20);
  if (targetMoveBounds.maxY <= targetMoveBounds.minY) { targetMoveBounds.maxY = targetMoveBounds.minY + 1; }
  if (targetMoveBounds.maxX <= targetMoveBounds.minX) { targetMoveBounds.maxX = targetMoveBounds.minX + 1; }
  console.log(`Layout/Scale Set: SF=${scaleFactor.toFixed(2)}, BallR=${ball.radius.toFixed(1)}, TargetW=${targetBox.w.toFixed(1)}`);
}

// ========================================================
// LEVEL SETUP & ELEMENT POSITIONING
// ========================================================

function setupLevel() {
  console.log("setupLevel called..."); gameState = 'aiming'; ball.isHeld = false;
  pole.baseX = width * 0.15; pole.x = pole.baseX; pole.y = height;
  let minTargetX = pole.x + width * 0.25; let maxTargetX = width - targetBox.w - width * 0.1; if (minTargetX >= maxTargetX) { minTargetX = width * 0.5; maxTargetX = width - targetBox.w - width * 0.05; }
  let minYTarget = height * 0.15; let maxYTarget = height - pole.poleHeight - targetBox.h - height * 0.15; if (maxYTarget <= minYTarget) { maxYTarget = minYTarget + 1; }
  targetBox.initialX = random(minTargetX, maxTargetX); targetBox.initialY = random(minYTarget, maxYTarget); targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY;
  let initialAnchorPos = calculateAnchorPos(0); if (initialAnchorPos) { ball.pos = initialAnchorPos.copy(); ball.vel = createVector(0, 0); ball.acc = createVector(0, 0); } else { console.error("Failed anchor pos in setupLevel!"); ball.pos = createVector(pole.baseX, height - pole.poleHeight); }
  generateGeometricPatterns();
  explosionParticles = []; // Clear explosion particles for new level
  console.log(`Level ${currentLevel + 1} setup complete.`);
}

function calculateAnchorPos(animationFrameCount = frameCount) {
  if (!pole || typeof pole.baseX !== 'number' || typeof height !== 'number' || typeof pole.poleHeight !== 'number' || typeof pole.anchorYOffset !== 'number') { console.warn("Invalid pole data in calculateAnchorPos, returning null."); return null; }
  let currentPoleX = pole.baseX + sin(animationFrameCount * poleSwaySpeed) * poleSwayAmount; let baseAnchorY = height - pole.poleHeight + pole.anchorYOffset; let currentAnchorY = baseAnchorY + cos(animationFrameCount * anchorBobSpeed) * anchorBobAmount; return createVector(currentPoleX, currentAnchorY);
}

// ========================================================
// DRAW LOOP & UPDATE FUNCTIONS
// ========================================================

function draw() {
  // Early exit / safety check
  if (!ball || !pole || !targetBox || !width || !height || width <= 0 || height <= 0) {
    if (frameCount < 60) console.log("Waiting...");
    return;
  }

  background(clrBackground); // Clear background

  // Update target position only if game is active and NOT exploding
  if (gameState !== 'gameOver' && gameState !== 'exploding') {
      updateTargetPosition();
  }

  // Update background particle systems ALWAYS
  updateAndDrawParticles(); // Background dust

  // Update explosion particles ALWAYS (drawing happens later)
  // It's better to separate update and draw for particles too, but keep simple for now
  // We will draw them specifically within the 'exploding' state or after other elements

  // Draw background shapes, pole
  drawGround();
  drawPole();

  // Draw target (visible unless game over?)
  if (gameState !== 'gameOver') {
       drawTargetBox();
  }

  // --- Game State Logic ---

  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic();
    drawBall();
  }
  else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions(); // Can change state to 'exploding' or 'gameOver'
    drawBall();
  }
  else if (gameState === 'exploding') {
    // Optional: Draw ball semi-transparent or at impact point?
    // Let's just draw it normally for now.
    drawBall();

    // *** UPDATE & DRAW explosion particles ***
    updateAndDrawExplosionParticles(); // This function now also draws

    // *** Check if animation is finished AFTER updating/drawing ***
    if (explosionParticles.length === 0) {
        console.log("Explosion finished, setting up next level.");
        currentLevel++;
        setupLevel(); // Resets gameState to 'aiming'
    }
  }
  else if (gameState === 'gameOver') {
    // Draw final ball position maybe?
     drawBall();
    showGameOver();
  }

  // --- Draw UI Overlays ---
  displayScore();
  drawGlowingBorder();
}


function updateTargetPosition() {
  let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2; let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2; if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) { targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX); targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY); } else { targetBox.x = targetBox.initialX; targetBox.y = targetBox.initialY; if(frameCount % 60 === 0) console.warn("Using fallback target position."); }
}

// ========================================================
// VISUAL DRAWING FUNCTIONS (Using Scaled Properties)
// ========================================================
function applyGlow(glowColor, intensity) { if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; } }
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }
function drawGround() { push(); noFill(); strokeWeight(1.5); stroke(clrGeoShapes); applyGlow(clrGeoShapesGlow, 8); for (let i = 0; i < geometricShapes.length; i++) { let shape = geometricShapes[i]; shape.angle += 0.008; shape.x += sin(frameCount * 0.025 + i * 0.6) * 0.2; shape.y += cos(frameCount * 0.018 + i * 0.8) * 0.15; shape.y = constrain(shape.y, groundLevelY + 10, height - 20); if (shape.x > width + shape.w) shape.x = -shape.w; if (shape.x < -shape.w) shape.x = width + shape.w; push(); translate(shape.x, shape.y); rotate(shape.angle); rectMode(CENTER); rect(0, 0, shape.w, shape.h); pop(); } removeGlow(); pop(); } // Shapes not scaled
function generateGeometricPatterns() { geometricShapes = []; let patternAreaHeight = height - groundLevelY; if (patternAreaHeight <= 0) return; for (let i = 0; i < NUM_GEO_SHAPES; i++) { let shape = { x: random(width), y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8), w: random(20, 150), h: random(10, 80), angle: random(TWO_PI) }; geometricShapes.push(shape); } } // Shapes not scaled
function updateAndDrawParticles() {
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle(); for (let i = sideParticles.length - 1; i >= 0; i--) { let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5; if (p.lifespan <= 0) { sideParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6); let baseColor = color(clrSideParticle); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrSideParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size * scaleFactor, p.size * scaleFactor); removeGlow(); pop(); } } // Scaled particle size
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle(); for (let i = groundParticles.length - 1; i >= 0; i--) { let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1; if (p.lifespan <= 0) { groundParticles.splice(i, 1); } else { push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120); let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7); let baseColor = color(clrGroundParticleGlow); fill(red(baseColor), green(baseColor), blue(baseColor), alpha); applyGlow(clrGroundParticleGlow, glowAmount); noStroke(); ellipse(p.pos.x, p.pos.y, p.size * scaleFactor, p.size * scaleFactor); removeGlow(); pop(); } } // Scaled particle size
}
function spawnSideParticle() { let edgeMargin = width * 0.08; let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width); let yPos = random(height * 0.2, height * 1.1); let baseSize = random(1.5, 4); let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)), initialLifespan: random(120, 280), lifespan: 0, size: baseSize }; particle.lifespan = particle.initialLifespan; sideParticles.push(particle); } // Stores base size
function spawnGroundParticle() { if (typeof groundLevelY !== 'number' || groundLevelY >= height) return; let xPos = random(width); let yPos = random(groundLevelY + 5, height - 5); let baseSize = random(2, 5); let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)), initialLifespan: random(100, 200), lifespan: 0, size: baseSize }; particle.lifespan = particle.initialLifespan; groundParticles.push(particle); } // Stores base size
function drawPole() { push(); let currentPoleX = pole.baseX + sin(frameCount * poleSwaySpeed) * poleSwayAmount; let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return; let poleTopVisibleY = height - pole.poleHeight; strokeWeight(pole.thickness); stroke(clrPoleBase); line(currentPoleX, height, currentPoleX, poleTopVisibleY); fill(clrPoleAccent); applyGlow(clrSubtleGlow, 5); noStroke(); ellipse(currentAnchor.x, currentAnchor.y, pole.thickness * 1.8, pole.thickness * 1.8); removeGlow(); pop(); } // Uses scaled pole.thickness
function drawTargetBox() { let pulse = (sin(frameCount * pulseSpeed) + 1) / 2; let scaleFactorPulse = map(pulse, 0, 1, 1.0, 1.03); let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity); let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2; let finalW = targetBox.w * scaleFactorPulse; let finalH = targetBox.h * scaleFactorPulse; push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke(); rectMode(CENTER); rect(centerX, centerY, finalW, finalH, 5 * scaleFactor); removeGlow(); pop(); } // Uses scaled targetBox.w/h and scales corner radius
function drawBall() { push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke(); ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2); pop(); } // Uses scaled ball.radius
function drawElastic() { let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return; let stretchVector = p5.Vector.sub(ball.pos, currentAnchor); let currentStretch = stretchVector.mag(); if (currentStretch < 2 && !ball.isHeld) return; let stretchRatio = constrain(currentStretch / scaledMaxStretch, 0, 1); let glowAmount = 4 + stretchRatio * elasticGlowIntensity; let minThickness = max(1.0, 2 * scaleFactor); let maxThickness = max(minThickness + 1, 5 * scaleFactor); let thickness = map(stretchRatio, 0, 1, minThickness, maxThickness); push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase); strokeWeight(thickness); line(currentAnchor.x, currentAnchor.y, ball.pos.x, ball.pos.y); pop(); } // Uses scaledMaxStretch and scales thickness
function displayScore() { let scoreText = `Level: ${currentLevel + 1}`; let txtX = width * 0.03; let txtY = height * 0.07; let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; push(); let scaledSize = max(MIN_TEXT_SIZE, BASE_TEXT_SIZE * scaleFactor); textSize(scaledSize); textFont(gameFont); textAlign(LEFT, TOP); applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow); text(scoreText, txtX + 1, txtY + 1); removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop(); } // Scales text size
function showGameOver() { let overlayAlpha = 180; push(); let overlayColor = color(clrBackground); overlayColor.setAlpha(overlayAlpha); fill(overlayColor); noStroke(); rect(0, 0, width, height); let mainTxtSize = max(MIN_TEXT_SIZE * 1.5, 60 * scaleFactor); let subTxtSize = max(MIN_TEXT_SIZE, 28 * scaleFactor); let textY = height / 2; let lineSpacing = max(20, 50 * scaleFactor); let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 8 + pulse * 6; textFont(gameFont); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrText); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing); removeGlow(); applyGlow(clrTextGlow, glowAmount * 0.6); fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5); removeGlow(); fill(clrText); textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5); pop(); } // Scales text sizes and spacing
function drawGlowingBorder() { push(); let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2; let currentGlow = borderBaseGlow + pulse * borderPulseIntensity; let offset = scaledBorderStrokeWeight / 2; noFill(); stroke(clrMainAccent); strokeWeight(scaledBorderStrokeWeight); applyGlow(clrBorderGlow, currentGlow); rect(offset, offset, width - scaledBorderStrokeWeight, height - scaledBorderStrokeWeight); removeGlow(); pop(); } // Uses scaledBorderStrokeWeight

// ========================================================
// *** EXPLOSION FUNCTIONS ***
// ========================================================
function spawnExplosionBurst(x, y) {
    console.log("Spawning explosion at:", x.toFixed(1), y.toFixed(1));
    explosionParticles = []; // Clear previous burst before adding new
    for (let i = 0; i < NUM_EXPLOSION_PARTICLES; i++) {
        let angle = random(TWO_PI);
        let speed = random(EXPLOSION_SPEED_MIN * scaleFactor, EXPLOSION_SPEED_MAX * scaleFactor);
        let vel = p5.Vector.fromAngle(angle).mult(speed);
        let life = random(EXPLOSION_LIFESPAN_MIN, EXPLOSION_LIFESPAN_MAX);
        let baseSize = random(EXPLOSION_PARTICLE_SIZE_MIN, EXPLOSION_PARTICLE_SIZE_MAX);
        let particleColor = random() < 0.6 ? clrMainAccent : clrSecondaryAccent;
        explosionParticles.push({ pos: createVector(x, y), vel: vel, lifespan: life, initialLifespan: life, size: baseSize, color: particleColor });
    }
}
function updateAndDrawExplosionParticles() {
    // Only proceed if there are particles
    if(explosionParticles.length === 0) return;

    rectMode(CENTER); // Set for drawing particles
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        let p = explosionParticles[i];
        p.pos.add(p.vel); p.vel.mult(0.95); p.lifespan -= 1; // Update
        if (p.lifespan <= 0) { explosionParticles.splice(i, 1); } // Remove
        else { // Draw
            push(); let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 255);
            let currentSize = p.size * scaleFactor; // Scale size
            let particleColor = color(p.color);
            fill(red(particleColor), green(particleColor), blue(particleColor), alpha);
            applyGlow(clrSubtleGlow, 5); noStroke();
            rect(p.pos.x, p.pos.y, currentSize, currentSize); // Draw square
            removeGlow(); pop();
        }
    }
    rectMode(CORNER); // Reset if needed (though most drawing uses CENTER now)
}

// ========================================================
// GAME MECHANICS & PHYSICS (Using Scaled Properties)
// ========================================================
function aimingLogic() { let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return; if (ball.isHeld) { let currentInputPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(currentInputPos, currentAnchor); let distance = displacement.mag(); if (distance > scaledMaxStretch) { displacement.setMag(scaledMaxStretch); ball.pos = p5.Vector.add(currentAnchor, displacement); } else { ball.pos.set(currentInputPos.x, currentInputPos.y); } } else { ball.pos.set(currentAnchor.x, currentAnchor.y); } }
function physicsUpdate() { if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0); }

// *** UPDATED checkCollisions to trigger explosion ***
function checkCollisions() {
    if (gameState !== 'launched') return;
    if (didBallHitBox()) {
      console.log("Target Hit! Triggering Explosion.");
      let targetCenterX = targetBox.x + targetBox.w / 2; let targetCenterY = targetBox.y + targetBox.h / 2;
      spawnExplosionBurst(targetCenterX, targetCenterY); // Create particles
      gameState = 'exploding'; // Change state
      return;
    }
    let hitBorder = false; let r = ball.radius;
    if (ball.pos.x - r <= 0) hitBorder = true; else if (ball.pos.x + r >= width) hitBorder = true;
    else if (ball.pos.y - r <= 0) hitBorder = true; else if (ball.pos.y + r >= height) hitBorder = true;
    if (hitBorder) { gameState = 'gameOver'; console.log("Hit Border!"); return; }
}
function didBallHitBox() { let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w); let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h); let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2); return dSq < pow(ball.radius, 2); }

// ========================================================
// INPUT HANDLERS (Using Scaled Properties)
// ========================================================
function mousePressed() { if (gameState === 'aiming') { let currentAnchor = calculateAnchorPos(); if (!currentAnchor) return false; let d = dist(mouseX, mouseY, currentAnchor.x, currentAnchor.y); if (d < ball.radius * 3.5) { ball.isHeld = true; aimingLogic(); } } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); } return false; }
function mouseDragged() { if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } return false; }

// *** UPDATED mouseReleased - Divide by sqrt(Scale Factor) with HIGHER BASE ***
function mouseReleased() {
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched';
        let currentAnchor = calculateAnchorPos();
        if (!currentAnchor) return false; // Check anchor validity

        let launchVector = p5.Vector.sub(currentAnchor, ball.pos);

        // --- Adjust Base Multiplier for overall power level ---
        const BASE_LAUNCH_MULTIPLIER = 0.85; // Higher base, adjust if needed

        // Calculate effective multiplier based on scale factor
        let effectiveScaleFactor = max(MIN_SCALE_FACTOR_FOR_LAUNCH, scaleFactor);
        // *** Divide by sqrt(effectiveScaleFactor) ***
        let effectiveMultiplier = BASE_LAUNCH_MULTIPLIER / sqrt(effectiveScaleFactor);

        ball.vel = launchVector.mult(elasticForce * effectiveMultiplier);
        ball.acc.mult(0);
        console.log(`Launched: Scale=${scaleFactor.toFixed(2)}, BaseMult=${BASE_LAUNCH_MULTIPLIER}, EffMult=${effectiveMultiplier.toFixed(2)} (1/sqrt(SF) adjust), V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
    return false;
}
// --- End ---