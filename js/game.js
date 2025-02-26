const GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#333333",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(GameConfig);

let playerSnake;
let foods = [];
let cursor;
let graphics;
let scoreText;
let score = 0;
let aiSnakes = [];
const AI_CHANGE_DIRECTION_INTERVAL = 3000; // ms
let boostBar;
let boostBarBg;
let boostBarWidth = 200;
let boostBarHeight = 20;
const GRID_SIZE = 4; // 4x4 grid
const TILE_SIZE = 1000; // Size of each tile
const WORLD_SIZE = GRID_SIZE * TILE_SIZE; // Total world size
let gridTiles = []; // Store the grid tiles

// Add these constants for AI behavior
const AI_STATE = {
  HUNTING_FOOD: "hunting_food",
  HUNTING_PLAYER: "hunting_player",
  WANDERING: "wandering",
  FLEEING: "fleeing",
};

function preload() {
  // Load any assets here if needed
}

function create() {
  // Setup game objects
  graphics = this.add.graphics();

  // Create grid of background tiles
  createGridWorld(this);

  // Set world bounds to match our grid size
  this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

  // Create player snake in the center of the world
  playerSnake = new Snake({
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    color: 0x00ff00,
    length: 15,
    size: 15, // Make snake larger and more visible
  });

  // Log snake position to debug
  console.log("Snake position:", playerSnake.x, playerSnake.y);

  // Create food throughout the world but with some near the starting position
  for (let i = 0; i < 500; i++) {
    let foodX, foodY;

    if (i < 20) {
      // Place some food near the player's starting position
      foodX = WORLD_SIZE / 2 + (Math.random() * 400 - 200);
      foodY = WORLD_SIZE / 2 + (Math.random() * 400 - 200);
    } else {
      // Rest distributed throughout the world
      foodX = Math.random() * WORLD_SIZE;
      foodY = Math.random() * WORLD_SIZE;
    }

    const food = new Food({
      x: foodX,
      y: foodY,
      color: Phaser.Display.Color.RandomRGB().color,
      size: 8, // Make food larger and more visible
    });
    foods.push(food);
  }

  // Setup camera to follow snake - always centered
  this.cameras.main.startFollow(
    { x: playerSnake.x, y: playerSnake.y },
    true,
    1,
    1 // These parameters ensure immediate following with no lag
  );

  // Setup input - adjust for camera position
  cursor = { x: 0, y: 0 };
  this.input.on(
    "pointermove",
    function (pointer) {
      cursor.x = pointer.x + this.cameras.main.scrollX;
      cursor.y = pointer.y + this.cameras.main.scrollY;
    },
    this
  );

  // Create AI snakes
  aiSnakes = [];
  for (let i = 0; i < 10; i++) {
    createAiSnake(this);
  }

  // Score display - fixed to camera
  scoreText = this.add.text(16, 16, "Score: 0", {
    fontSize: "24px",
    fill: "#fff",
  });
  scoreText.setScrollFactor(0);

  // Create boost UI (fixed to camera)
  createBoostUI(this);

  // Setup input for boosting
  this.input.on("pointerdown", function () {
    playerSnake.boostPressed = true;
  });

  this.input.on("pointerup", function () {
    playerSnake.boostPressed = false;
  });

  // Setup keyboard input for spacebar
  this.input.keyboard.on("keydown-SPACE", function () {
    playerSnake.boostPressed = true;
  });

  this.input.keyboard.on("keyup-SPACE", function () {
    playerSnake.boostPressed = false;
  });
}

