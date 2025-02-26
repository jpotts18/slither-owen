const { Snake } = require("../js/snake");

describe("Snake Boost Functionality", () => {
  let snake;

  beforeEach(() => {
    // Create a new snake before each test with a predictable boost setup
    snake = new Snake({
      x: 100,
      y: 100,
      angle: 0,
      speed: 2,
      boostSpeed: 4, // Double the normal speed
    });

    // Reset timing data
    snake.lastBoostTime = 0;
    snake.boostAmount = 100; // Full boost
  });

  test("should increase speed when boost is activated", () => {
    const normalSpeed = snake.speed;

    // Activate boost
    const boostActivated = snake.startBoost();

    expect(boostActivated).toBe(true);
    expect(snake.boosting).toBe(true);
    expect(snake.speed).toBe(snake.boostSpeed);
    expect(snake.speed).toBeGreaterThan(normalSpeed);
  });

  test("should not activate boost when boost meter is empty", () => {
    // Set boost amount to 0
    snake.boostAmount = 0;

    // Try to activate boost
    const boostActivated = snake.startBoost();

    expect(boostActivated).toBe(false);
    expect(snake.boosting).toBe(false);
    expect(snake.speed).toBe(snake.normalSpeed);
  });

  test("should deplete boost after the duration expires", () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    const mockNow = jest.fn();

    try {
      // Start with a fixed time
      const startTime = 1000;
      mockNow.mockReturnValue(startTime);
      global.Date.now = mockNow;

      // Activate boost
      snake.startBoost();
      expect(snake.boosting).toBe(true);

      // Move time forward just before duration expires
      mockNow.mockReturnValue(startTime + snake.boostDuration - 100);
      snake.updateBoost();
      expect(snake.boosting).toBe(true);

      // Move time forward past duration
      mockNow.mockReturnValue(startTime + snake.boostDuration + 100);
      snake.updateBoost();

      // Boost should be deactivated and depleted
      expect(snake.boosting).toBe(false);
      expect(snake.boostAmount).toBe(0);
      expect(snake.speed).toBe(snake.normalSpeed);
    } finally {
      // Restore original Date.now
      global.Date.now = originalNow;
    }
  });

  test("should recharge boost over time", () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    const mockNow = jest.fn();

    try {
      // Start with a fixed time
      const startTime = 1000;
      mockNow.mockReturnValue(startTime);
      global.Date.now = mockNow;

      // Activate and deplete boost
      snake.startBoost();
      mockNow.mockReturnValue(startTime + snake.boostDuration + 100);
      snake.updateBoost();
      expect(snake.boostAmount).toBe(0);

      // Move time forward 1.1 seconds (should recharge 22%)
      mockNow.mockReturnValue(startTime + snake.boostDuration + 1100);
      snake.updateBoost();
      expect(snake.boostAmount).toBeCloseTo(22, 0); // Approximately 22%

      // Move time forward 5 seconds total (should fully recharge)
      mockNow.mockReturnValue(startTime + snake.boostDuration + 5000); // Exactly 5 seconds
      snake.updateBoost();
      expect(snake.boostAmount).toBe(100);
    } finally {
      // Restore original Date.now
      global.Date.now = originalNow;
    }
  });

  test("should continuously drain boost while active", () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    const mockNow = jest.fn();

    try {
      // Start with a fixed time
      const startTime = 1000;
      mockNow.mockReturnValue(startTime);
      global.Date.now = mockNow;

      // Set boost pressed to true
      snake.boostPressed = true;

      // First update - should start boosting
      snake.updateBoost();
      expect(snake.boosting).toBe(true);
      expect(snake.boostAmount).toBe(100);

      // Move time forward 1 second - should drain 20%
      mockNow.mockReturnValue(startTime + 1000);
      snake.updateBoost();
      expect(snake.boostAmount).toBeCloseTo(80, 0);

      // Move time forward another second - should drain to 60%
      mockNow.mockReturnValue(startTime + 2000);
      snake.updateBoost();
      expect(snake.boostAmount).toBeCloseTo(60, 0);

      // Release boost button
      snake.boostPressed = false;
      snake.updateBoost();
      expect(snake.boosting).toBe(false);

      // Boost amount should stay at current level
      expect(snake.boostAmount).toBeCloseTo(60, 0);

      // Move time forward 2 seconds - should recharge by 40%
      mockNow.mockReturnValue(startTime + 4000);
      snake.updateBoost();
      expect(snake.boostAmount).toBeCloseTo(100, 0);
    } finally {
      // Restore original Date.now
      global.Date.now = originalNow;
    }
  });
});
