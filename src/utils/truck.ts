import { TerrainPoint, getTerrainHeightAt } from './terrain';
import { PhysicsManager } from './physics';
import { ScoreManager } from './scoring';
import { SoundManager, EngineState } from './sound';
import truckImage from '../assets/toyo van.png';

export class Truck {
  public readonly MAX_SPEED = 400;
  private readonly ACCELERATION = 300;
  private readonly AIR_CONTROL = 100;
  private readonly GRAVITY = 800;
  private readonly GROUND_FRICTION = 100;
  private readonly AIR_FRICTION = 30;
  private readonly BOUNCE_DAMPING = 0.5;
  private readonly SUSPENSION_STIFFNESS = 0.3;
  private readonly SUSPENSION_DAMPING = 0.5;
  private readonly SUSPENSION_TRAVEL = 20;
  private readonly NITRO_MULTIPLIER = 2.5;
  private readonly NITRO_MAX = 100;
  private readonly NITRO_RECHARGE_BASE = 25;
  private readonly NITRO_DEPLETION_RATE = 45;
  private readonly NITRO_CONSUMPTION_RATE = 10;
  private readonly MAX_REVERSE_SPEED = 200;
  private readonly REVERSE_ACCELERATION = 200;
  private readonly BRAKE_FORCE = 0.5;

