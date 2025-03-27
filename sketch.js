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
let clrBall = '#00ffff'; // Cyan ball
let clrBallGlow = '#00ffff';
let clrPoleBase = '#aaaaaa';
let clrPoleAccent = '#dddddd';
let clrGround = '#00ced1'; // Main ground line color (Cyan/Turquoise)
let clrGroundGlow = '#00ffff';
let clrElasticBase = '#4d4dff';
let clrElasticGlow = '#8080ff';
let clrTarget = '#ffd700'; // Yellow target
let clrTargetGlow = '#ffd700';
let clrText = '#f0f0f0';
let clrTextGlow = '#a0a0f0';
let clrSideParticle = '#ffcc00'; // Yellow side particles
let clrSideParticleGlow = '#ffd700';
let clrBorderGlow = '#00ffff'; // Cyan border glow

// *** NEW/MODIFIED: Geometric Shape Colors (Changed as requested) ***
let clrGeoShapes = '#FF69B4'; // Hot Pink for shapes below ground
let clrGeoShapesGlow = '#FFC0CB'; // Pink glow for shapes below ground

// Animation & Element Parameters
let pulseSpeed = 0.05;
let targetPulseIntensity = 5;
let elasticGlowIntensity = 15;
let defaultGlow = 15;
let groundLevelY;
const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 100; // These are the small dots *under* ground line
const MAX_SIDE_PARTICLES = 150;  // These are the yellow dots at the sides

// Border parameters
let borderStrokeWeight = 2.5;
let borderBaseGlow = 8;
let borderPulseIntensity = 12;
let borderPulseSpeedFactor = 0.7;

