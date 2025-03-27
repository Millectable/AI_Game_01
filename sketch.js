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
// *** KEEPING "MILLECTABLES" Color Palette ***
let clrBackground = '#F5EFE4';     // Beige/Cream background
let clrText = '#8DA1AD';           // Greyish-Blue text
let clrTextGlow = '#0B3D42';       // Dark Teal for text glow/accent
let clrMainAccent = '#0B3D42';     // Dark Teal (Ball, Target, Border stroke)
let clrSecondaryAccent = '#8DA1AD'; // Greyish-Blue (Shapes, Pole, Main Glow Color)
let clrSubtleGlow = '#A8BAC4';     // Lighter Greyish-Blue (Particle glows)

// --- Map palette to game elements ---
// Ball
let clrBall = clrMainAccent;
let clrBallGlow = clrSecondaryAccent; // Use Greyish-Blue for glow color
// Pole
let clrPoleBase = clrSecondaryAccent;
let clrPoleAccent = '#C0CED7';
// Ground Shapes/Particles (Shapes are below conceptual ground line)
let clrGeoShapes = clrSecondaryAccent;
let clrGeoShapesGlow = clrSubtleGlow;
let clrGroundParticleGlow = clrSubtleGlow; // Dots below line
// Elastic Band
let clrElasticBase = clrMainAccent;
let clrElasticGlow = clrSecondaryAccent;
// Target Box
let clrTarget = clrMainAccent;
let clrTargetGlow = clrSecondaryAccent; // Use Greyish-Blue for glow color
// Side Particles
let clrSideParticle = clrSecondaryAccent;
let clrSideParticleGlow = clrSubtleGlow;
// Border
let clrBorderGlow = clrMainAccent; // Dark Teal glow for border

// Animation & Element Parameters
let pulseSpeed = 0.05;
// *** CHANGE: Increased Glow Intensities ***
let defaultGlow = 20; // Increased base glow significantly
let targetPulseIntensity = 8; // Increased pulse intensity
let elasticGlowIntensity = 12; // Adjusted elastic glow intensity
let groundLevelY;
const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80;
const MAX_SIDE_PARTICLES = 100;

// Border parameters
let borderStrokeWeight = 2.5;
let borderBaseGlow = 8;      // Adjusted border glow
let borderPulseIntensity = 10; // Adjusted border pulse
let borderPulseSpeedFactor = 0.7;

// Arrays for shapes and particles
let geometricShapes = [];
let groundParticles = [];
let sideParticles = [];

// Target Movement Parameters
let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let targetMoveSpeedX = 0.015;
let targetMoveSpeedY = 0.011;

// Target aspect ratio
const TARGET_ASPECT_RATIO = 1280 / 720;

// Font (using the one specified before)
let gameFont = 'Georgia';

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  let canvasSize = calculateCanvasSize();
  createCanvas(canvasSize.w, canvasSize.h);
  console.log(`Canvas created (dynamic): ${width}x${height}`);

  setDynamicSizes(); // Set groundLevelY etc.

  gravity = createVector(0, 0.6);
  friction = 0.988; // Keep slight increase

  // Keep larger ball/pole sizes from previous step
  ball = {
    pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0),
    radius: 24,
    isHeld: false,
  };
  pole = {
    x: 0, y: 0,
    poleHeight: 120,
    anchorYOffset: -10, thickness: 8,
  };
  targetBox = {
    x: 0, y: 0, w: 60, h: 60,
    initialX: 0, initialY: 0
  };

  setupLevel();
  console.log("Setup finished.");
}

// calculateCanvasSize - Remains the same
function calculateCanvasSize() {
  let w = windowWidth;
  let h = windowHeight;
  let currentRatio = w / h;
  let canvasW, canvasH;
  if (currentRatio > TARGET_ASPECT_RATIO) {
    canvasH = h;
    canvasW = h * TARGET_ASPECT_RATIO;
  } else {
    canvasW = w;
    canvasH = w / TARGET_ASPECT_RATIO;
  }
  return { w: floor(canvasW), h: floor(canvasH) };
}

// setDynamicSizes - Remains the same
function setDynamicSizes() {
    groundLevelY = height * 0.85;
    targetMoveBounds.minX = width * 0.35;
    targetMoveBounds.maxX = width * 0.9 - targetBox.w;
    targetMoveBounds.minY = height * 0.1;
    targetMoveBounds.maxY = min(height * 0.6, groundLevelY - pole.poleHeight - targetBox.h - 20);
    console.log(`Dynamic sizes set: groundY=${groundLevelY}, TargetBounds=(${targetMoveBounds.minX}, ${targetMoveBounds.minY}) to (${targetMoveBounds.maxX}, ${targetMoveBounds.maxY})`);
}