function update() {
  // Clear only the snake graphics, not the entire display
  graphics.clear();

  // Make graphics more prominent
  graphics.lineStyle(2, 0x000000, 1);

  // Update camera position to exactly follow snake (centered)
  this.cameras.main.scrollX = playerSnake.x - this.cameras.main.width / 2;
  this.cameras.main.scrollY = playerSnake.y - this.cameras.main.height / 2;

  // Debug info
  const debugText = `
  Player: (${Math.floor(playerSnake.x)}, ${Math.floor(playerSnake.y)})
  Camera: (${Math.floor(this.cameras.main.scrollX)}, ${Math.floor(
    this.cameras.main.scrollY
  )})
  Food count: ${foods.length}
  AI Snakes: ${aiSnakes.length}
  `;

  if (!this.debugInfo) {
    this.debugInfo = this.add.text(10, 50, debugText, {
      fontSize: "14px",
      fill: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 5, y: 5 },
    });
    this.debugInfo.setScrollFactor(0);
    this.debugInfo.setDepth(1000); // Very high depth to be on top
  } else {
    this.debugInfo.setText(debugText);
  }

  // Update player's target based on mouse position relative to camera
  const targetX = cursor.x || playerSnake.x + 100; // default to moving right if no input
  const targetY = cursor.y || playerSnake.y;
  playerSnake.setTarget(targetX, targetY);

  // Update snake movement
  playerSnake.update();

  // Update AI snakes
  for (let i = 0; i < aiSnakes.length; i++) {
    updateAiSnake(aiSnakes[i], this);
  }

  // Draw player snake
  drawSnake(playerSnake, graphics);

  // Draw AI snakes
  for (let i = 0; i < aiSnakes.length; i++) {
    drawSnake(aiSnakes[i], graphics);
  }

  // Draw food
  for (let i = 0; i < foods.length; i++) {
    drawFood(foods[i], graphics);
  }

  // Check for collisions with food
  checkFoodCollisions(this);

  // Check for collisions between snakes
  checkSnakeCollisions(this);

  // Keep player snake within world bounds
  keepSnakeInBounds(playerSnake, 0, 0, WORLD_SIZE, WORLD_SIZE);

  // Keep AI snakes within world bounds
  for (let i = 0; i < aiSnakes.length; i++) {
    keepSnakeInBounds(aiSnakes[i], 0, 0, WORLD_SIZE, WORLD_SIZE);
  }

  // Update boost UI
  updateBoostUI(this);

  // Always draw the player snake last so it's on top
  drawSnake(playerSnake, graphics);
}

function drawSnake(snake, graphics) {
  // Make sure we're using the right color and line style
  graphics.lineStyle(1, 0x000000, 1);

  // Draw head (make it larger and ensure high visibility)
  graphics.fillStyle(snake.color, 1);
  graphics.beginPath();
  graphics.arc(snake.x, snake.y, snake.size, 0, Math.PI * 2);
  graphics.closePath();
  graphics.fill();
  graphics.stroke();

  // Draw segments (ensure high visibility)
  for (let i = 0; i < snake.segments.length; i++) {
    const segment = snake.segments[i];

    // Calculate segment size (tapered towards the end)
    const segmentSize = snake.size * (1 - (i / snake.segments.length) * 0.5);

    // Use a slightly different color for segments for visual appeal
    const segmentColor =
      i % 2 === 0
        ? snake.color
        : Phaser.Display.Color.ValueToColor(snake.color).brighten(20).color;

    graphics.fillStyle(segmentColor, 1);
    graphics.beginPath();
    graphics.arc(segment.x, segment.y, segmentSize, 0, Math.PI * 2);
    graphics.closePath();
    graphics.fill();
    graphics.stroke();
  }

  // Add eye details for better visibility
  const eyeSize = snake.size * 0.3;
  const eyeOffset = snake.size * 0.6;

  // Calculate eye positions based on snake's angle
  const eyeX1 = snake.x + Math.cos(snake.angle - 0.3) * eyeOffset;
  const eyeY1 = snake.y + Math.sin(snake.angle - 0.3) * eyeOffset;
  const eyeX2 = snake.x + Math.cos(snake.angle + 0.3) * eyeOffset;
  const eyeY2 = snake.y + Math.sin(snake.angle + 0.3) * eyeOffset;

  // Draw eyes
  graphics.fillStyle(0xffffff, 1);
  graphics.beginPath();
  graphics.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
  graphics.closePath();
  graphics.fill();
  graphics.stroke();

  graphics.beginPath();
  graphics.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
  graphics.closePath();
  graphics.fill();
  graphics.stroke();
}

function drawFood(food, graphics) {
  // Make food more visible
  graphics.fillStyle(food.color, 1);
  graphics.lineStyle(1, 0x000000, 1);
  graphics.beginPath();
  graphics.arc(food.x, food.y, food.size * 2, 0, Math.PI * 2); // Double the size for visibility
  graphics.closePath();
  graphics.fill();
  graphics.stroke();

  // Add a highlight effect
  graphics.fillStyle(0xffffff, 0.5);
  graphics.beginPath();
  graphics.arc(
    food.x - food.size * 0.3,
    food.y - food.size * 0.3,
    food.size * 0.5,
    0,
    Math.PI * 2
  );
  graphics.closePath();
  graphics.fill();
}

