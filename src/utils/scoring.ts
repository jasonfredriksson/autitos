export interface Score {
  totalScore: number;
  airTime: number;
  lastTrickScore: number;
}

export class ScoreManager {
  private score: Score;
  private readonly POINTS_PER_SECOND = 1000; // Points awarded per second of air time
  private wasGrounded: boolean = true;

  constructor() {
    this.score = {
      totalScore: 0,
      airTime: 0,
      lastTrickScore: 0
    };
  }

  getScore(): Score {
    return { ...this.score };
  }

  update(deltaTime: number, isGrounded: boolean, velocity: { x: number; y: number }, rotation: number) {
    // Track when we leave the ground
    if (this.wasGrounded && !isGrounded) {
      this.score.airTime = 0;
      this.score.lastTrickScore = 0;
    }

    // Update air time and calculate score while in air
    if (!isGrounded) {
      this.score.airTime += deltaTime;
      // Calculate current trick score based on air time
      this.score.lastTrickScore = Math.floor(this.score.airTime * this.POINTS_PER_SECOND);
    } 
    // When landing after being in air
    else if (!this.wasGrounded && isGrounded) {
      // Only count if we had some air time
      if (this.score.airTime > 0.2) { // Minimum air time threshold
        this.score.totalScore += this.score.lastTrickScore;
      }
      this.score.airTime = 0;
      this.score.lastTrickScore = 0;
    }

    this.wasGrounded = isGrounded;
  }
}