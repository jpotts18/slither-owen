const { Snake } = require("../js/snake");
const { Food } = require("../js/food");

describe("Snake", () => {
  let snake;

  beforeEach(() => {
    // Create a new snake before each test
    snake = new Snake({
      x: 100,
      y: 100,
      angle: 0,
      length: 5,
    });
  });

  test("should initialize with correct properties", () => {
    expect(snake.x).toBe(100);
    expect(snake.y).toBe(100);
    expect(snake.angle).toBe(0);
    expect(snake.segments.length).toBe(5);
  });

  test("should move in the direction of its angle", () => {
    const initialX = snake.x;
    const initialY = snake.y;

    // Snake angle is 0 (moving right)
    snake.update();

    expect(snake.x).toBeGreaterThan(initialX);
    expect(snake.y).toBe(initialY); // Y shouldn't change when moving horizontally
  });

  test("should change direction towards target", () => {
    // Set target below the snake
    snake.setTarget(100, 200);

    // Initial angle is 0 (right)
    // Update multiple times to allow for smooth turning
    for (let i = 0; i < 20; i++) {
      snake.update();
    }

    // Angle should now be closer to π/2 (downward)
    expect(snake.angle).toBeGreaterThan(0);
    expect(snake.angle).toBeLessThan(Math.PI);
  });

  test("should grow when grow() is called", () => {
    const initialLength = snake.segments.length;
    snake.grow(3);

    expect(snake.segments.length).toBe(initialLength + 3);
  });

  test("segments should follow the head", () => {
    const initialHeadX = snake.x;
    const initialHeadY = snake.y;

    // Move the snake multiple times
    for (let i = 0; i < 10; i++) {
      snake.update();
    }

    // Head has moved
    expect(snake.x).not.toBe(initialHeadX);

    // First segment should now be close to where the head was
    const firstSegment = snake.segments[0];
    const distance = Math.sqrt(
      Math.pow(firstSegment.x - initialHeadX, 2) +
        Math.pow(firstSegment.y - initialHeadY, 2)
    );

    // The distance won't be exact due to the following mechanics
    expect(distance).toBeLessThan(snake.segmentDistance * 2);
  });

  test("should detect collision with food", () => {
    const food = new Food({
      x: snake.x,
      y: snake.y,
      size: 5,
    });

    expect(snake.checkFoodCollision(food)).toBe(true);

    // Move food away
    food.x = snake.x + 100;
    food.y = snake.y + 100;

    expect(snake.checkFoodCollision(food)).toBe(false);
  });

  test("should NOT detect self collision - new behavior", () => {
    // Create a situation where the head is on top of a segment
    snake.segments[3].x = snake.x;
    snake.segments[3].y = snake.y;

    // This should now return false according to the new requirements
    expect(snake.checkCollision(snake)).toBe(false);
  });

  test("should detect collision with other snakes", () => {
    // Create another snake
    const otherSnake = new Snake({
      x: snake.x,
      y: snake.y + 5, // Position it so segments can collide
      angle: Math.PI, // Opposite direction
      length: 5,
    });

    // Test collision detection with other snake
    expect(snake.checkCollision(otherSnake)).toBe(true);

    // Move other snake away INCLUDING its segments
    otherSnake.x += 100;
    otherSnake.y += 100;

    // Move all segments too
    for (const segment of otherSnake.segments) {
      segment.x += 100;
      segment.y += 100;
    }

    // Should no longer collide
    expect(snake.checkCollision(otherSnake)).toBe(false);
  });
});