function wrapSnake(snake, width, height) {
  // Wrap head position
  if (snake.x < 0) snake.x = width;
  if (snake.x > width) snake.x = 0;
  if (snake.y < 0) snake.y = height;
  if (snake.y > height) snake.y = 0;

  // Wrap segments
  for (const segment of snake.segments) {
    if (segment.x < 0) segment.x = width;
    if (segment.x > width) segment.x = 0;
    if (segment.y < 0) segment.y = height;
    if (segment.y > height) segment.y = 0;
  }
}

function resetGame(scene) {
  // Reset player snake at the center of the world
  playerSnake = new Snake({
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    color: 0x00ff00,
    length: 15,
  });

  // Reset AI snakes
  aiSnakes = [];
  for (let i = 0; i < 10; i++) {
    createAiSnake(scene);
  }

  // Reset score
  score = 0;
  scoreText.setText("Score: 0");

  // Respawn food
  for (const food of foods) {
    food.respawn(WORLD_SIZE, WORLD_SIZE);
  }
}

function createAiSnake(scene) {
  // Create new AI snake at a random position within the world
  const x = Math.random() * WORLD_SIZE;
  const y = Math.random() * WORLD_SIZE;

  const aiSnake = new Snake({
    x: x,
    y: y,
    angle: Math.random() * Math.PI * 2,
    color: Phaser.Display.Color.RandomRGB().color,
    length: 10 + Math.floor(Math.random() * 10), // Random length between 10-20
    speed: 1 + Math.random() * 1.5, // Random speed
  });

  // Add AI-specific properties
  aiSnake.state = AI_STATE.WANDERING;
  aiSnake.lastStateChange = Date.now();
  aiSnake.lastDirectionChange = Date.now();
  aiSnake.targetEntity = null;
  aiSnake.aggressiveness = Math.random(); // Random aggression level (0-1)
  aiSnake.intelligence = 0.5 + Math.random() * 0.5; // Intelligence factor (0.5-1)

  // Smarter snakes are more colorful to give player visual cues
  if (aiSnake.intelligence > 0.8) {
    aiSnake.color = 0xff0000; // Bright red for smartest snakes
  } else if (aiSnake.intelligence > 0.7) {
    aiSnake.color = 0xff7700; // Orange for quite smart snakes
  }

  // Set initial target
  aiSnake.setTarget(
    x + (Math.random() * 200 - 100),
    y + (Math.random() * 200 - 100)
  );

  aiSnakes.push(aiSnake);

  return aiSnake;
}

function updateAiSnake(aiSnake, scene) {
  const now = Date.now();

  // Only reconsider state every 2-3 seconds (varies by snake intelligence)
  if (now - aiSnake.lastStateChange > 3000 - aiSnake.intelligence * 1000) {
    determineAiState(aiSnake);
    aiSnake.lastStateChange = now;
  }

  // Execute behavior based on current state
  switch (aiSnake.state) {
    case AI_STATE.HUNTING_FOOD:
      huntFood(aiSnake);
      break;
    case AI_STATE.HUNTING_PLAYER:
      huntPlayer(aiSnake);
      break;
    case AI_STATE.WANDERING:
      wander(aiSnake);
      break;
    case AI_STATE.FLEEING:
      fleeFromThreats(aiSnake);
      break;
  }

  // Update snake movement
  aiSnake.update();

  // Check if we need to change direction for obstacle avoidance
  const obstacleAvoidanceFrequency = 500 - aiSnake.intelligence * 300; // Smarter snakes check more often
  if (now - aiSnake.lastDirectionChange > obstacleAvoidanceFrequency) {
    avoidObstacles(aiSnake);
    aiSnake.lastDirectionChange = now;
  }
}

