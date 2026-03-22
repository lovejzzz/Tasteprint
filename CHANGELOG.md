# Changelog

## 1.0.0

### Added

#### Testing & Quality
- **React StrictMode** — catches double-render bugs and missing effect cleanup during development
- **PR CI workflow** — `.github/workflows/ci.yml` runs verify on pull requests (not just push-to-main deploys)
- **Test coverage config** — `npm run test:coverage` with v8 provider for on-demand coverage reports
- **ErrorBoundary** — individual component render errors show a recoverable error card instead of crashing the canvas
- **ErrorBoundary tests** — 4 tests covering normal render, error catch, custom fallback, and retry recovery
- **Constants integrity tests** — 10+ tests validating VARIANTS/DEFAULT_PROPS/LIB/FONTS/PAL consistency, orphan detection, SIZE_CAT coverage, and cross-reference integrity
- **useKeyboard tests** — 18 tests covering all keyboard shortcuts
- **useHistory tests** — 9 tests covering undo/redo behavior, history cap, and edge cases
- **validateImport tests** — 13 tests covering the security-critical JSON import boundary
- **designerRandomize tests** — 15 tests covering the core randomization engine, moods, DNA, and harmony
- **designScore tests** — 10 tests covering the quality-gate scoring function
- **getTextureStyle tests** — 17 tests covering all 12 texture modes
- **load tests** — 7 tests covering localStorage hydration resilience
- **snap tests** — 12 tests covering the drag-and-drop alignment primitive
- **App smoke tests** — 5 tests (renders, brand, Desktop default, empty guidance, Starter default)
- **XSS sanitizer tests** — 5 tests for hardened bypass vectors (case-insensitive, whitespace, data: URIs)
- **Header tests** — 24 tests covering desktop/mobile layouts, toolbar actions, disabled states, palette/device/mood pickers, and ARIA roles
- **PropsPanel tests** — 10 tests covering toggle rendering, click callbacks, slider/star/count controls, and comprehensive smoke test across all HAS_PROPS types
- **LibrarySidebar tests** — 8 tests covering category tabs, component cards, drag support, ARIA roles, with mocked ComponentRenderer for fast execution
- **useDesigner tests** — 18 tests covering the core designer randomization hook: mood cycling, single/multi-target randomize, candidate generation & cycling, undo randomize, lock/unlock, style transfer, design history, reset, and edge-case no-ops
- **GitHub issue templates** — bug report (with repro steps, environment), feature request (with design-principle self-check), and config.yml (security redirect, blank issue option)
- **useDesigner edge-case tests** — 3 additional tests: cross-type variant clamping (modulo wrap), prop filtering (only target's DEFAULT_PROPS), and candidate cleanup after copyStyle
- **usePicky tests** — 22 tests covering the Picky state machine (idle→template→mood→picking→done), option generation, auto-advance, skip/back navigation, regenerate, cancel, edge cases (invalid template, out-of-range pick), plus `assembleShapes` positioning (desktop/phone dimensions, skipped slots, entrance animation delays) and PAGE_TEMPLATES/PICKY_MOODS data integrity
- **PickyCard tests** — 9 tests covering the option card component: smoke render, mood label, onClick callback, selected/unselected states (class + checkmark), variant passthrough, variant name display, and preview scaling
- **useViewport tests** — 7 tests covering the viewport hook: initial width, mobile breakpoint (below/at/above 768px), resize-via-rAF update, rAF coalescing of rapid resizes, and cleanup on unmount

#### Documentation
- **useHistory JSDoc** — added JSDoc explaining why the tested-but-unused `useHistory` hook exists alongside App.jsx's inline undo/redo (future refactoring target for independent sub-feature history stacks)

#### Features & Onboarding
- **Starter library category** — high-frequency first-screen blocks (Hero, Nav, Button, Input, Card, Pricing)
- **One-click starter CTA** — "Start with Hero + Navbar + Button" seeds a device-aware first screen
- **MobileDrawer component** — extracted ~90-line inline mobile drawer from App.jsx into `src/components/MobileDrawer.jsx` (React.memo, 8 tests)
- **useViewport hook** — extracted from App.jsx for reusable viewport/mobile detection
- **Keyboard shortcuts documentation** in README
- **Progressive disclosure map** in README
- **90-Second First Screen Recipe** in README
- **Designer-First Defaults** section in README

#### Console API
- **`window.tp`** — the `tp` Live IDE API is now exposed on `window` automatically, making all ~20 methods accessible from the browser DevTools console for scripting, batch operations, and extension building

#### API & Architecture Documentation
- **`API.md`** — full reference for the `tp` Live IDE API (~20 methods): read/write/save/load with examples for scripting, batch updates, and palette previews. Linked from README under new "Live IDE API" section.
- **`ARCHITECTURE.md`** — codebase map covering data flow, state model, component hierarchy, render pipeline, randomization engine, canvas modes, hooks, performance patterns, and security surface. Linked from CONTRIBUTING.md.

#### Infrastructure & Docs
- **GitHub Pages SPA support** — `public/404.html` redirect for client-side routing
- **robots.txt** — basic crawl allowance for deployed site
- **CONTRIBUTING.md** — contributor setup guide, project structure, 9-step component checklist, automatic test coverage guide
- **PRODUCT.md** — product plan, principles, and priority roadmap
- **SECURITY.md** — vulnerability reporting and security scope documentation
- **CHANGELOG.md** — this file
- **SEO/OG meta tags** in `index.html`
- **PWA manifest** — `id`, `scope`, `orientation`, `categories`, maskable icon, iOS home screen support
- **`.nvmrc`** pinned to Node 22
- **`.editorconfig`** — 2-space indent, LF, UTF-8, trim trailing whitespace
- **`.gitattributes`** — normalize line endings, mark binary types
- **`.env.example`** — documents `VITE_BASE_PATH` for subfolder deploys
- **`jsconfig.json`** — editor IntelliSense support (JSX autocomplete, go-to-definition, module resolution matching Vite's bundler mode)
- **`.npmrc`** — `engine-strict=true` enforces Node 22 requirement at install time; `save-exact=true` pins dependency versions for reproducible installs
- **Coverage exclusion** — excluded `chatAI.js` (prototype-heavy module) from coverage reports to prevent skewed metrics
- **PR template** — `.github/PULL_REQUEST_TEMPLATE.md` guides contributors through what/why/how-to-test and a pre-submit checklist

### Changed

#### Performance — Callback Stabilization (Runs 28-33)
- **onMove/onUp** — replaced closed-over drag/resize/pan state with refs for stable event handlers during high-frequency mouse interactions
- **useKeyboard** — event listener now mounts once via ref pattern instead of re-attaching on every state change (was 16 dependencies)
- **10+ useCallback stabilizations** — `push`, `undo`, `redo`, `cycle`, `delShape`, `dupShape`, `addShape`, `onDrop`, `onSelect`, `onDown`, `exportJSON`, `exportPng` all converted to ref-based patterns with minimal/empty dependency arrays
- **onTouchMove** — extracted inline arrow function to `useCallback` with ref-based reads (`dragRef`, `rszRef`), preventing handler recreation on every render during touch interactions
- **Header mood picker** — deduplicated 3× `DESIGN_MOODS.find()` calls into single `activeMood` const

#### Performance — Other
- **Font loading** — split Google Fonts into eager (DM Sans for UI) and async (16 canvas fonts via `media="print"` pattern); removed redundant `<link rel="preload">` that defeated async loading
- **PropsPanel** — wrapped with `React.memo` to reduce unnecessary re-renders
- **useViewport resize** — throttled with `requestAnimationFrame` to coalesce rapid resize events
- **localStorage persist** — debounced (300ms) to avoid thrashing during drag/resize
- **Bundle** — lazy-loaded chat sidecar, 7-way manual chunks, disabled modulePreload
- **Chunk strategy** — lowered `chunkSizeWarningLimit` to 2200 for actionable diagnostics

#### UI & Defaults
- **Default canvas mode** — Desktop instead of Free for first-run clarity
- **Default library category** — Starter instead of Structure
- **Device mode controls** — reordered to prioritize Desktop and Phone ahead of Free
- **Undo/redo buttons** — disabled when no history exists
- **LibrarySidebar + mobile drawer** — component previews wrapped with ErrorBoundary

#### Build & CI
- **Lint policy** — `--max-warnings=0` for zero-tolerance on lint regressions; `no-unused-vars` promoted from `warn` to `error` for consistency
- **CI** — uses single `npm run verify` gate (lint + test + build)
- **GitHub Pages deploy** — sets `VITE_BASE_PATH` from repo name in CI
- **PR CI concurrency** — stale PR runs auto-cancel when new commits are pushed (saves Actions minutes)
- **Base path** — configurable via `VITE_BASE_PATH` env var for subfolder deploys

### Fixed

#### Security
- **sanitizeHtml** — hardened against XSS bypasses: case-insensitive `javascript:`, whitespace/control chars, `src`/`action` attrs, `data:` URI allowlist (only `data:image/*` passes), `vbscript:` blocking
- **validateImport texts sanitization** — `texts` sub-object (contenteditable HTML) was not being sanitized on import, allowing XSS via malicious JSON files; now sanitized with same `sanitizeHtml()` as `props`
- **Import security** — sanitizes all string fields, validates prefV, rejects non-finite gest
- **localStorage load** — uses same `validateImport` sanitization as file import

#### Bugs
- **ShapeItem memo** — added missing `texture` comparison in custom React.memo equality check (was causing stale renders on texture change)
- **SIZE_CAT completeness** — added 17 missing component types (toast, progress, rating, sub-toggle as small; table, accordion, chart, etc. as medium) that were silently falling to generic defaults
- **CSS keyframes** — added 17 missing `@keyframes` definitions for mood animations (`tp-d-breathe`, `tp-d-float`, `tp-d-shimmer`, etc.) that were assigned but never rendered; then deduplicated against ComponentRenderer.jsx copies
- **GitHub Pages 404.html** — fixed SPA redirect for subpath deploys (was hardcoded to domain root)
- **manifest.json link** — changed from absolute `/manifest.json` to relative for Vite base path rewriting
- **Duplicate meta tag** — removed second `apple-mobile-web-app-capable` in index.html
- **Device canvas height** — fixed `deviceH` calculation to use actual shape positions (`Math.max(s.y + s.h)`) instead of summing all heights (was wrong for overlapping/gapped layouts)
- **Font categories** — fixed FONT_CATS after font swap (Nunito Sans and Be Vietnam Pro correctly categorized as body, not display)
- **Phantom fonts** — replaced "General Sans" and "Cabinet Grotesk" (Fontshare-only, never loaded) with Google Fonts alternatives
- **Dead export** — removed unused `FONT_URL` constant

#### Refactors
- **debounce** — per-instance timers instead of shared module timer
- **State reset** — consistent `resetTransientEditorState()` across import/clear/reset paths
- **useDesigner hook** — extracted ~200-line Designer System (randomize, moods, candidates, style transfer, lock, undo-design) from App.jsx into `src/hooks/useDesigner.js`
- **useTpApi hook** — extracted ~100-line tp Live IDE API into `src/hooks/useTpApi.js`
- **Unused imports** — removed dead `C` (ComponentRenderer) and `ErrorBoundary` imports from App.jsx
- **Chat bubble** — removed repeated `loadChat()` localStorage reads on re-render
- **Header color util** — extracted `getReadableTextColor()` to eliminate duplicated accent-contrast logic
- **Randomize cleanup** — batched candidate/candidateIdx deletions to reduce render churn
- **Dead parameter removal** — removed unused `prefVRef` from `useTpApi` hook (accepted but never read, misleading JSDoc and unnecessary `useMemo` dep)
- **Stale test cleanup** — removed dead `prefVRef` from `useTpApi` test setup (leftover after parameter removal)
- **Unified delete handler** — merged duplicate `delShape` and `onDel` implementations into one `delShape` with both empty-selection guard and `flushDirtyText()` call; `onDel` is now an alias
- **Zoom button dedup** — extracted `zoomBy(step)` useCallback to eliminate duplicated zoom-with-center-anchor math in zoom-in/out buttons
- **Viewport consistency** — replaced last `window.innerWidth` with shared `useViewport` hook

### Accessibility
- **Zoom** — removed `maximum-scale=1.0, user-scalable=no` from viewport meta (WCAG 1.4.4)
- **Reduced motion** — added `prefers-reduced-motion: reduce` global media query
- **ARIA (LibrarySidebar)** — fixed orphaned `role="listitem"` by wrapping in `role="list"` container
- **ARIA (MobileDrawer)** — added `role="dialog"` with `aria-label`/`aria-hidden`, `role="tablist"`/`role="tab"` with `aria-selected` for category tabs, `role="tabpanel"` for component grid (4 new tests)
- **Skip link** — "Skip to canvas" link appears on Tab focus (WCAG 2.4.1), letting keyboard users bypass the toolbar and jump directly to the design canvas
- **`window.tp`** — Live IDE API exposed on `window` automatically via `useEffect` for browser console access
- **Noscript** — added `<noscript>` fallback message in index.html
