import { InternalForce, NoisePoint } from '../types.js';

/**
 * Manages internal forces that create organic blob deformation
 */
export class ForceSystem {
  private forces: InternalForce[] = [];
  private sensitivity: number;
  private fadeMultiplier: number;

  constructor(sensitivity: number = 0.05) {
    this.sensitivity = sensitivity;
    this.fadeMultiplier = 1;
  }

  /**
   * Update force system based on audio volume
   */
  update(smoothedVolume: number, dynamicSensitivityThreshold: number): void {
    // Remove expired forces
    this.forces = this.forces.filter(force => force.life > 0);

    // Only create forces if above dynamic sensitivity threshold
    if (smoothedVolume > dynamicSensitivityThreshold) {
      // Create new forces based on audio level
      const creationRate = (smoothedVolume - dynamicSensitivityThreshold) * 0.5;
      if (Math.random() < creationRate) {
        const newForce: InternalForce = {
          angle: Math.random() * Math.PI * 2,
          strength: 10 + (smoothedVolume - dynamicSensitivityThreshold) * 50,
          life: 1.0,
          decay: 0.008 + Math.random() * 0.012,
          speed: 0.3 + Math.random() * 1.0,
          distance: 0,
          maxDistance: 20 + (smoothedVolume - dynamicSensitivityThreshold) * 60
        };
        this.forces.push(newForce);
      }
    }

    // Update existing forces with enhanced fading
    this.forces.forEach(force => {
      const baseDecay = smoothedVolume < dynamicSensitivityThreshold ? 2.5 : 1;
      const fadeDecay = (1 - this.fadeMultiplier) * 2;
      force.life -= force.decay * (baseDecay + fadeDecay);
      force.distance += force.speed;
      force.distance = Math.min(force.distance, force.maxDistance);
      force.angle += 0.005; // Slight rotation
    });
  }

  /**
   * Calculate force influence at a given angle
   */
  getInfluenceAt(angle: number): number {
    let totalInfluence = 0;

    this.forces.forEach(force => {
      // Calculate angular distance
      let angleDiff = Math.abs(angle - force.angle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      // Force influence decreases with angular distance
      const angularFalloff = Math.max(0, 1 - (angleDiff / (Math.PI * 0.4)));

      // Force influence based on life and distance from center
      const forceAmount = force.strength * force.life * angularFalloff;
      const distanceEffect = Math.sin((force.distance / force.maxDistance) * Math.PI);

      totalInfluence += forceAmount * distanceEffect;
    });

    return totalInfluence;
  }

  /**
   * Set fade multiplier for smooth transitions
   */
  setFadeMultiplier(fade: number): void {
    this.fadeMultiplier = fade;
  }

  /**
   * Get current number of active forces
   */
  getActiveCount(): number {
    return this.forces.length;
  }

  /**
   * Clear all forces
   */
  clear(): void {
    this.forces = [];
  }
}

/**
 * Manages noise points for organic shape variation
 */
export class NoiseSystem {
  private points: NoisePoint[] = [];
  private numPoints: number;

  constructor(pointCount: number = 24) {
    this.numPoints = pointCount;
    this.initializePoints();
  }

  /**
   * Initialize noise points with random properties
   */
  private initializePoints(): void {
    this.points = [];
    for (let i = 0; i < this.numPoints; i++) {
      this.points.push({
        angle: (i / this.numPoints) * Math.PI * 2,
        speed: 0.001 + Math.random() * 0.002,
        amplitude: 0.3 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Get organic noise variation at a given angle and time
   */
  getNoiseAt(angle: number, time: number): number {
    // Find the closest noise points
    const normalizedAngle = angle % (Math.PI * 2);
    const pointIndex = Math.floor((normalizedAngle / (Math.PI * 2)) * this.numPoints);
    const point = this.points[pointIndex];

    if (!point) return 0;

    // Generate organic noise
    return (Math.sin(angle * 4 + time * 0.6) * 4 + 
            Math.sin(angle * 5 - time * 0.4) * 2);
  }

  /**
   * Update point count and reinitialize if needed
   */
  setPointCount(count: number): void {
    if (count !== this.numPoints) {
      this.numPoints = count;
      this.initializePoints();
    }
  }
}