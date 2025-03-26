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
// Color Palette (Updated based on new image)
let clrBackground = '#1a1a2e';   // Deep cosmic navy (Seems okay)
let clrBall = '#00ffff';           // Bright Cyan (Existing)
let clrBallGlow = '#00ffff';
let clrPoleBase = '#aaaaaa';       // Lighter Gray for pole stand
let clrPoleAccent = '#dddddd';     // Even Lighter Gray accent
// Removed Pole Glow for simplicity, using Ball glow instead on top
let clrGround = '#00ced1';         // Dark Turquoise / Cyan for ground line/patterns
let clrGroundGlow = '#00ffff';     // Cyan glow for ground elements
let clrElasticBase = '#4d4dff';     // Electric Blue (Existing) - Use for elastic? Or ball color? Let's stick with blue.
let clrElasticGlow = '#8080ff';
let clrTarget = '#ffd700';         // Gold/Yellow (Existing)
let clrTargetGlow = '#ffd700';
let clrText = '#f0f0f0';           // Off-white (Existing)
let clrTextGlow = '#a0a0f0';       // Subtle lavender glow for text (Keep or change?) Let's keep.
let clrSideParticle = '#ffcc00';   // Gold/Yellow for side particles
let clrSideParticleGlow = '#ffd700';

// Animation & Element Parameters
let pulseSpeed = 0.05;
let targetPulseIntensity = 5;
let elasticGlowIntensity = 15;
let defaultGlow = 15;
let groundLevelY;                   // Y position of the ground line
const NUM_GEO_SHAPES = 30;          // How many shapes in the ground pattern
const MAX_GROUND_PARTICLES = 100;   // Max particles in ground area
const MAX_SIDE_PARTICLES = 150;     // Max particles floating up sides

// Arrays for shapes and particles
let geometricShapes = [];
let groundParticles = [];
let sideParticles = [];


// --- P5.js Core Functions ---

function setup() {
  console.log("Setup starting...");
  // Use a fixed canvas size for scaling in iFrame
  createCanvas(1280, 720); // Example: 720p resolution
  console.log(`Canvas created (fixed): ${width}x${height}`);

  gravity = createVector(0, 0.6);
  friction = 0.985;

  // Define ground level relative to fixed height
  groundLevelY = height * 0.85;

  ball = {
    pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0),
    radius: 18, isHeld: false,
  };

  pole = { // Pole object stores its properties now
    x: 0, y: 0, // Base start (set in setupLevel)
    poleHeight: 80, // Height of the visible pole stick
    anchorYOffset: -10, // Where elastic attaches relative to top of stick (above it)
    thickness: 8,
  };

  targetBox = { x: 0, y: 0, w: 60, h: 60 };

  // Initialize the first level
  setupLevel();
  console.log("Setup finished.");
}

