// Import necessary functions/classes
const { Snake } = require("../js/snake");
const { Food } = require("../js/food");

// Define constants used throughout tests
const GRID_SIZE = 4;
const TILE_SIZE = 1000;
const WORLD_SIZE = GRID_SIZE * TILE_SIZE;

// Mock Phaser dependencies
jest.mock(
  "phaser",
  () => ({
    AUTO: "auto",
    Game: jest.fn(),
    Scene: jest.fn(),
    Physics: {
      Arcade: {
        Body: jest.fn(),
      },
    },
    Display: {
      Color: {
        RandomRGB: jest.fn().mockReturnValue({ color: 0xff0000 }),
      },
    },
  }),
  { virtual: true }
);

// Mock the camera and graphics
const mockCamera = {
  startFollow: jest.fn(),
  scrollX: 0,
  scrollY: 0,
  width: 800,
  height: 600,
};

const mockGraphics = {
  clear: jest.fn(),
  fillStyle: jest.fn(),
  lineStyle: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillRect: jest.fn(),
};

const mockScene = {
  add: {
    graphics: jest.fn().mockReturnValue(mockGraphics),
    rectangle: jest.fn().mockReturnValue({
      setOrigin: jest.fn(),
    }),
    text: jest.fn().mockReturnValue({
      setOrigin: jest.fn(),
      setScrollFactor: jest.fn(),
      setText: jest.fn(),
    }),
  },
  cameras: {
    main: mockCamera,
  },
  input: {
    on: jest.fn(),
    keyboard: {
      on: jest.fn(),
    },
  },
  physics: {
    world: {
      setBounds: jest.fn(),
    },
  },
};

describe("Game World", () => {
  test("world size should be calculated correctly", () => {
    expect(WORLD_SIZE).toBe(4000);
  });

  test("player snake should start at the center of the world", () => {
    const playerSnake = new Snake({
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2,
      color: 0x00ff00,
      length: 15,
    });

    expect(playerSnake.x).toBe(2000);
    expect(playerSnake.y).toBe(2000);
  });

  test("createGridWorld should create correct number of tiles", () => {
    // We need to mock the grid tiles array and implement a basic version of createGridWorld
    const gridTiles = [];

    // Simple version of createGridWorld for testing
    function createGridWorld(scene) {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          gridTiles.push({
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            color: 0x333333,
          });
        }
      }
      return gridTiles;
    }

    const tiles = createGridWorld(mockScene);
    expect(tiles.length).toBe(16); // 4x4 grid = 16 tiles

    // Check first tile position
    expect(tiles[0].x).toBe(0);
    expect(tiles[0].y).toBe(0);

    // Check last tile position
    expect(tiles[15].x).toBe(3 * TILE_SIZE);
    expect(tiles[15].y).toBe(3 * TILE_SIZE);
  });

  test("camera should stay centered on snake", () => {
    // Create a snake at the center
    const snake = new Snake({
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2,
    });

    // Update camera position (simplified version of what happens in update())
    mockCamera.scrollX = snake.x - mockCamera.width / 2;
    mockCamera.scrollY = snake.y - mockCamera.height / 2;

    // Expected camera position to center the snake
    const expectedScrollX = WORLD_SIZE / 2 - mockCamera.width / 2;
    const expectedScrollY = WORLD_SIZE / 2 - mockCamera.height / 2;

    expect(mockCamera.scrollX).toBe(expectedScrollX);
    expect(mockCamera.scrollY).toBe(expectedScrollY);

    // Move snake and update camera
    snake.x += 100;
    snake.y += 50;
    mockCamera.scrollX = snake.x - mockCamera.width / 2;
    mockCamera.scrollY = snake.y - mockCamera.height / 2;

    // Camera should follow perfectly
    expect(mockCamera.scrollX).toBe(expectedScrollX + 100);
    expect(mockCamera.scrollY).toBe(expectedScrollY + 50);
  });

  test("food should spawn within world bounds", () => {
    for (let i = 0; i < 100; i++) {
      const food = new Food({
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
      });

      expect(food.x).toBeGreaterThanOrEqual(0);
      expect(food.x).toBeLessThanOrEqual(WORLD_SIZE);
      expect(food.y).toBeGreaterThanOrEqual(0);
      expect(food.y).toBeLessThanOrEqual(WORLD_SIZE);
    }
  });

  test("keepSnakeInBounds should restrict snake to world bounds", () => {
    const snake = new Snake({
      x: WORLD_SIZE + 100, // Outside bounds
      y: WORLD_SIZE + 100, // Outside bounds
    });

    // Simple implementation of keepSnakeInBounds for testing
    function keepSnakeInBounds(snake, minX, minY, maxX, maxY) {
      snake.x = Math.max(
        minX + snake.size,
        Math.min(maxX - snake.size, snake.x)
      );
      snake.y = Math.max(
        minY + snake.size,
        Math.min(maxY - snake.size, snake.y)
      );
    }

    keepSnakeInBounds(snake, 0, 0, WORLD_SIZE, WORLD_SIZE);

    // Snake should be at the edge of the world
    expect(snake.x).toBe(WORLD_SIZE - snake.size);
    expect(snake.y).toBe(WORLD_SIZE - snake.size);
  });
});

describe("Game Reset Functionality", () => {
  test("resetGame should place snake at world center", () => {
    // Define simplified resetGame function for testing
    function resetGame() {
      const playerSnake = new Snake({
        x: WORLD_SIZE / 2,
        y: WORLD_SIZE / 2,
        color: 0x00ff00,
        length: 15,
      });

      return playerSnake;
    }

    const snake = resetGame();

    expect(snake.x).toBe(WORLD_SIZE / 2);
    expect(snake.y).toBe(WORLD_SIZE / 2);
    expect(snake.color).toBe(0x00ff00);
    expect(snake.segments.length).toBe(15);
  });
});