// Determine what state the AI snake should be in
function determineAiState(aiSnake) {
  // Get distance to player
  const distanceToPlayer = getDistance(
    aiSnake.x,
    aiSnake.y,
    playerSnake.x,
    playerSnake.y
  );

  // Get distance to nearest food
  const nearestFood = findNearestFood(aiSnake);
  const distanceToFood = nearestFood
    ? getDistance(aiSnake.x, aiSnake.y, nearestFood.x, nearestFood.y)
    : Infinity;

  // Calculate a threat level from nearby larger snakes
  const threatLevel = calculateThreatLevel(aiSnake);

  // High threat = flee
  if (threatLevel > 0.7) {
    aiSnake.state = AI_STATE.FLEEING;
    return;
  }

  // Calculate probability of hunting player based on aggression and intelligence
  const playerHuntProbability = aiSnake.aggressiveness * aiSnake.intelligence;

  // Hungry snakes (shorter) prioritize food
  const isHungry = aiSnake.segments.length < 15;

  // Decision making
  if (isHungry && distanceToFood < 500) {
    // Hungry and food is nearby
    aiSnake.state = AI_STATE.HUNTING_FOOD;
    aiSnake.targetEntity = nearestFood;
  } else if (distanceToPlayer < 800 && Math.random() < playerHuntProbability) {
    // Close to player and feeling aggressive
    aiSnake.state = AI_STATE.HUNTING_PLAYER;
    aiSnake.targetEntity = playerSnake;
  } else if (distanceToFood < 500) {
    // Food is close, might as well get it
    aiSnake.state = AI_STATE.HUNTING_FOOD;
    aiSnake.targetEntity = nearestFood;
  } else {
    // Nothing interesting nearby, just wander
    aiSnake.state = AI_STATE.WANDERING;
    aiSnake.targetEntity = null;
  }
}

// AI snake hunts for food
function huntFood(aiSnake) {
  // If we don't have a target food or it's too far, find a new one
  if (
    !aiSnake.targetEntity ||
    getDistance(
      aiSnake.x,
      aiSnake.y,
      aiSnake.targetEntity.x,
      aiSnake.targetEntity.y
    ) > 600
  ) {
    aiSnake.targetEntity = findNearestFood(aiSnake);
  }

  if (aiSnake.targetEntity) {
    // Move toward the food
    aiSnake.setTarget(aiSnake.targetEntity.x, aiSnake.targetEntity.y);
  } else {
    // No food found, wander
    wander(aiSnake);
  }
}

// AI snake hunts the player with prediction
function huntPlayer(aiSnake) {
  // Calculate player's future position based on current direction and speed
  const predictionFactor = aiSnake.intelligence * 2; // Smarter snakes predict better

  // Calculate player's velocity vector
  const playerDirectionX = Math.cos(playerSnake.angle);
  const playerDirectionY = Math.sin(playerSnake.angle);

  // Predict player's future position
  const predictedX =
    playerSnake.x + playerDirectionX * playerSnake.speed * predictionFactor;
  const predictedY =
    playerSnake.y + playerDirectionY * playerSnake.speed * predictionFactor;

  // Head toward predicted position to intercept
  aiSnake.setTarget(predictedX, predictedY);

  // If we're longer than the player and close enough, try to boost to catch them
  if (
    aiSnake.segments.length > playerSnake.segments.length &&
    getDistance(aiSnake.x, aiSnake.y, playerSnake.x, playerSnake.y) < 300
  ) {
    aiSnake.boostPressed = true;
  } else {
    aiSnake.boostPressed = false;
  }
}

// AI snake wanders randomly but avoids world edges
function wander(aiSnake) {
  // Make a random movement decision occasionally
  if (Math.random() < 0.05) {
    // Bias movement toward center if we're near an edge
    const distanceFromCenter = getDistance(
      aiSnake.x,
      aiSnake.y,
      WORLD_SIZE / 2,
      WORLD_SIZE / 2
    );
    const maxDistance = WORLD_SIZE * 0.4;

    let targetX, targetY;

    if (distanceFromCenter > maxDistance) {
      // Too far from center, head back toward middle
      const centeringForce = Math.min(
        1,
        (distanceFromCenter - maxDistance) / 500
      );
      targetX = aiSnake.x + (WORLD_SIZE / 2 - aiSnake.x) * centeringForce;
      targetY = aiSnake.y + (WORLD_SIZE / 2 - aiSnake.y) * centeringForce;
    } else {
      // Random movement
      targetX = aiSnake.x + (Math.random() * 600 - 300);
      targetY = aiSnake.y + (Math.random() * 600 - 300);
    }

    aiSnake.setTarget(targetX, targetY);
  }
}