// Sets up positions and generated elements for a new level
function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming';
  ball.isHeld = false;

  // --- Place Pole --- (Pole position is base)
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = groundLevelY; // Base of pole sits on ground line

  // --- Place Target Box --- (Ensure above ground)
  let minTargetX = pole.x + 250;
  let maxTargetX = width - targetBox.w - 70;
  if (minTargetX > maxTargetX) {
      minTargetX = width * 0.5;
      maxTargetX = width - targetBox.w - 30;
  }
  targetBox.x = random(minTargetX, maxTargetX);
  // Target Y position needs to be clearly above groundLevelY
  targetBox.y = random(height * 0.15, groundLevelY - targetBox.h - 50); // Max Y is well above ground

  // --- Place Ball --- At the pole's anchor point
  let anchorX = pole.x;
  // Y position relative to the pole base and its height
  let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0);
  ball.acc = createVector(0, 0);

  // --- Generate Ground Patterns ---
  generateGeometricPatterns();

  // Clear existing particles (optional, maybe let them fade)
  // groundParticles = [];
  // sideParticles = [];


  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target(${targetBox.x.toFixed(0)}, ${targetBox.y.toFixed(0)})`);
}

// Main draw loop
function draw() {
    if (!ball || !pole || !targetBox) return; // Safety check

  background(clrBackground);

  // --- Draw Background Elements ---
  drawGround();             // Includes line and geometric patterns
  updateAndDrawParticles(); // Handles both ground and side particles

  // --- Draw Game Elements ---
  drawPole();               // Draw the launch pole
  drawTargetBox();          // Draw the target

  // --- Game State Logic & Dynamic Drawing ---
  if (gameState === 'aiming') {
    aimingLogic();
    // Draw elastic connecting ball and anchor
    if (ball.isHeld) drawElastic();
    // Draw ball on top
    drawBall();
  } else if (gameState === 'launched') {
    physicsUpdate();
    checkCollisions();
    // Draw moving ball
    drawBall();
  } else if (gameState === 'gameOver') {
    drawBall(); // Draw ball's final position
    showGameOver();
  }

  // --- Draw UI ---
  displayScore();
}


// --- Visual Elements Drawing Functions ---

// Helper to apply glow
function applyGlow(glowColor, intensity) {
    if(drawingContext) { drawingContext.shadowBlur = intensity; drawingContext.shadowColor = glowColor; }
}
function removeGlow() { if(drawingContext) { drawingContext.shadowBlur = 0; } }

// Draws ground line and geometric pattern below it
function drawGround() {
    push();
    // Ground Line
    strokeWeight(3);
    stroke(clrGround);
    applyGlow(clrGroundGlow, 15);
    line(0, groundLevelY, width, groundLevelY);
    removeGlow();

    // Geometric Shapes (drawn from pre-generated array)
    noFill();
    strokeWeight(1.5);
    stroke(clrGround); // Use base color for lines
    applyGlow(clrGroundGlow, 10); // Apply glow to shapes

    for (const shape of geometricShapes) {
        push();
        translate(shape.x, shape.y);
        rotate(shape.angle);
        // Draw simple rectangles for geometric feel
        rect(0, 0, shape.w, shape.h);
        pop();
    }

    removeGlow();
    pop();
}

// Generates the array of geometric shapes below ground
function generateGeometricPatterns() {
    geometricShapes = []; // Clear previous shapes
    let patternAreaHeight = height - groundLevelY; // Height of the zone below ground line

    for (let i = 0; i < NUM_GEO_SHAPES; i++) {
        let shape = {
            x: random(width),
            // Ensure Y is between ground line and bottom edge
            y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.9),
            w: random(20, 150),
            h: random(10, 80),
            angle: random(TWO_PI)
        };
        geometricShapes.push(shape);
    }
}

// Update and draw all particle systems
function updateAndDrawParticles() {
    // --- Side Particles (Floating Up) ---
    // Spawn new side particles occasionally
    if (frameCount % 2 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) {
       spawnSideParticle();
    }

    // Update and draw existing side particles
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i];
        p.pos.add(p.vel);
        p.lifespan -= 1.5; // Fade rate

        if (p.lifespan <= 0) {
            sideParticles.splice(i, 1); // Remove dead particle
        } else {
            // Draw particle
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 255); // Fade out
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 8);
            fill(red(clrSideParticle), green(clrSideParticle), blue(clrSideParticle), alpha); // Use alpha
            applyGlow(clrSideParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow();
            pop();
        }
    }

    // --- Ground Particles (Drifting) ---
     // Spawn new ground particles occasionally
    if (frameCount % 4 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) {
        spawnGroundParticle();
    }
     // Update and draw existing ground particles
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i];
        p.pos.add(p.vel);
        p.lifespan -= 1; // Fade slower than side particles

        if (p.lifespan <= 0) {
            groundParticles.splice(i, 1); // Remove
        } else {
            // Draw
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 150); // More subtle alpha
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 10);
             fill(red(clrGroundGlow), green(clrGroundGlow), blue(clrGroundGlow), alpha); // Use glow color? Or base?
            applyGlow(clrGroundGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow();
            pop();
        }
    }
}

// Function to spawn a single side particle
function spawnSideParticle() {
    let edgeMargin = width * 0.08; // How far from edge particles can spawn
    let xPos;
    // Spawn on left or right side
    if (random() < 0.5) {
        xPos = random(edgeMargin);
    } else {
        xPos = random(width - edgeMargin, width);
    }
    let yPos = random(height * 0.2, height * 1.1); // Spawn lower down, some offscreen bottom

    let particle = {
        pos: createVector(xPos, yPos),
        vel: createVector(random(-0.3, 0.3), random(-0.8, -1.8)), // Mostly upwards velocity
        initialLifespan: random(100, 250),
        lifespan: 0, // Will be set to initial lifespan below
        size: random(2, 5),
    };
    particle.lifespan = particle.initialLifespan; // Set lifespan
    sideParticles.push(particle);
}


// Function to spawn a single ground particle
function spawnGroundParticle() {
    let xPos = random(width);
    let yPos = random(groundLevelY + 10, height - 10); // Below ground line

    let particle = {
        pos: createVector(xPos, yPos),
        vel: createVector(random(-0.4, 0.4), random(-0.2, 0.2)), // Slow drift
        initialLifespan: random(80, 180),
        lifespan: 0,
        size: random(3, 6),
    };
    particle.lifespan = particle.initialLifespan;
    groundParticles.push(particle);
}


// Draws the stylized pole structure (updated for ground level)
function drawPole() {
    push();
    let poleTopY = pole.y - pole.poleHeight;

    // Pole Base/Stand (optional)
    // fill(100);
    // ellipse(pole.x, pole.y, pole.thickness + 4, 5); // Small base shadow/stand

    // Pole Stick
    strokeWeight(pole.thickness);
    stroke(clrPoleBase);
    line(pole.x, pole.y, pole.x, poleTopY); // From ground line up

    // Top Anchor/Light visual (where ball attaches visually)
    let anchorX = pole.x;
    let anchorY = poleTopY + pole.anchorYOffset;
    fill(clrBall); // Use ball color for the light
    applyGlow(clrBallGlow, defaultGlow);
    noStroke();
    ellipse(anchorX, anchorY, pole.thickness * 1.8, pole.thickness * 1.8);
    removeGlow();

    pop();
}

// Draws the target box (Unchanged conceptually)
function drawTargetBox() {
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2;
    let scaleFactor = map(pulse, 0, 1, 1.0, 1.05);
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);
    let centerX = targetBox.x + targetBox.w / 2; let centerY = targetBox.y + targetBox.h / 2;
    let scaledW = targetBox.w * scaleFactor; let scaledH = targetBox.h * scaleFactor;
    push(); applyGlow(clrTargetGlow, glowAmount); fill(clrTarget); noStroke();
    rect(centerX - scaledW / 2, centerY - scaledH / 2, scaledW, scaledH, 5);
    removeGlow(); pop();
}

// Draws the ball (Unchanged)
function drawBall() {
    push(); applyGlow(clrBallGlow, defaultGlow); fill(clrBall); noStroke();
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2); pop();
}

// Draws the elastic band (adjusted for new pole anchor)
function drawElastic() {
    // Anchor point is now calculated based on pole base, height, and offset
    let anchorX = pole.x;
    let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY));
    let currentStretch = stretchVector.mag();
    if (currentStretch < 2 && !ball.isHeld) return; // Don't draw if slack

    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1);
    let glowAmount = 5 + stretchRatio * elasticGlowIntensity;
    let thickness = map(stretchRatio, 0, 1, 2, 5);

    push(); applyGlow(clrElasticGlow, glowAmount); stroke(clrElasticBase);
    strokeWeight(thickness); line(anchorX, anchorY, ball.pos.x, ball.pos.y); pop();
}

// Displays the score (Unchanged conceptually, just position)
function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`;
    // Adjusted Y slightly higher maybe?
    let txtX = 30; let txtY = 40;
    let glowAmount = 5 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 3;
    push(); textSize(26); textFont('monospace'); textAlign(LEFT, CENTER);
    applyGlow(clrTextGlow, glowAmount); fill(clrTextGlow);
    text(scoreText, txtX+1, txtY+1); // Glow shadow
    removeGlow(); fill(clrText); text(scoreText, txtX, txtY); pop(); // Main text
}

