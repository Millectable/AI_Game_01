// Game Globals
let ball;
let pole;
let targetBox;
let gravity;
let friction;
let elasticForce = 5;
let maxStretch = 160;

let gameState = 'aiming';
let currentLevel = 0;

// --- Visual Style & Animation ---
// *** REVERTED: Original Color Palette ***
let clrBackground = '#1a1a2e';
let clrBall = '#00ffff';         // Cyan ball
let clrBallGlow = '#00ffff';
let clrPoleBase = '#aaaaaa';
let clrPoleAccent = '#dddddd';   // Anchor point color
let clrGround = '#00ced1';       // Color for (now removed) ground line, potentially reuse
let clrGroundGlow = '#00ffff';
let clrElasticBase = '#4d4dff';
let clrElasticGlow = '#8080ff';
let clrTarget = '#ffd700';       // Yellow target
let clrTargetGlow = '#ffd700';
let clrText = '#f0f0f0';
let clrTextGlow = '#a0a0f0';
let clrSideParticle = '#ffcc00'; // Yellow side particles
let clrSideParticleGlow = '#ffd700';
let clrBorderGlow = '#00ffff';    // Cyan border glow
let clrGeoShapes = '#FF69B4';     // Keep pink shapes from previous step unless specified otherwise
let clrGeoShapesGlow = '#FFC0CB';

// Animation & Element Parameters
let pulseSpeed = 0.05;
let targetPulseIntensity = 5;
let elasticGlowIntensity = 15;
let defaultGlow = 15;
let groundLevelY; // Still used for positioning pole and shapes
const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 100;
const MAX_SIDE_PARTICLES = 150;

// Border parameters
let borderStrokeWeight = 2.5;
let borderBaseGlow = 8;
let borderPulseIntensity = 12;
let borderPulseSpeedFactor = 0.7;

// Arrays for shapes and particles
let geometricShapes = [];
let groundParticles = []; // Still exist below groundLevelY
let sideParticles = [];

// *** NEW: Target Movement Parameters ***
let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let targetMoveSpeedX = 0.015; // Adjust speed as needed
let targetMoveSpeedY = 0.011; // Adjust speed (different from X for non-circular path)

// *** REVERTED: Use default font ***
// let gameFont = 'Georgia';

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  createCanvas(1280, 720);
  console.log(`Canvas created (fixed): ${width}x${height}`);

  gravity = createVector(0, 0.6);
  friction = 0.985; // Reverted friction
  groundLevelY = height * 0.85; // Keep definition for positioning

  ball = {
    pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0),
    // *** CHANGE: Increase ball radius ***
    radius: 24, // Increased from 18
    isHeld: false,
  };
  pole = {
    x: 0, y: 0,
    // *** CHANGE: Increase pole height ***
    poleHeight: 120, // Increased from 80
    anchorYOffset: -10, thickness: 8,
  };
  targetBox = {
    x: 0, y: 0, w: 60, h: 60,
    initialX: 0, initialY: 0 // Store base position for movement calculation
  };

  setupLevel();
  console.log("Setup finished.");
}