// AI snake flees from threats
function fleeFromThreats(aiSnake) {
  // Find the nearest threat (larger snake)
  const threats = getAllThreats(aiSnake);

  if (threats.length > 0) {
    // Calculate average threat direction to flee away from
    let threatDirX = 0;
    let threatDirY = 0;

    for (const threat of threats) {
      const dx = aiSnake.x - threat.x;
      const dy = aiSnake.y - threat.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Weight by inverse distance (closer threats matter more)
      const weight = 1 / Math.max(1, distance);
      threatDirX += dx * weight;
      threatDirY += dy * weight;
    }

    // Normalize direction
    const magnitude = Math.sqrt(
      threatDirX * threatDirX + threatDirY * threatDirY
    );
    if (magnitude > 0) {
      threatDirX /= magnitude;
      threatDirY /= magnitude;
    }

    // Set escape target away from threats
    const escapeDistance = 300;
    aiSnake.setTarget(
      aiSnake.x + threatDirX * escapeDistance,
      aiSnake.y + threatDirY * escapeDistance
    );

    // Use boost to escape if the threat is close
    if (magnitude < 200) {
      aiSnake.boostPressed = true;
    } else {
      aiSnake.boostPressed = false;
    }
  } else {
    // No threats found anymore, back to wandering
    aiSnake.state = AI_STATE.WANDERING;
  }
}

// Helper function to avoid obstacles
function avoidObstacles(aiSnake) {
  // Detect obstacles in the snake's path
  const headingX = Math.cos(aiSnake.angle);
  const headingY = Math.sin(aiSnake.angle);

  // Look ahead for other snakes in our path
  let closestObstacle = null;
  let closestDistance = Infinity;

  // Check player snake
  const playerObstacle = checkCollisionPath(aiSnake, playerSnake);
  if (playerObstacle && playerObstacle.distance < closestDistance) {
    closestDistance = playerObstacle.distance;
    closestObstacle = playerObstacle;
  }

  // Check other AI snakes
  for (const otherSnake of aiSnakes) {
    if (otherSnake === aiSnake) continue;

    const obstacle = checkCollisionPath(aiSnake, otherSnake);
    if (obstacle && obstacle.distance < closestDistance) {
      closestDistance = obstacle.distance;
      closestObstacle = obstacle;
    }
  }

  // Check world boundaries too
  const boundaryObstacle = checkBoundaryCollision(aiSnake);
  if (boundaryObstacle && boundaryObstacle.distance < closestDistance) {
    closestDistance = boundaryObstacle.distance;
    closestObstacle = boundaryObstacle;
  }

  // If obstacle is close, take evasive action
  if (closestObstacle && closestDistance < 100 * aiSnake.intelligence) {
    // Calculate evasion direction (perpendicular to obstacle direction)
    const evadeX = -closestObstacle.normal.y;
    const evadeY = closestObstacle.normal.x;

    // Set new target to avoid the obstacle
    aiSnake.setTarget(aiSnake.x + evadeX * 200, aiSnake.y + evadeY * 200);
  }
}

// Helper functions
function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function findNearestFood(aiSnake) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const food of foods) {
    const distance = getDistance(aiSnake.x, aiSnake.y, food.x, food.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = food;
    }
  }

  return nearest;
}

function calculateThreatLevel(aiSnake) {
  let threatLevel = 0;

  // Check player as a threat
  if (playerSnake.segments.length > aiSnake.segments.length) {
    const distance = getDistance(
      aiSnake.x,
      aiSnake.y,
      playerSnake.x,
      playerSnake.y
    );
    if (distance < 500) {
      threatLevel +=
        ((500 - distance) / 500) *
        (playerSnake.segments.length / aiSnake.segments.length);
    }
  }

  // Check other AI snakes as threats
  for (const otherSnake of aiSnakes) {
    if (otherSnake === aiSnake) continue;

    if (otherSnake.segments.length > aiSnake.segments.length) {
      const distance = getDistance(
        aiSnake.x,
        aiSnake.y,
        otherSnake.x,
        otherSnake.y
      );
      if (distance < 400) {
        threatLevel +=
          ((400 - distance) / 400) *
          (otherSnake.segments.length / aiSnake.segments.length);
      }
    }
  }

  return Math.min(1, threatLevel);
}

