import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import terser from '@rollup/plugin-terser';

export default [
  // JavaScript builds
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/voice-orb.mjs',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/voice-orb.cjs',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/voice-orb.iife.js',
        format: 'iife',
        name: 'VoiceOrb',
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      })
    ]
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/voice-orb.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];