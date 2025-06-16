import { AudioMode, CalibrationData } from '../types.js';

/**
 * Manages audio processing, calibration, and analysis
 */
export class AudioPipeline {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  
  // Assistant audio mode
  private assistantAudioContext: AudioContext | null = null;
  private assistantAnalyser: AnalyserNode | null = null;
  private assistantAudioElement: HTMLAudioElement | null = null;
  
  // Calibration system
  private isCalibrating: boolean = false;
  private calibrationSamples: number[] = [];
  private calibrationStartTime: number = 0;
  private readonly CALIBRATION_DURATION = 1000; // 1 second for testing
  
  // Audio processing state
  private baselineNoise: number = 0.02;
  private dynamicSensitivityThreshold: number = 0.08;
  private dynamicLoudThreshold: number = 0.4;
  private dynamicVeryLoudThreshold: number = 0.7;
  private adaptiveGain: number = 1.0;
  private volumeHistory: number[] = [];
  private readonly VOLUME_HISTORY_SIZE = 100;
  
  // Configuration
  private fftSize: number = 512;
  private smoothingTimeConstant: number = 0.8;
  
  // Callbacks
  private onCalibrated?: (data: CalibrationData) => void;
  private onError?: (error: Error) => void;

  constructor(options: {
    fftSize?: number;
    smoothingTimeConstant?: number;
    onCalibrated?: (data: CalibrationData) => void;
    onError?: (error: Error) => void;
  } = {}) {
    this.fftSize = options.fftSize || 512;
    this.smoothingTimeConstant = options.smoothingTimeConstant || 0.8;
    this.onCalibrated = options.onCalibrated;
    this.onError = options.onError;
  }

