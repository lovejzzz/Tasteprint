# Picky Feature — Improvement Roadmap

Track autonomous improvement rounds. Each round picks the next item, implements it, verifies the build, and logs the result.

## Priority Queue (ordered by impact)

- [x] 1. **Regenerate button** — "Shuffle" button to regenerate 4 new options for the current slot without advancing
- [x] 2. **Mood picker at start** — After picking a template, let user choose a mood (or "Surprise me") that influences all options
- [x] 3. **Live assembly preview** — Small sidebar/bottom strip showing the page being built as picks are made
- [x] 4. **Card entrance animations** — Staggered fade+slide-up when options appear for each new step
- [x] 5. **More templates** — Blog, SaaS Landing, Restaurant, Event Page, Resume/CV (5 more templates)
- [x] 6. **Keyboard shortcuts** — 1/2/3/4 to pick, S to skip, B to go back, R to regenerate
- [x] 7. **Clickable progress dots** — Click any dot to jump to that step (not just linear back/forward)
- [x] 8. **Option variant labels** — Show variant name (e.g., "Glass", "Brutal") alongside the mood label
- [x] 9. **Assembly entrance animation** — When "Build Page" is clicked, staggered drop-in animation as shapes appear on canvas
- [x] 10. **Smart diversity guarantee** — Ensure all 4 options have different variant indices (never duplicate visuals)
- [x] 11. **Quick presets** — "Minimal landing", "Bold dashboard", "Playful portfolio" — template + mood in one click
- [x] 12. **Responsive preview toggle** — In done phase, toggle between desktop/phone preview of assembled page
- [x] 13. **Palette-aware options** — Option C/D respect palette temperature (warm palettes avoid cold moods)
- [x] 14. **Template preview icons** — Show tiny component type icons in each template card (navbar → hero → card → ...)

## Completed

- **2026-03-22 Round 1** — Added Shuffle/Regenerate button: `regenerate()` in usePicky clears cache for current step, Shuffle button with shuffle icon in nav bar, 3 new tests (354 total).
- **2026-03-22 Round 2** — Added mood picker: new `"mood"` phase between template and picking, 6 curated moods + "Surprise me", `selectMood()` generates DNA, `prevStep` from step 0 returns to mood, 8 new tests (362 total).
- **2026-03-22 Round 3** — Added live assembly preview: horizontal strip below progress dots showing tiny real-component thumbnails for picked slots and placeholder labels for unpicked ones. Highlights current step. 2 new tests (364 total).
- **2026-03-22 Round 4** — Added card entrance animations: `tp-picky-card-in` keyframe (fade+slide-up, cubic-bezier ease-out), staggered 70ms per card via wrapper div. Re-triggers on step change via React key. 1 new test (365 total).
- **2026-03-22 Round 5** — Added 5 new templates: Blog, SaaS Landing, Restaurant, Event Page, Resume/CV (9 total). Template grid now 3-column. Each uses real LIB types (timeline, accordion, bento-grid, etc.). 1 new test (366 total).
- **2026-03-22 Round 6** — Added keyboard shortcuts: 1-4 pick, R shuffle, B back, S skip. useEffect listener active only during picking phase, ignores input fields. Subtle kbd hint bar on desktop. 3 new tests (369 total).
- **2026-03-22 Round 7** — Added clickable progress dots: `goToStep(idx)` in usePicky, dots now `<button role="tab">` with hover scale + aria labels. Works from both picking and done phases, ignores out-of-range. 4 new tests (373 total).
- **2026-03-22 Round 8** — Added variant labels: each option card now shows variant name (bold, e.g. "Glass") alongside mood label (dimmed, e.g. "Elegant") via `varName()` from utils. 1 new test (374 total).
- **2026-03-22 Round 9** — Added assembly entrance animation: assembled shapes drop in with staggered 120ms delay (fade+scale+translateY). `_pickyDelay` field on shapes drives CSS animation in ShapeItem, auto-cleaned after animation completes. 1 new test (375 total).
- **2026-03-22 Round 10** — Smart diversity guarantee: `_genUnique()` helper retries up to 5 times per option to avoid used variant indices. Tracks used set across all 4 options. Gracefully degrades if component has fewer variants than options. 1 new test (376 total).
- **2026-03-22 Round 11** — Quick presets: 6 curated one-click combos (Minimal Landing, Bold Landing, Elegant Dashboard, Playful Portfolio, Synthwave SaaS, Clean Resume). `quickStart(template, mood)` skips mood phase. Pill-style preset row above template grid. 2 new tests (377 total).
- **2026-03-22 Round 12** — Responsive preview toggle: done phase now shows a scaled live preview of the assembled page with Desktop/Phone toggle. Uses `assembleShapes` with toggled device + real ComponentRenderer thumbnails. Extracted `DonePhase` subcomponent. Smooth CSS transitions on size change. 1 new test (378 total).
- **2026-03-22 Round 13** — Palette-aware options: `paletteTemperature()` classifies palette accent hue as warm/cool/neutral. Options C & D now pick moods that match the palette temperature (warm palettes → bold/playful/artdeco, cool → elegant/minimal/synthwave). 3 new tests (381 total).
- **2026-03-22 Round 14** — Template preview icons: each template card now shows a row of tiny slot-label tags (e.g. "Nav", "Hero", "Prici…") below the section count, giving users a visual summary of what the template contains. Abbreviated to 6 chars max. 1 new test (385 total).

## Roadmap Complete

All 14 planned improvements have been implemented and verified. The Picky feature now includes: regenerate/shuffle, mood picker, live assembly preview, card animations, 9 templates, keyboard shortcuts, clickable progress dots, variant labels, assembly animations, smart diversity, quick presets, responsive preview, palette-aware moods, and template slot previews.
