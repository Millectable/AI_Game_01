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
  // Disable right-click context menu on the canvas
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  console.log(`Canvas created (dynamic): ${width}x${height}`);

  setDynamicSizes(); // Set groundLevelY and target bounds

  gravity = createVector(0, 0.6); // Pulls ball down
  friction = 0.988; // Slows ball down slightly over time

  // Initialize game objects with sizes
  ball = {
    pos: createVector(0, 0), vel: createVector(0, 0), acc: createVector(0, 0),
    radius: 24, // Larger ball
    isHeld: false,
  };
  pole = {
    x: 0, y: 0,
    poleHeight: 120, // Taller pole
    anchorYOffset: -10, thickness: 8,
  };
  targetBox = {
    x: 0, y: 0, w: 60, h: 60,
    initialX: 0, initialY: 0 // Base position for movement calculation
  };

  // Run level setup AFTER canvas/objects are ready
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
    // Window is wider than target: Use full height
    canvasH = h;
    canvasW = h * TARGET_ASPECT_RATIO;
  } else {
    // Window is narrower or same ratio: Use full width
    canvasW = w;
    canvasH = w / TARGET_ASPECT_RATIO;
  }
  // Use floor to avoid potential rendering issues with fractional pixels
  return { w: floor(canvasW), h: floor(canvasH) };
}

// Sets/updates variables dependent on canvas size
function setDynamicSizes() {
    groundLevelY = height * 0.85; // Position based on current height

    // Define target movement bounds based on current width/height
    targetMoveBounds.minX = width * 0.35;
    targetMoveBounds.maxX = width * 0.9 - targetBox.w; // Subtract target width
    targetMoveBounds.minY = height * 0.1;
    // Ensure target stays above the pole area and reasonable upper limit
    targetMoveBounds.maxY = min(height * 0.6, groundLevelY - pole.poleHeight - targetBox.h - 20);

    console.log(`Dynamic sizes set: groundY=${groundLevelY.toFixed(0)}, TargetBounds=(${targetMoveBounds.minX.toFixed(0)}, ${targetMoveBounds.minY.toFixed(0)}) to (${targetMoveBounds.maxX.toFixed(0)}, ${targetMoveBounds.maxY.toFixed(0)})`);
}

// p5 function called automatically when window is resized
function windowResized() {
  console.log("Window resized!");
  let canvasSize = calculateCanvasSize();
  resizeCanvas(canvasSize.w, canvasSize.h);
  console.log(`Canvas resized to: ${width}x${height}`);

  // Update dynamic sizes and reset level elements
  setDynamicSizes();
  // Resetting the level ensures elements are placed correctly
  setupLevel();
}

// Sets up elements for a new level or restart
function setupLevel() {
  console.log("setupLevel called...");
  gameState = 'aiming'; // Start in aiming mode
  ball.isHeld = false; // Ball is not held initially

  // Position pole based on current dimensions
  pole.x = random(width * 0.1, width * 0.3);
  pole.y = groundLevelY; // Base of pole sits on calculated ground level

  // Calculate initial target position within safe bounds
  let minTargetX = pole.x + width * 0.2; // Ensure target is offset from pole
  let maxTargetX = width - targetBox.w - width * 0.1; // Ensure target is not too close to edge
  if (minTargetX > maxTargetX) { // Fallback if calculated bounds are invalid
      minTargetX = width * 0.5;
      maxTargetX = width - targetBox.w - width * 0.05;
  }
  targetBox.initialX = random(minTargetX, maxTargetX);
  // Ensure initial Y is within reasonable vertical bounds
  targetBox.initialY = random(height * 0.15, groundLevelY - pole.poleHeight - targetBox.h - height * 0.1);

  // Set current position for movement start
  targetBox.x = targetBox.initialX;
  targetBox.y = targetBox.initialY;

  // Place ball at the anchor point on the pole
  let anchorX = pole.x;
  let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
  ball.pos = createVector(anchorX, anchorY);
  ball.vel = createVector(0, 0); // Reset velocity
  ball.acc = createVector(0, 0); // Reset acceleration

  // Generate decorative shapes below the conceptual ground line
  generateGeometricPatterns();
  console.log(`Level ${currentLevel + 1} setup: Pole Base(${pole.x.toFixed(0)}, ${pole.y.toFixed(0)}), Target Initial(${targetBox.initialX.toFixed(0)}, ${targetBox.initialY.toFixed(0)})`);
}