  /**
   * Initialize microphone audio input
   */
  async initMicrophone(): Promise<void> {
    try {
      await this.cleanup();
      
      console.log('Requesting microphone access...');
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      
      this.microphone.connect(this.analyser);
      
      this.startCalibration();
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Initialize assistant audio mode for streaming audio
   */
  async initAssistant(): Promise<void> {
    try {
      await this.cleanup();
      
      this.assistantAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.assistantAudioContext.state === 'suspended') {
        await this.assistantAudioContext.resume();
      }
      
      this.assistantAnalyser = this.assistantAudioContext.createAnalyser();
      this.assistantAnalyser.fftSize = this.fftSize;
      this.assistantAnalyser.smoothingTimeConstant = this.smoothingTimeConstant;
      
      this.assistantAudioElement = document.createElement('audio');
      this.assistantAudioElement.crossOrigin = 'anonymous';
      this.assistantAudioElement.controls = false;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Start calibration process
   */
  private startCalibration(): void {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
  }

  /**
   * Process calibration samples
   */
  private processCalibration(volume: number): boolean {
    if (!this.isCalibrating) return false;
    
    this.calibrationSamples.push(volume);
    const elapsed = performance.now() - this.calibrationStartTime;
    
    if (elapsed >= this.CALIBRATION_DURATION) {
      // Calculate baseline noise from samples
      this.calibrationSamples.sort((a, b) => a - b);
      const median = this.calibrationSamples[Math.floor(this.calibrationSamples.length / 2)];
      const p90 = this.calibrationSamples[Math.floor(this.calibrationSamples.length * 0.9)];
      
      this.baselineNoise = Math.max(0.01, median);
      
      // Set adaptive thresholds based on environment
      this.dynamicSensitivityThreshold = this.baselineNoise + 0.03;
      this.dynamicLoudThreshold = this.baselineNoise + 0.15;
      this.dynamicVeryLoudThreshold = this.baselineNoise + 0.35;
      
      // Calculate adaptive gain to normalize volume range
      const noiseRange = p90 - this.baselineNoise;
      this.adaptiveGain = noiseRange > 0.05 ? 0.8 / noiseRange : 2.0;
      this.adaptiveGain = Math.max(0.5, Math.min(this.adaptiveGain, 4.0));
      
      this.isCalibrating = false;
      
      console.log('Calibration complete!', {
        baseline: this.baselineNoise,
        gain: this.adaptiveGain,
        sensitivity: this.dynamicSensitivityThreshold
      });
      
      // Notify calibration complete
      this.onCalibrated?.({
        baseline: this.baselineNoise,
        gain: this.adaptiveGain,
        sensitivity: this.dynamicSensitivityThreshold,
        loudThreshold: this.dynamicLoudThreshold,
        veryLoudThreshold: this.dynamicVeryLoudThreshold
      });
      
      return true; // Calibration complete
    }
    
    return false; // Still calibrating
  }

  /**
   * Process volume with adaptive gain and noise filtering
   */
  private processVolumeAdaptively(rawVolume: number): number {
    // Store volume history for continuous adaptation
    this.volumeHistory.push(rawVolume);
    if (this.volumeHistory.length > this.VOLUME_HISTORY_SIZE) {
      this.volumeHistory.shift();
    }
    
    // Subtract baseline noise
    let adjustedVolume = Math.max(0, rawVolume - this.baselineNoise);
    
    // Apply adaptive gain
    adjustedVolume *= this.adaptiveGain;
    
    // Continuous adaptation: adjust gain based on recent volume distribution
    if (this.volumeHistory.length >= 50 && !this.isCalibrating) {
      const recentVolumes = this.volumeHistory.slice(-50);
      const avgRecent = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const targetRange = 0.3; // Target average volume
      
      if (avgRecent > 0.05) {
        const gainAdjustment = targetRange / avgRecent;
        this.adaptiveGain += (gainAdjustment - this.adaptiveGain) * 0.001; // Very slow adaptation
        this.adaptiveGain = Math.max(0.5, Math.min(this.adaptiveGain, 4.0));
      }
    }
    
    return Math.min(adjustedVolume, 1.0);
  }

  /**
   * Get current volume level from active audio source
   */
  getVolume(mode: AudioMode): number {
    if (mode === 'test') {
      // Simulate audio input for test mode
      return Math.abs(Math.sin(performance.now() * 0.005)) * 0.3 + Math.random() * 0.1;
    }
    
    const analyserToUse = mode === 'assistant' ? this.assistantAnalyser : this.analyser;
    if (!analyserToUse) return 0;
    
    const bufferLength = analyserToUse.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserToUse.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    
    const rawVolume = Math.min(sum / bufferLength / 255, 1);
    
    // Process calibration if active (only for microphone mode)
    if (this.isCalibrating) {
      const calibrationComplete = this.processCalibration(rawVolume);
      if (!calibrationComplete) {
        return 0; // Don't trigger animations during calibration
      }
    }
    
    // For assistant mode, use lighter processing (audio files don't need heavy filtering)
    if (mode === 'assistant') {
      // Simple gain and clamp for audio files
      const boostedVolume = Math.min(rawVolume * 2.0, 1.0);
      return boostedVolume;
    }
    
    // Apply adaptive processing (for microphone mode)
    return this.processVolumeAdaptively(rawVolume);
  }

  /**
   * Connect streaming audio to assistant mode
   */
  connectStreamingAudio(audioElement: HTMLAudioElement): boolean {
    if (!this.assistantAudioContext || !this.assistantAnalyser) {
      return false;
    }
    
    try {
      const source = this.assistantAudioContext.createMediaElementSource(audioElement);
      source.connect(this.assistantAnalyser);
      source.connect(this.assistantAudioContext.destination);
      return true;
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Process audio stream data for assistant mode
   */
  processAudioStream(audioData: ArrayBuffer | AudioBuffer | string): void {
    if (!this.assistantAudioContext) return;
    
    try {
      if (audioData instanceof ArrayBuffer) {
        this.assistantAudioContext.decodeAudioData(audioData.slice())
          .then(buffer => this.playAudioBuffer(buffer))
          .catch(error => this.onError?.(error));
      } else if (audioData instanceof AudioBuffer) {
        this.playAudioBuffer(audioData);
      } else if (typeof audioData === 'string') {
        // Handle URL or data URL
        if (this.assistantAudioElement) {
          this.assistantAudioElement.src = audioData;
          this.connectStreamingAudio(this.assistantAudioElement);
          this.assistantAudioElement.play();
        }
      }
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Play audio buffer in assistant mode
   */
  private playAudioBuffer(buffer: AudioBuffer): void {
    if (!this.assistantAudioContext || !this.assistantAnalyser) return;
    
    try {
      const source = this.assistantAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.assistantAnalyser);
      source.connect(this.assistantAudioContext.destination);
      source.start(0);
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get calibration status and progress
   */
  getCalibrationStatus(): { isCalibrating: boolean; progress: number; samplesCount: number } {
    const elapsed = this.isCalibrating ? performance.now() - this.calibrationStartTime : 0;
    const progress = Math.min(elapsed / this.CALIBRATION_DURATION, 1);
    
    return {
      isCalibrating: this.isCalibrating,
      progress,
      samplesCount: this.calibrationSamples.length
    };
  }

  /**
   * Get current thresholds for visualization
   */
  getThresholds(): CalibrationData {
    return {
      baseline: this.baselineNoise,
      gain: this.adaptiveGain,
      sensitivity: this.dynamicSensitivityThreshold,
      loudThreshold: this.dynamicLoudThreshold,
      veryLoudThreshold: this.dynamicVeryLoudThreshold
    };
  }

  /**
   * Clean up audio resources
   */
  async cleanup(): Promise<void> {
    this.isCalibrating = false;
    this.calibrationSamples = [];
    
    // Cleanup microphone resources
    if (this.microphone) {
      try {
        this.microphone.disconnect();
      } catch (e) {
        console.warn('Error disconnecting microphone:', e);
      }
      this.microphone = null;
    }
    
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn('Error stopping media tracks:', e);
      }
      this.mediaStream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
      this.audioContext = null;
    }
    
    // Cleanup assistant audio resources
    if (this.assistantAudioElement) {
      try {
        this.assistantAudioElement.pause();
        this.assistantAudioElement.src = '';
      } catch (e) {
        console.warn('Error stopping assistant audio element:', e);
      }
      this.assistantAudioElement = null;
    }
    
    if (this.assistantAudioContext && this.assistantAudioContext.state !== 'closed') {
      try {
        await this.assistantAudioContext.close();
      } catch (e) {
        console.warn('Error closing assistant audio context:', e);
      }
      this.assistantAudioContext = null;
    }
    
    this.analyser = null;
    this.assistantAnalyser = null;
    
    // Reset processing state
    this.volumeHistory = [];
    this.adaptiveGain = 1.0;
    this.baselineNoise = 0.02;
    this.dynamicSensitivityThreshold = 0.08;
    this.dynamicLoudThreshold = 0.4;
    this.dynamicVeryLoudThreshold = 0.7;
  }
}