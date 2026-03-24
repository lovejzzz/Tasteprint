# Contributing to Tasteprint

Thanks for your interest! Tasteprint is a designer-first rapid prototyping tool — contributions should keep it easy to use on the surface and powerful at the core.

## Quick Start

```bash
nvm use          # Node 22
npm install
npm run dev      # http://localhost:5173
```

## Before You Commit

```bash
npm run verify   # lint + test + build (all must pass)
```

## Design Principles

1. **Surface stays simple.** If a feature adds UI noise without improving prototype speed, it should stay hidden or optional.
2. **Progressive disclosure.** Starter blocks → variants → advanced controls. Don't flatten the learning curve by dumping everything at once.
3. **Prototype speed over configurability.** Fewer clicks to a shareable screen wins over more knobs.
4. **Opinionated defaults.** Desktop mode, Starter category, one-click randomize — new users should feel momentum immediately.

## What Makes a Good PR

- Reduces visible complexity (fewer clicks, cleaner defaults)
- Fixes warnings or stabilizes the build
- Adds a component type that fits the existing Starter → Advanced flow
- Improves export quality (PNG fidelity, JSON roundtrip)
- Keeps the `npm run verify` pipeline green

## What to Avoid

- Features that require configuration before they're useful
- UI that's only meaningful to developers (not designers)
- Breaking the compose → tune → export loop
- Adding dependencies without a clear prototype-speed justification

## Architecture

For a deeper understanding of data flow, state management, the render pipeline, and performance patterns, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Project Structure

```
src/
  App.jsx              # Main editor (canvas, state, interactions)
  constants.js         # Palettes, fonts, component library, variants
  utils.js             # Helpers (randomize, snap, design DNA, etc.)
  global.css           # Global styles + prefers-reduced-motion media query
  canvas.css           # Canvas-specific styles (grid, selection, guides)
  main.jsx             # Entry point (StrictMode wrapper)
  components/
    ComponentRenderer.jsx  # Renders all 40+ component types by type/variant
    Header.jsx             # Top toolbar (palette, device, mood, undo/redo, export)
    header.css             # Header structural styles
    LibrarySidebar.jsx     # Desktop component library sidebar
    librarysidebar.css     # LibrarySidebar structural styles (nav, cards, hover states)
    MobileDrawer.jsx       # Mobile bottom drawer (FAB, category tabs, component grid)
    ShapeItem.jsx          # Individual canvas shape (selection, toolbars, resize)
    shapeitem.css          # ShapeItem structural styles (toolbar, resize handle, badges)
    PropsPanel.jsx         # Per-component props editor (toggles, sliders, etc.)
    propspanel.css         # PropsPanel structural styles (panel, toggle switch, buttons)
    PickyOverlay.jsx       # Guided wizard overlay (template → mood → per-slot picking)
    picky.css              # Picky wizard structural styles (phases, cards, navigation)
    PickyCard.jsx          # Option card with preview for wizard steps
    ErrorBoundary.jsx      # Crash-resilient wrapper for component renders
    ChatBubble.jsx         # Chat component — 7 variants (iMessage/Slack/terminal/glass/gradient/brutal/glow)
    chatbubble.css         # ChatBubble structural styles (emoji picker, new-chat buttons, hover states)
    chatAI.js              # Chat AI response engine (lazy-loaded sidecar)
    animations.css         # Shared CSS keyframe animations for components
    code/                  # Code block components (lazy-chunked)
      index.js             # Barrel exports
      tokenizer.jsx        # Syntax highlighting primitives (tokenize, TC, HighlightLine)
      CodeIDE.jsx          # IDE editor variant
      CodeNotebook.jsx     # Jupyter-style notebook variant
      CodeReview.jsx       # Diff/review variant
      CodeMinimap.jsx      # VS Code-style minimap variant
      CodeBenchmark.jsx    # Performance benchmark variant
      CodeTypewriter.jsx   # Animated typing variant
      AsciiArt.jsx         # ASCII art variant
  hooks/
    useKeyboard.js     # Keyboard shortcuts (delete, undo, redo, nudge, etc.)
    useViewport.js     # Responsive viewport width + mobile breakpoint
    useDesigner.js     # Designer system (randomize, moods, candidates, style transfer, lock)
    usePicky.js        # Guided "Picky" wizard state machine + page templates
    useTpApi.js        # tp Live IDE console API
    useHistory.js      # Generic undo/redo hook
    useLatestRef.js    # Always-current ref (replaces manual ref sync pattern)
  contexts/
    TpContext.js       # React context for the tp Live IDE API
  __tests__/           # Vitest + Testing Library tests
```

## Adding a Component Type

1. Add the type to `VARIANTS` in `constants.js` (variant names array)
2. Add the type to `DEFAULT_PROPS` in `constants.js` (tunable prop defaults)
3. If it supports editable text, add the type to the `HAS_TEXT` set
4. Add a library entry in the `LIB` array (pick the right category — start with Starter only if it's a high-frequency first-screen block)
5. Add the type to `SIZE_CAT` in `utils.js` (`small`, `medium`, or `large`) — controls font sizing, animation intensity, and clip-path eligibility during randomization
6. If it has tunable props, add the type to the `HAS_PROPS` set in `constants.js`
7. Add rendering logic in `ComponentRenderer.jsx`
8. If it has tunable props, add a panel section in `PropsPanel.jsx`
9. Run `npm run verify`

The constants integrity tests will catch missing or mismatched entries across `VARIANTS`, `DEFAULT_PROPS`, `LIB`, `HAS_TEXT`, and `SIZE_CAT`.

### What the existing tests cover automatically

You don't need to write tests for most of the checklist above — the integrity test suite validates:

- Every `LIB` type has `VARIANTS` defined
- Every `HAS_PROPS` type has `DEFAULT_PROPS` (and vice versa)
- Every `HAS_TEXT` type exists in `VARIANTS`
- Every `VARIANTS` type appears in at least one `LIB` category
- Every `VARIANTS` type belongs to exactly one `SIZE_CAT` category
- No duplicate types within a `LIB` category
- The `PropsPanel` smoke test renders every `HAS_PROPS` type without throwing

If any of these are missing after adding a component, `npm run verify` will fail with a clear message.

## Code Style

- ESLint with `--max-warnings=0` (no warnings allowed)
- No unused variables (prefix with `_` if intentionally unused)
- Prefer `useCallback`/`useMemo` for handlers and derived data in App.jsx