// Main draw loop, runs continuously
function draw() {
  // Safety check in case objects aren't ready
  if (!ball || !pole || !targetBox) return;

  background(clrBackground); // Clear canvas with background color

  // Update target position if game is active
  if (gameState !== 'gameOver') {
      updateTargetPosition();
  }

  // --- Draw Background Elements ---
  drawGround(); // Draws shapes/particles below the line
  updateAndDrawParticles(); // Draws side/ground dust particles

  // --- Draw Game Elements ---
  drawPole();
  drawTargetBox(); // Draws target at its current (possibly moving) position

  // --- Game State Logic & Dynamic Drawing ---
  if (gameState === 'aiming') {
    aimingLogic(); // Handle mouse input for aiming
    if (ball.isHeld) drawElastic(); // Draw elastic band if pulling
    drawBall(); // Draw ball at current aiming position
  } else if (gameState === 'launched') {
    physicsUpdate(); // Apply gravity, velocity, friction
    checkCollisions(); // Check for target hit or border collision
    drawBall(); // Draw ball at its updated physics position
  } else if (gameState === 'gameOver') {
    // Optionally draw final ball position
    drawBall();
    // Display game over screen
    showGameOver();
  }

  // --- Draw UI Elements ---
  displayScore(); // Show current level

  // --- Draw the animated glowing border ---
  drawGlowingBorder(); // Framed border around the canvas
}

// Updates the target's position smoothly using sine/cosine waves
function updateTargetPosition() {
    // Calculate oscillation factors (0 to 1 range)
    let timeFactorX = (sin(frameCount * targetMoveSpeedX) + 1) / 2;
    let timeFactorY = (cos(frameCount * targetMoveSpeedY) + 1) / 2; // Cosine for different phase

    // Map these factors to the movement bounds calculated in setDynamicSizes
    // Check if bounds are valid before mapping to prevent errors
    if (targetMoveBounds.maxX > targetMoveBounds.minX && targetMoveBounds.maxY > targetMoveBounds.minY) {
        targetBox.x = map(timeFactorX, 0, 1, targetMoveBounds.minX, targetMoveBounds.maxX);
        targetBox.y = map(timeFactorY, 0, 1, targetMoveBounds.minY, targetMoveBounds.maxY);
    } else {
        // Fallback: If bounds are invalid, keep target at its initial position
        targetBox.x = targetBox.initialX;
        targetBox.y = targetBox.initialY;
    }
}

// --- Visual Elements Drawing Functions ---

// Helper to apply canvas shadow blur for glow effect
function applyGlow(glowColor, intensity) {
    if(drawingContext) { // Check if context exists (safer)
        drawingContext.shadowBlur = intensity;
        drawingContext.shadowColor = glowColor;
    }
}
// Helper to remove canvas shadow blur
function removeGlow() {
    if(drawingContext) {
        drawingContext.shadowBlur = 0;
    }
}

// Draws the decorative geometric shapes below the conceptual ground line
function drawGround() {
    push(); // Isolate drawing settings
    // No visual ground line is drawn anymore

    // Draw the animated geometric shapes
    noFill();
    strokeWeight(1.5);
    stroke(clrGeoShapes); // Greyish-Blue Shapes
    applyGlow(clrGeoShapesGlow, 8); // Subtle Lighter Grey-Blue Glow

    for (let i = 0; i < geometricShapes.length; i++) {
        let shape = geometricShapes[i];
        // Animate rotation and position
        shape.angle += 0.008; // Slow rotation
        shape.x += sin(frameCount * 0.025 + i * 0.6) * 0.2; // Horizontal drift
        shape.y += cos(frameCount * 0.018 + i * 0.8) * 0.15; // Vertical drift

        // Constrain vertical position below groundLevelY
        shape.y = constrain(shape.y, groundLevelY + 10, height - 20);
        // Wrap horizontal position if it goes off-screen
        if (shape.x > width + shape.w) shape.x = -shape.w;
        if (shape.x < -shape.w) shape.x = width + shape.w;

        // Draw the individual shape
        push();
        translate(shape.x, shape.y);
        rotate(shape.angle);
        rectMode(CENTER); // Draw from center for rotation
        rect(0, 0, shape.w, shape.h);
        pop();
    }
    removeGlow(); // Stop glowing after drawing all shapes
    pop(); // Restore previous drawing settings
}

