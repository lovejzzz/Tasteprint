# Tasteprint Architecture

A quick map for contributors who want to understand how the pieces fit together.

## Data Flow

```
User interaction → App.jsx state → ShapeItem renders → ComponentRenderer draws
                 ↓
              localStorage (debounced persist)
```

All canvas state lives in `App.jsx` as React state. There is no external store or reducer — just `useState` + `useCallback` with ref-based stabilization for performance.

## State Model

The core state is a flat `shapes` array where each shape is:

```js
{
  id: string,        // unique ID (uid())
  type: string,      // component type ("hero", "card", "navbar", ...)
  x: number,         // canvas position
  y: number,
  w: number,         // dimensions
  h: number,
  variant: number,   // which visual variant (0-based index into VARIANTS[type])
  font: number,      // index into FONTS array
  fsize: number,     // font size multiplier (0.5–2.0)
  texts: {},         // editable text overrides keyed by slot name
  props: {},         // component-specific prop overrides
  dStyles: {},       // mood-generated design styles (shadows, animations, etc.)
  group: string?,    // group ID for grouped shapes
}
```

Supporting state: `pal` (palette name), `device` (canvas mode), `prefV` (preferred variants per type), `cam` (camera pan/zoom for free mode).

## Component Architecture

```
App.jsx
├── Header.jsx           — toolbar: palette, device, mood, undo/redo, export
├── LibrarySidebar.jsx   — desktop component library (drag to add)
├── MobileDrawer.jsx     — mobile component library (tap to add)
├── PickyOverlay.jsx     — guided wizard overlay (template → mood → pick per slot)
│   └── PickyCard.jsx    — option card with preview for each wizard step
└── ShapeItem.jsx        — individual canvas shape
    ├── Top toolbar      — variant/font/fsize cycling, randomize, copy/paste style
    ├── ComponentRenderer.jsx — renders all 40+ component types
    │   ├── ChatBubble.jsx    — 7-variant chat component (iMessage/Slack/terminal/glass/gradient/brutal/glow)
    │   └── code/             — code block components (lazy-chunked)
    │       ├── CodeIDE.jsx, CodeNotebook.jsx, CodeReview.jsx
    │       ├── CodeMinimap.jsx, CodeBenchmark.jsx, CodeTypewriter.jsx
    │       ├── AsciiArt.jsx
    │       └── tokenizer.jsx — syntax highlighting primitives (tokenize, TC, HighlightLine)
    └── PropsPanel.jsx   — per-component prop toggles (below the shape)
```

## Render Pipeline

1. `ShapeItem` receives a shape object and wraps it with selection UI, toolbars, and resize handle
2. `ComponentRenderer` (`CRaw`) maps `type` + `variant` to JSX — this is the ~2200-line switch that draws all 40+ component types
3. `dStyles` (from randomization) are applied as inline styles on ShapeItem's body div — shadows, animations, gradients, transforms
4. `ErrorBoundary` wraps each ComponentRenderer call so a single component crash doesn't take down the canvas

## Randomization Engine

The design randomization system in `utils.js` is the most complex part:

1. **`designerRandomize(type, palette, defaults, mood, otherShapes, dna, w, h)`** — generates a complete design for one component: variant, font, font-size, props, and dStyles
2. **Design DNA** (`generateDesignDNA`) — canvas-wide parameters that create cohesion across components (shadow depth, border radius family, color temperature, etc.)
3. **Design Moods** — 30+ mood presets that bias randomization (minimal strips decoration, bold amplifies contrast, playful adds animation)
4. **`designScore()`** — quality gate that scores randomization output; low scores trigger rerolls
5. **Curated Presets** (`getCuratedPreset`) — hand-tuned variant/font/fsize combos tried before random generation
6. **Candidates** — single-component randomize generates 3 candidates; user cycles with `← →` keys

## Canvas Modes

| Mode | Behavior |
|------|----------|
| **Desktop** | Fixed 1280px width, auto-height, centered with padding |
| **Phone** | Fixed 390×844px, centered |
| **Free** | Infinite canvas with pan/zoom via camera transform |

## Hooks

- **`useKeyboard`** — all keyboard shortcuts, reads props from a ref for stable mounting
- **`useViewport`** — viewport width + mobile breakpoint + `reducedMotion` (from `prefers-reduced-motion` media query), rAF-throttled resize
- **`useDesigner`** — the entire Designer System: mood state, randomize/randomizeAll, candidate cycling, style transfer (copyStyle), lock/unlock, undo-design, undo-randomize. Extracted from App.jsx to keep canvas interaction separate from design intelligence.
- **`usePicky`** — guided "Picky" wizard: walks users through template selection → mood selection → per-slot option picking → assembled page. Manages a state machine (`idle` → `template` → `mood` → `picking` → `done`) and produces a complete set of positioned, randomized shapes via `assembleShapes`.
- **`useTpApi`** — the `tp` Live IDE API exposed on `window.tp` for console scripting and automation
- **`useHistory`** — generic undo/redo hook (available but App.jsx uses its own implementation for tighter integration)

## Picky Wizard

The "Picky" system is a guided alternative to manual block-by-block composition:

1. **Template selection** — user picks a page type (Landing, Dashboard, Portfolio, etc.) from `PAGE_TEMPLATES`
2. **Mood selection** — user picks a design mood from `PICKY_MOODS` (curated subset of `DESIGN_MOODS`)
3. **Per-slot picking** — for each slot in the template, the wizard generates 3 randomized options; user picks one or skips
4. **Assembly** — `assembleShapes` positions all chosen shapes vertically with device-aware sizing and optional entrance animation delays

State machine: `idle` → `template` → `mood` → `picking` → `done`. Users can navigate back, skip slots, or cancel at any point.

## Performance Patterns

- **Ref-based callbacks** — high-frequency handlers (`onMove`, `onUp`, `onDown`) read state from refs instead of closing over it, keeping callback identity stable across renders
- **`React.memo` with custom comparator** — `ShapeItem` skips re-render unless its specific shape/selection/drag state changed
- **Debounced persist** — localStorage writes are debounced (300ms) to avoid thrashing during drag
- **Async font loading** — only the UI font (DM Sans) blocks first paint; 16 canvas fonts load async
- **Manual chunks** — Vite splits react-vendor, export-vendor, ai-vendor, chat-engine, code-components, design-system-core

## Bundle Strategy

Vite's `manualChunks` splits the build into focused chunks for optimal loading:

| Chunk | Contents | Loading |
|-------|----------|---------|
| `react-vendor` | React + ReactDOM | Eager (framework) |
| `design-system-core` | ComponentRenderer + constants | Eager (renders all components) |
| `export-vendor` | html-to-image | Eager (export path) |
| `ai-vendor` | @huggingface/transformers | Lazy (only when chat AI activates) |
| `chat-engine` | chatAI.js | Lazy (imported dynamically by ChatBubble) |
| `chat-components` | ChatBubble.jsx | Lazy (7 variants, ~600 lines) |
| `code-components` | code/*.jsx + tokenizer | Lazy (code block rendering) |

`modulePreload` is disabled so the browser doesn't eagerly fetch lazy chunks. Only the UI font (DM Sans) blocks first paint; 16 canvas fonts load async via the `media="print"` swap pattern.

## Security Surface

- **`sanitizeHtml()`** — strips dangerous attributes/protocols from user HTML (blocks `javascript:`, `data:` except `data:image/*`, `vbscript:`)
- **`validateImport()`** — validates and sanitizes imported JSON files before loading
- **No backend** — everything runs client-side; localStorage is the only persistence