function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming';
  ball.isHeld = false;

  // Pole position based on groundLevelY
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = groundLevelY;

  // Target initial position
  let minTargetX = pole.x + 300; // Ensure target is further away initially
  let maxTargetX = width - targetBox.w - 100;
  if (minTargetX > maxTargetX) {
    minTargetX = width * 0.5;
    maxTargetX = width - targetBox.w - 50;
  }
  // Keep initial vertical position reasonable
  targetBox.initialX = random(minTargetX, maxTargetX);
  targetBox.initialY = random(height * 0.2, groundLevelY - targetBox.h - 100);

  // Set current position initially
  targetBox.x = targetBox.initialX;
  targetBox.y = targetBox.initialY;

  // *** NEW: Define movement bounds based on image ***
  // Approximating the green dotted box
  targetMoveBounds.minX = width * 0.35;
  targetMoveBounds.maxX = width * 0.9 - targetBox.w;
  targetMoveBounds.minY = height * 0.1;
  targetMoveBounds.maxY = height * 0.6 - targetBox.h;

  // Ball initial position at anchor
  let anchorX = pole.x;
  let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0);
  ball.acc = createVector(0, 0);

  generateGeometricPatterns(); // Keep shapes below groundLevelY
  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target Initial(${targetBox.initialX.toFixed(0)}, ${targetBox.initialY.toFixed(0)})`);
}

// Main draw loop
function draw() {
  if (!ball || !pole || !targetBox) return;

  background(clrBackground); // Original background color

  // *** NEW: Update target position each frame ***
  if (gameState !== 'gameOver') { // Don't move target after game over
      updateTargetPosition();
  }

  // --- Draw Background Elements ---
  drawGround(); // Now only draws shapes/particles below line
  updateAndDrawParticles(); // Uses original colors

  // --- Draw Game Elements ---
  drawPole(); // Taller pole, original colors
  drawTargetBox(); // Moving target, original colors

  // --- Game State Logic & Dynamic Drawing ---
  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic(); // Original colors
    drawBall(); // Bigger ball, original colors
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions(); // Includes border check, no ground line check
    drawBall(); // Bigger ball, original colors
  } else if (gameState === 'gameOver') {
    drawBall(); // Show final position
    showGameOver(); // Original colors, default font
  }

  // --- Draw UI Elements ---
  displayScore(); // Original colors, default font

  // --- Draw the animated glowing border ---
  drawGlowingBorder(); // Original colors
}

// --- NEW: Function to update target position ---
function updateTargetPosition() {
    // Calculate oscillation factors (0 to 1) using sin/cos
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2; // Ranges 0 to 1
    let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2; // Ranges 0 to 1 (use cos for different phase)

    // Map these factors to the movement bounds
    targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX);
    targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY);
}


// --- Visual Elements Drawing Functions ---

function applyGlow(glowColor, intensity) {
    // Reverted intensity adjustment
    if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; }
}
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }

function drawGround() {
    push();
    // *** CHANGE: Removed the ground line drawing ***
    // strokeWeight(3);
    // stroke(clrGround);
    // applyGlow(clrGroundGlow, 15);
    // line(0, groundLevelY, width, groundLevelY); // This line is now removed
    // removeGlow();

    // Draw the animated geometric shapes below the (now invisible) ground line
    noFill();
    strokeWeight(1.5);
    stroke(clrGeoShapes); // Pink shapes
    applyGlow(clrGeoShapesGlow, 10); // Pink glow

    for (let i = 0; i < geometricShapes.length; i++) {
        let shape = geometricShapes[i];
        // Keep animation
        shape.angle += 0.01;
        shape.x += sin(frameCount * 0.03 + i * 0.6) * 0.3;
        shape.y += cos(frameCount * 0.02 + i * 0.8) * 0.2;
        // Use groundLevelY for constraint
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


function generateGeometricPatterns() {
    geometricShapes = [];
    let patternAreaHeight = height - groundLevelY; // Calculate height below the conceptual line
    for (let i = 0; i < NUM_GEO_SHAPES; i++) {
        let shape = {
            x: random(width),
            // Position shapes relative to groundLevelY
            y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8),
            w: random(20, 150),
            h: random(10, 80),
            angle: random(TWO_PI)
        };
        geometricShapes.push(shape);
    }
}

function updateAndDrawParticles() {
    // Side Particles (Yellow)
    if (frameCount % 2 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle();
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5;
        if (p.lifespan <= 0) sideParticles.splice(i, 1);
        else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 255); // Original alpha
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 8); // Original glow
            // Use original side particle color
            fill(red(clrSideParticle), green(clrSideParticle), blue(clrSideParticle), alpha);
            applyGlow(clrSideParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
        }
    }
    // Ground Particles (Cyan dots below invisible line)
    if (frameCount % 4 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle();
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1;
        if (p.lifespan <= 0) groundParticles.splice(i, 1);
        else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 150); // Original alpha
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 10); // Original glow
            // Use original ground glow color
            let baseColor = color(clrGroundGlow);
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha);
            applyGlow(clrGroundGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
        }
    }
}

function spawnSideParticle() {
    // Reverted particle parameters
    let edgeMargin = width * 0.08;
    let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width);
    let yPos = random(height * 0.2, height * 1.1);
    let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.3, 0.3), random(-0.8, -1.8)), initialLifespan: random(100, 250), lifespan: 0, size: random(2, 5), };
    particle.lifespan = particle.initialLifespan; sideParticles.push(particle);
}
function spawnGroundParticle() {
    // Spawn relative to groundLevelY
    let xPos = random(width); let yPos = random(groundLevelY + 10, height - 10);
    let particle = { pos: createVector(xPos, yPos), vel: createVector(random(-0.4, 0.4), random(-0.2, 0.2)), initialLifespan: random(80, 180), lifespan: 0, size: random(3, 6), };
    particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}

function drawPole() {
    push();
    // Use taller poleHeight
    let poleTopY = pole.y - pole.poleHeight;
    strokeWeight(pole.thickness);
    stroke(clrPoleBase); // Original color
    line(pole.x, pole.y, pole.x, poleTopY);

    // Anchor point visual
    let anchorX = pole.x;
    let anchorY = poleTopY + pole.anchorYOffset;
    fill(clrPoleAccent); // Original anchor color
    applyGlow(clrBallGlow, defaultGlow * 0.8); // Use ball glow slightly reduced
    noStroke();
    ellipse(anchorX, anchorY, pole.thickness * 1.8, pole.thickness * 1.8);
    removeGlow();
    pop();
}

function drawTargetBox() {
    // Uses targetBox.x and targetBox.y updated by updateTargetPosition()
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2;
    let scaleFactor = map(pulse, 0, 1, 1.0, 1.05); // Original pulse
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity); // Original intensity
    let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2;
    let scaledW = targetBox.w * scaleFactor; let scaledH = targetBox.h * scaleFactor;
    push();
    applyGlow(clrTargetGlow, glowAmount); // Original color/glow
    fill(clrTarget); // Original color
    noStroke();
    rect(centerX - scaledW / 2, centerY - scaledH / 2, scaledW, scaledH, 5);
    removeGlow();
    pop();
}

function drawBall() {
    push();
    applyGlow(clrBallGlow, defaultGlow); // Original glow
    fill(clrBall); // Original color
    noStroke();
    // Use updated radius
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2);
    pop();
}

function drawElastic() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset; // Uses taller pole
    let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY));
    let currentStretch = stretchVector.mag();
    if (currentStretch < 2 && !ball.isHeld) return;

    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1);
    let glowAmount = 5 + stretchRatio * elasticGlowIntensity; // Original glow
    let thickness = map(stretchRatio, 0, 1, 2, 5);
    push();
    applyGlow(clrElasticGlow, glowAmount); // Original color/glow
    stroke(clrElasticBase); // Original color
    strokeWeight(thickness);
    line(anchorX, anchorY, ball.pos.x, ball.pos.y);
    pop();
}

function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`;
    let txtX = 30; let txtY = 40;
    let glowAmount = 5 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 3; // Original glow
    push();
    textSize(26);
    // *** REVERTED: Use default font ***
    textFont('monospace'); // Original font
    textAlign(LEFT, CENTER);
    applyGlow(clrTextGlow, glowAmount); // Original color/glow
    fill(clrTextGlow);
    text(scoreText, txtX+1, txtY+1);
    removeGlow();
    fill(clrText); // Original color
    text(scoreText, txtX, txtY);
    pop();
}