// Generates the initial set of geometric shapes
function generateGeometricPatterns() {
    geometricShapes = [];
    let patternAreaHeight = height - groundLevelY; // Available height below line
    for (let i = 0; i < NUM_GEO_SHAPES; i++) {
        let shape = {
            x: random(width), // Random horizontal position
            y: groundLevelY + random(patternAreaHeight * 0.1, patternAreaHeight * 0.8), // Random vertical position below line
            w: random(20, 150), // Random width
            h: random(10, 80),  // Random height
            angle: random(TWO_PI) // Random initial rotation
        };
        geometricShapes.push(shape);
    }
}

// *** CORRECTED function ***
// Updates and draws all particle effects (side dust, ground dust)
function updateAndDrawParticles() {
    // --- Side Particles (Greyish-Blue near edges) ---
    // Spawn new ones occasionally
    if (frameCount % 3 === 0 && sideParticles.length < MAX_SIDE_PARTICLES) {
        spawnSideParticle();
    }
    // Update and draw existing ones
    for (let i = sideParticles.length - 1; i >= 0; i--) {
        let p = sideParticles[i];
        p.pos.add(p.vel); // Move particle
        p.lifespan -= 1.5; // Decrease lifespan

        if (p.lifespan <= 0) {
            sideParticles.splice(i, 1); // Remove dead particle
        } else {
            // Draw the particle WITHIN the else block
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 200); // Fade out alpha
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 6); // Fade out glow
            let baseColor = color(clrSideParticle); // Get base color
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha); // Apply alpha
            applyGlow(clrSideParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow();
            pop();
        }
    }

    // --- Ground Particles (Light Grey-Blue dots below line) ---
    // Spawn new ones occasionally
    if (frameCount % 5 === 0 && groundParticles.length < MAX_GROUND_PARTICLES) {
        spawnGroundParticle();
    }
    // Update and draw existing ones
    for (let i = groundParticles.length - 1; i >= 0; i--) {
        let p = groundParticles[i];
        p.pos.add(p.vel); // Move particle
        p.lifespan -= 1; // Decrease lifespan

        if (p.lifespan <= 0) {
            groundParticles.splice(i, 1); // Remove dead particle
        } else {
             // Draw the particle WITHIN the else block
            push();
            let alpha = map(p.lifespan, 0, p.initialLifespan, 0, 120); // Fade out alpha
            let glowAmount = map(p.lifespan, 0, p.initialLifespan, 0, 7); // Fade out glow
            let baseColor = color(clrGroundParticleGlow); // Use glow color as base
            fill(red(baseColor), green(baseColor), blue(baseColor), alpha); // Apply alpha
            applyGlow(clrGroundParticleGlow, glowAmount);
            noStroke();
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            removeGlow();
            pop();
        }
    }
}


// Spawns a single side particle near the screen edges
function spawnSideParticle() {
    let edgeMargin = width * 0.08; // How far from edge they spawn
    let xPos = (random() < 0.5) ? random(edgeMargin) : random(width - edgeMargin, width); // Left or right edge
    let yPos = random(height * 0.2, height * 1.1); // Vertical spawn range
    let particle = {
        pos: createVector(xPos, yPos),
        vel: createVector(random(-0.2, 0.2), random(-0.6, -1.2)), // Slow upward/sideways drift
        initialLifespan: random(120, 280),
        lifespan: 0,
        size: random(1.5, 4), // Small size
    };
    particle.lifespan = particle.initialLifespan; // Start lifespan timer
    sideParticles.push(particle);
}
// Spawns a single ground particle below the conceptual ground line
function spawnGroundParticle() {
    let xPos = random(width); // Random horizontal position
    let yPos = random(groundLevelY + 5, height - 5); // Vertical position below line
    let particle = {
        pos: createVector(xPos, yPos),
        vel: createVector(random(-0.3, 0.3), random(-0.15, 0.15)), // Very slow drift
        initialLifespan: random(100, 200),
        lifespan: 0,
        size: random(2, 5), // Slightly larger than side particles
    };
    particle.lifespan = particle.initialLifespan; // Start lifespan timer
    groundParticles.push(particle);
}

