# Tasteprint Live IDE API (`tp`)

Tasteprint exposes a programmatic API via the browser console for scripting, automation, and extension building. Access it through the React context or directly from the DevTools console.

## Quick Start

Open DevTools → Console and try:

```js
// List all shapes on the canvas
tp.shapes()

// Add a hero component
tp.add("hero", { x: 100, y: 100 })

// Switch palette
tp.setPalette("midnight")
```

> The `tp` object is exposed on `window.tp` automatically, so you can use it directly in the browser console.

## Read Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `tp.palette()` | `string` | Current palette name (e.g. `"warm"`) |
| `tp.palettes()` | `string[]` | All available palette names |
| `tp.colors()` | `object` | Current palette colors (`bg`, `tx`, `ac`, `mu`, `su`, `bd`, `card`) |
| `tp.shapes()` | `object[]` | All shapes with `id`, `type`, `x`, `y`, `w`, `h`, `variant`, `font`, `fsize`, `texts`, `props` |
| `tp.get(id)` | `object \| null` | Single shape by ID |
| `tp.find(type)` | `string[]` | IDs of all shapes matching a component type |
| `tp.device()` | `string` | Current device mode: `"free"`, `"desktop"`, or `"phone"` |
| `tp.fonts()` | `string[]` | All available font names |
| `tp.types()` | `string[]` | All available component types |
| `tp.variants(type)` | `string[]` | Variant names for a component type |

## Write Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `tp.add(type, opts?)` | `string` | Add a shape. Returns its ID. Options: `{ x, y, w, h, variant, font, fsize, texts, props }` |
| `tp.remove(id)` | — | Remove a shape by ID |
| `tp.update(id, changes)` | — | Update shape properties: `{ x, y, w, h, variant, font, fsize, texts, props }` |
| `tp.setText(id, key, value)` | — | Set a text field (`null` to delete) |
| `tp.setProp(id, key, value)` | — | Set a prop value (`null` to delete) |
| `tp.setFont(id, fontIndex)` | — | Set font by index (see `tp.fonts()`) |
| `tp.setFsize(id, size)` | — | Set font size multiplier (0.5–2.0) |
| `tp.setPalette(name)` | — | Switch palette |
| `tp.setDevice(mode)` | — | Switch device: `"free"`, `"desktop"`, `"phone"` |
| `tp.clear()` | — | Remove all shapes (keeps code-blocks) |
| `tp.reset()` | — | Full reset: clear shapes, reset palette to `"warm"`, device to `"desktop"` |

## Save / Load

| Method | Returns | Description |
|--------|---------|-------------|
| `tp.save(name?)` | `string` | Save current state to localStorage. Returns storage key |
| `tp.load(name?)` | `boolean` | Load a saved state. Returns `true` on success |
| `tp.saves()` | `string[]` | List all saved state names |
| `tp.deleteSave(name?)` | — | Delete a saved state |
| `tp.export()` | `object` | Export current state as `{ shapes, pal, device }` |

## Examples

### Build a landing page programmatically

```js
const nav = tp.add("navbar", { y: 0 })
const hero = tp.add("hero", { y: 80 })
const cta = tp.add("button", { y: 500, x: 540 })
tp.setText(cta, "label", "Get Started")
tp.setPalette("ocean")
```

### Batch-update all cards

```js
tp.find("card").forEach(id => {
  tp.update(id, { variant: 2, font: 3 })
})
```

### Quick palette preview

```js
for (const name of tp.palettes()) {
  tp.setPalette(name)
  await new Promise(r => setTimeout(r, 1000))
}
tp.setPalette("warm") // restore
```

### Export and reimport

```js
const state = tp.export()
// ... make changes ...
tp.reset()
// Reimport by setting shapes directly isn't exposed,
// but you can save/load via localStorage:
tp.save("backup")
tp.load("backup")
```

## Notes

- All write methods push to the undo stack — `Ctrl+Z` reverts them
- Shape coordinates are in canvas space (not screen pixels)
- Font index maps to the array returned by `tp.fonts()`
- The API is designed for scripting and extension building, not for production automation