// Shows game over screen (Unchanged conceptually)
function showGameOver() {
    let overlayAlpha = 180; push(); noStroke(); fill(100, 0, 20, overlayAlpha);
    rect(0, 0, width, height); // Full overlay using fixed width/height
    let mainTxtSize = 60; let subTxtSize = 28; let textY = height / 2;
    let lineSpacing = 50; let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2;
    let glowAmount = 15 + pulse * 10; textFont('monospace'); textAlign(CENTER, CENTER);
    applyGlow(clrTextGlow, glowAmount); // Using text glow color now? Or border? Let's try text glow
    fill(clrText); // Maybe white looks better than border color
    textSize(mainTxtSize); text('GAME OVER', width / 2, textY - lineSpacing);
    removeGlow(); applyGlow('#FF5555', 10); fill(clrText); textSize(subTxtSize);
    text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    textSize(subTxtSize * 0.9); text('Click to Restart', width / 2, textY + lineSpacing * 1.5);
    pop();
}

// --- Game Mechanics & Physics --- (Mostly Unchanged)

function aimingLogic() {
   // Use the dynamically calculated anchor point
   let anchorX = pole.x;
   let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
   if (ball.isHeld) {
     let desiredPos = createVector(mouseX, mouseY);
     let displacement = p5.Vector.sub(desiredPos, createVector(anchorX, anchorY));
     let distance = displacement.mag();
     if (distance > maxStretch) {
       displacement.setMag(maxStretch);
       ball.pos = p5.Vector.add(createVector(anchorX, anchorY), displacement);
     } else { ball.pos.set(mouseX, mouseY); }
   } else { ball.pos.set(anchorX, anchorY); }
}

