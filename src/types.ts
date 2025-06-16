export interface VoiceOrbOptions {
  // Size & Layout
  radius?: number;
  padding?: number;
  
  // Visual
  color?: string;
  fillMode?: 'solid' | 'gradient';
  gradientStops?: Array<{ offset: number; color: string }>;
  strokeWidth?: number;
  strokeColor?: string;
  opacity?: number;
  
  // Audio Processing
  mode?: 'microphone' | 'assistant' | 'test';
  fftSize?: 256 | 512 | 1024;
  smoothingTimeConstant?: number;
  autoCalibration?: boolean;
  baselineNoise?: number;
  sensitivity?: number;
  loudThreshold?: number;
  veryLoudThreshold?: number;
  adaptiveGain?: number;
  volumeLerpFactor?: number;
  
  // Motion & Shape
  pointCount?: number;
  noiseIntensity?: number;
  noiseSpeed?: number;
  forceStrength?: number;
  forceDecayRate?: number;
  animationSpeed?: number;
  maxOffset?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  
  // Performance
  fpsLimit?: number;
  debug?: boolean;
  
  // Accessibility
  theme?: 'light' | 'dark' | 'auto';
  reducedMotion?: boolean;
  ariaLabel?: string;
  
  // Callbacks
  onCalibrated?: (baseline: number, gain: number) => void;
  onVolume?: (volume: number) => void;
  onError?: (error: Error) => void;
  onModeChange?: (mode: string) => void;
}

export interface InternalForce {
  angle: number;
  strength: number;
  life: number;
  decay: number;
  speed: number;
  distance: number;
  maxDistance: number;
}

export interface NoisePoint {
  angle: number;
  speed: number;
  amplitude: number;
  phase: number;
}

export interface BlobPoint {
  x: number;
  y: number;
}

export type AudioMode = 'microphone' | 'assistant' | 'test' | 'stopped';

export interface CalibrationData {
  baseline: number;
  gain: number;
  sensitivity: number;
  loudThreshold: number;
  veryLoudThreshold: number;
}