  // Truck state
  public x: number;
  public y: number;
  public rotation: number = 0;
  public velocity: { x: number; y: number } = { x: 0, y: 0 };
  public width: number;
  public height: number;
  public wheelBase: number;
  public grounded: boolean = false;
  public nitroFuel: number = 100;
  public nitroActive: boolean = false;
  private currentMaxSpeed: number = this.MAX_SPEED;
  private targetRotation: number;
  private airRotationSpeed: number;
  private physicsManager: PhysicsManager;
  private scoreManager: ScoreManager;
  private soundManager: SoundManager;
  private image: HTMLImageElement;
  private imageLoaded: boolean;
  private landingBounce: number = 0;
  private lastGroundedState: boolean = false;
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
  }> = [];
  private currentAirTime: number = 0;
  private maxAirTime: number = 0;
  private totalAirTime: number = 0;
  private isAccelerating: boolean = false;
  private isReversing: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = 80;
    this.height = 40;
    this.wheelBase = 40;
    this.airRotationSpeed = 3.0;
    this.physicsManager = new PhysicsManager();
    this.scoreManager = new ScoreManager();
    this.soundManager = new SoundManager();
    this.soundManager.setEngineSounds({
      [EngineState.ACCELERATION]: '/sounds/mid-acceleration engine.wav',
      [EngineState.DECELERATION]: '/sounds/deceleration final.wav',
      [EngineState.REVERSE]: '/sounds/mid-acceleration engine.wav',
      [EngineState.IDLE]: '/sounds/idle.wav'
    });
    this.soundManager.setBackgroundMusic('/sounds/retro-racing-theme.wav');
    this.soundManager.playBackgroundMusic(0.5);
    this.image = new Image();
    this.image.src = truckImage;
    this.imageLoaded = false;
  }

  getScore() {
    return this.scoreManager.getScore();
  }

  getAirTime(): { current: number; max: number } {
    return {
      current: this.currentAirTime,
      max: this.maxAirTime
    };
  }

  getSpeed(): number {
    return Math.abs(this.velocity.x);
  }

  updateNitro(deltaTime: number, spacePressed: boolean) {
    if (spacePressed && this.nitroFuel > 0 && !this.nitroActive) {
      this.nitroActive = true;
    }

    if (this.nitroActive) {
      this.nitroFuel = Math.max(0, this.nitroFuel - this.NITRO_DEPLETION_RATE * deltaTime);
      
      if (this.nitroFuel <= 0) {
        this.nitroActive = false;
      }
    } else if (this.nitroFuel < 100) {
      const baseRecharge = this.NITRO_RECHARGE_BASE * deltaTime;
      const movementPenalty = Math.abs(this.velocity.x) / this.MAX_SPEED;
      const rechargeRate = baseRecharge * (1 + (Math.abs(this.velocity.x) < 1 ? 0.8 : -movementPenalty * 0.5));
      
      this.nitroFuel = Math.min(100, this.nitroFuel + rechargeRate);
    }

    return this.nitroActive;
  }

  accelerate(deltaTime: number, useNitro: boolean = false) {
    const nitroActive = this.updateNitro(deltaTime, useNitro);
    const nitroMultiplier = nitroActive ? this.NITRO_MULTIPLIER : 1;
    const currentMaxSpeed = this.MAX_SPEED * nitroMultiplier;

    if (!this.grounded) {
      const { airControl } = this.physicsManager.calculatePhysics(
        this.velocity,
        this.rotation,
        this.grounded,
        nitroActive
      );
      
      this.velocity.x = Math.min(
        this.velocity.x + this.ACCELERATION * deltaTime * airControl,
        currentMaxSpeed
      );
      return;
    }

    const acceleration = useNitro && this.nitroFuel > 0 ? this.ACCELERATION * 2 : this.ACCELERATION;
    this.velocity.x = Math.min(this.velocity.x + acceleration * deltaTime, useNitro ? this.MAX_SPEED * 1.5 : this.MAX_SPEED);
    
    // Update engine sound based on state
    this.soundManager.updateEngineSound(true, false, this.velocity.x);
    this.isAccelerating = true;
    
    if (useNitro && this.nitroFuel > 0) {
      this.nitroFuel = Math.max(0, this.nitroFuel - this.NITRO_CONSUMPTION_RATE * deltaTime);
    }
  }

  reverse(deltaTime: number) {
    if (Math.abs(this.velocity.x) > this.MAX_REVERSE_SPEED * 0.1) {
      // Apply braking force first
      this.velocity.x *= (1 - this.BRAKE_FORCE * deltaTime);
    } else {
      // Then start reversing
      this.velocity.x = Math.max(this.velocity.x - this.REVERSE_ACCELERATION * deltaTime, -this.MAX_REVERSE_SPEED);
    }
    
    // Update engine sound for reverse
    this.soundManager.updateEngineSound(false, true, this.velocity.x);
    this.isReversing = true;
  }

  idle(deltaTime: number) {
    // Apply air/ground resistance
    const resistanceFactor = this.grounded ? 0.95 : 0.99;
    this.velocity.x *= resistanceFactor;
    if (Math.abs(this.velocity.x) < 1) this.velocity.x = 0;
    
    // Update sound for deceleration/idle
    this.soundManager.updateEngineSound(false, false, this.velocity.x);
    this.isAccelerating = false;
    this.isReversing = false;
  }

  update(deltaTime: number, terrain: TerrainPoint[]) {
    // Store previous grounded state
    const wasGrounded = this.grounded;
    
    // Update score
    this.scoreManager.update(deltaTime, this.grounded, this.velocity, this.rotation);

    this.x += this.velocity.x * deltaTime;
    this.y += this.velocity.y * deltaTime;

    const frontWheelX = this.x + this.wheelBase / 2;
    const backWheelX = this.x - this.wheelBase / 2;
    
    const frontWheelY = getTerrainHeightAt(frontWheelX, terrain);
    const backWheelY = getTerrainHeightAt(backWheelX, terrain);

    this.targetRotation = Math.atan2(frontWheelY - backWheelY, this.wheelBase);
    
    const groundY = (frontWheelY + backWheelY) / 2 - this.height / 2;
    const distanceToGround = groundY - this.y;
    
    this.lastGroundedState = this.grounded;
    this.grounded = distanceToGround < 1;

    // Landing bounce effect
    if (!wasGrounded && this.grounded && Math.abs(this.velocity.y) > 200) {
      this.landingBounce = Math.min(0.3, Math.abs(this.velocity.y) / 2000);
    }
    if (this.landingBounce > 0) {
      this.landingBounce = Math.max(0, this.landingBounce - deltaTime * 2);
    }

    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vy += 400 * deltaTime; // Gravity
      particle.life -= deltaTime;
      return particle.life > 0;
    });

    // Create new particles when moving on ground
    if (this.grounded && Math.abs(this.velocity.x) > 50) {
      const particleCount = Math.floor(Math.abs(this.velocity.x) / 100);
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: this.x - this.width / 2 + Math.random() * 20,
          y: this.y + this.height / 2,
          vx: -Math.abs(this.velocity.x) * 0.3 * (0.5 + Math.random() * 0.5),
          vy: -Math.random() * 200,
          life: 0.5 + Math.random() * 0.5,
          maxLife: 1,
          size: 2 + Math.random() * 3
        });
      }
    }

    // Update air time
    if (!this.grounded) {
      this.currentAirTime += deltaTime;
      this.maxAirTime = Math.max(this.maxAirTime, this.currentAirTime);
    } else {
      this.currentAirTime = 0;
    }

    // Calculate terrain angle at current position
    const currentPoint = terrain.find(p => p.x > this.x - 5 && p.x < this.x + 5);
    const nextPoint = terrain.find(p => p.x > this.x + 5 && p.x < this.x + 15);
    
    if (currentPoint && nextPoint) {
      const angle = Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x);
      const slopeThreshold = 0.5; // About 28 degrees
      const speed = Math.abs(this.velocity.x);
      
      // If slope is steep enough and we're going fast enough, become airborne
      if (Math.abs(angle) > slopeThreshold && speed > this.MAX_SPEED * 0.4) {
        this.grounded = false;
        // Add upward velocity based on slope angle and speed
        this.velocity.y = -Math.sin(angle) * speed * 0.5;
      }
    }

    // Calculate physics state
    const physics = this.physicsManager.calculatePhysics(
      this.velocity,
      this.rotation,
      this.grounded,
      this.nitroActive
    );

    // Apply physics
    const gravity = this.physicsManager.getGravity(physics.gravityScale);
    this.velocity.y += (gravity - physics.upwardForce * 1000) * deltaTime;

    if (this.grounded) {
      const suspensionForce = distanceToGround * this.SUSPENSION_STIFFNESS;
      this.velocity.y *= this.SUSPENSION_DAMPING;
      this.y += suspensionForce;

      const slopeFactor = Math.abs(Math.sin(this.rotation));
      this.velocity.x -= this.velocity.x * slopeFactor * deltaTime * 2;
      
      const rotationDiff = this.targetRotation - this.rotation;
      this.rotation += rotationDiff * this.SUSPENSION_STIFFNESS;
    } else {
      const airTimeMultiplier = this.nitroActive ? 1.5 : 1;
      const targetRotation = this.velocity.x > 0 ? -0.2 : 0.2;
      const rotationDiff = targetRotation - this.rotation;
      
      this.rotation += rotationDiff * this.airRotationSpeed * deltaTime * airTimeMultiplier;
    }

    this.rotation = Math.max(Math.min(this.rotation, Math.PI / 2.5), -Math.PI / 2.5);

    // Update sound if not accelerating or reversing (for deceleration sound)
    if (!this.isAccelerating && !this.isReversing) {
      this.soundManager.updateEngineSound(false, false, this.velocity.x);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw particles behind the truck
    this.particles.forEach(particle => {
      const alpha = (particle.life / particle.maxLife) * 0.6;
      ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x - this.x, particle.y - (this.y + this.height / 2), particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.translate(this.x, this.y + this.height / 2);
    ctx.rotate(this.rotation);

    // Apply bounce scale effect
    const bounceScaleY = 1 - this.landingBounce;
    const bounceScaleX = 1 + this.landingBounce * 0.5;
    ctx.scale(bounceScaleX, bounceScaleY);

    // Draw shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    if (this.image.complete) {
      // Draw the truck image
      ctx.drawImage(
        this.image,
        -this.width / 2,
        -this.height,
        this.width,
        this.height
      );
    } else {
      // Fallback rectangle if image hasn't loaded
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
    }
    ctx.restore();

    // Draw retro-style nitro effect when active
    if (this.nitroActive) {
      const flameCount = 3;
      const baseFlameLength = 25;
      const flameWidth = 8;
      
      for (let i = 0; i < flameCount; i++) {
        const flameLength = baseFlameLength * (0.7 + Math.random() * 0.3);
        const yOffset = (i - 1) * flameWidth;
        
        // Create flame path
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -this.height / 2 + yOffset);
        
        // Zigzag flame effect
        ctx.lineTo(-this.width / 2 - flameLength * 0.3, -this.height / 2 + yOffset - flameWidth * 0.3);
        ctx.lineTo(-this.width / 2 - flameLength * 0.6, -this.height / 2 + yOffset + flameWidth * 0.3);
        ctx.lineTo(-this.width / 2 - flameLength, -this.height / 2 + yOffset);
        
        // Create gradient for each flame
        const gradient = ctx.createLinearGradient(
          -this.width / 2,
          0,
          -this.width / 2 - flameLength,
          0
        );
        
        // Retro-style flame colors
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 0, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  destroy() {
    this.soundManager.stopAll();
  }
}