interface PhysicsState {
  upwardForce: number;
  airControl: number;
  gravityScale: number;
}

export class PhysicsManager {
  private readonly BASE_GRAVITY = 980;
  private readonly MAX_UPWARD_FORCE = 0.4;

  calculatePhysics(
    velocity: { x: number; y: number },
    rotation: number,
    isGrounded: boolean,
    nitroActive: boolean
  ): PhysicsState {
    // Calculate upward force based on speed and rotation
    const speedFactor = Math.abs(velocity.x) / 400; // Normalized speed factor
    const rotationFactor = Math.max(0, -rotation / (Math.PI / 4)); // Positive when pointing up
    
    let upwardForce = speedFactor * rotationFactor * this.MAX_UPWARD_FORCE;
    let airControl = 0.3;
    let gravityScale = 1;

    // Enhanced physics during nitro
    if (nitroActive) {
      upwardForce *= 1.5;
      airControl *= 1.4;
      gravityScale *= 0.6;
    }

    // Additional lift when moving fast
    if (Math.abs(velocity.x) > 300) {
      upwardForce *= 1.2;
      gravityScale *= 0.85;
    }

    return {
      upwardForce,
      airControl,
      gravityScale
    };
  }

  getGravity(gravityScale: number): number {
    return this.BASE_GRAVITY * gravityScale;
  }
}