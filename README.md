# Tasteprint

A visual design component playground — drag-and-drop UI components onto a canvas, customize palettes, fonts, and variants, then export as PNG or JSON.

## Setup

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run lint` | Lint source files |

## Stack

- React 19 + Vite 8
- html-to-image (PNG export)
- Vitest + Testing Library
- ESLint

## Features

- 40+ component types across 9 categories
- 13 color palettes with automatic taste tracking
- 17 font families with per-component selection
- Multiple variants per component (button: 7 variants, card: 8, etc.)
- Desktop / Phone / Free canvas modes
- Snap-to-grid alignment guides
- Undo / Redo (⌘Z / ⌘⇧Z)
- Component grouping (⌘G / ⌘⇧G)
- Arrow key nudging (1px, or 10px with Shift)
- PNG and JSON export/import
- Auto-save to localStorage

## Project Structure

```
src/
├── App.jsx                    # Main orchestrator
├── constants.js               # Fonts, palettes, variants, library
├── utils.js                   # Helpers (uid, snap, sanitize, validate)
├── main.jsx                   # Entry point
├── components/
│   ├── ComponentRenderer.jsx  # 40+ component renderers
│   ├── Header.jsx             # Top toolbar
│   ├── LibrarySidebar.jsx     # Component library panel
│   └── ShapeItem.jsx          # Canvas shape (React.memo)
├── hooks/
│   ├── useHistory.js          # Undo/redo
│   └── useKeyboard.js         # Keyboard shortcuts
└── __tests__/
    └── utils.test.js          # Unit tests
```
