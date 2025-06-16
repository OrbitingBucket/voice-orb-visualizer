/**
 * Easing functions for smooth animations
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Get canvas from element or selector
 */
export function getCanvas(canvasOrSelector: HTMLCanvasElement | string): HTMLCanvasElement {
  if (typeof canvasOrSelector === 'string') {
    const element = document.querySelector(canvasOrSelector);
    if (!element) {
      throw new Error(`Canvas element not found: ${canvasOrSelector}`);
    }
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error(`Element is not a canvas: ${canvasOrSelector}`);
    }
    return element;
  }
  return canvasOrSelector;
}

/**
 * Check if browser supports required features
 */
export function checkBrowserSupport(): { supported: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    missing.push('Web Audio API');
  }
  
  if (!navigator.mediaDevices?.getUserMedia) {
    missing.push('getUserMedia API');
  }
  
  if (!window.requestAnimationFrame) {
    missing.push('requestAnimationFrame');
  }
  
  return {
    supported: missing.length === 0,
    missing
  };
}

/**
 * Create a deep clone of an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(deepClone) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}