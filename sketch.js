// Game Globals
let ball;
let pole;
let targetBox;
let gravity;
let friction;
let elasticForce = 0.4; // Base elastic strength
let maxStretch = 160;    // Max distance ball can be pulled

let gameState = 'aiming'; // aiming, launched, gameOver
let currentLevel = 0;

// --- Visual Style & Animation ---
// "MILLECTABLES" Color Palette
let clrBackground = '#F5EFE4';     // Beige/Cream background
let clrText = '#8DA1AD';           // Greyish-Blue text
let clrTextGlow = '#0B3D42';       // Dark Teal for text glow/accent
let clrMainAccent = '#0B3D42';     // Dark Teal (Ball, Target, Border stroke, Elastic)
let clrSecondaryAccent = '#8DA1AD'; // Greyish-Blue (Shapes, Pole, Main Glow Color)
let clrSubtleGlow = '#A8BAC4';     // Lighter Greyish-Blue (Particle/Shape glows)

// --- Map palette to game elements ---
let clrBall = clrMainAccent;
let clrBallGlow = clrSecondaryAccent;
let clrPoleBase = clrSecondaryAccent;
let clrPoleAccent = '#C0CED7'; // Anchor point
let clrGeoShapes = clrSecondaryAccent; // Shapes below line
let clrGeoShapesGlow = clrSubtleGlow;
let clrGroundParticleGlow = clrSubtleGlow; // Dots below line
let clrElasticBase = clrMainAccent;
let clrElasticGlow = clrSecondaryAccent;
let clrTarget = clrMainAccent;
let clrTargetGlow = clrSecondaryAccent;
let clrSideParticle = clrSecondaryAccent; // Side dust particles
let clrSideParticleGlow = clrSubtleGlow;
let clrBorderGlow = clrMainAccent; // Border glow uses main accent

// Animation & Element Parameters
let pulseSpeed = 0.05;
let defaultGlow = 20;          // Base glow intensity (increased)
let targetPulseIntensity = 8;  // Added glow for target pulse (increased)
let elasticGlowIntensity = 12; // Glow when stretching elastic
let groundLevelY;             // Y-coordinate for pole base, calculated dynamically
const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80;
const MAX_SIDE_PARTICLES = 100;

// Border parameters
let borderStrokeWeight = 2.5;
let borderBaseGlow = 8;
let borderPulseIntensity = 10;
let borderPulseSpeedFactor = 0.7;

// Arrays for shapes and particles
let geometricShapes = [];
let groundParticles = [];
let sideParticles = [];

// Target Movement Parameters
let targetMoveBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let targetMoveSpeedX = 0.015; // How fast target moves horizontally
let targetMoveSpeedY = 0.011; // How fast target moves vertically

// Target aspect ratio for canvas scaling
const TARGET_ASPECT_RATIO = 1280 / 720; // 16:9

// Font
let gameFont = 'Georgia'; // Serif font similar to image

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  let canvasSize = calculateCanvasSize();
  let canvas = createCanvas(canvasSize.w, canvasSize.h);
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  console.log(`Canvas created (dynamic): ${width}x${height}`);

  // *** CORRECTED ORDER: Initialize objects BEFORE using their properties ***
  gravity = createVector(0, 0.6);
  friction = 0.988;

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

  // Now call setDynamicSizes AFTER objects with needed properties exist
  setDynamicSizes(); // Set groundLevelY and target bounds

  // Run level setup AFTER canvas/objects/dynamic sizes are ready
  setupLevel();
  console.log("Setup finished.");
}

// Calculates optimal canvas size based on window and aspect ratio
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