// Draws the pole
function drawPole() {
    push();
    let poleTopY = pole.y - pole.poleHeight; // Use dynamic height
    strokeWeight(pole.thickness);
    stroke(clrPoleBase); // Greyish-Blue
    line(pole.x, pole.y, pole.x, poleTopY); // Draw main pole line

    // Draw anchor point visual
    let anchorX = pole.x;
    let anchorY = poleTopY + pole.anchorYOffset;
    fill(clrPoleAccent); // Lighter Greyish-Blue
    applyGlow(clrSubtleGlow, 5); // Subtle glow for anchor
    noStroke();
    ellipse(anchorX, anchorY, pole.thickness * 1.8, pole.thickness * 1.8);
    removeGlow();
    pop();
}

// Draws the target box (cube)
function drawTargetBox() {
    // Calculate pulsing effect for scale and glow
    let pulse = (sin(frameCount * pulseSpeed) + 1) / 2; // Ranges 0 to 1
    let scaleFactor = map(pulse, 0, 1, 1.0, 1.03); // Subtle size pulse
    // Use increased glow values for target
    let glowAmount = defaultGlow + map(pulse, 0, 1, 0, targetPulseIntensity);

    // Calculate centered position for scaling
    let centerX = targetBox.x + targetBox.w / 2;
    let centerY = targetBox.y + targetBox.h / 2;
    let scaledW = targetBox.w * scaleFactor;
    let scaledH = targetBox.h * scaleFactor;

    push();
    applyGlow(clrTargetGlow, glowAmount); // Apply Greyish-Blue glow, stronger intensity
    fill(clrTarget); // Dark Teal fill
    noStroke();
    rectMode(CENTER); // Draw from center
    rect(centerX, centerY, scaledW, scaledH, 5); // Draw rounded rect
    removeGlow();
    pop();
}

// Draws the player's ball
function drawBall() {
    push();
    applyGlow(clrBallGlow, defaultGlow); // Apply Greyish-Blue glow, stronger intensity
    fill(clrBall); // Dark Teal fill
    noStroke();
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2, ball.radius * 2); // Use larger radius
    pop();
}

// Draws the elastic band when the ball is held
function drawElastic() {
    let anchorX = pole.x;
    let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset; // Anchor on taller pole
    let stretchVector = p5.Vector.sub(ball.pos, createVector(anchorX, anchorY));
    let currentStretch = stretchVector.mag();

    // Don't draw if not stretched and not held
    if (currentStretch < 2 && !ball.isHeld) return;

    // Calculate glow and thickness based on stretch amount
    let stretchRatio = constrain(currentStretch / maxStretch, 0, 1);
    let glowAmount = 4 + stretchRatio * elasticGlowIntensity; // Glow increases with stretch
    let thickness = map(stretchRatio, 0, 1, 2, 5); // Thickness increases with stretch

    push();
    applyGlow(clrElasticGlow, glowAmount); // Greyish-Blue glow
    stroke(clrElasticBase); // Dark Teal line
    strokeWeight(thickness);
    line(anchorX, anchorY, ball.pos.x, ball.pos.y); // Draw the line
    pop();
}

// Displays the current level number
function displayScore() {
    let scoreText = `Level: ${currentLevel + 1}`;
    // Position relative to current canvas size
    let txtX = width * 0.03;
    let txtY = height * 0.07;
    let glowAmount = 3 + (sin(frameCount * pulseSpeed * 0.8) + 1) * 2; // Subtle text glow pulse

    push();
    // Scale text size slightly based on canvas width, with a minimum size
    let baseSize = 26;
    let scaledSize = baseSize * (width / 1280); // Scale relative to original design width
    textSize(max(14, scaledSize)); // Use scaled size, ensure minimum readable size
    textFont(gameFont); // Use Georgia font
    textAlign(LEFT, TOP); // Align top-left

    // Draw subtle glow behind text
    applyGlow(clrTextGlow, glowAmount); // Dark Teal glow
    fill(clrTextGlow); // Use glow color for offset text
    text(scoreText, txtX + 1, txtY + 1); // Offset slightly
    removeGlow();

    // Draw main text
    fill(clrText); // Greyish-Blue text color
    text(scoreText, txtX, txtY);
    pop();
}

