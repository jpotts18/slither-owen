class Food {
  constructor(config = {}) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.size = config.size || 5;
    this.color = config.color || 0xffffff;
    this.value = config.value || 1; // Default value is 1, snake food is worth more
  }

  respawn(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
  }
}

// Export for testing in Node.js environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Food };
}
