# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Web CAI (Computer Aided Instruction) for the Array30 input method (行列輸入法). This is a fully client-side browser application with no remote server dependencies. Primary language is TypeScript.

## Build & Development

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — type-check with `tsc` then bundle with Vite
- `npm run preview` — preview production build locally

## Architecture

- **Vite** as dev server and bundler
- **TypeScript** with strict mode
- Entry point: `index.html` → `src/main.ts`
- All code lives under `src/`