// Sets/updates variables dependent on canvas size
function setDynamicSizes() {
    groundLevelY = height * 0.85; // Position based on current height

    // Define target movement bounds based on current width/height
    // This calculation now safely uses pole.poleHeight and targetBox.h
    targetMoveBounds.minX = width * 0.35;
    targetMoveBounds.maxX = width * 0.9 - targetBox.w;
    targetMoveBounds.minY = height * 0.1;
    targetMoveBounds.maxY = min(height * 0.6, groundLevelY - pole.poleHeight - targetBox.h - 20);

    // Add a check for validity just in case min > max after calculation
    if (targetMoveBounds.maxY < targetMoveBounds.minY) {
        console.warn("Calculated target maxY is less than minY. Adjusting bounds.");
        // Simple fix: swap them or set maxY equal to minY
        targetMoveBounds.maxY = targetMoveBounds.minY;
    }
     if (targetMoveBounds.maxX < targetMoveBounds.minX) {
        console.warn("Calculated target maxX is less than minX. Adjusting bounds.");
        targetMoveBounds.maxX = targetMoveBounds.minX;
    }


    console.log(`Dynamic sizes set: groundY=${groundLevelY.toFixed(0)}, TargetBounds=(${targetMoveBounds.minX.toFixed(0)}, ${targetMoveBounds.minY.toFixed(0)}) to (${targetMoveBounds.maxX.toFixed(0)}, ${targetMoveBounds.maxY.toFixed(0)})`);
}


// p5 function called automatically when window is resized
function windowResized() {
  console.log("Window resized!");
  let canvasSize = calculateCanvasSize();
  resizeCanvas(canvasSize.w, canvasSize.h);
  console.log(`Canvas resized to: ${width}x${height}`);
  setDynamicSizes(); // Recalculate bounds based on new size
  setupLevel(); // Reset level elements for new size
}

