# Tasteprint Product Plan (Current Pass)

## Target User

Primary:
- UI/product designers who need to generate and compare web/app directions quickly

Secondary:
- Startup teams and PM/founders who need clear prototype visuals for decision-making
- Creative developers who want quick visual scaffolding before implementation

## Core Promise

**From blank canvas to exportable prototype in minutes.**

Tasteprint should feel instantly usable while still offering enough depth to refine style, hierarchy, and layout quality.

## First-Run Flow

1. Land in a clean canvas with a clear "add components" cue
2. Add core blocks from the library (hero, cards, nav, forms, etc.)
3. Rearrange and resize with snap guidance
4. Adjust palette and typography to establish design direction
5. Export PNG for sharing or JSON for continued iteration

Success criteria for first run:
- User can produce one coherent screen in under 10 minutes
- Export action is obvious and reliable
- No advanced setup required

## Product Principle: Visible Simplicity, Hidden Power

- **Visible simplicity:** minimal UI friction, strong defaults, immediate feedback, clear controls
- **Hidden power:** keyboard shortcuts, grouping, history, component variants, style randomization/mood controls, JSON portability

Tasteprint should never force advanced concepts before basic progress is made.

## What's Already Solid

These areas have been stabilized through iterative passes and should be maintained, not reworked:

- **First-run onboarding:** Starter-first library, Desktop default, one-click starter CTA, Picky guided wizard, progressive disclosure in README
- **Picky wizard:** 9 page templates, guided state machine (template → mood → per-slot picking → assembled page), palette-aware mood selection, keyboard shortcuts (1–4/R/B/S/Esc), entrance animations
- **Build/CI hygiene:** `npm run verify` gate (lint + test + build), zero-warning lint policy, GitHub Pages deploy CI, PR CI workflow, Dependabot for automated dependency updates
- **Test coverage:** All hooks (useDesigner, useHistory, useViewport, useKeyboard, usePicky, useTpApi), all components (Header, PropsPanel, LibrarySidebar, MobileDrawer, ShapeItem, PickyOverlay, PickyCard, ErrorBoundary, App), core utils (load, snap, debounce, sanitizeHtml, validateImport, getTextureStyle, getReadableTextColor, designerRandomize, designScore), constants integrity + orphan detection
- **Designer system:** 30+ mood presets, Design DNA for canvas-wide cohesion, curated presets, quality-gate rerolls, candidate cycling, style transfer, lock/unlock
- **Keyboard shortcuts:** Fully documented, designer single-key shortcuts for rapid iteration, Picky-specific shortcuts
- **Bundle performance:** Lazy-loaded chat sidecar, manual chunks (7 splits including ai-vendor), disabled modulePreload, deferred canvas font loading
- **PWA:** Manifest with maskable icons, iOS/Android home screen support, StrictMode enabled
- **Security:** sanitizeHtml hardened against XSS bypasses, validateImport sanitizes all string fields on import/load, SECURITY.md with reporting guidance
- **Accessibility:** Skip link (WCAG 2.4.1), prefers-reduced-motion (CSS media query + JS `matchMedia` for inline dStyles animations), ARIA roles on sidebar/drawer/canvas, no viewport zoom restrictions
- **Docs:** README (onboarding, shortcuts, moods), ARCHITECTURE.md, CONTRIBUTING.md (9-step component checklist), API.md (tp Live IDE reference), SECURITY.md, CHANGELOG.md

## Top Next Product Priorities

1. **Component quality depth**
   - Refine individual component variant polish (spacing, alignment, responsive sizing)
   - Ensure all 40+ components produce consistently good results across all moods
   - Audit Picky template assembly for layout quality across all 9 templates × all moods

2. **Export fidelity**
   - Close gaps between canvas preview and PNG output (especially dStyles with complex transforms)
   - Improve JSON round-trip reliability for complex designs

3. **Collaboration handoff**
   - Consider lightweight share URLs or preview links
   - Improve JSON format documentation for external tool integration

4. **Scope discipline (ongoing)**
   - Prioritize compose/tune/export loop over sidecar experiments
   - Keep experimental features isolated from primary interaction path