function getAllThreats(aiSnake) {
  const threats = [];

  // Check if player is a threat
  if (playerSnake.segments.length > aiSnake.segments.length) {
    const distance = getDistance(
      aiSnake.x,
      aiSnake.y,
      playerSnake.x,
      playerSnake.y
    );
    if (distance < 500) {
      threats.push(playerSnake);
    }
  }

  // Check other AI snakes as threats
  for (const otherSnake of aiSnakes) {
    if (otherSnake === aiSnake) continue;

    if (otherSnake.segments.length > aiSnake.segments.length) {
      const distance = getDistance(
        aiSnake.x,
        aiSnake.y,
        otherSnake.x,
        otherSnake.y
      );
      if (distance < 400) {
        threats.push(otherSnake);
      }
    }
  }

  return threats;
}

function checkCollisionPath(snake, otherSnake) {
  // Simple collision prediction - check if we're heading toward another snake
  const dx = otherSnake.x - snake.x;
  const dy = otherSnake.y - snake.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Get normalized direction vectors
  const headingX = Math.cos(snake.angle);
  const headingY = Math.sin(snake.angle);

  const directionX = dx / distance;
  const directionY = dy / distance;

  // Calculate dot product to see if we're heading toward the other snake
  const dotProduct = headingX * directionX + headingY * directionY;

  // If we're heading toward it and it's close enough to be a concern
  if (dotProduct > 0.7 && distance < 200) {
    return {
      distance: distance,
      normal: { x: directionX, y: directionY },
    };
  }

  return null;
}

function checkBoundaryCollision(snake) {
  const margin = 100;

  // Check distance to boundaries
  const distToLeft = snake.x;
  const distToRight = WORLD_SIZE - snake.x;
  const distToTop = snake.y;
  const distToBottom = WORLD_SIZE - snake.y;

  // Get heading vector
  const headingX = Math.cos(snake.angle);
  const headingY = Math.sin(snake.angle);

  // Check which boundary we might hit
  let closestDist = Infinity;
  let normal = { x: 0, y: 0 };

  if (distToLeft < margin && headingX < 0) {
    // Left boundary
    if (distToLeft < closestDist) {
      closestDist = distToLeft;
      normal = { x: 1, y: 0 }; // Normal pointing right
    }
  }

  if (distToRight < margin && headingX > 0) {
    // Right boundary
    if (distToRight < closestDist) {
      closestDist = distToRight;
      normal = { x: -1, y: 0 }; // Normal pointing left
    }
  }

  if (distToTop < margin && headingY < 0) {
    // Top boundary
    if (distToTop < closestDist) {
      closestDist = distToTop;
      normal = { x: 0, y: 1 }; // Normal pointing down
    }
  }

  if (distToBottom < margin && headingY > 0) {
    // Bottom boundary
    if (distToBottom < closestDist) {
      closestDist = distToBottom;
      normal = { x: 0, y: -1 }; // Normal pointing up
    }
  }

  if (closestDist < Infinity) {
    return {
      distance: closestDist,
      normal: normal,
    };
  }

  return null;
}

function checkSnakeCollisions(scene) {
  // Check if player's head collides with any AI snake
  for (let i = 0; i < aiSnakes.length; i++) {
    const aiSnake = aiSnakes[i];

    // Player's head hit AI snake's body
    if (playerSnake.checkCollision(aiSnake)) {
      resetGame(scene);
      return;
    }

    // AI snake's head hit player's body
    if (aiSnake.checkCollision(playerSnake)) {
      // AI snake dies, convert some segments to food
      createFoodFromSnake(aiSnake, scene);

      // Remove the dead AI snake
      aiSnakes.splice(i, 1);
      i--; // Adjust loop counter

      // Create a new AI snake
      createAiSnake(scene);
    }
  }

  // Check for collisions between AI snakes
  for (let i = 0; i < aiSnakes.length; i++) {
    for (let j = 0; j < aiSnakes.length; j++) {
      if (i !== j && aiSnakes[i].checkCollision(aiSnakes[j])) {
        // AI snake i hit AI snake j, so i dies
        createFoodFromSnake(aiSnakes[i], scene);

        // Remove the dead AI snake
        aiSnakes.splice(i, 1);
        i--; // Adjust loop counter

        // Create a new AI snake
        createAiSnake(scene);
        break;
      }
    }
  }
}

