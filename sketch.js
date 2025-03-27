// Game Globals
let ball;
let pole;
let targetBox;
let gravity;
let friction;
let elasticForce = 0.4; // Keep original force, adjust launch multiplier if needed
let maxStretch = 160;

let gameState = 'aiming';
let currentLevel = 0;

// --- Visual Style & Animation ---
// *** NEW: Color Palette based on "MILLECTABLES" image ***
let clrBackground = '#F5EFE4';     // Beige/Cream background
let clrText = '#8DA1AD';           // Greyish-Blue text
let clrTextGlow = '#0B3D42';       // Dark Teal for text glow/accent
let clrMainAccent = '#0B3D42';     // Dark Teal (for ground line, border, ball, etc.)
let clrSecondaryAccent = '#8DA1AD'; // Greyish-Blue (for glows, secondary elements)
let clrSubtleGlow = '#A8BAC4';     // Lighter Greyish-Blue for subtle glows

// --- Map new palette to game elements ---
// Background is clrBackground
// Ball
let clrBall = clrMainAccent;        // Dark Teal Ball
let clrBallGlow = clrSecondaryAccent; // Greyish-Blue Glow
// Pole
let clrPoleBase = clrSecondaryAccent; // Greyish-Blue Pole
let clrPoleAccent = '#C0CED7';        // Lighter Greyish-Blue accent for pole anchor maybe
// Ground Line (Visual only)
let clrGround = clrMainAccent;        // Dark Teal Line
let clrGroundGlow = clrSecondaryAccent; // Greyish-Blue Glow
// Geometric Shapes (Below ground line)
let clrGeoShapes = clrSecondaryAccent; // Greyish-Blue Shapes
let clrGeoShapesGlow = clrSubtleGlow;  // Lighter Grey-Blue Glow
// Elastic Band
let clrElasticBase = clrMainAccent;   // Dark Teal Band
let clrElasticGlow = clrSecondaryAccent; // Greyish-Blue Glow
// Target Box
let clrTarget = clrMainAccent;        // Dark Teal Target
let clrTargetGlow = clrSecondaryAccent; // Greyish-Blue Glow
// Particles
let clrSideParticle = clrSecondaryAccent; // Greyish-Blue Side Particles
let clrSideParticleGlow = clrSubtleGlow;  // Lighter Grey-Blue Glow
let clrGroundParticleGlow = clrSubtleGlow; // Lighter Grey-Blue dots below ground
// Border
let clrBorderGlow = clrMainAccent;    // Dark Teal Border Glow
// Text is clrText and clrTextGlow defined above

// Animation & Element Parameters
let pulseSpeed = 0.05;
let targetPulseIntensity = 3; // Reduced intensity for softer look
let elasticGlowIntensity = 10; // Reduced
let defaultGlow = 8;        // Reduced base glow
let groundLevelY;
const NUM_GEO_SHAPES = 30;
const MAX_GROUND_PARTICLES = 80; // Reduced density slightly
const MAX_SIDE_PARTICLES = 100; // Reduced density slightly

// Border parameters
let borderStrokeWeight = 2.5;
let borderBaseGlow = 5;     // Reduced
let borderPulseIntensity = 8; // Reduced
let borderPulseSpeedFactor = 0.7;

// Arrays for shapes and particles
let geometricShapes = [];
let groundParticles = [];
let sideParticles = [];

// *** NEW: Font Variable ***
let gameFont = 'Georgia'; // Font similar to the image (serif)

// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  createCanvas(1280, 720);
  console.log(`Canvas created (fixed): ${width}x${height}`);

  gravity = createVector(0, 0.6);
  // Slightly increased friction might feel better with new palette
  friction = 0.988;
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
  // (SetupLevel function remains the same as before)
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
  generateGeometricPatterns();
  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target(${targetBox.x.toFixed(0)}, ${targetBox.y.toFixed(0)})`);
}

// Main draw loop
function draw() {
    if (!ball || !pole || !targetBox) return;

  background(clrBackground); // Use new background color

  // --- Draw Background Elements ---
  drawGround(); // Uses new colors
  updateAndDrawParticles(); // Uses new colors

  // --- Draw Game Elements ---
  drawPole(); // Uses new colors
  drawTargetBox(); // Uses new colors

  // --- Game State Logic & Dynamic Drawing ---
  if (gameState === 'aiming') {
    aimingLogic();
    if (ball.isHeld) drawElastic(); // Uses new colors
    drawBall(); // Uses new colors
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions(); // *** UPDATED COLLISION LOGIC ***
    drawBall(); // Uses new colors
  } else if (gameState === 'gameOver') {
    // Optionally draw final ball position even in game over
    drawBall(); // Uses new colors
    showGameOver(); // Uses new colors and font
  }

  // --- Draw UI Elements ---
  displayScore(); // Uses new colors and font

  // --- Draw the animated glowing border ---
  drawGlowingBorder(); // Uses new colors
}


// --- Visual Elements Drawing Functions ---

function applyGlow(glowColor, intensity) {
    // Reduce intensity globally for a softer look if desired
    let adjustedIntensity = intensity * 0.8; // Example: Reduce all glows by 20%
    if(drawingContext) { drawingContext.shadowBlur = adjustedIntensity; drawingContext.shadowColor = glowColor; }
}
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }

function drawGround() {
    push();
    // Draw the main ground line
    strokeWeight(3);
    stroke(clrGround); // Dark Teal
    applyGlow(clrGroundGlow, 12); // Greyish-Blue glow, adjusted intensity
    line(0, groundLevelY, width, groundLevelY);
    removeGlow();

    // Draw the animated geometric shapes below the ground line
    noFill();
    strokeWeight(1.5);
    stroke(clrGeoShapes); // Greyish-Blue Shapes
    applyGlow(clrGeoShapesGlow, 8); // Lighter Grey-Blue Glow, adjusted intensity

    for (let i = 0; i < geometricShapes.length; i++) {
        let shape = geometricShapes[i];
        // Keep animation subtle
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
    // (generateGeometricPatterns function remains the same)
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
    // Side Particles
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) spawnSideParticle(); // Spawn less often
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i]; p.pos.add(p.vel); p.lifespan -= 1.5;
        if (p.lifespan <= 0) sideParticles.splice(i, 1);
        else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200); // Max alpha lower
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6); // Lower glow
            // Need to parse the hex color to use with alpha
            let baseColor = color(clrSideParticle); // Greyish-Blue
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha);
            applyGlow(clrSideParticleGlow, glowAmount); // Lighter Grey-Blue glow
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
        }
    }
    // Ground Particles (Dots below line)
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) spawnGroundParticle(); // Spawn less often
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i]; p.pos.add(p.vel); p.lifespan -= 1;
        if (p.lifespan <= 0) groundParticles.splice(i, 1);
        else {
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120); // Max alpha lower
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7); // Lower glow
            let baseColor = color(clrGroundParticleGlow); // Use glow color directly
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha);
            applyGlow(clrGroundParticleGlow, glowAmount); // Self-glow
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow(); pop();
        }
    }
}

function spawnSideParticle() {
    // (spawnSideParticle function remains the same logic)
    let edgeMargin = width * 0.08;
    let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width);
    let yPos = random(height * 0.2, height * 1.1); // Can spawn slightly below screen
    let particle = {
      pos: createVector(xPos, yPos),
      vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)), // Slower overall
      initialLifespan: random(120, 280), // Longer life possible
      lifespan: 0,
      size: random(1.5, 4), // Smaller particles
    };
    particle.lifespan = particle.initialLifespan;
    sideParticles.push(particle);
}
function spawnGroundParticle() {
    // (spawnGroundParticle function remains the same logic)
    let xPos = random(width); let yPos = random(groundLevelY + 5, height - 5);
    let particle = {
        pos: createVector(xPos, yPos),
        vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)), // Slower
        initialLifespan: random(100, 200), // Adjusted lifespan
        lifespan: 0,
        size: random(2, 5), // Slightly smaller range
    };
    particle.lifespan = particle.initialLifespan; groundParticles.push(particle);
}

function drawPole() {
    push();
    let poleTopY = pole.y - pole.poleHeight;
    strokeWeight(pole.thickness);
    stroke(clrPoleBase); // Greyish-Blue
    line(pole.x, pole.y, pole.x, poleTopY);

    // Anchor point visual
    let anchorX = pole.x;
    let anchorY = poleTopY + pole.anchorYOffset;
    fill(clrPoleAccent); // Lighter Greyish-Blue
    // No glow for anchor maybe? Or use subtle glow
    applyGlow(clrSubtleGlow, 5);
    noStroke();
    ellipse(anchorX, anchorY, pole.thickness * 1.8, pole.thickness * 1.8);
    removeGlow();
    pop();
}

function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2;
    let scaleFactor = map(pulse, 0, 1, 1.0, 1.03); // Less intense pulse
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2;
    let scaledW = targetBox.w * scaleFactor; let scaledH = targetBox.h * scaleFactor;
    push();
    applyGlow(clrTargetGlow, glowAmount); // Greyish-Blue glow
    fill(clrTarget); // Dark Teal target
    noStroke();
    rect(centerX - scaledW / 2, centerY - scaledH / 2, scaledW, scaledH, 5); // Keep rounded corners
    removeGlow();
    pop();
}

function drawBall() {
    push();
    applyGlow(clrBallGlow, defaultGlow); // Greyish-Blue glow
    fill(clrBall); // Dark Teal ball
    noStroke();
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2);
    pop();
}

function drawElastic() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY));
    let currentStretch = stretchVector.mag();
    if (currentStretch < 2 && !ball.isHeld) return;

    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1);
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity; // Adjusted glow base/intensity
    let thickness = map(stretchRatio, 0, 1, 2, 5);
    push();
    applyGlow(clrElasticGlow, glowAmount); // Greyish-Blue glow
    stroke(clrElasticBase); // Dark Teal band
    strokeWeight(thickness);
    line(anchorX, anchorY, ball.pos.x, ball.pos.y);
    pop();
}

function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`;
    let txtX = 30; let txtY = 40;
    let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; // Softer glow pulse
    push();
    textSize(26);
    // *** CHANGE: Use new font ***
    textFont(gameFont);
    textAlign(LEFT, CENTER);
    // Subtle glow effect using the accent color
    applyGlow(clrTextGlow, glowAmount); // Dark Teal glow
    fill(clrTextGlow); // Draw offset text in glow color
    text(scoreText, txtX + 1, txtY + 1); // Offset slightly
    removeGlow();
    // Main text
    fill(clrText); // Greyish-Blue text
    text(scoreText, txtX, txtY);
    pop();
}

