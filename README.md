# Voice Orb Visualizer

An organic audio blob visualizer for conversational UIs. Creates a beautiful, responsive orb that reacts to voice input with natural, flowing animations.

[![npm version](https://badge.fury.io/js/voice-orb-visualizer.svg)](https://badge.fury.io/js/voice-orb-visualizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎤 **Microphone Input** - Real-time voice visualization with auto-calibration
- 🔊 **Assistant Audio** - Connect streaming audio for AI assistant interfaces  
- 🌊 **Organic Animation** - Natural blob-like deformation with internal force system
- 🎨 **Customizable** - Extensive theming and animation options
- 📱 **Responsive** - Adapts to any container size
- 🚀 **Performance** - Optimized for 60fps smooth animation
- 💻 **TypeScript** - Full type definitions included
- 🌐 **Universal** - Works in all modern browsers

## Quick Start

### CDN (Easiest)

```html
<script type="module">
  import { VoiceOrb } from 'https://cdn.jsdelivr.net/npm/voice-orb-visualizer@1/dist/voice-orb.mjs'

  const orb = new VoiceOrb('#canvas', { color: '#2563eb' })
  document.querySelector('#start').onclick = () => orb.startMicrophone()
</script>

<canvas id="canvas" width="400" height="400"></canvas>
<button id="start">Start Listening</button>
```

### NPM

```bash
npm install voice-orb-visualizer
```

```javascript
import { VoiceOrb } from 'voice-orb-visualizer'

const orb = new VoiceOrb('#canvas', {
  radius: 120,
  color: '#2563eb',
  debug: false
})

// Start microphone mode
await orb.startMicrophone()

// Or assistant mode for streaming audio
await orb.startAssistant()
orb.processAudioStream(audioBuffer)
```

## API Reference

### Constructor

```typescript
new VoiceOrb(canvas: HTMLCanvasElement | string, options?: VoiceOrbOptions)
```

### Methods

| Method | Description |
|--------|-------------|
| `startMicrophone()` | Start microphone input mode |
| `startAssistant()` | Start assistant audio mode |
| `startTest()` | Start test mode (no microphone needed) |
| `stop()` | Stop all audio processing |
| `processAudioStream(data)` | Process audio data for assistant mode |
| `connectAudio(audioElement)` | Connect HTML audio element |
| `setOptions(options)` | Update options at runtime |
| `getMode()` | Get current mode |
| `destroy()` | Clean up and destroy instance |

### Options

<details>
<summary><strong>Visual Options</strong></summary>

```typescript
{
  // Size & Layout
  radius?: number              // Base orb radius (default: 100)
  padding?: number             // Container padding (default: 10)
  
  // Appearance  
  color?: string               // Fill color (default: '#2563eb')
  fillMode?: 'solid' | 'gradient'
  strokeWidth?: number         // Border width (default: 0)
  strokeColor?: string         // Border color (default: '#ffffff')
  opacity?: number             // Overall opacity (default: 1)
}
```
</details>

<details>
<summary><strong>Audio Processing</strong></summary>

```typescript
{
  fftSize?: 256 | 512 | 1024          // FFT size for analysis (default: 512)
  smoothingTimeConstant?: number       // Audio smoothing (default: 0.8)  
  autoCalibration?: boolean           // Auto-calibrate to environment (default: true)
  sensitivity?: number                // Volume sensitivity (default: 0.05)
  volumeLerpFactor?: number           // Volume smoothing speed (default: 0.12)
}
```
</details>

<details>
<summary><strong>Animation & Motion</strong></summary>

```typescript
{
  pointCount?: number          // Blob vertices (default: 24)
  animationSpeed?: number      // Global animation speed (default: 1.0)
  maxOffset?: number           // Maximum orb movement (default: 50)
  fadeOutMs?: number           // Fade out duration (default: 1200)
  forceStrength?: number       // Internal force strength (default: 1.0)
}
```
</details>

<details>
<summary><strong>Callbacks</strong></summary>

```typescript
{
  onCalibrated?: (baseline: number, gain: number) => void
  onVolume?: (volume: number) => void  
  onError?: (error: Error) => void
  onModeChange?: (mode: string) => void
}
```
</details>

## Usage Examples

### Basic Microphone Visualization

```javascript
const orb = new VoiceOrb('#canvas')

document.querySelector('#start').onclick = async () => {
  try {
    await orb.startMicrophone()
  } catch (error) {
    console.error('Microphone access denied:', error)
  }
}
```

### Assistant/Streaming Audio

```javascript
const orb = new VoiceOrb('#canvas')
await orb.startAssistant()

// Connect HTML audio element
const audio = document.querySelector('audio')
orb.connectAudio(audio)

// Or process audio data directly
orb.processAudioStream(audioBuffer)
```

### Customized Appearance

```javascript
const orb = new VoiceOrb('#canvas', {
  radius: 150,
  color: '#ff6b6b',
  pointCount: 32,
  sensitivity: 0.1,
  animationSpeed: 1.5,
  onVolume: (volume) => {
    console.log('Current volume:', volume)
  }
})
```

### React Integration

```jsx
import { useEffect, useRef } from 'react'
import { VoiceOrb } from 'voice-orb-visualizer'

function VoiceVisualizer() {
  const canvasRef = useRef(null)
  const orbRef = useRef(null)

  useEffect(() => {
    orbRef.current = new VoiceOrb(canvasRef.current, {
      color: '#2563eb',
      radius: 120
    })
    
    return () => orbRef.current?.destroy()
  }, [])

  const startListening = async () => {
    await orbRef.current?.startMicrophone()
  }

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={400} />
      <button onClick={startListening}>Start</button>
    </div>
  )
}
```

## Browser Support

- Chrome 66+
- Firefox 60+  
- Safari 11.1+
- Edge 79+

Requires: Web Audio API, getUserMedia, Canvas 2D, ES2018

## Permissions

**Microphone mode** requires user permission and HTTPS in production. The library handles permission requests automatically.

## Performance Notes

- Optimized for 60fps on modern devices
- Automatically caps devicePixelRatio at 2x for performance
- Uses requestAnimationFrame for smooth animation
- Minimal memory allocations during animation

## Examples

- [Basic Example](./examples/basic.html) - All features with controls
- [React Example](./examples/react.tsx) - React integration
- [Assistant Mode](./examples/assistant.html) - Streaming audio visualization

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

---

Made with ❤️ for conversational AI interfaces