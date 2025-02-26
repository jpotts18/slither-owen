class Snake {
  constructor(config = {}) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.angle = config.angle || 0;
    this.normalSpeed = config.speed || 2;
    this.speed = this.normalSpeed;
    this.boostSpeed = config.boostSpeed || this.normalSpeed * 2;
    this.boosting = false;
    this.boostAmount = 100; // Percentage (0-100)
    this.boostDuration = 5000; // 5 seconds in milliseconds (changed from 1 second)
    this.boostCooldown = 5000; // 5 seconds in milliseconds
    this.lastBoostTime = 0;
    this.targetAngle = this.angle;
    this.turnSpeed = config.turnSpeed || 0.1;
    this.segments = [];
    this.segmentDistance = config.segmentDistance || 10;
    this.size = config.size || 10;
    this.length = config.length || 10;
    this.color = config.color || 0xff0000;
    this.boostPressed = false; // Track if boost button is being held

    // Initialize segments
    this.initSegments();
  }

  initSegments() {
    this.segments = [];
    let prevX = this.x;
    let prevY = this.y;

    for (let i = 0; i < this.length; i++) {
      // Place segments behind the head
      const segment = {
        x: prevX - Math.cos(this.angle) * this.segmentDistance * i,
        y: prevY - Math.sin(this.angle) * this.segmentDistance * i,
      };

      this.segments.push(segment);
    }
  }

  setTarget(x, y) {
    // Calculate angle to target
    this.targetAngle = Math.atan2(y - this.y, x - this.x);
  }

  update() {
    // Update boost state before moving
    this.updateBoost();

    // Smoothly rotate towards target angle
    let angleDiff = this.targetAngle - this.angle;

    // Normalize angle difference to be between -PI and PI
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Apply turn speed
    if (Math.abs(angleDiff) > 0.01) {
      this.angle += angleDiff * this.turnSpeed;
    }

    // Normalize angle
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    if (this.angle < 0) this.angle += Math.PI * 2;

    // Move head
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Update segments (follow the leader)
    let prevX = this.x;
    let prevY = this.y;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];

      // Calculate direction to previous point
      const dx = prevX - segment.x;
      const dy = prevY - segment.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only move if we're too far from the previous point
      if (distance > this.segmentDistance) {
        const moveRatio = (distance - this.segmentDistance) / distance;
        segment.x += dx * moveRatio;
        segment.y += dy * moveRatio;
      }

      prevX = segment.x;
      prevY = segment.y;
    }
  }

  grow(amount = 1) {
    for (let i = 0; i < amount; i++) {
      const lastSegment = this.segments[this.segments.length - 1];
      const secondLastSegment =
        this.segments[this.segments.length - 2] || lastSegment;

      // Calculate direction from second last to last segment
      const angle = Math.atan2(
        lastSegment.y - secondLastSegment.y,
        lastSegment.x - secondLastSegment.x
      );

      // Add new segment behind the last one
      this.segments.push({
        x: lastSegment.x + Math.cos(angle) * this.segmentDistance,
        y: lastSegment.y + Math.sin(angle) * this.segmentDistance,
      });
    }
    this.length += amount;
  }

  checkCollision(other) {
    // Skip self collisions according to updated requirements
    if (other === this) {
      return false; // Never consider collisions with self
    }

    // For other snakes, check if our head collides with their body
    for (let i = 0; i < other.segments.length; i++) {
      const segment = other.segments[i];
      const dx = this.x - segment.x;
      const dy = this.y - segment.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.size) {
        return true;
      }
    }

    return false;
  }

  checkFoodCollision(food) {
    const dx = this.x - food.x;
    const dy = this.y - food.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < this.size + food.size;
  }

  startBoost() {
    // Only boost if we have enough boost amount and not already boosting
    if (this.boostAmount > 0 && !this.boosting) {
      this.boosting = true;
      this.speed = this.boostSpeed;
      this.lastBoostTime = Date.now();
      return true;
    }
    return false;
  }

  stopBoost() {
    if (this.boosting) {
      this.boosting = false;
      this.speed = this.normalSpeed;
      // Record the time when boost stopped
      this.lastBoostTime = Date.now();
    }
  }

  updateBoost() {
    const currentTime = Date.now();

    // If boost button is pressed and we have boost available
    if (this.boostPressed && this.boostAmount > 0) {
      // If not already boosting, start the boost
      if (!this.boosting) {
        this.startBoost();
      }
    } else if (!this.boostPressed && this.boosting) {
      // If boost button is released, stop boosting
      this.stopBoost();
    }

    // Handle active boost - continuously drain boost while active
    if (this.boosting) {
      // Calculate how much boost to drain based on elapsed time
      const timeElapsed = currentTime - this.lastBoostTime;
      const drainRate = 100 / (this.boostDuration / 1000); // % per second
      const elapsedSeconds = timeElapsed / 1000;
      const drainAmount = drainRate * elapsedSeconds;

      // Reduce boost amount
      this.boostAmount = Math.max(0, this.boostAmount - drainAmount);

      // Update last boost time to continually drain
      this.lastBoostTime = currentTime;

      // If boost is depleted, stop boosting
      if (this.boostAmount <= 0) {
        this.boosting = false;
        this.speed = this.normalSpeed;
      }
    }
    // Handle boost recharge when not boosting
    else if (this.boostAmount < 100) {
      // Calculate time since last boost ended
      const timeSinceBoost = currentTime - this.lastBoostTime;

      if (timeSinceBoost > 0) {
        // Recharge at 20% per second
        const rechargeRate = 100 / (this.boostCooldown / 1000); // % per second
        const elapsedSeconds = timeSinceBoost / 1000;

        // Calculate new boost amount
        this.boostAmount = Math.min(
          100,
          this.boostAmount + rechargeRate * elapsedSeconds
        );

        // Update last boost time to avoid continuous recharging
        this.lastBoostTime = currentTime;
      }
    }
  }
}

// Export for testing in Node.js environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Snake };
}