function physicsUpdate() { if (gameState !== 'launched') return; ball.acc.add(gravity); ball.vel.add(ball.acc); ball.vel.mult(friction); ball.pos.add(ball.vel); ball.acc.mult(0); }

function checkCollisions() {
    if (gameState !== 'launched') return;
    if (didBallHitBox()) { console.log("Target Hit!"); currentLevel++; setupLevel(); return; }
    // Ground collision now checks against groundLevelY
    if (ball.pos.y + ball.radius >= groundLevelY) {
        console.log("Hit ground!"); gameState = 'gameOver'; ball.vel.y *= -0.5; // Slight bounce maybe?
        ball.vel.x *= 0.8; ball.pos.y = groundLevelY - ball.radius;
        // Could also just stop: ball.vel.mult(0); ball.pos.y = groundLevelY - ball.radius;
    }
    // Check Offscreen (L/R/T)
    if (ball.pos.x + ball.radius < 0 || ball.pos.x - ball.radius > width || ball.pos.y + ball.radius < 0) {
        console.log("Off screen!"); gameState = 'gameOver';
    }
}

function didBallHitBox() {
    let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w);
    let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h);
    let distanceSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2);
    return distanceSq < pow(ball.radius, 2);
}


// --- Input Event Handlers --- (Adjusted for new anchor calculation)

function mousePressed() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming') {
        let d = dist(mouseX, mouseY, anchorX, anchorY);
        if (d < ball.radius * 3) { ball.isHeld = true; aimingLogic(); }
    } else if (gameState === 'gameOver') { currentLevel = 0; setupLevel(); }
}

function mouseDragged() { if (gameState === 'aiming' && ball.isHeld) { aimingLogic(); } }

function mouseReleased() {
    let anchorX = pole.x; let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false; gameState = 'launched';
        let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);
        ball.vel = launchVector.mult(elasticForce); ball.acc.mult(0);
        console.log(`Launched: V(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
}

// --- Window Resize Handler --- (Removed as canvas size is fixed) ---
// function windowResized() {
//    // No longer needed for fixed canvas size + CSS scaling method
// }
// --- End ---