// windowResized - Remains the same
function windowResized() {
  console.log("Window resized!");
  let canvasSize = calculateCanvasSize();
  resizeCanvas(canvasSize.w, canvasSize.h);
  console.log(`Canvas resized to: ${width}x${height}`);
  setDynamicSizes();
  setupLevel();
}

// setupLevel - Remains the same
function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming';
  ball.isHeld = false;
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = groundLevelY;
  let minTargetX = pole.x + width * 0.2;
  let maxTargetX = width - targetBox.w - width * 0.1;
  if (minTargetX > maxTargetX) {
      minTargetX = width * 0.5;
      maxTargetX = width - targetBox.w - width*0.05;
  }
  targetBox.initialX = random(minTargetX, maxTargetX);
  targetBox.initialY = random(height * 0.15, groundLevelY - targetBox.h - height * 0.1);
  targetBox.x = targetBox.initialX;
  targetBox.y = targetBox.initialY;
  let anchorX = pole.x;
  let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0);
  ball.acc = createVector(0, 0);
  generateGeometricPatterns();
  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target Initial(${targetBox.initialX.toFixed(0)}, ${targetBox.initialY.toFixed(0)})`);
}

// draw - Remains the same
function draw() {
  if (!ball || !pole || !targetBox) return;
  background(clrBackground);
  if (gameState !== 'gameOver') {
      updateTargetPosition();
  }
  drawGround();
  updateAndDrawParticles();
  drawPole();
  drawTargetBox(); // Will now draw with stronger glow
  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic();
    drawBall(); // Will now draw with stronger glow
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions();
    drawBall(); // Will now draw with stronger glow
  } else if (gameState === 'gameOver') {
    drawBall();
    showGameOver();
  }
  displayScore();
  drawGlowingBorder();
}

// updateTargetPosition - Remains the same
function updateTargetPosition() {
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2;
    let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2;
    if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) {
        targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX);
        targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY);
    } else {
        targetBox.x = targetBox.initialX;
        targetBox.y = targetBox.initialY;
    }
}

// --- Visual Elements Drawing Functions ---

// applyGlow - Remains the same
function applyGlow(glowColor, intensity) {
    if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; }
}
// removeGlow - Remains the same
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }

// drawGround (No visual line, just shapes/particles) - Remains the same
function drawGround() {
    push();
    noFill();
    strokeWeight(1.5);
    stroke(clrGeoShapes); // Greyish-Blue Shapes
    applyGlow(clrGeoShapesGlow, 8); // Subtle Lighter Grey-Blue Glow
    for (let i = 0; i < geometricShapes.length; i++) {
        let shape = geometricShapes[i];
        shape.angle += 0.008;
        shape.x += sin(frameCount * 0.025 + i * 0.6) * 0.2;
        shape.y += cos(frameCount * 0.018 + i * 0.8) * 0.15;
        shape.y = constrain(shape.y, groundLevelY + 10, height - 20);
        if (shape.x > width + shape.w) shape.x = -shape.w;
        if (shape.x < -shape.w) shape.x = width + shape.w;
        push();
        translate(shape.x, shape.y);
        rotate(shape.angle);
        rectMode(CENTER);
        rect(0, 0, shape.w, shape.h);
        pop();
    }
    removeGlow();
    pop();
}

// generateGeometricPatterns - Remains the same
function generateGeometricPatterns() {
    geometricShapes = [];
    let patternAreaHeight = height - groundLevelY;
    for (let i = 0; i < NUM_GEO_SHAPES; i++) {
        let shape = {
            x: random(width),
            y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8),
            w: random(20, 150), h: random(10, 80), angle: random(TWO_PI)
        };
        geometricShapes.push(shape);
    }
}

// updateAndDrawParticles - Remains the same
function updateAndDrawParticles() {
    // Side Particles
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle();
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5;
        if (p.lifespan <= 0) sideParticles.splice(i, 1);
        else { /* Draw with clrSideParticle/clrSideParticleGlow */ } // Simplified for brevity
    }
    // Ground Particles
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle();
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1;
        if (p.lifespan <= 0) groundParticles.splice(i, 1);
        else { /* Draw with clrGroundParticleGlow */ } // Simplified for brevity
    }
     // Full particle drawing logic from previous steps needed here
     // Side Particles Drawing
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i];
        // Only draw if lifespan > 0 (already checked for splice)
        if (p.lifespan > 0) {
             push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200);
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6);
            let baseColor = color(clrSideParticle);
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha);
            applyGlow(clrSideParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
        }
    }
    // Ground Particles Drawing
    for (let i = groundParticles.length - 1; i >= 0; i--) {
         let p = groundParticles[i];
         if (p.lifespan > 0) {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120);
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7);
            let baseColor = color(clrGroundParticleGlow);
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha);
            applyGlow(clrGroundParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
         }
    }
}

// spawnSideParticle - Remains the same
function spawnSideParticle() {
    let edgeMargin = width * 0.08;
    let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width);
    let yPos = random(height * 0.2, height * 1.1);
    let particle = { /* ... */ }; // Use full definition from prev step
    particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)), initialLifespan: random(120, 280), lifespan: 0, size: random(1.5, 4), };
    particle.lifespan = particle.initialLifespan;
    sideParticles.push(particle);
}
// spawnGroundParticle - Remains the same
function spawnGroundParticle() {
    let xPos = random(width); let yPos = random(groundLevelY + 5, height - 5);
    let particle = { /* ... */ }; // Use full definition from prev step
    particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)), initialLifespan: random(100, 200), lifespan: 0, size: random(2, 5), };
    particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}

// drawPole - Remains the same
function drawPole() {
    push();
    let poleTopY = pole.y - pole.poleHeight;
    strokeWeight(pole.thickness);
    stroke(clrPoleBase); // Greyish-Blue
    line(pole.x, pole.y, pole.x, poleTopY);
    let anchorX = pole.x;
    let anchorY = poleTopY + pole.anchorYOffset;
    fill(clrPoleAccent); // Lighter Greyish-Blue
    applyGlow(clrSubtleGlow, 5);
    noStroke();
    ellipse(anchorX, anchorY, pole.thickness * 1.8, pole.thickness * 1.8);
    removeGlow();
    pop();
}

// drawTargetBox - Applies stronger glow intensity
function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2;
    let scaleFactor = map(pulse, 0, 1, 1.0, 1.03);
    // *** Use increased defaultGlow and targetPulseIntensity ***
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2;
    let scaledW = targetBox.w * scaleFactor; let scaledH = targetBox.h * scaleFactor;
    push();
    // Use defined glow color and calculated amount
    applyGlow(clrTargetGlow, glowAmount); // Greyish-Blue glow, stronger intensity
    fill(clrTarget); // Dark Teal target
    noStroke();
    rect(centerX - scaledW / 2, centerY - scaledH / 2, scaledW, scaledH, 5);
    removeGlow();
    pop();
}

// drawBall - Applies stronger glow intensity
function drawBall() {
    push();
    // *** Use increased defaultGlow intensity ***
    applyGlow(clrBallGlow, defaultGlow); // Greyish-Blue glow, stronger intensity
    fill(clrBall); // Dark Teal ball
    noStroke();
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2);
    pop();
}

// drawElastic - Uses adjusted elasticGlowIntensity
function drawElastic() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY));
    let currentStretch = stretchVector.mag();
    if (currentStretch < 2 && !ball.isHeld) return;
    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1);
    // *** Use adjusted elasticGlowIntensity ***
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity;
    let thickness = map(stretchRatio, 0, 1, 2, 5);
    push();
    applyGlow(clrElasticGlow, glowAmount); // Greyish-Blue glow
    stroke(clrElasticBase); // Dark Teal band
    strokeWeight(thickness);
    line(anchorX, anchorY, ball.pos.x, ball.pos.y);
    pop();
}

// displayScore - Remains the same (using Georgia font)
function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`;
    let txtX = width * 0.03;
    let txtY = height * 0.07;
    let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2;
    push();
    let baseSize = 26;
    let scaledSize = baseSize * (width / 1280);
    textSize(max(14, scaledSize));
    textFont(gameFont); // Use Georgia
    textAlign(LEFT, TOP);
    applyGlow(clrTextGlow, glowAmount); // Dark Teal glow
    fill(clrTextGlow);
    text(scoreText, txtX + 1, txtY + 1);
    removeGlow();
    fill(clrText); // Greyish-Blue text
    text(scoreText, txtX, txtY);
    pop();
}