// Displays the game over screen
function showGameOver() {
    let overlayAlpha = 180; // Opacity of the overlay

    push();
    // Draw semi-transparent overlay using background color
    let overlayColor = color(clrBackground);
    overlayColor.setAlpha(overlayAlpha);
    fill(overlayColor);
    noStroke();
    rect(0, 0, width, height); // Cover entire canvas

    // Scale text sizes and spacing based on canvas size, with minimums
    let mainTxtSize = max(30, 60 * (width/1280));
    let subTxtSize = max(16, 28 * (width/1280));
    let textY = height / 2; // Vertical center
    let lineSpacing = max(30, 50 * (height/720)); // Scale spacing too

    // Pulsing glow effect for text
    let pulse = (sin(frameCount * pulseSpeed * 1.5) + 1) / 2;
    let glowAmount = 8 + pulse * 6;

    textFont(gameFont); // Use Georgia font
    textAlign(CENTER, CENTER); // Center align text

    // "GAME OVER" Text
    applyGlow(clrTextGlow, glowAmount); // Dark Teal Glow
    fill(clrText); // Greyish-Blue Text
    textSize(mainTxtSize);
    text('GAME OVER', width / 2, textY - lineSpacing);
    removeGlow();

    // Score Text ("You reached level...")
    applyGlow(clrTextGlow, glowAmount * 0.6); // Slightly less intense glow
    fill(clrText); // Greyish-Blue Text
    textSize(subTxtSize);
    text(`You reached level ${currentLevel + 1}`, width / 2, textY + lineSpacing * 0.5);
    removeGlow(); // Important to remove glow before next text potentially without glow

    // "Click to Restart" Text
    fill(clrText); // Ensure fill is reset
    textSize(subTxtSize * 0.9); // Slightly smaller restart text
    text('Click to Restart', width / 2, textY + lineSpacing * 1.5);

    pop();
}

// Draws the animated glowing border around the canvas
function drawGlowingBorder() {
    push();
    // Calculate pulsing glow intensity
    let pulse = (sin(frameCount * pulseSpeed * borderPulseSpeedFactor) + 1) / 2;
    let currentGlow = borderBaseGlow + pulse * borderPulseIntensity;
    // Offset drawing inwards so stroke is fully visible
    let offset = borderStrokeWeight / 2;

    noFill();
    stroke(clrMainAccent); // Dark Teal border line
    strokeWeight(borderStrokeWeight);
    applyGlow(clrBorderGlow, currentGlow); // Apply Dark Teal glow

    // Draw rectangle inset slightly
    rect(offset, offset, width - borderStrokeWeight, height - borderStrokeWeight);

    removeGlow();
    pop();
}

// --- Game Mechanics & Physics ---

// Handles ball position updates while aiming
function aimingLogic() {
   let anchorX = pole.x;
   let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset; // Anchor on taller pole
   let anchorPos = createVector(anchorX, anchorY);

   if (ball.isHeld) {
     // Use p5's system variables for mouse/touch position
     let currentInputPos = createVector(mouseX, mouseY);
     let displacement = p5.Vector.sub(currentInputPos, anchorPos); // Vector from anchor to input
     let distance = displacement.mag(); // How far input is from anchor

     // Limit stretch distance
     if (distance > maxStretch) {
       displacement.setMag(maxStretch); // Keep direction, limit magnitude
       ball.pos = p5.Vector.add(anchorPos, displacement); // Set ball pos at max stretch
     } else {
       // Ball follows input position within limit
       ball.pos.set(currentInputPos.x, currentInputPos.y);
     }
   } else {
     // If not held, snap ball back to anchor point
     ball.pos.set(anchorX, anchorY);
   }
}


// Updates ball physics (gravity, velocity, friction) when launched
function physicsUpdate() {
  if (gameState !== 'launched') return; // Only run when ball is in flight

  ball.acc.add(gravity);      // Apply gravity to acceleration
  ball.vel.add(ball.acc);     // Apply acceleration to velocity
  ball.vel.mult(friction);    // Apply friction to velocity
  ball.pos.add(ball.vel);     // Apply velocity to position
  ball.acc.mult(0);           // Reset acceleration for next frame
}