// Sets up elements for a new level or restart
function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming';
  ball.isHeld = false;

  // Position pole based on current dimensions
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = groundLevelY; // Base of pole sits on calculated ground level

  // Calculate initial target position within safe bounds
  let minTargetX = pole.x + width * 0.2;
  let maxTargetX = width - targetBox.w - width * 0.1;
  if (minTargetX > maxTargetX) {
      minTargetX = width * 0.5;
      maxTargetX = width - targetBox.w - width * 0.05;
  }
  // Ensure target initial Y is within calculated vertical bounds
  let minYTarget = height * 0.15;
  let maxYTarget = groundLevelY - pole.poleHeight - targetBox.h - height * 0.1;
   if (maxYTarget < minYTarget) { // Ensure valid range for random()
        maxYTarget = minYTarget + 1; // Prevent error if calculated max < min
        console.warn("Adjusted initial target Y range as max < min");
   }
  targetBox.initialX = random(minTargetX, maxTargetX);
  targetBox.initialY = random(minYTarget, maxYTarget);


  // Set current position for movement start
  targetBox.x = targetBox.initialX;
  targetBox.y = targetBox.initialY;

  // Place ball at the anchor point on the pole
  let anchorX = pole.x;
  let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0); // Reset velocity
  ball.acc = createVector(0, 0); // Reset acceleration

  // Generate decorative shapes
  generateGeometricPatterns();
  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target Initial(${targetBox.initialX.toFixed(0)}, ${targetBox.initialY.toFixed(0)})`);
}

// Main draw loop, runs continuously
function draw() {
   // *** Optional: Keep diagnostic from previous step if needed ***
   /*
   if(frameCount < 5){
       console.log(`Draw frame: ${frameCount}, Width: ${width}, Height: ${height}`);
       fill(255, 0, 0); noStroke(); ellipse(width / 2, height / 2, 50, 50);
   }
   */

  // Safety check for objects (important!)
  if (!ball || !pole || !targetBox) {
       if(frameCount < 10) console.log("Objects not ready, returning from draw(). Frame:", frameCount);
       return;
  }

  background(clrBackground); // Clear canvas

  // Update target position if game is active
  if (gameState !== 'gameOver') {
      updateTargetPosition();
  }

  // --- Draw Background Elements ---
  drawGround();
  updateAndDrawParticles();

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
    checkCollisions();
    drawBall();
  } else if (gameState === 'gameOver') {
    drawBall(); // Show final position
    showGameOver(); // Display game over screen
  }

  // --- Draw UI Elements ---
  displayScore();

  // --- Draw the animated glowing border ---
  drawGlowingBorder();
}

// Updates the target's position smoothly
function updateTargetPosition() {
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2;
    let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2;

    // Use bounds calculated in setDynamicSizes
    // Check validity again in case of issues
    if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) {
        targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX);
        targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY);
    } else {
        // Fallback if bounds are invalid
        targetBox.x = targetBox.initialX;
        targetBox.y = targetBox.initialY;
         if(frameCount % 60 === 0) console.warn("Using fallback target position due to invalid bounds."); // Log occasionally
    }
}


// --- Visual Elements Drawing Functions ---

function applyGlow(glowColor, intensity) {
    if(drawingContext) {
        drawingContext.shadowBlur = intensity;
        drawingContext.shadowColor = glowColor;
    }
}
function removeGlow() {
    if(drawingContext) {
        drawingContext.shadowBlur = 0;
    }
}

function drawGround() {
    push();
    noFill();
    strokeWeight(1.5);
    stroke(clrGeoShapes);
    applyGlow(clrGeoShapesGlow, 8);
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

function generateGeometricPatterns() {
    geometricShapes = [];
    let patternAreaHeight = height - groundLevelY;
    if (patternAreaHeight <= 0) { // Avoid issues if height/groundLevelY are weird
        console.warn("Pattern area height invalid in generateGeometricPatterns.");
        return;
    }
    for (let i = 0; i < NUM_GEO_SHAPES; i++) {
        let shape = {
            x: random(width),
            y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8),
            w: random(20, 150), h: random(10, 80), angle: random(TWO_PI)
        };
        geometricShapes.push(shape);
    }
}

function updateAndDrawParticles() {
    // Side Particles
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) {
        spawnSideParticle();
    }
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i];
        p.pos.add(p.vel);
        p.lifespan -= 1.5;
        if (p.lifespan <= 0) {
            sideParticles.splice(i, 1);
        } else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200);
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6);
            let baseColor = color(clrSideParticle);
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha);
            applyGlow(clrSideParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow();
            pop();
        }
    }

    // Ground Particles
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) {
        spawnGroundParticle();
    }
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i];
        p.pos.add(p.vel);
        p.lifespan -= 1;
        if (p.lifespan <= 0) {
            groundParticles.splice(i, 1);
        } else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120);
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7);
            let baseColor = color(clrGroundParticleGlow);
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha);
            applyGlow(clrGroundParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow();
            pop();
        }
    }
}


function spawnSideParticle() {
    let edgeMargin = width * 0.08;
    let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width);
    let yPos = random(height * 0.2, height * 1.1);
    let particle = {
        pos: createVector(xPos, yPos),
        vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)),
        initialLifespan: random(120, 280), lifespan: 0, size: random(1.5, 4),
    };
    particle.lifespan = particle.initialLifespan;
    sideParticles.push(particle);
}

function spawnGroundParticle() {
    // Ensure groundLevelY and height are valid before spawning
     if (typeof groundLevelY !== 'number' || typeof height !== 'number' || groundLevelY >= height) {
         console.warn("Invalid dimensions for spawnGroundParticle");
         return;
     }
    let xPos = random(width);
    let yPos = random(groundLevelY + 5, height - 5);
    let particle = {
        pos: createVector(xPos, yPos),
        vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)),
        initialLifespan: random(100, 200), lifespan: 0, size: random(2, 5),
    };
    particle.lifespan = particle.initialLifespan;
    groundParticles.push(particle);
}

function drawPole() {
    push();
    let poleTopY = pole.y - pole.poleHeight;
    strokeWeight(pole.thickness);
    stroke(clrPoleBase);
    line(pole.x, pole.y, pole.x, poleTopY);
    let anchorX = pole.x;
    let anchorY = poleTopY + pole.anchorYOffset;
    fill(clrPoleAccent);
    applyGlow(clrSubtleGlow, 5);
    noStroke();
    ellipse(anchorX, anchorY, pole.thickness * 1.8, pole.thickness * 1.8);
    removeGlow();
    pop();
}

function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2;
    let scaleFactor = map(pulse, 0, 1, 1.0, 1.03);
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    let centerX = targetBox.x + targetBox.w / 2;
    let centerY = targetBox.y + targetBox.h / 2;
    let scaledW = targetBox.w * scaleFactor;
    let scaledH = targetBox.h * scaleFactor;
    push();
    applyGlow(clrTargetGlow, glowAmount);
    fill(clrTarget);
    noStroke();
    rectMode(CENTER);
    rect(centerX, centerY, scaledW, scaledH, 5);
    removeGlow();
    pop();
}

function drawBall() {
    push();
    applyGlow(clrBallGlow, defaultGlow);
    fill(clrBall);
    noStroke();
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2);
    pop();
}

function drawElastic() {
    let anchorX = pole.x;
    let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY));
    let currentStretch = stretchVector.mag();
    if (currentStretch < 2 && !ball.isHeld) return;
    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1);
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity;
    let thickness = map(stretchRatio, 0, 1, 2, 5);
    push();
    applyGlow(clrElasticGlow, glowAmount);
    stroke(clrElasticBase);
    strokeWeight(thickness);
    line(anchorX, anchorY, ball.pos.x, ball.pos.y);
    pop();
}

function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`;
    let txtX = width * 0.03;
    let txtY = height * 0.07;
    let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2;
    push();
    let baseSize = 26;
    let scaledSize = baseSize * (width / 1280);
    textSize(max(14, scaledSize));
    textFont(gameFont);
    textAlign(LEFT, TOP);
    applyGlow(clrTextGlow, glowAmount);
    fill(clrTextGlow);
    text(scoreText, txtX + 1, txtY + 1);
    removeGlow();
    fill(clrText);
    text(scoreText, txtX, txtY);
    pop();
}