// showGameOver - Remains the same (using Georgia font)
function showGameOver() {
    let overlayAlpha = 180;
    push();
    let overlayColor = color(clrBackground);
    overlayColor.setAlpha(overlayAlpha);
    fill(overlayColor);
    noStroke();
    rect(0, 0, width, height);
    let mainTxtSize = max(30, 60 * (width/1280)); // Added min size
    let subTxtSize = max(16, 28 * (width/1280)); // Added min size
    let textY = height / 2;
    let lineSpacing = max(30, 50 * (height/720)); // Scale spacing too
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2;
    let glowAmount = 8 + pulse * 6;
    textFont(gameFont); // Use Georgia
    textAlign(CENTER, CENTER);
    applyGlow(clrTextGlow, glowAmount);
    fill(clrText);
    textSize(mainTxtSize);
    text('GAME OVER', width / 2, textY - lineSpacing);
    removeGlow();
    applyGlow(clrTextGlow, glowAmount * 0.6);
    fill(clrText);
    textSize(subTxtSize);
    text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    removeGlow(); // Remove glow before next text
    fill(clrText); // Ensure fill is reset if glow wasn't applied
    textSize(subTxtSize * 0.9);
    text('Click to Restart', width / 2, textY + lineSpacing * 1.5);
    pop();
}


