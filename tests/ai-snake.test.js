const { Snake } = require("../js/snake");
const { Food } = require("../js/food");

describe("AI Snake Behavior", () => {
  // Mock the game functions for testing
  const createFoodFromSnake = (snake) => {
    const foods = [];
    const foodCount = Math.floor(snake.segments.length / 2);

    for (let i = 0; i < foodCount; i++) {
      if (i * 2 < snake.segments.length) {
        const segment = snake.segments[i * 2];
        foods.push({
          x: segment.x,
          y: segment.y,
          size: 5,
          color: 0xffff00,
          value: 2,
        });
      }
    }

    return foods;
  };

  test("should create correct number of food items from dead snake", () => {
    // Create a snake with known length
    const snake = new Snake({
      x: 100,
      y: 100,
      length: 10,
    });

    // Convert to food
    const foods = createFoodFromSnake(snake);

    // Should create food for approximately half the segments
    expect(foods.length).toBe(5); // Half of 10 segments
  });

  test("snake collision should result in death and food creation", () => {
    // Create two snakes
    const snake1 = new Snake({
      x: 100,
      y: 100,
      angle: 0,
      length: 10,
    });

    const snake2 = new Snake({
      x: 120, // Position in front of snake1
      y: 100,
      angle: Math.PI, // Facing opposite direction
      length: 8,
    });

    // Manually position to create collision
    snake1.x = snake2.segments[3].x;
    snake1.y = snake2.segments[3].y;

    // Check collision
    const collision = snake1.checkCollision(snake2);
    expect(collision).toBe(true);

    // Generate food from the dying snake
    const foods = createFoodFromSnake(snake1);

    // Verify food creation
    expect(foods.length).toBe(5); // Half of snake1's segments
    expect(foods[0].x).toBe(snake1.segments[0].x);
    expect(foods[0].y).toBe(snake1.segments[0].y);
  });
});
