# App Interface Design Brief

## Overview

A single-page viewer application. The aesthetic is **ethereal scientific** — soft atmospheric gray gradients, minimal UI chrome, everything serving the 3D model at the center. Inspired by atomic diagrams floating in mist.

---

## Visual Language

- **Background**: Multi-layered radial gradients in cool gray tones. Several soft, diffused light blobs scattered across the canvas — not uniform, but organic and asymmetric. Colors range from `#f5f5f5` (lightest center blobs) to `#c8c8c8` (mid-gray field) to `#b0b0b0` (darkest edges). No hard edges anywhere.
- **Atmosphere**: Slightly hazy, like light diffusing through frosted glass. The background should feel like it has depth and breath.
- **Typography**: Small, precise, very light weight. Use a geometric or scientific-feeling font. Tracking slightly loose. Labels feel like instrument readouts.
- **UI Elements**: Minimal — near-invisible at rest, becoming visible on hover. No heavy borders or drop shadows. Use thin `1px` strokes in `rgba(0,0,0,0.12)`.

---

## Layout

### Full-screen canvas
The app fills the entire viewport. No scrolling.

```
┌─────────────────────────────────────────────────────────┐
│  [logo / title — top left, small]       [controls — top right] │
│                                                         │
│                                                         │
│              ┌──────────────────────┐                   │
│              │                      │                   │
│              │    3D SCENE AREA     │                   │
│              │   (placeholder div)  │                   │
│              │                      │                   │
│              └──────────────────────┘                   │
│                                                         │
│  [label — bottom left, small]      [label — bottom right]     │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### Header Bar
- Position: fixed top, full width
- Height: 48px
- Background: transparent
- Left side: App name in small caps, letter-spacing 0.15em, `#555`
- Right side: 2–3 icon buttons (e.g. rotate, explode view, info). Very small, 20×20px, thin strokes

### 3D Scene Container (`#scene-container`)
- Position: centered in viewport
- Size: `60vw × 60vh`, min `400px × 400px`
- Background: transparent (the gradient background shows through)
- Border: `1px solid rgba(0,0,0,0.08)`, very subtle
- Border-radius: `4px`
- This div is the placeholder for the Three.js / React Three Fiber canvas
- On hover: border becomes `rgba(0,0,0,0.15)`

### Bottom Status Bar
- Position: fixed bottom, full width
- Height: 36px
- Background: transparent
- Small labels: model name (left), interaction hint "drag to rotate · scroll to zoom" (center), polygon count or metadata (right)
- All text: `11px`, `rgba(0,0,0,0.4)`, light weight

### Background Layer
- The background is NOT a solid color — it is a composition of 4–5 radial gradient blobs
- Blob 1 (large, center-right): `radial-gradient(ellipse 60% 50% at 65% 40%, #ececec 0%, transparent 70%)`
- Blob 2 (medium, left): `radial-gradient(ellipse 40% 45% at 20% 60%, #e8e8e8 0%, transparent 65%)`
- Blob 3 (small, top): `radial-gradient(ellipse 30% 25% at 50% 10%, #f0f0f0 0%, transparent 70%)`
- Base color: `#d6d6d6`
- Blend them together naturally — the result should feel like soft, volumetric light

---

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#d6d6d6` | Page background base |
| `--bg-blob-light` | `#f0f0f0` | Lightest gradient blobs |
| `--bg-blob-mid` | `#e4e4e4` | Mid gradient blobs |
| `--text-primary` | `#3a3a3a` | Main labels |
| `--text-secondary` | `rgba(0,0,0,0.4)` | Hints, metadata |
| `--border-subtle` | `rgba(0,0,0,0.08)` | Container borders |
| `--border-hover` | `rgba(0,0,0,0.18)` | Hover state borders |

---

## Interaction Notes

- The 3D scene container should have `cursor: grab`, `cursor: grabbing` on drag
- All UI controls fade to `opacity: 0.3` when idle for >3s, returning on mouse move
- No heavy animations on UI chrome — everything should be instant or very subtle `200ms ease`

---

## What Figma Make Should Generate

1. Full-screen layout with the layered gradient background
2. Transparent header bar with title + icon buttons
3. Centered `div#scene-container` — **leave this completely empty**, no inner content
4. Bottom status bar with placeholder text labels
5. Responsive: on mobile, the scene container becomes `90vw × 50vh`