// Checks for collisions between ball and target or borders
function checkCollisions() {
    if (gameState !== 'launched') return; // Only run when ball is in flight

    // 1. Check for target hit first
    if (didBallHitBox()) {
      console.log("Target Hit!");
      currentLevel++; // Increment level
      setupLevel();   // Reset for next level
      return;         // Exit collision check early
    }

    // 2. Check for border collisions (Game Over condition)
    let hitBorder = false;
    // Check left edge (account for ball radius)
    if (ball.pos.x - ball.radius <= 0) { hitBorder = true; console.log("Hit left border!"); }
    // Check right edge
    else if (ball.pos.x + ball.radius >= width) { hitBorder = true; console.log("Hit right border!"); }
    // Check top edge
    else if (ball.pos.y - ball.radius <= 0) { hitBorder = true; console.log("Hit top border!"); }
    // Check bottom edge
    else if (ball.pos.y + ball.radius >= height) { hitBorder = true; console.log("Hit bottom border!"); }

    // If any border was hit, trigger game over
    if (hitBorder) {
        gameState = 'gameOver';
        // Optional: Stop ball movement immediately on game over
        // ball.vel.mult(0);
        return; // Exit collision check
    }

    // No collision with visual ground line needed/implemented
}

// Checks if the ball overlaps with the target box
function didBallHitBox() {
  // Find the closest point on the target box to the center of the ball
  let closestX = constrain(ball.pos.x, targetBox.x, targetBox.x + targetBox.w);
  let closestY = constrain(ball.pos.y, targetBox.y, targetBox.y + targetBox.h);

  // Calculate the squared distance between the ball's center and this closest point
  let dSq = pow(ball.pos.x - closestX, 2) + pow(ball.pos.y - closestY, 2);

  // If the distance is less than the ball's radius squared, an overlap occurs
  return dSq < pow(ball.radius, 2);
}

// --- Input Event Handlers ---

// Called once when mouse button or touch is pressed
function mousePressed() {
    // Check if clicking near the anchor point while aiming
    if (gameState === 'aiming') {
      let anchorX = pole.x;
      let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
      // Calculate distance from click/touch to anchor
      let d = dist(mouseX, mouseY, anchorX, anchorY);
      // Allow grabbing if click/touch is within a certain radius of the anchor (relative to ball size)
      if (d < ball.radius * 3.0) { // Grab radius multiplier
        ball.isHeld = true; // Flag that ball is being held
        aimingLogic(); // Immediately snap ball to input position
      }
    }
    // If game is over, clicking/tapping restarts the game
    else if (gameState === 'gameOver') {
      currentLevel = 0; // Reset level count
      setupLevel();   // Set up level 1
    }
    // Prevent default browser actions for touch events (like scrolling or zooming)
    return false;
}

// Called continuously while mouse button or touch is held down and moved
function mouseDragged() {
  // If aiming and holding the ball, update aiming position
  if (gameState === 'aiming' && ball.isHeld) {
    aimingLogic();
  }
  // Prevent default browser actions for touch events
  return false;
}

// Called once when mouse button or touch is released
function mouseReleased() {
    // If was aiming and holding the ball, launch it
    if (gameState === 'aiming' && ball.isHeld) {
        ball.isHeld = false;       // No longer holding the ball
        gameState = 'launched';    // Change game state

        // Calculate launch vector (from ball position back towards anchor)
        let anchorX = pole.x;
        let anchorY = pole.y - pole.poleHeight + pole.anchorYOffset;
        let launchVector = p5.Vector.sub(createVector(anchorX, anchorY), ball.pos);

        // Increased launch multiplier for more speed
        let launchMultiplier = 0.35; // Adjust this value for desired speed (e.g., 0.3 - 0.5)

        // Calculate initial velocity based on vector, force, and multiplier
        ball.vel = launchVector.mult(elasticForce * launchMultiplier);
        ball.acc.mult(0); // Clear any residual acceleration

        console.log(`Launched: Multiplier=${launchMultiplier}, V=(${ball.vel.x.toFixed(2)}, ${ball.vel.y.toFixed(2)})`);
    }
     // Prevent default browser actions for touch events
    return false;
}

// --- End ---
