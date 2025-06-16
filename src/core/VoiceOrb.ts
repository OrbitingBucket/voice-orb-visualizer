import { VoiceOrbOptions, AudioMode, BlobPoint, CalibrationData } from '../types.js';
import { AudioPipeline } from './audio-pipeline.js';
import { ForceSystem } from './forces.js';
import { getCanvas, clamp, easeOutCubic } from './utils.js';

/**
 * Main VoiceOrb class that manages the visual audio blob
 */
export class VoiceOrb {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: any;
  
  // Core systems
  private audioPipeline: AudioPipeline;
  private forceSystem: ForceSystem;
  
  // Animation state
  private animationId: number | null = null;
  private currentMode: AudioMode = 'stopped';
  private time: number = 0;
  
  // Visual state
  private orbX: number = 0;
  private orbY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private smoothedVolume: number = 0;
  private targetVolume: number = 0;
  private lastAudioTime: number = 0;
  private fadeMultiplier: number = 1;
  private previousVolumeLevel: number = 0;
  
  // Default options (with proper callback handling)
  private static readonly DEFAULT_OPTIONS = {
    // Size & Layout
    radius: 100,
    padding: 10,
    
    // Visual
    color: '#2563eb',
    fillMode: 'solid' as const,
    gradientStops: [
      { offset: 0, color: '#2563eb' },
      { offset: 1, color: '#81e6d9' }
    ],
    strokeWidth: 0,
    strokeColor: '#ffffff',
    opacity: 1,
    
    // Audio Processing
    mode: 'microphone' as const,
    fftSize: 512,
    smoothingTimeConstant: 0.8,
    autoCalibration: true,
    baselineNoise: 0.02,
    sensitivity: 0.05,
    loudThreshold: 0.4,
    veryLoudThreshold: 0.7,
    adaptiveGain: 1.0,
    volumeLerpFactor: 0.12,
    
    // Motion & Shape
    pointCount: 24,
    noiseIntensity: 0.3,
    noiseSpeed: 1.0,
    forceStrength: 1.0,
    forceDecayRate: 1.0,
    animationSpeed: 1.0,
    maxOffset: 50,
    fadeInMs: 300,
    fadeOutMs: 1200,
    
    // Performance
    fpsLimit: 60,
    debug: false,
    
    // Accessibility
    theme: 'auto' as const,
    reducedMotion: false,
    ariaLabel: 'Voice activity visualizer',
    
    // Callbacks
    onCalibrated: undefined as ((baseline: number, gain: number) => void) | undefined,
    onVolume: undefined as ((volume: number) => void) | undefined,
    onError: undefined as ((error: Error) => void) | undefined,
    onModeChange: undefined as ((mode: string) => void) | undefined,
  };

  constructor(canvasOrSelector: HTMLCanvasElement | string, options: VoiceOrbOptions = {}) {
    // Get canvas element
    this.canvas = getCanvas(canvasOrSelector);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    
    // Merge options with defaults
    this.options = { ...VoiceOrb.DEFAULT_OPTIONS, ...options };
    
    // Initialize systems
    this.audioPipeline = new AudioPipeline({
      fftSize: this.options.fftSize,
      smoothingTimeConstant: this.options.smoothingTimeConstant,
      onCalibrated: (data) => {
        this.options.onCalibrated?.(data.baseline, data.gain);
      },
      onError: (error) => {
        this.options.onError?.(error);
      }
    });
    
    this.forceSystem = new ForceSystem(this.options.sensitivity);
    
    // Setup canvas
    this.setupCanvas();
    
    // Setup resize handler
    window.addEventListener('resize', () => this.setupCanvas());
    
    // Setup accessibility
    this.setupAccessibility();
    
    // Start idle animation
    this.startAnimation();
  }

