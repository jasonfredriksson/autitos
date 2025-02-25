export interface Star {
  x: number;
  y: number;
  brightness: number;
}

export class SkyManager {
  private time: number = 0;
  private readonly DAY_DURATION = 1200; // 20 minutes per day cycle
  private stars: Star[] = [];
  
  constructor() {
    // Generate random stars
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.7, // Keep stars in upper 70% of sky
        brightness: Math.random() * 0.5 + 0.5 // Brightness between 0.5 and 1
      });
    }
  }

  update(deltaTime: number) {
    this.time = (this.time + deltaTime) % this.DAY_DURATION;
  }

  // Returns value between 0 (midnight) and 1 (noon)
  getDayProgress(): number {
    return Math.sin(this.time / this.DAY_DURATION * Math.PI * 2) * 0.5 + 0.5;
  }

  // Get sky colors based on time of day
  getSkyGradient(): { top: string; bottom: string } {
    const progress = this.getDayProgress();
    
    // Smoother transitions throughout the day
    if (progress < 0.2) { // Deep night
      return {
        top: '#0a0a2c',
        bottom: '#1a1b4b'
      };
    } else if (progress < 0.4) { // Dawn transition
      const t = (progress - 0.2) / 0.2;
      return {
        top: this.lerpColor('#0a0a2c', '#FF7F50', this.smoothStep(t)),
        bottom: this.lerpColor('#1a1b4b', '#87CEEB', this.smoothStep(t))
      };
    } else if (progress < 0.6) { // Day
      const t = (progress - 0.4) / 0.2;
      return {
        top: this.lerpColor('#FF7F50', '#4B9FE1', this.smoothStep(t)),
        bottom: this.lerpColor('#87CEEB', '#87CEEB', this.smoothStep(t))
      };
    } else if (progress < 0.8) { // Dusk transition
      const t = (progress - 0.6) / 0.2;
      return {
        top: this.lerpColor('#4B9FE1', '#FF7F50', this.smoothStep(t)),
        bottom: this.lerpColor('#87CEEB', '#1a1b4b', this.smoothStep(t))
      };
    } else { // Night
      const t = (progress - 0.8) / 0.2;
      return {
        top: this.lerpColor('#FF7F50', '#0a0a2c', this.smoothStep(t)),
        bottom: this.lerpColor('#1a1b4b', '#1a1b4b', this.smoothStep(t))
      };
    }
  }

  getStars(): Star[] {
    const progress = this.getDayProgress();
    
    // Smoother star visibility transitions
    let opacity = 1;
    
    if (progress > 0.2 && progress < 0.4) {
      // Dawn fade out
      opacity = 1 - this.smoothStep((progress - 0.2) / 0.2);
    } else if (progress >= 0.4 && progress <= 0.6) {
      // Day (no stars)
      opacity = 0;
    } else if (progress > 0.6 && progress < 0.8) {
      // Dusk fade in
      opacity = this.smoothStep((progress - 0.6) / 0.2);
    }
    
    return this.stars.map(star => ({
      ...star,
      brightness: star.brightness * opacity
    }));
  }

  // Smooth step function for more natural transitions
  private smoothStep(t: number): number {
    // Smoother cubic transition
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    // Convert hex to RGB
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
