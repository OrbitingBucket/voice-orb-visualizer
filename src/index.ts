/**
 * Voice Orb Visualizer - Organic audio blob visualizer for conversational UIs
 */

export { VoiceOrb } from './core/VoiceOrb.js';
export type { 
  VoiceOrbOptions, 
  AudioMode, 
  CalibrationData,
  InternalForce,
  NoisePoint,
  BlobPoint
} from './types.js';
export { checkBrowserSupport } from './core/utils.js';