  /**
   * Setup canvas size and position
   */
  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    // Set CSS size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    
    // Update orb position
    this.orbX = rect.width / 2;
    this.orbY = rect.height / 2;
    this.targetX = this.orbX;
    this.targetY = this.orbY;
    this.currentX = this.orbX;
    this.currentY = this.orbY;
  }

  /**
   * Setup accessibility attributes
   */
  private setupAccessibility(): void {
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', this.options.ariaLabel);
    this.canvas.setAttribute('aria-live', 'polite');
  }

  /**
   * Start microphone mode
   */
  async startMicrophone(): Promise<void> {
    try {
      await this.audioPipeline.initMicrophone();
      this.currentMode = 'microphone';
      this.options.onModeChange?.('microphone');
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Start assistant mode for streaming audio
   */
  async startAssistant(): Promise<void> {
    try {
      await this.audioPipeline.initAssistant();
      this.currentMode = 'assistant';
      this.options.onModeChange?.('assistant');
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Start test mode with simulated audio
   */
  startTest(): void {
    this.currentMode = 'test';
    this.options.onModeChange?.('test');
  }

  /**
   * Stop all audio processing
   */
  async stop(): Promise<void> {
    this.currentMode = 'stopped';
    await this.audioPipeline.cleanup();
    this.forceSystem.clear();
    this.resetVisualState();
    this.options.onModeChange?.('stopped');
  }

  /**
   * Process audio stream data (for assistant mode)
   */
  processAudioStream(audioData: ArrayBuffer | AudioBuffer | string): void {
    this.audioPipeline.processAudioStream(audioData);
  }

  /**
   * Connect existing audio element to visualizer
   */
  connectAudio(audioElement: HTMLAudioElement): boolean {
    return this.audioPipeline.connectStreamingAudio(audioElement);
  }

  /**
   * Update options at runtime
   */
  setOptions(newOptions: Partial<VoiceOrbOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Update systems if needed
    if (newOptions.pointCount) {
      // Force system will handle this internally
    }
    
    // Update accessibility
    if (newOptions.ariaLabel) {
      this.canvas.setAttribute('aria-label', newOptions.ariaLabel);
    }
  }

  /**
   * Get current options
   */
  getOptions(): Readonly<VoiceOrbOptions> {
    return { ...this.options };
  }

  /**
   * Get current mode
   */
  getMode(): AudioMode {
    return this.currentMode;
  }

  /**
   * Get calibration status
   */
  getCalibrationStatus(): { isCalibrating: boolean; progress: number; samplesCount: number } {
    return this.audioPipeline.getCalibrationStatus();
  }

  /**
   * Reset visual state
   */
  private resetVisualState(): void {
    this.smoothedVolume = 0;
    this.targetVolume = 0;
    this.fadeMultiplier = 1;
    this.previousVolumeLevel = 0;
    this.targetX = this.orbX;
    this.targetY = this.orbY;
  }

  /**
   * Start animation loop
   */
  private startAnimation(): void {
    if (this.animationId) return;
    
    const animate = () => {
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Stop animation loop
   */
  private stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main drawing function
   */
  private draw(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Get current volume
    const rawVolume = this.audioPipeline.getVolume(this.currentMode);
    const thresholds = this.audioPipeline.getThresholds();
    
    // Track when we last had significant audio (before fade processing)
    if (rawVolume > thresholds.sensitivity) {
      this.lastAudioTime = performance.now();
    }
    
    // Enhanced fading system
    const timeSinceAudio = performance.now() - this.lastAudioTime;
    const fadeProgress = Math.min(timeSinceAudio / this.options.fadeOutMs, 1);
    const fadeFactor = 1 - easeOutCubic(fadeProgress);
    
    // Apply fade factor to volume for smooth return to circle
    this.targetVolume = rawVolume * fadeFactor;
    this.smoothedVolume += (this.targetVolume - this.smoothedVolume) * this.options.volumeLerpFactor;
    
    // Enhanced fade multiplier system
    const currentVolumeLevel = this.smoothedVolume;
    if (currentVolumeLevel < this.previousVolumeLevel) {
      this.fadeMultiplier *= 0.96; // Gradual fade out
    } else {
      this.fadeMultiplier += (1 - this.fadeMultiplier) * 0.15;
    }
    this.fadeMultiplier = clamp(this.fadeMultiplier, 0, 1);
    this.previousVolumeLevel = currentVolumeLevel;
    
    // Update force system
    this.forceSystem.setFadeMultiplier(this.fadeMultiplier);
    this.forceSystem.update(this.smoothedVolume, thresholds.sensitivity);
    
    // Additional tracking for smoothed volume (for internal force system)
    if (this.smoothedVolume > thresholds.sensitivity) {
      // This ensures forces stay active
    }
    
    // Check if we have active effects
    const effectiveVolume = this.smoothedVolume * this.fadeMultiplier;
    const hasActiveEffects = effectiveVolume >= thresholds.sensitivity || this.forceSystem.getActiveCount() > 0;
    
    // Draw the orb
    this.drawOrb(effectiveVolume, thresholds, hasActiveEffects);
    
    // Update time
    this.time += effectiveVolume > thresholds.sensitivity ? 0.006 : 0.001;
    
    // Callback for volume
    this.options.onVolume?.(effectiveVolume);
    
    // Draw debug info if enabled
    if (this.options.debug) {
      this.drawDebugInfo(rawVolume, effectiveVolume, thresholds);
    }
  }

  /**
   * Draw the orb shape
   */
  private drawOrb(effectiveVolume: number, thresholds: CalibrationData, hasActiveEffects: boolean): void {
    // Set fill style
    this.ctx.fillStyle = this.options.color;
    this.ctx.globalAlpha = this.options.opacity;
    
    if (!hasActiveEffects) {
      // Smoothly return to center when inactive
      this.targetX = this.orbX;
      this.targetY = this.orbY;
      this.currentX += (this.targetX - this.currentX) * 0.05;
      this.currentY += (this.targetY - this.currentY) * 0.05;
      
      // Perfect circle when below threshold and no effects
      this.ctx.beginPath();
      this.ctx.arc(this.currentX, this.currentY, this.options.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
    } else {
      // Calculate movement based on volume level
      this.updateOrbMovement(effectiveVolume, thresholds);
      
      // Generate organic blob shape
      const blobPoints = this.generateBlobPoints(effectiveVolume, thresholds);
      
      // Draw smooth blob
      this.drawBlob(blobPoints);
    }
    
    // Reset alpha
    this.ctx.globalAlpha = 1;
  }

  /**
   * Update orb movement based on audio level
   */
  private updateOrbMovement(effectiveVolume: number, thresholds: CalibrationData): void {
    let moveAmount = 0;
    let moveSpeed = 1;
    
    if (effectiveVolume > thresholds.veryLoudThreshold) {
      // Very loud: dramatic movement
      const agitation = (effectiveVolume - thresholds.veryLoudThreshold) * 2;
      moveAmount = agitation * 30;
      moveSpeed = 2 + agitation * 6;
      this.targetX = this.orbX + Math.sin(this.time * moveSpeed) * moveAmount + 
                   Math.sin(this.time * moveSpeed * 1.3) * moveAmount * 0.5;
      this.targetY = this.orbY + Math.cos(this.time * moveSpeed * 0.8) * moveAmount + 
                   Math.cos(this.time * moveSpeed * 1.2) * moveAmount * 0.4;
    } else if (effectiveVolume > thresholds.loudThreshold) {
      // Loud: moderate movement
      const agitation = (effectiveVolume - thresholds.loudThreshold) * 3;
      moveAmount = agitation * 20;
      moveSpeed = 1.5 + agitation * 3;
      this.targetX = this.orbX + Math.sin(this.time * moveSpeed) * moveAmount;
      this.targetY = this.orbY + Math.cos(this.time * moveSpeed * 0.75) * moveAmount;
    } else {
      // Active: gentle movement
      const adjustedVolume = Math.max(0, effectiveVolume - thresholds.sensitivity);
      moveAmount = adjustedVolume * 12;
      moveSpeed = 1.2 + adjustedVolume * 2;
      this.targetX = this.orbX + Math.sin(this.time * moveSpeed) * moveAmount;
      this.targetY = this.orbY + Math.cos(this.time * moveSpeed * 0.9) * moveAmount;
    }
    
    // Clamp movement to max offset
    const maxOffset = this.options.maxOffset;
    this.targetX = clamp(this.targetX, this.orbX - maxOffset, this.orbX + maxOffset);
    this.targetY = clamp(this.targetY, this.orbY - maxOffset, this.orbY + maxOffset);
    
    // Smooth position transitions
    const agitation = Math.max(0, effectiveVolume - thresholds.sensitivity);
    const positionSpeed = 0.02 + agitation * agitation * 0.06;
    this.currentX += (this.targetX - this.currentX) * positionSpeed;
    this.currentY += (this.targetY - this.currentY) * positionSpeed;
  }

  /**
   * Generate blob points for organic shape
   */
  private generateBlobPoints(effectiveVolume: number, thresholds: CalibrationData): BlobPoint[] {
    const points: BlobPoint[] = [];
    const numPoints = this.options.pointCount;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      
      // Start with base radius
      let radius = this.options.radius;
      
      // Get influence from internal forces
      const forceInfluence = this.forceSystem.getInfluenceAt(angle) * this.fadeMultiplier;
      
      // Add controlled audio reaction
      const adjustedVolume = Math.max(0, effectiveVolume - thresholds.sensitivity);
      const audioAmplitude = adjustedVolume * 40 * this.fadeMultiplier;
      
      // Smoother wave patterns
      const wave1 = Math.sin(angle * 2 + this.time * 2) * audioAmplitude;
      const wave2 = Math.sin(angle * 3 - this.time * 1.5) * audioAmplitude * 0.6;
      const wave3 = Math.sin(angle * 1.5 + this.time * 2.5) * audioAmplitude * 0.4;
      
      // Gentle organic variation
      const organicNoise = (Math.sin(angle * 4 + this.time * 0.6) * 4 + 
                          Math.sin(angle * 5 - this.time * 0.4) * 2) * this.fadeMultiplier;
      
      // Combine effects
      radius += forceInfluence + wave1 + wave2 + wave3 + organicNoise;
      
      // Conservative bounds
      radius = Math.max(radius, this.options.radius * (0.6 + (1 - this.fadeMultiplier) * 0.4));
      radius = Math.min(radius, this.options.radius * (1 + (1.8 + adjustedVolume * 0.7 - 1) * this.fadeMultiplier));
      
      const x = this.currentX + Math.cos(angle) * radius;
      const y = this.currentY + Math.sin(angle) * radius;
      
      points.push({ x, y });
    }
    
    return points;
  }

  /**
   * Draw smooth blob using quadratic curves
   */
  private drawBlob(points: BlobPoint[]): void {
    const numPoints = points.length;
    
    this.ctx.beginPath();
    
    // Move to starting point
    this.ctx.moveTo(
      (points[numPoints - 1].x + points[0].x) / 2,
      (points[numPoints - 1].y + points[0].y) / 2
    );
    
    // Draw smooth curves through all points
    for (let i = 0; i < numPoints; i++) {
      const current = points[i];
      const next = points[(i + 1) % numPoints];
      
      // Use quadratic curves for smooth results
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      
      this.ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw stroke if enabled
    if (this.options.strokeWidth > 0) {
      this.ctx.strokeStyle = this.options.strokeColor;
      this.ctx.lineWidth = this.options.strokeWidth;
      this.ctx.stroke();
    }
  }

  /**
   * Draw debug information overlay
   */
  private drawDebugInfo(rawVolume: number, effectiveVolume: number, thresholds: CalibrationData): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    
    const debugInfo = [
      `Mode: ${this.currentMode.toUpperCase()}`,
      `Raw Volume: ${rawVolume.toFixed(3)}`,
      `Effective Volume: ${effectiveVolume.toFixed(3)}`,
      `Smoothed Volume: ${this.smoothedVolume.toFixed(3)}`,
      `Baseline: ${thresholds.baseline.toFixed(3)}`,
      `Gain: ${thresholds.gain.toFixed(2)}`,
      `Fade: ${this.fadeMultiplier.toFixed(3)}`,
      `Forces: ${this.forceSystem.getActiveCount()}`,
      `Sensitivity: ${thresholds.sensitivity.toFixed(3)}`,
      `Loud: ${thresholds.loudThreshold.toFixed(3)}`,
      `Very Loud: ${thresholds.veryLoudThreshold.toFixed(3)}`
    ];
    
    debugInfo.forEach((info, index) => {
      this.ctx.fillText(info, this.canvas.width - 250, 20 + index * 16);
    });
    
    // Volume bar
    const barY = 20 + debugInfo.length * 16 + 10;
    const barWidth = 200;
    const barHeight = 10;
    const barX = this.canvas.width - 250;
    
    // Background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Volume fill
    this.ctx.fillStyle = effectiveVolume > thresholds.sensitivity ? '#2563eb' : '#666666';
    this.ctx.fillRect(barX, barY, effectiveVolume * barWidth, barHeight);
    
    // Threshold markers
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(barX + thresholds.sensitivity * barWidth, barY - 2, 2, barHeight + 4);
    this.ctx.fillStyle = '#ffaa00';
    this.ctx.fillRect(barX + thresholds.loudThreshold * barWidth, barY - 2, 2, barHeight + 4);
    this.ctx.fillStyle = '#ff00ff';
    this.ctx.fillRect(barX + thresholds.veryLoudThreshold * barWidth, barY - 2, 2, barHeight + 4);
  }

  /**
   * Cleanup and destroy the orb
   */
  async destroy(): Promise<void> {
    this.stopAnimation();
    await this.stop();
    window.removeEventListener('resize', () => this.setupCanvas());
  }
}