function showGameOver() {
    let overlayAlpha = 180;
    push();
    let overlayColor = color(clrBackground);
    overlayColor.setAlpha(overlayAlpha);
    fill(overlayColor);
    noStroke();
    rect(0, 0, width, height);
    let mainTxtSize = max(30, 60 * (width/1280));
    let subTxtSize = max(16, 28 * (width/1280));
    let textY = height / 2;
    let lineSpacing = max(30, 50 * (height/720));
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2;
    let glowAmount = 8 + pulse * 6;
    textFont(gameFont);
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
    removeGlow();
    fill(clrText);
    textSize(subTxtSize * 0.9);
    text('Click to Restart', width / 2, textY + lineSpacing * 1.5);
    pop();
}

function drawGlowingBorder() {
    push();
    let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity;
    let offset = borderStrokeWeight / 2;
    noFill();
    stroke(clrMainAccent);
    strokeWeight(borderStrokeWeight);
    applyGlow(clrBorderGlow, currentGlow);
    rect(offset, offset, width - borderStrokeWeight, height - borderStrokeWeight);
    removeGlow();
    pop();
}

// --- Game Mechanics & Physics ---

function aimingLogic() {
   let anchorX = pole.x;
   let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
   let anchorPos = createVector(anchorX, anchorY);
   if (ball.isHeld) {
     let currentInputPos = createVector(mouseX, mouseY);
     let displacement = p5.Vector.sub(currentInputPos, anchorPos);
     let distance = displacement.mag();
     if (distance > maxStretch) {
       displacement.setMag(maxStretch);
       ball.pos = p5.Vector.add(anchorPos, displacement);
     } else {
       ball.pos.set(currentInputPos.x, currentInputPos.y);
     }
   } else {
     ball.pos.set(anchorX, anchorY);
   }
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

// --- Input Event Handlers ---

function mousePressed() {
    if (gameState === 'aiming') {
      let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
      let d = dist(mouseX, mouseY, anchorX, anchorY);
      if (d < ball.radius * 3.0) { ball.isHeld = true; aimingLogic(); }
    } else if (gameState === 'gameOver') {
      currentLevel = 0; setupLevel();
    }
    return false; // Prevent default
}

function mouseDragged() {
  if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); }
  return false; // Prevent default
}

function mouseReleased() {
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched';
        let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
        let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);
        let launchMultiplier = 0.35; // Keep increased speed
        ball.vel = launchVector.mult(elasticForce * launchMultiplier);
        ball.acc.mult(0);
        console.log(`Launched: Multiplier=${launchMultiplier}, V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
    return false; // Prevent default
}

// --- End ---