function showGameOver() {
    let overlayAlpha = 160; // Original alpha
    push();
    fill(100, 0, 20, overlayAlpha); // Original overlay color
    noStroke();
    rect(0, 0, width, height);

    let mainTxtSize = 60; let subTxtSize = 28;
    let textY = height / 2; let lineSpacing = 50;
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2;
    let glowAmount = 15 + pulse * 10; // Original glow

    // *** REVERTED: Use default font ***
    textFont('monospace'); // Original font
    textAlign(CENTER, CENTER);

    // Game Over Text
    applyGlow(clrTextGlow, glowAmount); // Original color/glow
    fill(clrText); // Original color
    textSize(mainTxtSize);
    text('GAME OVER', width / 2, textY - lineSpacing);
    removeGlow();

    // Score Text
    // Use a different color/glow for emphasis if desired, e.g., red
    applyGlow('#FF5555', 10);
    fill(clrText); // Original color
    textSize(subTxtSize);
    text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    removeGlow(); // Remove red glow if applied

    // Restart Text
    fill(clrText); // Original color
    textSize(subTxtSize * 0.9);
    text('Click to Restart', width / 2, textY + lineSpacing * 1.5);
    pop();
}

function drawGlowingBorder() {
    // (Function remains the same - uses reverted border colors)
    push();
    let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity;
    let offset = borderStrokeWeight / 2;
    noFill();
    stroke(clrBorderGlow); // Cyan border
    strokeWeight(borderStrokeWeight);
    applyGlow(clrBorderGlow, currentGlow); // Cyan glow
    rect(offset, offset, width - borderStrokeWeight, height - borderStrokeWeight);
    removeGlow();
    pop();
}