// drawGlowingBorder - Remains the same
function drawGlowingBorder() {
    push();
    let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity;
    let offset = borderStrokeWeight / 2;
    noFill();
    stroke(clrMainAccent); // Use Dark Teal for border stroke
    strokeWeight(borderStrokeWeight);
    applyGlow(clrBorderGlow, currentGlow); // Dark Teal glow
    rect(offset, offset, width - borderStrokeWeight, height - borderStrokeWeight);
    removeGlow();
    pop();
}

// --- Game Mechanics & Physics ---
// aimingLogic, physicsUpdate, checkCollisions, didBallHitBox - Remain the same
function aimingLogic() { /* ... */ }
function physicsUpdate() { /* ... */ }
function checkCollisions() { /* ... */ }
function didBallHitBox() { /* ... */ }

// --- Input Event Handlers ---
// mousePressed, mouseDragged, mouseReleased - Remain the same
function mousePressed() { /* ... */ }
function mouseDragged() { /* ... */ }
function mouseReleased() { /* ... */ }

// Ensure full functions are present from previous steps if ellipsis used above
// (Copying relevant full functions again for completeness)
function aimingLogic() {
   let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
   if (ball.isHeld) {
     let desiredPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(desiredPos, createVector(anchorX, anchorY)); let distance = displacement.mag();
     if (distance > maxStretch) { displacement.setMag(maxStretch); ball.pos = p5.Vector.add(createVector(anchorX, anchorY), displacement); }
     else { ball.pos.set(mouseX, mouseY); }
   } else { ball.pos.set(anchorX, anchorY); }
}
function physicsUpdate() {
  if (gameState !== 'launched') return;
  ball.acc.add(gravity);
  ball.vel.add(ball.acc);
  ball.vel.mult(friction);
  ball.pos.add(ball.vel);
  ball.acc.mult(0);
}
function checkCollisions() {
    if (gameState !== 'launched') return;
    if (didBallHitBox()) {
      console.log("Target Hit!"); currentLevel++; setupLevel(); return;
    }
    let hitBorder = false;
    if (ball.pos.x - ball.radius <= 0) { hitBorder = true; console.log("Hit left border!"); }
    else if (ball.pos.x + ball.radius >= width) { hitBorder = true; console.log("Hit right border!"); }
    else if (ball.pos.y - ball.radius <= 0) { hitBorder = true; console.log("Hit top border!"); }
    else if (ball.pos.y + ball.radius >= height) { hitBorder = true; console.log("Hit bottom border!"); }
    if (hitBorder) { gameState = 'gameOver'; return; }
}
function didBallHitBox() {
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w);
  let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h);
  let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2);
  return dSq < pow(ball.radius, 2);
}
function mousePressed() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming') {
      let d = dist(mouseX, mouseY, anchorX, anchorY);
      if (d < ball.radius * 3.0) { ball.isHeld = true; aimingLogic(); }
    } else if (gameState === 'gameOver') {
      currentLevel = 0; setupLevel();
    }
}
function mouseDragged() {
  if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); }
}
function mouseReleased() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched';
        let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);
        let launchMultiplier = 0.15;
        ball.vel = launchVector.mult(elasticForce * launchMultiplier);
        ball.acc.mult(0);
        console.log(`Launched: V(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
}
// --- End ---