function createFoodFromSnake(snake, scene) {
  // Convert about half of the snake segments to food
  const foodCount = Math.floor(snake.segments.length / 2);

  for (let i = 0; i < foodCount; i++) {
    // Use every second segment for food
    const segment = snake.segments[i * 2];

    if (segment) {
      const food = new Food({
        x: segment.x,
        y: segment.y,
        color: 0xffff00, // Bright yellow for dead snake food
        size: 4 + Math.random() * 3, // Slightly random size
        value: 2, // Worth more than regular food
      });

      foods.push(food);
    }
  }
}

function keepSnakeInBounds(snake, minX, minY, maxX, maxY) {
  // Keep head position within bounds
  snake.x = Math.max(minX + snake.size, Math.min(maxX - snake.size, snake.x));
  snake.y = Math.max(minY + snake.size, Math.min(maxY - snake.size, snake.y));

  // Keep segments within bounds too
  for (const segment of snake.segments) {
    segment.x = Math.max(minX, Math.min(maxX, segment.x));
    segment.y = Math.max(minY, Math.min(maxY, segment.y));
  }
}

function createBoostUI(scene) {
  // Create background bar (gray)
  boostBarBg = scene.add.graphics();
  boostBarBg.fillStyle(0x333333, 1);
  boostBarBg.fillRect(
    scene.cameras.main.width / 2 - boostBarWidth / 2,
    10,
    boostBarWidth,
    boostBarHeight
  );
  boostBarBg.setScrollFactor(0);

  // Create foreground bar (green)
  boostBar = scene.add.graphics();
  boostBar.fillStyle(0x00ff00, 1);
  boostBar.fillRect(
    scene.cameras.main.width / 2 - boostBarWidth / 2,
    10,
    boostBarWidth,
    boostBarHeight
  );
  boostBar.setScrollFactor(0);

  // Add text label
  const boostText = scene.add.text(
    scene.cameras.main.width / 2,
    10 + boostBarHeight / 2,
    "BOOST",
    {
      fontSize: "14px",
      fill: "#fff",
      fontWeight: "bold",
    }
  );
  boostText.setOrigin(0.5, 0.5);
  boostText.setScrollFactor(0);
}

function updateBoostUI(scene) {
  // Clear previous graphics
  boostBar.clear();

  // Set color based on state
  if (playerSnake.boosting) {
    boostBar.fillStyle(0xff0000, 1); // Red when active
  } else {
    boostBar.fillStyle(0x00ff00, 1); // Green when charging
  }

  // Draw bar proportional to boost amount
  const barWidth = (playerSnake.boostAmount / 100) * boostBarWidth;
  boostBar.fillRect(
    scene.cameras.main.width / 2 - boostBarWidth / 2,
    10,
    barWidth,
    boostBarHeight
  );
}

function createGridWorld(scene) {
  gridTiles = [];

  // Create a 4x4 grid of colored tiles
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Calculate position
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      // Generate a unique color for each tile (alternating pattern)
      let color;
      if ((row + col) % 2 === 0) {
        color = 0x333333; // Dark gray
      } else {
        color = 0x555555; // Light gray
      }

      // Add some variety with different colored tiles
      if (row === col) {
        color = 0x225522; // Green tint
      } else if (row === GRID_SIZE - col - 1) {
        color = 0x222255; // Blue tint
      }

      // Create a rectangle for the tile
      const tile = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color);

      // Set the origin to top-left corner
      tile.setOrigin(0, 0);

      // Ensure grid tiles are behind other elements
      tile.setDepth(-1);

      // Store reference
      gridTiles.push(tile);

      // Add grid coordinate text for debugging/reference
      const coordText = scene.add.text(
        x + TILE_SIZE / 2,
        y + TILE_SIZE / 2,
        `(${col},${row})`,
        {
          font: "32px Arial",
          fill: "#ffffff",
        }
      );
      coordText.setOrigin(0.5, 0.5);
      coordText.setDepth(-0.5); // Text above background but below game elements
    }
  }
}

function checkFoodCollisions(scene) {
  // Check if player snake has collided with any food
  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];

    // Check player collision with food
    if (playerSnake.checkFoodCollision(food)) {
      playerSnake.grow();
      food.respawn(WORLD_SIZE, WORLD_SIZE);
      score++;
      scoreText.setText("Score: " + score);
    }

    // Check if AI snakes can eat food
    for (let j = 0; j < aiSnakes.length; j++) {
      if (aiSnakes[j].checkFoodCollision(food)) {
        aiSnakes[j].grow();
        food.respawn(WORLD_SIZE, WORLD_SIZE);
      }
    }
  }
}
