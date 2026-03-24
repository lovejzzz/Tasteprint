# Picky Feature — V2 Roadmap

Phase 2 improvements to make Picky the killer feature. V1 shipped 14 items; V2 focuses on depth, delight, and power-user workflows.

## Priority Queue (ordered by impact)

- [x] 1. **Remix mode** — "Remix" button on done screen re-enters Picky with same template/mood but regenerates all options fresh. Keeps existing picks as defaults.
- [x] 2. **Undo within Picky** — Go back to any previous pick and change it without restarting. Clicking a picked preview-strip thumbnail jumps to that step with the old pick pre-selected.
- [x] 3. **Custom template builder** — "Custom" template option where user picks which component types to include from a checklist, creating a personalized slot sequence.
- [x] 4. **Palette picker inside Picky** — Small palette swatch row in the picking phase header. Changing palette regenerates all options with new colors without leaving Picky.
- [x] 5. **Option comparison mode** — Hold Shift to select 2 options side-by-side for detailed comparison before picking.
- [x] 6. **Smart section count** — Templates suggest "Add another section?" after the last slot, letting users extend the page with more components dynamically.
- [x] 7. **Picky history** — Remember last 3 Picky sessions in localStorage. "Recent" tab on template screen lets users re-enter a previous session's template+mood+picks.
- [x] 8. **Swipe gestures on mobile** — Swipe left/right to navigate options, swipe up to pick, swipe down to skip. Native-feeling touch interactions.
- [x] 9. **Option hover preview** — On desktop, hovering an option card shows a larger tooltip preview at 1:1 scale for detailed inspection.
- [x] 10. **Assembly layout intelligence** — Smarter stacking: navbar always full-width, sidebar floats beside content, cards arrange in grid instead of single column.
- [x] 11. **Export from Picky** — "Export PNG" button directly on done screen, exports the preview without going to canvas first.
- [x] 12. **Mood blending** — "Blend" option in mood picker that mixes two moods (e.g., elegant+bold). DNA interpolates between both mood configs.

## Completed

- **2026-03-22 V2 Round 1** — Remix mode: `remix()` in usePicky regenerates DNA + clears option cache while preserving template/mood/picks. "Remix" button on done screen with accent styling. 2 new tests (377 total).
- **2026-03-22 V2 Round 2** — Undo within Picky: preview-strip thumbnails are now clickable `<button>` elements that call `goToStep(i)`. Picked slots show a pencil-edit overlay on hover. Existing picks are preserved when jumping back, so users can re-pick any slot. 1 new test (378 total).
- **2026-03-22 V2 Round 3** — Custom template builder: new `"custom"` phase with 17 component-type chips. `enterCustom()` + `confirmCustom(types[])` actions. "Build Your Own" button on template screen. `CustomBuilder` component with toggle-chip checklist, section counter, and Continue/Back/Cancel flow. 5 new tests (383 total).
- **2026-03-22 V2 Round 4** — Palette picker inside Picky: compact swatch row below step title in picking phase. Clicking a swatch calls `setPal` + `clearCache()` to regenerate all options with the new palette colors. `pal`/`setPal` passed from App.jsx. 1 new test (388 total).
- **2026-03-22 V2 Round 5** — Option comparison mode: Shift+click on two cards opens a compare overlay showing them side-by-side at full size. Click either to pick. Options grid dims during compare. `comparing` state (Set) resets on step change. PickyCard gains `comparing` highlight class. 1 new test (389 total).
- **2026-03-22 V2 Round 6** — Smart section count: "+ Add another section" link in done phase opens a dropdown of unused component types. `addSlot(type)` in usePicky appends a slot to the template and navigates to it for picking. Filters out already-used types. 1 new test (390 total).
- **2026-03-22 V2 Round 7** — Picky history: `saveToHistory()` writes template+mood to `tp_picky_history` in localStorage (max 3, deduped, most-recent-first) on every assemble. "Recent" section on template screen shows past sessions as pill buttons that call `quickStart()`. `loadPickyHistory()` exported for UI. 2 new tests (392 total).
- **2026-03-22 V2 Round 8** — Swipe gestures on mobile: touch handlers on mobile options container detect swipe up (pick visible card), swipe down (skip). Horizontal swipes handled by native CSS scroll-snap. 50px threshold, 500ms timeout. Swipe hint text below card dots. 393 tests passing.
- **2026-03-22 V2 Round 9** — Option hover preview: on desktop, hovering a card shows a larger (~480px wide) real ComponentRenderer preview below the options grid. Uses `hoveredIdx` state with fade-in animation. Scales to fit max 480px. Desktop only (skipped on mobile). 393 tests passing.
- **2026-03-22 V2 Round 10** — Assembly layout intelligence: `assembleShapes` now categorizes components — full-width types (navbar, hero, footer, promo-banner, heading) stretch to maxW; sidebar+next content sit side-by-side; consecutive small types (stat-card, card-sm, etc.) grid into 2-3 columns. Phone falls back to single column. 3 new tests (396 total).
- **2026-03-22 V2 Round 11** — Export from Picky: "Export PNG" button on done screen captures the preview element via `toPng` (html-to-image) at 2x pixel ratio and triggers download as `picky-preview.png`. Uses ref on preview container. 1 new test (397 total).
- **2026-03-22 V2 Round 12** — Mood blending: "Blend two moods" button in mood picker enters blend mode. Two-click selection creates `"blend:mood1+mood2"` format. `generateOptions` uses mood1 for DNA/Options A, mood2 for Option B with separate DNA, and palette-aware moods for C/D. Extracted `MoodPicker` subcomponent with blend state. 1 new test (398 total).

## V2 Roadmap Complete

All 12 V2 improvements shipped across 12 autonomous rounds (V1: 14 items + V2: 12 items = 26 total improvements). 398 tests passing.