// --- Game Mechanics & Physics ---

function aimingLogic() {
   let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset; // Uses taller pole
   if (ball.isHeld) {
     let desiredPos = createVector(mouseX, mouseY); let displacement = p5.Vector.sub(desiredPos, createVector(anchorX, anchorY)); let distance = displacement.mag();
     if (distance > maxStretch) { displacement.setMag(maxStretch); ball.pos = p5.Vector.add(createVector(anchorX, anchorY), displacement); }
     else { ball.pos.set(mouseX, mouseY); }
   } else { ball.pos.set(anchorX, anchorY); }
}

function physicsUpdate() {
  // (Physics update remains the same)
  if (gameState !== 'launched') return;
  ball.acc.add(gravity);
  ball.vel.add(ball.acc);
  ball.vel.mult(friction);
  ball.pos.add(ball.vel);
  ball.acc.mult(0);
}

function checkCollisions() {
    if (gameState !== 'launched') return;

    // 1. Check for target hit
    // Uses targetBox.x/y which are updated by updateTargetPosition()
    if (didBallHitBox()) {
      console.log("Target Hit!");
      currentLevel++;
      setupLevel(); // Resets target position and bounds
      return;
    }

    // 2. Check for border collisions (Game Over condition)
    // Uses larger ball.radius
    let hitBorder = false;
    if (ball.pos.x - ball.radius <= 0) { hitBorder = true; console.log("Hit left border!"); }
    else if (ball.pos.x + ball.radius >= width) { hitBorder = true; console.log("Hit right border!"); }
    else if (ball.pos.y - ball.radius <= 0) { hitBorder = true; console.log("Hit top border!"); }
    else if (ball.pos.y + ball.radius >= height) { hitBorder = true; console.log("Hit bottom border!"); }

    if (hitBorder) {
        gameState = 'gameOver';
        // Optional: Stop ball movement on game over
        // ball.vel.mult(0);
        return;
    }

    // 3. Ground line collision is still disabled (line visually removed too)
}

function didBallHitBox() {
  // Uses targetBox.x/y updated by updateTargetPosition() and larger ball.radius
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w);
  let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h);
  // Use larger ball.radius in check
  let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2);
  return dSq < pow(ball.radius, 2);
}

// --- Input Event Handlers ---
function mousePressed() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset; // Uses taller pole
    if (gameState === 'aiming') {
      let d = dist(mouseX, mouseY, anchorX, anchorY);
      // Keep grab radius relative to ball size
      if (d < ball.radius * 3.0) { // Adjusted multiplier slightly for bigger ball
        ball.isHeld = true;
        aimingLogic();
      }
    } else if (gameState === 'gameOver') {
      currentLevel = 0;
      setupLevel();
    }
}

function mouseDragged() {
  if (gameState === 'aiming' && ball.isHeld) {
    aimingLogic();
  }
}

function mouseReleased() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset; // Uses taller pole
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false;
        gameState = 'launched';
        let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);
        // Keep launch multiplier, effect changes due to different anchor height
        let launchMultiplier = 0.15;
        ball.vel = launchVector.mult(elasticForce * launchMultiplier);
        ball.acc.mult(0);
        console.log(`Launched: V(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
}
// --- End ---
