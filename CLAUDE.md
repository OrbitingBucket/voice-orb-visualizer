# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a standalone HTML5 audio visualizer called "Voice Orb Visualizer" that creates an organic, blob-like visual orb that responds to audio input in real-time. The entire application is contained in a single `orb.html` file with embedded CSS and JavaScript.

what do i need to do? so far i have just in the process of creating it, i want to turn it into a library that people can download an integrate into their applications (this is meant to be a blob for conversational applications.

Below is a practical ― and reasonably opinionated ― road-map for turning the one-page “Voice Orb” proof-of-concept into a reusable JavaScript library that anyone can install from npm or drop in via a `<script>` tag.

---

## 1. Define the public API first

| What people should be able to do | Suggested surface                                     |             |                                                 |
| -------------------------------- | ----------------------------------------------------- | ----------- | ----------------------------------------------- |
| Mount the orb in any container   | `new VoiceOrb(canvasOrSelector, options?)`            |             |                                                 |
| Start/stop listening modes       | `orb.startMicrophone()`, \`orb.startAssistant(audioEl | AudioBuffer | ArrayBuffer)`, `orb.startTest()`, `orb.stop()\` |
| Feed raw PCM/stream chunks       | `orb.pushSamples(Float32Array)` (optional)            |             |                                                 |
| Change settings at runtime       | `orb.setOptions({ color: '#39f', debug: false })`     |             |                                                 |
| Listen to lifecycle events       | `orb.on('calibrated', cb)` etc.                       |             |                                                 |

Anything not on that list should stay private/internal.

---

## 2. Refactor the prototype into modules

> Keep one class = one file; keep UI controls & demo code **out** of the core.

```
/src
 ├─ core/
 │   ├─ VoiceOrb.ts          ← exports the class
 │   ├─ audio-pipeline.ts    ← analyser, calibration, gain logic
 │   ├─ forces.ts            ← internal tentacle/bubble helpers
 │   └─ utils.ts
 ├─ styles.css               ← tiny or zero; let users style
 └─ index.ts                 ← re-export VoiceOrb
```

*Use TypeScript or JSDoc-annotated JS so consumers get typings for free.*

---

## 3. Build system & bundle formats

| Tool                                       | Why                                                       |
| ------------------------------------------ | --------------------------------------------------------- |
| **Rollup** (or `tsup` / Vite library mode) | Generates clean ESM, CJS and IIFE builds with sourcemaps. |
| `postcss` + `autoprefixer` (optional)      | Ships a minified `.css` alongside the JS.                 |

**rollup.config.mjs (sketch)**

```js
import dts from 'rollup-plugin-dts'
import { terser } from 'rollup-plugin-terser'
export default [
  { // JS
    input: 'src/index.ts',
    output: [
      { file: 'dist/voice-orb.mjs',  format: 'es'   },
      { file: 'dist/voice-orb.cjs',  format: 'cjs'  },
      { file: 'dist/voice-orb.iife.js', format: 'iife', name: 'VoiceOrb', plugins:[terser()] }
    ],
    plugins: [ /* ts, postcss, terser, etc. */ ]
  },
  { // types
    input: 'src/index.ts',
    output: [{ file: 'dist/voice-orb.d.ts', format: 'es' }],
    plugins: [dts()]
  }
]
```

Run with `npm run build`.

---

## 4. Repository housekeeping

```
voice-orb-visualizer/
 ├─ dist/                   ← ignored in git; built on publish
 ├─ examples/               ← small HTML demo, CodeSandbox link
 ├─ test/                   ← vitest + happy-path tests
 ├─ .github/workflows/ci.yml← lint, test, build on push
 ├─ package.json
 ├─ README.md
 ├─ LICENSE (MIT or similar)
 └─ CHANGELOG.md
```

### `package.json` essentials

```json
{
  "name": "voice-orb-visualizer",
  "version": "1.0.0",
  "description": "Organic audio blob visualizer for conversational UIs",
  "main": "dist/voice-orb.cjs",
  "module": "dist/voice-orb.mjs",
  "browser": "dist/voice-orb.iife.js",
  "types": "dist/voice-orb.d.ts",
  "exports": {
    ".": {
      "import": "./dist/voice-orb.mjs",
      "require": "./dist/voice-orb.cjs",
      "script": "./dist/voice-orb.iife.js",
      "types": "./dist/voice-orb.d.ts"
    }
  },
  "files": ["dist"],
  "sideEffects": false
}
```

---

## 5. Documentation & DX

* **README** –  “Quick start”, options table, CDN snippet, FAQ on microphone permissions.
* **Typedoc** or JSDoc comments – autogenerate API docs to `docs/`.
* **Demos** – vanilla JS + a React example (people copy/paste examples more than they read docs).
* **Type definitions** – already covered by TS or `*.d.ts`.

---

## 6. Publish & release workflow

1. `npm login` (once)
2. `npm version minor && npm publish --access public`
3. Create GitHub release tag & changelog entry.
4. People can now:

   ```bash
   npm i voice-orb-visualizer
   # or
   <script src="https://cdn.jsdelivr.net/npm/voice-orb-visualizer@1/dist/voice-orb.iife.js"></script>
   ```

---

## 7. Optional niceties

| Feature                       | How                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| **Tree-shakable debug code**  | Guard with `if (process.env.NODE_ENV !== 'production')` or use `rollup-plugin-strip`. |
| Themeable colors              | Accept CSS variable overrides (`--voice-orb-color`).                                  |
| Unit tests for audio pipeline | Feed synthetic Float32Array samples, assert smoothed volume outputs.                  |
| ES5 fallback                  | Babel post-transpile the IIFE build only.                                             |
| Performance budget            | Limit per-frame allocations; run `npm run profile`.                                   |

---

## 8. Migration notes from your current file

* Move *everything* inside `<script>` into `src/core/VoiceOrb.ts`.
* Delete DOM-specific bits: permission prompt HTML, control buttons, debug overlay. Provide callback hooks (`onCalibrating`, `onError`) so host apps can show their own UI.
* Keep **only**: canvas drawing, audio handling, internal forces, public API.
* Replace global `window.VoiceOrbVisualizer = …` with proper exports (`export class VoiceOrb`).

---

### Tiny usage sample (after publishing)

```html
<script type="module">
  import { VoiceOrb } from 'https://cdn.jsdelivr.net/npm/voice-orb-visualizer@1/dist/voice-orb.mjs'

  const canvas = document.querySelector('#orb')
  const orb = new VoiceOrb(canvas, { color: '#2563eb', debug: false })

  document.querySelector('#start').onclick = () => orb.startMicrophone()
  document.querySelector('#stop').onclick  = () => orb.stop()
</script>
<canvas id="orb"></canvas>
<button id="start">Start</button><button id="stop">Stop</button>
```

---

## 9. Checklist

* [ ] Refactor into class-based modules.
* [ ] Add Rollup/Tsup build that spits out ESM + CJS + IIFE + types.
* [ ] Write `README`, license, changelog.
* [ ] Create minimal tests & GitHub CI.
* [ ] Publish `1.0.0` to npm.

Here are some additional knobs you might expose so integrators can really tailor the orb to their needs:

1. Size & Layout

    radius (or width/height)
    Base orb size, or auto-scale to container.

    padding / margin
    Spacing around the canvas if you include layout helpers.

    devicePixelRatioCap
    Cap DPR (e.g. 1–2) to control visual fidelity vs CPU/GPU work.

2. Color & Style

    fillMode: "solid" | "gradient" | "outline" | "dual-tone"

    color / gradientStops

        Solid color (#2563eb)

        Gradient: array of {offset, color} + "radial" | "linear"

    strokeWidth / strokeColor

    blur / shadowBlur

    opacity (static or volume-driven)

    cssVariableHook: e.g. --voice-orb-color

    compositeMode: "source-over" | "lighter" | "multiply", etc.

3. Audio Processing

    mode: "microphone" | "assistant" | "test"

    mediaSource: accept user-supplied MediaStream | AudioNode | AudioBuffer | PCM callback

    fftSize: 256 | 512 | 1024

    smoothingTimeConstant: 0–1

    lowCutHz / highCutHz: ignore sub-bass or hiss

    autoCalibration: true | false

    baselineNoise, sensitivity, loudThreshold, veryLoudThreshold

    adaptiveGain (initial), gainAdaptationRate

    volumeLerpFactor (the 0.12 smoothing constant)

    onCalibrated(baseline, gain), onVolume(level), onError(err)

4. Motion & Shape

    pointCount: 12–64 vertices

    noiseIntensity / noiseSpeed / noisePhaseRandomness

    forceCountRate (bubble/tentacle creation rate)

    forceStrength / forceDecayRate

    animationSpeed: base time multiplier

    easing: "easeOutCubic" | "easeInOut" | "bounce" | etc.

    maxOffset: how far the orb center wanders

    idleWiggleSpeed: movement when silent

    fadeInMs / fadeOutMs

5. Rendering & Performance

    fpsLimit: 30 | 45 | 60

    offscreenCanvas: true | false (worker rendering)

    debug: true | false (draw overlay or call back)

    recordFrames: true | false (capture canvas frames)

    recordVolumes: true | false

6. Theming & Accessibility

    theme: "light" | "dark" | "auto"

    highContrast: true | false

    reducedMotion: "auto" | true | false

    ariaLabel / liveRegionText callbacks for screen-readers

    colorBlindFriendly: true | false

7. Advanced & Extensibility

    customShaders: GLSL snippets (if you add WebGL mode)

    hookDraw: callback to inject custom canvas drawing

    onModeChange(mode): sync external UI

    exportAPI: methods like .pushSamples(), .stop(), .connectAudio()

Sample Initialization

const orb = new VoiceOrb('#canvas', {
  // Size & Layout
  radius: 120,
  padding: 10,

  // Visual
  fillMode: 'gradient',
  gradientStops: [
    { offset: 0, color: '#2563eb' },
    { offset: 1, color: '#81e6d9' }
  ],
  strokeWidth: 4,
  blur: 8,
  compositeMode: 'lighter',

  // Audio
  mode: 'microphone',
  fftSize: 512,
  autoCalibration: true,
  sensitivity: 0.05,
  lowCutHz: 100,
  highCutHz: 8000,

  // Motion & Shape
  pointCount: 24,
  noiseIntensity: 0.3,
  forceDecayRate: 1.2,
  easing: 'easeOutCubic',

  // Performance
  fpsLimit: 60,
  offscreenCanvas: true,

  // Accessibility
  theme: 'auto',
  reducedMotion: 'auto',
  ariaLabel: 'Voice activity visualizer',

  // Hooks
  onCalibrated: (baseline, gain) => console.log('Calibrated', baseline, gain),
  onVolume: v => console.log('Volume', v),
  onError: err => alert(err.message),
});
orb.startMicrophone();