function showGameOver() {
    let overlayAlpha = 180; // Slightly more opaque overlay might look better
    push();
    // Use a tinted background color for the overlay
    let overlayColor = color(clrBackground);
    overlayColor.setAlpha(overlayAlpha);
    fill(overlayColor);
    noStroke();
    rect(0, 0, width, height);

    let mainTxtSize = 60; let subTxtSize = 28;
    let textY = height / 2; let lineSpacing = 50;
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2;
    let glowAmount = 8 + pulse * 6; // Softer glow

    // *** CHANGE: Use new font ***
    textFont(gameFont);
    textAlign(CENTER, CENTER);

    // Game Over Text
    applyGlow(clrTextGlow, glowAmount); // Dark Teal Glow
    fill(clrText); // Greyish-Blue Text
    textSize(mainTxtSize);
    text('GAME OVER', width / 2, textY - lineSpacing);
    removeGlow();

    // Score Text
    applyGlow(clrTextGlow, glowAmount * 0.6); // Less intense glow
    fill(clrText); // Greyish-Blue Text
    textSize(subTxtSize);
    text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);

    // Restart Text
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
    stroke(clrBorderGlow); // Dark Teal stroke for border
    strokeWeight(borderStrokeWeight);
    applyGlow(clrBorderGlow, currentGlow); // Dark Teal glow

    rect(offset, offset, width - borderStrokeWeight, height - borderStrokeWeight);

    removeGlow();
    pop();
}

// --- Game Mechanics & Physics ---

function aimingLogic() {
   // (Aiming logic remains the same)
   let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
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

    // 1. Check for target hit (highest priority)
    if (didBallHitBox()) {
      console.log("Target Hit!");
      currentLevel++;
      setupLevel();
      return; // Exit collision check
    }

    // 2. *** NEW: Check for border collisions ***
    let hitBorder = false;
    if (ball.pos.x - ball.radius <= 0) { // Hit left
        console.log("Hit left border!");
        hitBorder = true;
        // Optional: Snap position to border edge
        // ball.pos.x = ball.radius;
        // ball.vel.x *= -0.5; // Optional small bounce
    } else if (ball.pos.x + ball.radius >= width) { // Hit right
        console.log("Hit right border!");
        hitBorder = true;
        // ball.pos.x = width - ball.radius;
        // ball.vel.x *= -0.5;
    } else if (ball.pos.y - ball.radius <= 0) { // Hit top
        console.log("Hit top border!");
        hitBorder = true;
        // ball.pos.y = ball.radius;
        // ball.vel.y *= -0.5;
    } else if (ball.pos.y + ball.radius >= height) { // Hit bottom
        console.log("Hit bottom border!");
        hitBorder = true;
        // ball.pos.y = height - ball.radius;
        // ball.vel.y *= -0.5;
    }

    // If any border was hit, end the game
    if (hitBorder) {
        gameState = 'gameOver';
        // You might want to stop the ball completely on game over
        // ball.vel.mult(0);
        return; // Exit collision check
    }

    // 3. Ground line collision is still disabled (commented out in previous step)
    /*
    if (ball.pos.y + ball.radius >= groundLevelY) { ... }
    */

    // Note: The previous "Off screen" check is now effectively handled by the border checks.
}

function didBallHitBox() {
  // (didBallHitBox function remains the same)
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w);
  let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h);
  let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2);
  return dSq < pow(ball.radius, 2);
}

// --- Input Event Handlers ---
// (mousePressed, mouseDragged, mouseReleased remain the same as your last version)
function mousePressed() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming') {
      let d = dist(mouseX, mouseY, anchorX, anchorY);
      if (d < ball.radius * 3.5) { // Keep slightly larger grab radius
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
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false;
        gameState = 'launched';
        let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);
        // You might need to adjust this multiplier based on feel
        let launchMultiplier = 0.15; // Start with previous value, adjust if needed
        ball.vel = launchVector.mult(elasticForce * launchMultiplier);
        ball.acc.mult(0);
        console.log(`Launched: V(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
}
// --- End ---
