# Tasteprint

[![CI](https://github.com/skyxzzz/Tasteprint/actions/workflows/ci.yml/badge.svg)](https://github.com/skyxzzz/Tasteprint/actions/workflows/ci.yml)
[![Deploy](https://github.com/skyxzzz/Tasteprint/actions/workflows/deploy.yml/badge.svg)](https://github.com/skyxzzz/Tasteprint/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/node-22-brightgreen.svg)](.nvmrc)

Tasteprint is a **designer-first rapid prototyping tool** for websites and apps.

It is built around one promise:

> **From blank canvas to presentation-ready screen in minutes.**

Simple on the surface, powerful at the core.

## Product Positioning

Tasteprint is for people who want to explore visual direction quickly without wrestling complex setup.

- **Surface (always visible):** add blocks, arrange, style, export
- **Core (progressively revealed):** variants, fine-grained props, grouped edits, keyboard speed, JSON portability

If a feature adds UI noise without improving prototype speed, it should stay hidden or optional.

### Progressive disclosure map (what to use first vs later)

Use this as a quick complexity filter:

- **Use immediately (first pass):** Starter blocks, Desktop/Phone mode, one randomize pass, lock, PNG export
- **Use after first screen exists:** variant cycling, typography tuning, grouped edits, JSON export/import
- **Use only when needed:** free-canvas panning/zooming, style-transfer workflows, design-history recovery loops

If you feel overwhelmed, ignore the “later” layers and just finish one shareable screen first.

### Why it feels easy (even with power under the hood)

Tasteprint is intentionally opinionated in the first 10 minutes:

- start from **Starter** blocks, not a giant all-at-once library
- build in **Desktop** or **Phone** before touching free-canvas mode
- use **one randomize pass** to get momentum, then lock and refine
- export early, iterate in short loops

This keeps cognitive load low while preserving advanced control when you need it.

## Who It’s For

- UI/product designers exploring multiple directions fast
- Founders/PMs validating app or website flows before implementation
- Creative technologists who want visual velocity without heavy design-tool ceremony

## Fastest Path (2-Minute Designer Onboarding)

1. Start in **Desktop** (default) or switch to **Phone** (skip free canvas for your first pass)
2. On an empty canvas, click **Start with Hero + Navbar + Button** (or add those blocks manually from **Starter**)
3. Click **Randomize All** once for a cohesive direction
4. Lock parts you like and keep iterating
5. Export **PNG** for sharing, or **JSON** to keep the prototype editable

### 90-Second First Screen Recipe

Use this when you just want a strong first pass quickly:

1. **Pick one target**: Desktop *or* Phone (don’t bounce between both yet)
2. **Build one flow**: Navbar → Hero → primary Button (or CTA)
3. **One mood + one palette**: choose once, then iterate component variants before changing global style
4. **Freeze wins early**: lock any block you already like so global randomize won’t destroy it
5. **Ship the pass**: export PNG for feedback, JSON for editable handoff

## Designer-First Defaults (Day 1)

When in doubt, keep these defaults:

- Start from **Starter** components before exploring all categories
- Build one complete screen before polishing micro-details
- Use **one palette + one font pairing** per concept pass
- Prefer **PNG export** for review rounds, keep **JSON export** for iteration handoff

This keeps the surface easy while preserving the powerful core for later passes.

## First-Screen Quality Checklist

A screen is “good enough to share” when:

- visual hierarchy is obvious at first glance (headline → action → support)
- spacing rhythm feels consistent (not crowded/noisy)
- palette + typography look intentional
- PNG export looks like what you saw on canvas
- JSON re-import restores the same working state

## Keyboard Shortcuts

### Essentials

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl Z` | Undo |
| `⌘/Ctrl Shift Z` | Redo |
| `⌘/Ctrl D` | Duplicate selected |
| `Delete / Backspace` | Remove selected |
| `Arrow keys` | Nudge selected (1px) |
| `Shift + Arrow keys` | Nudge selected (10px) |

### Grouping

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl G` | Group selected blocks |
| `⌘/Ctrl Shift G` | Ungroup |

### Designer Shortcuts (no modifier key, requires selection)

| Key | Action |
|-----|--------|
| `R` | Randomize selected block |
| `Shift R` | Randomize all blocks |
| `U` | Undo last randomize |
| `M` | Cycle mood/palette |
| `L` | Lock/unlock selected block |
| `Z` | Undo design on selected block |
| `C` | Set selected as style-transfer source |
| `← / →` | Cycle variant candidates |

> These single-key shortcuts are disabled while typing in text fields.

## Guided Page Builder (Picky)

Don't want to start from scratch? Use the **Picky** wizard:

1. Pick a page template (Landing, Dashboard, Portfolio, Shop, Blog, SaaS, Restaurant, Event, Resume)
2. Choose a design mood
3. For each section, pick from 3 randomized options (or skip)
4. Get a complete, positioned page in under a minute

Picky is the fastest path when you know what kind of page you want but don't want to assemble blocks manually.

**Picky keyboard shortcuts:** `1`–`4` pick option · `R` shuffle · `B` back · `S` skip · `Esc` cancel

## Core Capabilities

- 40+ component types across 9 categories
- Starter-first library flow for quick first composition
- Free, Desktop, and Phone canvas modes
- Curated palettes, typography controls, component variants
- Snap guides, nudge controls, grouping, duplication
- Undo/redo with iterative exploration flow
- PNG export + JSON export/import
- Local autosave for in-progress prototypes

## Design Moods

Moods shape every randomize pass — variant selection, font pairing, shadow style, gradient palette, border treatment, and micro-animations all shift to match the mood's personality.

| Category | Moods |
|----------|-------|
| **Foundations** | Auto ✦, Minimal ○, Bold ■, Elegant ◇, Playful ★ |
| **Retro & Cultural** | Art Deco 🏛, Synthwave 🌆, Retro Disco 🪩, Ukiyo-e 🌊 |
| **Craft & Texture** | Pixel Art 👾, Line Art ✏️, Paper Craft 📄, Paper Cut ✂️, Collage 🎨, Embroidery 🧵, Lego 🧱 |
| **Nature & Organic** | Watercolor 🎨, Ink Wash 🖌️, Botanical 🌿, Stained Glass 🪟 |
| **Figurative** | Kawaii 🧸, 3D Clay 🧱, Plushie 🧸, Pop Mart 🎪, Storybook 📚 |
| **Cinematic** | Sci-Fi 🚀, Cinematic 🎬, Shadow Play 🎭, Porcelain 🏺 |
| **Art Styles** | Tattoo Art 💉, Watercolor Tattoo |

Select a mood before randomizing to get a cohesive direction in one click. Use **Auto** for maximum variety.

## Scope Discipline

Tasteprint prioritizes the compose → tune → export loop.

Experimental sidecar features are intentionally de-emphasized in the primary product surface.

## Quick Start

Requires **Node 22** (pinned in `.nvmrc`).

```bash
nvm use          # switches to Node 22
npm install
npm run dev      # http://localhost:5173
```

Then open the app and build one screen end-to-end before exploring advanced controls.

### Base Path (for subfolder deploys)

Tasteprint defaults to `/` for local/dev simplicity.

If you deploy under a subpath (for example GitHub Pages), set:

```bash
VITE_BASE_PATH=/Tasteprint/
```

You can put this in `.env.production` to keep local onboarding friction-free.

## Scripts

Use `npm run verify` before commits to keep lint, tests, and build green in one pass.

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — lint source files (`--max-warnings=0`)
- `npm test` — run tests
- `npm run verify` — lint + test + build

## Live IDE API

Tasteprint exposes a scriptable `tp` API in the browser console for automation and extension building. See **[API.md](API.md)** for the full reference.

```js
tp.add("hero", { x: 100, y: 100 })
tp.setPalette("midnight")
tp.find("card").forEach(id => tp.update(id, { variant: 2 }))
```

## Tech Stack

- React + Vite
- html-to-image (PNG export)
- Vitest + Testing Library
- ESLint