// Arrays for shapes and particles
let geometricShapes = []; // The rectangles below the ground line
let groundParticles = []; // The small dot particles below ground line
let sideParticles = [];   // The yellow particles near screen edges

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  createCanvas(1280, 720);
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
  generateGeometricPatterns(); // Regenerate shapes for new level
  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target(${targetBox.x.toFixed(0)}, ${targetBox.y.toFixed(0)})`);
}

// Main draw loop
function draw() {
    if (!ball || !pole || !targetBox) return;

  background(clrBackground);

  // --- Draw Background Elements ---
  drawGround(); // Draws ground line AND animated shapes below it
  updateAndDrawParticles(); // Handles ground dots and side particles

  // --- Draw Game Elements ---
  drawPole();
  drawTargetBox();

  // --- Game State Logic & Dynamic Drawing ---
  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic();
    drawBall();
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions(); // Updated: No ground collision check
    drawBall();
  } else if (gameState === 'gameOver') {
    drawBall();
    showGameOver();
  }

  // --- Draw UI Elements ---
  displayScore();

  // --- Draw the animated glowing border ---
  drawGlowingBorder();
}


// --- Visual Elements Drawing Functions ---

function applyGlow(glowColor, intensity) {
    if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; }
}
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }

function drawGround() {
    push();
    // Draw the main ground line (still cyan/turquoise)
    strokeWeight(3);
    stroke(clrGround);
    applyGlow(clrGroundGlow, 15);
    line(0, groundLevelY, width, groundLevelY);
    removeGlow();

    // Draw the animated geometric shapes below the ground line
    noFill();
    strokeWeight(1.5);
    // *** CHANGE: Use new shape color (Hot Pink) ***
    stroke(clrGeoShapes);
    // *** CHANGE: Use new shape glow color (Pink) ***
    applyGlow(clrGeoShapesGlow, 10);

    for (let i = 0; i < geometricShapes.length; i++) {
        let shape = geometricShapes[i];

        // *** NEW/MODIFIED: Animate shape properties more ***
        shape.angle += 0.01; // Increased rotation speed

        // Increased drift amplitude and slightly adjusted speeds
        shape.x += sin(frameCount * 0.03 + i * 0.6) * 0.3;
        shape.y += cos(frameCount * 0.02 + i * 0.8) * 0.2;

        // Keep shapes roughly within their initial vertical band below ground
        shape.y = constrain(shape.y, groundLevelY + 10, height - 20);

        // Wrap shapes horizontally
        if (shape.x > width + shape.w) shape.x = -shape.w;
        if (shape.x < -shape.w) shape.x = width + shape.w;

        // Draw the shape
        push();
        translate(shape.x, shape.y);
        rotate(shape.angle);
        rectMode(CENTER);
        rect(0, 0, shape.w, shape.h);
        pop();
    }
    removeGlow(); // Remove glow after drawing all shapes
    pop();
}


function generateGeometricPatterns() {
    geometricShapes = [];
    let patternAreaHeight = height - groundLevelY;
    for (let i = 0; i < NUM_GEO_SHAPES; i++) {
        let shape = {
            x: random(width),
            y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8),
            w: random(20, 150),
            h: random(10, 80),
            angle: random(TWO_PI)
        };
        geometricShapes.push(shape);
    }
}

function updateAndDrawParticles() {
    // Side Particles (Yellow, near edges)
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
    // Ground Particles (Cyan/Turquoise dots below ground line)
    // NOTE: These are *different* from the geometric shapes.
    if (frameCount % 4 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle();
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1;
        if (p.lifespan <= 0) groundParticles.splice(i, 1);
        else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 150);
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 10);
            // Uses the ground line's glow color
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
    let overlayAlpha = 160;
    push();
    fill(100, 0, 20, overlayAlpha); noStroke(); rect(0, 0, width, height);
    let mainTxtSize = 60; let subTxtSize = 28; let textY = height / 2; let lineSpacing = 50;
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2; let glowAmount = 15 + pulse * 10;
    textFont('monospace'); textAlign(CENTER, CENTER); applyGlow(clrTextGlow, glowAmount); fill(clrText); textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing); removeGlow();
    applyGlow('#FF5555', 10); fill(clrText); textSize(subTxtSize); text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5);
    pop();
}

function drawGlowingBorder() {
    push();
    let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity;
    let offset = borderStrokeWeight / 2;

    noFill();
    stroke(clrBorderGlow);
    strokeWeight(borderStrokeWeight);
    applyGlow(clrBorderGlow, currentGlow);

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

    // Check for target hit
    if (didBallHitBox()) {
      console.log("Target Hit!");
      currentLevel++;
      setupLevel();
      return; // Exit collision check early if target is hit
    }

    // *** CHANGE: Ground collision check COMPLETELY COMMENTED OUT ***
    // The ball will now pass through the ground line without any effect.
    /*
    if (ball.pos.y + ball.radius >= groundLevelY) {
        console.log("Hit ground!");
        gameState = 'gameOver';
        // Bounce effect (optional, but game over is disabled)
        // ball.vel.y *= -0.5;
        // ball.vel.x *= 0.8;
        // ball.pos.y = groundLevelY - ball.radius;
    }
    */

    // Check for off-screen (left, right, top)
    // Ball falling off the *bottom* will NOT trigger game over with current logic.
    if (ball.pos.x + ball.radius < 0 || ball.pos.x - ball.radius > width || ball.pos.y + ball.radius < 0) {
        console.log("Off screen!");
        gameState = 'gameOver';
    }
}

function didBallHitBox() {
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w);
  let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h);
  let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2);
  return dSq < pow(ball.radius, 2);
}

// --- Input Event Handlers ---
function mousePressed() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming') {
      let d = dist(mouseX, mouseY, anchorX, anchorY);
      // Increase click radius slightly for easier grabbing
      if (d < ball.radius * 3.5) {
        ball.isHeld = true;
        aimingLogic(); // Snap ball to mouse immediately
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
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false;
        gameState = 'launched';
        let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);
        // Adjust force multiplier if needed
        ball.vel = launchVector.mult(elasticForce * 0.15); // Example adjustment
        ball.acc.mult(0); // Reset acceleration
        console.log(`Launched: V(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
}
// --- End ---
