import React from "react";
import { HighlightLine, tokenize, TC } from "./tokenizer";
import { TpContext } from "../../contexts/TpContext";

/* ========== Constants ========== */
const MONO = "'JetBrains Mono',monospace";
const PAIRS = {'(':')','[':']','{':'}','"':'"',"'":"'",'`':'`'};

const MAIN_DEFAULT = `// Tasteprint IDE \u2014 your design, in code
// Run with \u25B6 or \u2318+Enter

// See what's on the canvas
const shapes = tp.shapes();
console.log(\`\${shapes.length} components on canvas\`);
shapes.forEach(s => console.log(\`  \${s.type} #\${s.id.slice(0,4)}\`));

// Current theme
console.log('Palette:', tp.palette());
console.log('Device:', tp.device());
`;

const PLAYGROUND_DEFAULT = `// Playground \u2014 experiment freely!
//
// Try:
//   tp.add('button', { x: 50, y: 200, w: 200, h: 48 })
//   tp.setPalette('neon')
//   tp.setDevice('phone')
//   tp.remove(tp.shapes()[0]?.id)
//   tp.clear()
`;

const API_DOCS = `/**
 * \u2500\u2500\u2500 tp API Reference \u2500\u2500\u2500
 *
 * \u2500\u2500 READ \u2500\u2500
 * tp.palette()    \u2192 palette name ("warm","neon",...)
 * tp.palettes()   \u2192 all palette names
 * tp.colors()     \u2192 { bg, card, ac, ac2, tx, mu, bd, su }
 * tp.shapes()     \u2192 [{ id, type, x, y, w, h, variant, font, fsize, texts, props }]
 * tp.get(id)      \u2192 full shape object or null
 * tp.find(type)   \u2192 [id, id, ...] matching type
 * tp.device()     \u2192 "free" | "desktop" | "phone"
 * tp.fonts()      \u2192 ["DM Sans", "Inter", ...]
 * tp.types()      \u2192 all component type names
 * tp.variants(type) \u2192 ["Filled","Outline","Ghost",...]
 *
 * \u2500\u2500 WRITE \u2500\u2500
 * tp.setPalette(name)
 * tp.setDevice(mode)
 * tp.add(type, opts?)        \u2192 id
 *   opts: { x, y, w, h, variant, font, fsize, texts, props }
 * tp.remove(id)
 * tp.update(id, changes)
 *   changes: { x, y, w, h, variant, font, fsize, texts, props }
 * tp.setText(id, key, value)  \u2192 set text field
 * tp.setProp(id, key, value)  \u2192 set prop field
 * tp.setFont(id, fontIndex)   \u2192 set font (0\u201316)
 * tp.setFsize(id, size)       \u2192 set font size (0.5\u20132.0)
 * tp.clear()                  \u2192 removes all (keeps IDE)
 *
 * \u2500\u2500 SAVE / LOAD \u2500\u2500
 * tp.save(name?)     \u2192 save current state
 * tp.load(name?)     \u2192 restore saved state
 * tp.saves()         \u2192 list saved state names
 * tp.deleteSave(name?) \u2192 delete a save
 * tp.reset()         \u2192 clear everything, reset palette & device
 * tp.export()        \u2192 { shapes, pal, device } object
 *
 * \u2500\u2500 EXAMPLES \u2500\u2500
 * // Add buttons with custom text
 * const id = tp.add('button', { x: 50, y: 100 });
 * tp.setText(id, 'label', 'Click me!');
 *
 * // Change a card's content
 * const cards = tp.find('card');
 * tp.setText(cards[0], 'title', 'New Title');
 *
 * // Save & restore
 * tp.save('my-layout');
 * tp.load('my-layout');
 *
 * // Get all variant styles for buttons
 * console.log(tp.variants('button'));
 */
`;

/* File tree structure — static skeleton, user files added dynamically */
const TREE_BASE = [
  { name: 'src', children: [
    { name: 'main.js', path: 'src/main.js' },
    { name: 'playground.js', path: 'src/playground.js' },
  ]},
  { name: 'config', children: [
    { name: 'palette.js', path: 'config/palette.js' },
    { name: 'shapes.js', path: 'config/shapes.js' },
    { name: 'fonts.js', path: 'config/fonts.js' },
    { name: 'variants.js', path: 'config/variants.js' },
    { name: 'types.js', path: 'config/types.js' },
    { name: 'device.js', path: 'config/device.js' },
  ]},
  { name: 'snippets', children: [
    { name: 'layout.js', path: 'snippets/layout.js' },
    { name: 'theme.js', path: 'snippets/theme.js' },
    { name: 'batch.js', path: 'snippets/batch.js' },
  ]},
  { name: 'docs', children: [
    { name: 'api.js', path: 'docs/api.js' },
  ]},
];

const FCOLORS = {
  'main.js':'#f9e2af', 'playground.js':'#f9e2af',
  'palette.js':'#89b4fa', 'shapes.js':'#89b4fa', 'fonts.js':'#89b4fa',
  'variants.js':'#89b4fa', 'types.js':'#89b4fa', 'device.js':'#89b4fa',
  'layout.js':'#fab387', 'theme.js':'#fab387', 'batch.js':'#fab387',
  'api.js':'#a6e3a1',
};

const FICONS = {
  'main.js': 'JS', 'playground.js': 'JS',
  'palette.js': '\uD83C\uDFA8', 'shapes.js': '\u25A1', 'fonts.js': 'Aa',
  'variants.js': '\u2726', 'types.js': 'T', 'device.js': '\uD83D\uDCF1',
  'layout.js': '\u2B1A', 'theme.js': '\uD83C\uDF19', 'batch.js': '\u21C6',
  'api.js': '\uD83D\uDCD6',
};

/* Snippet content */
const SNIPPET_LAYOUT = `// Layout Builder — create a full page structure
// Run with \u25B6 or \u2318+Enter

tp.clear();
tp.setPalette('cool');
tp.setDevice('desktop');

// Nav
tp.add('navbar', { x: 0, y: 0, w: 1280, h: 52 });

// Hero
tp.add('hero', { x: 50, y: 72, w: 1180, h: 240 });

// 3-column cards
for (let i = 0; i < 3; i++) {
  tp.add('card', { x: 50 + i * 393, y: 340, w: 370, h: 200 });
}

// Stats row
for (let i = 0; i < 4; i++) {
  tp.add('stat-card', { x: 50 + i * 290, y: 570, w: 270, h: 110 });
}

// Footer
tp.add('footer', { x: 0, y: 710, w: 1280, h: 110 });

console.log('Page layout created!');
`;

const SNIPPET_THEME = `// Theme Explorer — cycle through all palettes
// Run with \u25B6 or \u2318+Enter

const palettes = tp.palettes();
const current = tp.palette();
const idx = palettes.indexOf(current);
const next = palettes[(idx + 1) % palettes.length];

tp.setPalette(next);
console.log(\`Switched: \${current} \u2192 \${next}\`);
console.log('Run again to cycle to next theme');

// All available palettes:
palettes.forEach((p, i) => {
  const marker = p === next ? '\u25B6' : ' ';
  console.log(\`  \${marker} \${p}\`);
});
`;

const SNIPPET_BATCH = `// Batch Operations — modify all shapes at once
// Run with \u25B6 or \u2318+Enter

const shapes = tp.shapes();
console.log(\`Processing \${shapes.length} shapes...\`);

shapes.forEach(s => {
  // Set all shapes to font 0 (DM Sans) and size 1.0
  tp.update(s.id, { font: 0, fsize: 1 });
});

// List all shapes with their details
shapes.forEach(s => {
  const variants = tp.variants(s.type);
  const vName = variants[s.variant] || 'default';
  console.log(\`  \${s.type} [\${vName}] at (\${s.x}, \${s.y})\`);
});

console.log('Done!');
`;

/* tp autocomplete entries */
const TP_AC = [
  { label: 'palette()', desc: 'Current palette name', insert: 'palette()' },
  { label: 'palettes()', desc: 'All palette names', insert: 'palettes()' },
  { label: 'colors()', desc: '{ bg, card, ac, ... }', insert: 'colors()' },
  { label: 'shapes()', desc: 'All canvas shapes', insert: 'shapes()' },
  { label: 'get(id)', desc: 'Full shape by id', insert: 'get(' },
  { label: 'find(type)', desc: 'Shape ids by type', insert: 'find(' },
  { label: 'device()', desc: 'Current device mode', insert: 'device()' },
  { label: 'fonts()', desc: 'Available font names', insert: 'fonts()' },
  { label: 'types()', desc: 'All component types', insert: 'types()' },
  { label: 'variants(type)', desc: 'Variant names', insert: 'variants(' },
  { label: 'setPalette(name)', desc: 'Change palette', insert: "setPalette('" },
  { label: 'setDevice(mode)', desc: 'Set device mode', insert: "setDevice('" },
  { label: 'add(type, opts?)', desc: 'Add component', insert: "add('" },
  { label: 'remove(id)', desc: 'Remove shape', insert: 'remove(' },
  { label: 'update(id, ch)', desc: 'Update shape props', insert: 'update(' },
  { label: 'setText(id, k, v)', desc: 'Set text field', insert: 'setText(' },
  { label: 'setProp(id, k, v)', desc: 'Set prop field', insert: 'setProp(' },
  { label: 'setFont(id, idx)', desc: 'Set font index', insert: 'setFont(' },
  { label: 'setFsize(id, s)', desc: 'Set font size', insert: 'setFsize(' },
  { label: 'clear()', desc: 'Remove all shapes', insert: 'clear()' },
  { label: 'save(name?)', desc: 'Save state', insert: 'save(' },
  { label: 'load(name?)', desc: 'Load saved state', insert: 'load(' },
  { label: 'saves()', desc: 'List saved states', insert: 'saves()' },
  { label: 'deleteSave(name?)', desc: 'Delete save', insert: 'deleteSave(' },
  { label: 'reset()', desc: 'Reset everything', insert: 'reset()' },
  { label: 'export()', desc: 'Export state object', insert: 'export()' },
];

/* Hover docs for tp methods */
const TP_DOCS = {
  palette: 'tp.palette() → string\nReturns current palette name',
  palettes: 'tp.palettes() → string[]\nAll available palette names',
  colors: 'tp.colors() → { bg, card, ac, ac2, tx, mu, bd, su }\nCurrent palette colors',
  shapes: 'tp.shapes() → Shape[]\nAll canvas shapes with id, type, x, y, w, h, variant, etc.',
  get: 'tp.get(id) → Shape | null\nGet a shape by id',
  find: 'tp.find(type) → string[]\nFind shape IDs matching type',
  device: 'tp.device() → "free" | "desktop" | "phone"\nCurrent device mode',
  fonts: 'tp.fonts() → string[]\nAvailable font names',
  types: 'tp.types() → string[]\nAll component type names',
  variants: 'tp.variants(type) → string[]\nVariant names for a type',
  setPalette: 'tp.setPalette(name)\nChange the active palette',
  setDevice: 'tp.setDevice(mode)\nSet device to "free", "desktop", or "phone"',
  add: 'tp.add(type, opts?) → string\nAdd a component, returns id\nopts: { x, y, w, h, variant, font, fsize, texts, props }',
  remove: 'tp.remove(id)\nRemove a shape from canvas',
  update: 'tp.update(id, changes)\nUpdate shape properties',
  setText: 'tp.setText(id, key, value)\nSet a text field on a shape',
  setProp: 'tp.setProp(id, key, value)\nSet a prop field on a shape',
  setFont: 'tp.setFont(id, fontIndex)\nSet font by index (0–16)',
  setFsize: 'tp.setFsize(id, size)\nSet font size (0.5–2.0)',
  clear: 'tp.clear()\nRemove all shapes (keeps IDE)',
  save: 'tp.save(name?)\nSave current state to localStorage',
  load: 'tp.load(name?)\nRestore a saved state',
  saves: 'tp.saves() → string[]\nList all saved state names',
  deleteSave: 'tp.deleteSave(name?)\nDelete a saved state',
  reset: 'tp.reset()\nReset everything to defaults',
  export: 'tp.export() → { shapes, pal, device }\nExport state as object',
};

/* Code snippets: trigger word → expansion */
const SNIPPETS = {
  'for': 'for (let i = 0; i < ${1:length}; i++) {\n  ${0}\n}',
  'fore': '${1:arr}.forEach((${2:item}) => {\n  ${0}\n});',
  'map': '${1:arr}.map((${2:item}) => {\n  ${0}\n});',
  'fn': 'function ${1:name}(${2:params}) {\n  ${0}\n}',
  'afn': 'const ${1:name} = (${2:params}) => {\n  ${0}\n};',
  'if': 'if (${1:condition}) {\n  ${0}\n}',
  'ife': 'if (${1:condition}) {\n  ${0}\n} else {\n  \n}',
  'log': 'console.log(${0});',
  'try': 'try {\n  ${0}\n} catch (e) {\n  console.error(e);\n}',
  'imp': "import ${1:name} from '${0}';",
  'sw': 'switch (${1:expr}) {\n  case ${2:val}:\n    ${0}\n    break;\n  default:\n    break;\n}',
  'cl': 'console.log(${0});',
  'ce': 'console.error(${0});',
  'cw': 'console.warn(${0});',
  'fil': '${1:arr}.filter((${2:item}) => ${0});',
  'red': '${1:arr}.reduce((${2:acc}, ${3:item}) => {\n  ${0}\n  return ${2:acc};\n}, ${4:init});',
  'prom': 'new Promise((resolve, reject) => {\n  ${0}\n});',
  'tpa': "const id = tp.add('${1:type}', { x: ${2:50}, y: ${3:100}, w: ${4:200}, h: ${5:48} });",
  'tpf': "const ids = tp.find('${0:type}');",
  'tps': "tp.shapes().forEach(s => {\n  ${0}\n});",
};

/* Parameter hints for tp methods */
const PARAM_HINTS = {
  'add': ['type: string', 'opts?: { x, y, w, h, variant, font, fsize, texts, props }'],
  'remove': ['id: string'],
  'update': ['id: string', 'changes: { x?, y?, w?, h?, variant?, font?, fsize?, texts?, props? }'],
  'get': ['id: string'],
  'find': ['type: string'],
  'setText': ['id: string', 'key: string', 'value: string'],
  'setProp': ['id: string', 'key: string', 'value: any'],
  'setFont': ['id: string', 'fontIndex: number (0–16)'],
  'setFsize': ['id: string', 'size: number (0.5–2.0)'],
  'setPalette': ['name: string'],
  'setDevice': ['mode: "free" | "desktop" | "phone"'],
  'save': ['name?: string'],
  'load': ['name?: string'],
  'deleteSave': ['name?: string'],
  'variants': ['type: string'],
};

/* Keyboard shortcuts */
const SHORTCUTS = [
  { cat: 'General', items: [
    ['\u2318+Enter', 'Run code'],
    ['\u2318+Shift+Enter', 'Run selection'],
    ['\u2318+S', 'Save state'],
    ['\u2318+P', 'Command palette'],
    ['\u2318+K', 'Shortcuts help'],
    ['Esc', 'Close overlay'],
  ]},
  { cat: 'Editing', items: [
    ['\u2318+/', 'Toggle comment'],
    ['\u2318+D', 'Select next occurrence'],
    ['\u2318+L', 'Select line (expandable)'],
    ['\u2318+A', 'Select all'],
    ['\u2318+Shift+D', 'Duplicate line'],
    ['Ctrl+Shift+K', 'Delete line'],
    ['Alt+\u2191/\u2193', 'Move line up/down'],
    ['Alt+Shift+\u2191/\u2193', 'Copy line up/down'],
    ['Tab / Shift+Tab', 'Indent / Outdent'],
    ['Ctrl+\u232B', 'Delete word left'],
    ['Ctrl+Del', 'Delete word right'],
    ['Home', 'Smart line start'],
    ['End', 'End of line'],
    ['\u2318+Z', 'Undo'],
    ['\u2318+Shift+Z', 'Redo'],
    ['\u2318+R', 'Rename symbol'],
    ['\u2318+Shift+S', 'Surround with...'],
    ['Tab (on trigger)', 'Expand snippet'],
    ['\u2318+Shift+\\', 'Jump to matching bracket'],
    ['\u2318+Shift+[', 'Fold at cursor'],
    ['\u2318+Shift+]', 'Unfold at cursor'],
    ['\u2318+Shift+Space', 'Expand selection to brackets'],
  ]},
  { cat: 'Search', items: [
    ['\u2318+F', 'Find'],
    ['\u2318+H', 'Find & Replace'],
    ['\u2318+Shift+F', 'Search in files'],
    ['\u2318+G / Ctrl+G', 'Go to line'],
    ['\u2318+Click', 'Go to definition'],
  ]},
  { cat: 'Navigation', items: [
    ['\u2318+E', 'Recent files'],
    ['\u2318+B', 'Toggle bookmark'],
    ['F3/Shift+F3', 'Next/prev search match'],
    ['F2/Shift+F2', 'Next/prev bookmark'],
    ['Ctrl+Tab', 'Next tab'],
    ['Ctrl+Shift+Tab', 'Previous tab'],
    ['\u2318+W', 'Close tab'],
    ['\u2318+Shift+T', 'Reopen closed tab'],
    ['\u2318+Shift+O', 'Go to symbol'],
  ]},
  { cat: 'View', items: [
    ['\u2318+=/\u2318+-', 'Zoom in/out'],
    ['\u2318+0', 'Reset zoom'],
  ]},
  { cat: 'Terminal', items: [
    ['\u2318+J', 'Toggle terminal'],
    ['\u2318+L (in REPL)', 'Clear terminal output'],
    ['Shift+Enter (REPL)', 'Multi-line input'],
  ]},
];

/* Generated file builders */
function genPalette(tp) {
  if (!tp) return '// tp API not available';
  const name = tp.palette();
  const c = tp.colors();
  return `// Current palette: "${name}"\n// Auto-generated \u2014 change via tp.setPalette()\n\nexport default ${JSON.stringify(c, null, 2)};\n\n// Available: ${tp.palettes().join(', ')}`;
}

function genShapes(tp) {
  if (!tp) return '// tp API not available';
  const s = tp.shapes();
  return `// Canvas components (${s.length})\n// Auto-generated \u2014 modify via tp.add/remove/update\n\nexport default ${JSON.stringify(s, null, 2)};`;
}

function genFonts(tp) {
  if (!tp) return '// tp API not available';
  const fonts = tp.fonts();
  return `// Available fonts (${fonts.length})\n// Use: tp.setFont(shapeId, index)\n\nexport default ${JSON.stringify(fonts.map((f, i) => ({ index: i, name: f })), null, 2)};`;
}

function genVariants(tp) {
  if (!tp) return '// tp API not available';
  const types = tp.types();
  const all = {};
  types.forEach(t => { const v = tp.variants(t); if (v.length) all[t] = v; });
  return `// All variant styles by component type\n// Use: tp.update(id, { variant: index })\n\nexport default ${JSON.stringify(all, null, 2)};`;
}

function genTypes(tp) {
  if (!tp) return '// tp API not available';
  const types = tp.types();
  return `// All ${types.length} component types available\n// Use: tp.add(typeName, { x, y })\n\nexport default ${JSON.stringify(types, null, 2)};`;
}

function genDevice(tp) {
  if (!tp) return '// tp API not available';
  return `// Current device mode: "${tp.device()}"\n// Use: tp.setDevice("free" | "desktop" | "phone")\n\nexport default "${tp.device()}";`;
}

/* ========== Component ========== */
export default function CodeIDE({ b, p, fsize = 1 }) {
  const tp = React.useContext(TpContext);

  /* ---- File system ---- */
  const initFiles = React.useMemo(() => ({
    'src/main.js': MAIN_DEFAULT,
    'src/playground.js': PLAYGROUND_DEFAULT,
    'snippets/layout.js': SNIPPET_LAYOUT,
    'snippets/theme.js': SNIPPET_THEME,
    'snippets/batch.js': SNIPPET_BATCH,
  }), []);
  const [editFiles, setEditFiles] = React.useState(initFiles);
  const [activeFile, setActiveFile] = React.useState('src/main.js');
  const [openTabs, setOpenTabs] = React.useState(['src/main.js']);
  const [openFolders, setOpenFolders] = React.useState({ src: true, config: false, docs: false, snippets: false, user: false });
  const [showTree, setShowTree] = React.useState(true);

  /* ---- Editor state ---- */
  const [cursor, setCursor] = React.useState({ ln: 1, col: 1 });
  const [activeLn, setActiveLn] = React.useState(1);
  const [scrollTop, setScrollTop] = React.useState(0);
  const taRef = React.useRef(null);
  const lnRef = React.useRef(null);
  const hlRef = React.useRef(null);

  /* ---- Terminal state ---- */
  const [termOpen, setTermOpen] = React.useState(false);
  const [output, setOutput] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const termRef = React.useRef(null);
  const [termInput, setTermInput] = React.useState('');
  const [termHistory, setTermHistory] = React.useState([]);
  const [termHistIdx, setTermHistIdx] = React.useState(-1);
  const termInputRef = React.useRef(null);

  /* ---- Search state ---- */
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [replaceWith, setReplaceWith] = React.useState('');
  const [showReplace, setShowReplace] = React.useState(false);
  const searchRef = React.useRef(null);

  /* ---- Command palette ---- */
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [cmdQuery, setCmdQuery] = React.useState('');
  const [cmdIdx, setCmdIdx] = React.useState(0);
  const cmdRef = React.useRef(null);

  /* ---- Autocomplete ---- */
  const [acOpen, setAcOpen] = React.useState(false);
  const [acItems, setAcItems] = React.useState([]);
  const [acIdx, setAcIdx] = React.useState(0);

  /* ---- Go to line ---- */
  const [gotoOpen, setGotoOpen] = React.useState(false);
  const [gotoVal, setGotoVal] = React.useState('');
  const gotoRef = React.useRef(null);

  /* ---- Keyboard help ---- */
  const [helpOpen, setHelpOpen] = React.useState(false);

  /* ---- Editor undo/redo ---- */
  const editorHist = React.useRef([]);
  const editorFuture = React.useRef([]);

  /* ---- Context menu ---- */
  const [ctxMenu, setCtxMenu] = React.useState(null);

  /* ---- Terminal resize ---- */
  const [termHeight, setTermHeight] = React.useState(120);
  const termDrag = React.useRef(null);

  /* ---- Explorer filter ---- */
  const [explorerFilter, setExplorerFilter] = React.useState('');

  /* ---- Explorer new file input ---- */
  const [newFileInput, setNewFileInput] = React.useState(false);
  const [newFileName, setNewFileName] = React.useState('');
  const newFileRef = React.useRef(null);

  /* ---- Explorer context menu ---- */
  const [explorerCtx, setExplorerCtx] = React.useState(null);
  const [renameFile, setRenameFile] = React.useState(null);
  const [renameName, setRenameName] = React.useState('');
  const renameRef = React.useRef(null);

  /* ---- Selected word occurrences ---- */
  const [selectedWord, setSelectedWord] = React.useState('');

  /* ---- Toast notification ---- */
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setNotifHistory(prev => [...prev.slice(-20), { msg, type, time: Date.now() }]);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  /* ---- Tab drag reorder ---- */
  const [dragTab, setDragTab] = React.useState(null);
  const [dragOverTab, setDragOverTab] = React.useState(null);

  /* ---- Search options ---- */
  const [searchCase, setSearchCase] = React.useState(false);
  const [searchRegex, setSearchRegex] = React.useState(false);
  const [searchWholeWord, setSearchWholeWord] = React.useState(false);
  const [searchIdx, setSearchIdx] = React.useState(0);

  /* ---- Code folding ---- */
  const [foldedLines, setFoldedLines] = React.useState(new Set());
  const toggleFold = (lineIdx) => {
    setFoldedLines(prev => {
      const next = new Set(prev);
      if (next.has(lineIdx)) next.delete(lineIdx);
      else next.add(lineIdx);
      return next;
    });
  };

  /* ---- Explorer resize ---- */
  const [explorerW, setExplorerW] = React.useState(130);
  const explorerDrag = React.useRef(null);

  /* ---- Word wrap ---- */
  const [wordWrap, setWordWrap] = React.useState(false);

  /* ---- Hover docs ---- */
  const [hoverDoc, setHoverDoc] = React.useState(null);
  const hoverTimer = React.useRef(null);

  /* ---- Editor focus ---- */
  const [editorFocused, setEditorFocused] = React.useState(false);

  /* ---- Terminal tabs ---- */
  const [termTab, setTermTab] = React.useState('output');

  /* ---- Global search ---- */
  const [globalSearchOpen, setGlobalSearchOpen] = React.useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = React.useState('');
  const globalSearchRef = React.useRef(null);

  /* ---- Diff view ---- */
  const [diffOpen, setDiffOpen] = React.useState(false);

  /* ---- Tab hover close ---- */
  const [hoverTab, setHoverTab] = React.useState(null);

  /* ---- Parameter hints ---- */
  const [paramHint, setParamHint] = React.useState(null);

  /* ---- Outline panel ---- */
  const [outlineOpen, setOutlineOpen] = React.useState(false);

  /* ---- Activity bar / sidebar mode ---- */
  const [sidebarMode, setSidebarMode] = React.useState('files'); // 'files' | 'search' | 'outline' | 'settings' | null

  /* ---- Settings ---- */
  const [showMinimap, setShowMinimap] = React.useState(true);
  const [showBracketColors, setShowBracketColors] = React.useState(true);
  const [showIndentRainbow, setShowIndentRainbow] = React.useState(true);
  const [autoSave, setAutoSave] = React.useState(true);

  /* ---- Editor zoom ---- */
  const [editorZoom, setEditorZoom] = React.useState(1);

  /* ---- Zoom-derived values ---- */
  const zf = fsize * editorZoom;
  const fs = n => Math.round(n * zf);
  const lh = Math.round(16 * zf) + 'px';

  /* ---- Notification history ---- */
  const [notifHistory, setNotifHistory] = React.useState([]);
  const [notifOpen, setNotifOpen] = React.useState(false);

  /* ---- Recent files ---- */
  const [recentFiles, setRecentFiles] = React.useState(['src/main.js']);
  const [recentOpen, setRecentOpen] = React.useState(false);
  const recentRef = React.useRef(null);

  /* ---- Collapsed terminal objects ---- */
  const [expandedLogs, setExpandedLogs] = React.useState(new Set());

  /* ---- Color decorators setting ---- */
  const [showColorDecorators, setShowColorDecorators] = React.useState(true);
  const [showLineNumbers, setShowLineNumbers] = React.useState(true);
  const [tabSize, setTabSize] = React.useState(2);

  /* ---- Bookmarks ---- */
  const [bookmarks, setBookmarks] = React.useState(new Set());
  const toggleBookmark = (ln) => setBookmarks(prev => { const n = new Set(prev); if (n.has(ln)) n.delete(ln); else n.add(ln); return n; });
  const jumpBookmark = (dir) => {
    const sorted = [...bookmarks].sort((a, b) => a - b);
    if (!sorted.length) return;
    const target = dir > 0
      ? (sorted.find(b => b > activeLn) || sorted[0])
      : ([...sorted].reverse().find(b => b < activeLn) || sorted[sorted.length - 1]);
    goToLine(target);
  };

  /* ---- Tab context menu / pinned tabs ---- */
  const [tabCtx, setTabCtx] = React.useState(null);
  const [pinnedTabs, setPinnedTabs] = React.useState(new Set());

  /* ---- Rename symbol ---- */
  const [renameSymbol, setRenameSymbol] = React.useState(null);
  const renameSymbolRef = React.useRef(null);

  /* ---- Help filter ---- */
  const helpSearchRef = React.useRef(null);
  const helpFilterRef = React.useRef({ q: '' });

  /* ---- Per-file scroll/cursor memory ---- */
  const filePositions = React.useRef({});

  /* ---- Surround with menu ---- */
  const [surroundMenu, setSurroundMenu] = React.useState(null);

  /* ---- Welcome tab ---- */
  const [welcomeDismissed, setWelcomeDismissed] = React.useState(false);

  /* ---- Go to Symbol ---- */
  const [symbolOpen, setSymbolOpen] = React.useState(false);
  const [symbolQuery, setSymbolQuery] = React.useState('');
  const [symbolIdx, setSymbolIdx] = React.useState(0);
  const symbolRef = React.useRef(null);

  /* ---- Recently closed tabs ---- */
  const closedTabs = React.useRef([]);

  /* ---- Peek definition ---- */
  const [peekDef, setPeekDef] = React.useState(null); // { method, line }

  /* ---- Breadcrumb dropdown ---- */
  const [breadcrumbDrop, setBreadcrumbDrop] = React.useState(null);

  /* ---- Cmd key held (for go-to-definition underline) ---- */
  const [cmdHeld, setCmdHeld] = React.useState(false);
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Meta' || e.key === 'Control') setCmdHeld(true); };
    const onUp = e => { if (e.key === 'Meta' || e.key === 'Control') setCmdHeld(false); };
    const onBlur = () => setCmdHeld(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onUp); window.removeEventListener('blur', onBlur); };
  }, []);

  /* ---- Dynamic tree (base + user files) ---- */
  const userFiles = React.useMemo(() => {
    const known = new Set();
    TREE_BASE.forEach(f => f.children.forEach(c => known.add(c.path)));
    return Object.keys(editFiles).filter(p => !known.has(p));
  }, [editFiles]);

  const TREE = React.useMemo(() => {
    const tree = TREE_BASE.map(f => ({ ...f, children: [...f.children] }));
    if (userFiles.length > 0) {
      tree.push({ name: 'user', children: userFiles.map(p => ({ name: p.split('/').pop(), path: p })) });
    }
    return tree;
  }, [userFiles]);

  /* ---- File helpers ---- */
  const GEN_FILES = {
    'config/palette.js': () => genPalette(tp),
    'config/shapes.js': () => genShapes(tp),
    'config/fonts.js': () => genFonts(tp),
    'config/variants.js': () => genVariants(tp),
    'config/types.js': () => genTypes(tp),
    'config/device.js': () => genDevice(tp),
    'docs/api.js': () => API_DOCS,
  };

  const getFile = (path) => {
    if (editFiles[path] !== undefined) return { content: editFiles[path], readonly: false };
    if (GEN_FILES[path]) return { content: GEN_FILES[path](), readonly: true };
    return null;
  };

  const createFile = (name) => {
    if (!name) return;
    const path = name.includes('/') ? name : 'user/' + name;
    if (editFiles[path] !== undefined) return;
    setEditFiles(prev => ({ ...prev, [path]: `// ${name}\n` }));
    setOpenFolders(prev => ({ ...prev, user: true }));
    openFile(path);
  };

  const deleteFile = (path) => {
    // Can't delete built-in files
    if (initFiles[path] !== undefined || GEN_FILES[path]) return;
    setEditFiles(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    // Close tab if open
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== path);
      if (activeFile === path && next.length) setActiveFile(next[next.length - 1]);
      else if (!next.length) { setActiveFile('src/main.js'); return ['src/main.js']; }
      return next;
    });
  };

  const renameFileFn = (oldPath, newName) => {
    if (!newName || !editFiles.hasOwnProperty(oldPath) || initFiles[oldPath]) return;
    const folder = oldPath.substring(0, oldPath.lastIndexOf('/') + 1);
    const newPath = folder + newName;
    if (editFiles[newPath] !== undefined) return;
    setEditFiles(prev => {
      const next = { ...prev };
      next[newPath] = next[oldPath];
      delete next[oldPath];
      return next;
    });
    setOpenTabs(prev => prev.map(t => t === oldPath ? newPath : t));
    if (activeFile === oldPath) setActiveFile(newPath);
  };

  const runTermInput = (input) => {
    if (!input.trim()) return;
    setTermHistory(prev => [...prev.slice(-50), input]);
    setTermHistIdx(-1);
    const cmd = input.trim();
    // Built-in terminal commands
    if (cmd === 'clear') { setOutput(null); setTermInput(''); return; }
    if (cmd === 'help') {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F help' },
        { t: 'log', v: 'Built-in commands:' },
        { t: 'log', v: '  clear      — Clear output' },
        { t: 'log', v: '  help       — Show this help' },
        { t: 'log', v: '  ls         — List files' },
        { t: 'log', v: '  cat <f>    — Show file contents' },
        { t: 'log', v: '  echo <x>   — Print text' },
        { t: 'log', v: '  run        — Run active file' },
        { t: 'log', v: '  pwd        — Show current file' },
        { t: 'log', v: '  date       — Show current date/time' },
        { t: 'log', v: '  whoami     — Show IDE info' },
        { t: 'log', v: '  history    — Show command history' },
        { t: 'log', v: '  touch <f>  — Create a new file' },
        { t: 'log', v: '  grep <t>   — Search in all files' },
        { t: 'log', v: '  wc <f>     — Count lines in file' },
        { t: 'log', v: '  env        — Show environment variables' },
        { t: 'log', v: '  time <e>   — Benchmark an expression' },
        { t: 'log', v: '  open <f>   — Open a file in editor' },
        { t: 'log', v: '  diff       — Show changes vs original' },
        { t: 'log', v: '  mv <f> <t> — Rename/move a file' },
        { t: 'log', v: '  head [n] f — Show first n lines of file' },
        { t: 'log', v: '  rm <f>     — Delete a user-created file' },
        { t: 'log', v: '  export     — Copy canvas state to clipboard' },
        { t: 'log', v: '  find <n>   — Find files by name' },
        { t: 'log', v: "  tail [n] f — Show last n lines of file" },
        { t: 'log', v: "  sed 's/p/r/' f — Find and replace in file" },
        { t: 'log', v: '  cp <f> <t> — Copy a file' },
        { t: 'log', v: '  man <m>    — Show docs for tp method' },
        { t: 'log', v: '  which <m>  — Show docs for tp method' },
        { t: 'log', v: '  alias      — Show terminal shortcuts' },
        { t: 'log', v: '\nOr type any JavaScript expression (tp.shapes(), etc.)' },
      ], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd === 'ls') {
      const allPaths = [...Object.keys(editFiles), ...Object.keys(GEN_FILES)];
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F ls' },
        ...allPaths.map(p => ({ t: 'log', v: '  ' + p }))
      ], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd.startsWith('cat ')) {
      const path = cmd.slice(4).trim();
      const f = getFile(path);
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F cat ' + path },
        f ? { t: 'log', v: f.content } : { t: 'err', v: `File not found: ${path}` }
      ], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd.startsWith('echo ')) {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F echo ...' }, { t: 'log', v: cmd.slice(5) }], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd === 'pwd') {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F pwd' }, { t: 'log', v: activeFile }], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd === 'date') {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F date' }, { t: 'log', v: new Date().toString() }], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd === 'whoami') {
      const shapeCount = tp?.shapes()?.length || 0;
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F whoami' },
        { t: 'log', v: 'Tasteprint IDE v1.0' },
        { t: 'log', v: `  Palette: ${tp?.palette() || 'unknown'}` },
        { t: 'log', v: `  Device: ${tp?.device() || 'unknown'}` },
        { t: 'log', v: `  Shapes: ${shapeCount}` },
        { t: 'log', v: `  Files: ${Object.keys(editFiles).length + Object.keys(GEN_FILES).length}` },
      ], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd === 'history') {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F history' },
        ...termHistory.map((h, i) => ({ t: 'log', v: `  ${i + 1}  ${h}` })),
        ...(termHistory.length === 0 ? [{ t: 'log', v: '  (empty)' }] : []),
      ], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd.startsWith('touch ')) {
      const name = cmd.slice(6).trim();
      if (name) { createFile(name); setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F touch ${name}` }, { t: 'log', v: `Created ${name}` }], ms: null, err: null, errLn: null })); }
      else { setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: 'Usage: touch <filename>' }], ms: null, err: null, errLn: null })); }
      setTermInput(''); return;
    }
    if (cmd.startsWith('grep ')) {
      const term = cmd.slice(5).trim().toLowerCase();
      if (term) {
        const results = [];
        for (const [path, content] of Object.entries(editFiles)) {
          content.split('\n').forEach((line, i) => {
            if (line.toLowerCase().includes(term)) results.push({ path, ln: i + 1, line: line.trim() });
          });
        }
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F grep ${term}` },
          ...results.slice(0, 30).map(r => ({ t: 'log', v: `  ${r.path}:${r.ln}  ${r.line.substring(0, 60)}` })),
          ...(results.length === 0 ? [{ t: 'log', v: '  No matches found' }] : []),
          ...(results.length > 30 ? [{ t: 'log', v: `  ... and ${results.length - 30} more` }] : []),
        ], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('wc ')) {
      const path = cmd.slice(3).trim();
      const f = getFile(path);
      if (f) {
        const lns = f.content.split('\n').length;
        const chars = f.content.length;
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F wc ${path}` }, { t: 'log', v: `  ${lns} lines, ${chars} chars` }], ms: null, err: null, errLn: null }));
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `File not found: ${path}` }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd === 'run') { runCode(); setTermInput(''); return; }
    if (cmd === 'env') {
      const modFiles = Object.keys(editFiles).filter(p => initFiles[p] !== undefined && editFiles[p] !== initFiles[p]);
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F env' },
        { t: 'log', v: `  IDE_VERSION=1.0` },
        { t: 'log', v: `  PALETTE=${tp?.palette() || 'unknown'}` },
        { t: 'log', v: `  DEVICE=${tp?.device() || 'unknown'}` },
        { t: 'log', v: `  SHAPES=${tp?.shapes()?.length || 0}` },
        { t: 'log', v: `  FILES=${Object.keys(editFiles).length}` },
        { t: 'log', v: `  MODIFIED=${modFiles.length}` },
        { t: 'log', v: `  TAB_SIZE=${tabSize}` },
        { t: 'log', v: `  ZOOM=${Math.round(editorZoom * 100)}%` },
        { t: 'log', v: `  WORD_WRAP=${wordWrap}` },
      ], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    if (cmd.startsWith('time ')) {
      const expr = cmd.slice(5).trim();
      if (expr) {
        const t0 = performance.now();
        try {
          const r = new Function('tp', expr)(tp || {});
          const ms = (performance.now() - t0).toFixed(2);
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F time ${expr}` },
            { t: 'log', v: `  Result: ${JSON.stringify(r)}` },
            { t: 'log', v: `  Time: ${ms}ms` },
          ], ms: null, err: null, errLn: null }));
        } catch (e) {
          const ms = (performance.now() - t0).toFixed(2);
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F time ${expr}` },
            { t: 'err', v: `  ${e.message} (${ms}ms)` },
          ], ms: null, err: null, errLn: null }));
        }
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('open ')) {
      const path = cmd.slice(5).trim();
      const f = getFile(path);
      if (f) { openFile(path); setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F open ${path}` }, { t: 'log', v: `Opened ${path}` }], ms: null, err: null, errLn: null })); }
      else {
        // Try fuzzy match
        const allPaths = [...Object.keys(editFiles), ...Object.keys(GEN_FILES)];
        const match = allPaths.find(p => p.includes(path) || p.split('/').pop().startsWith(path));
        if (match) { openFile(match); setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F open ${path}` }, { t: 'log', v: `Opened ${match}` }], ms: null, err: null, errLn: null })); }
        else setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `File not found: ${path}` }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd === 'diff') {
      const orig = initFiles[activeFile];
      if (!orig) {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F diff' }, { t: 'log', v: `  No original for ${activeFile}` }], ms: null, err: null, errLn: null }));
      } else {
        const origLines = orig.split('\n'), currLines = code.split('\n');
        const diffs = [];
        const maxLen = Math.max(origLines.length, currLines.length);
        for (let i = 0; i < maxLen; i++) {
          if (origLines[i] !== currLines[i]) {
            if (origLines[i] !== undefined && currLines[i] === undefined) diffs.push({ t: 'err', v: `- ${i + 1}: ${origLines[i]}` });
            else if (origLines[i] === undefined) diffs.push({ t: 'log', v: `+ ${i + 1}: ${currLines[i]}` });
            else { diffs.push({ t: 'err', v: `- ${i + 1}: ${origLines[i]}` }); diffs.push({ t: 'log', v: `+ ${i + 1}: ${currLines[i]}` }); }
          }
        }
        setOutput(prev => ({ logs: [...(prev?.logs || []),
          { t: 'log', v: `\u276F diff (${activeFile})` },
          ...(diffs.length ? diffs.slice(0, 40) : [{ t: 'log', v: '  No changes' }]),
          ...(diffs.length > 40 ? [{ t: 'log', v: `  ... and ${diffs.length - 40} more` }] : []),
        ], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('mv ')) {
      const args = cmd.slice(3).trim().split(/\s+/);
      if (args.length === 2) {
        const [from, to] = args;
        const allPaths = Object.keys(editFiles);
        const src = allPaths.find(p => p === from || p.endsWith('/' + from) || p.split('/').pop() === from);
        if (src) {
          const newName = to.includes('/') ? to.split('/').pop() : to;
          const folder = src.substring(0, src.lastIndexOf('/') + 1);
          const dest = folder + newName;
          renameFileFn(src, newName);
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F mv ${from} ${to}` }, { t: 'log', v: `Renamed ${src} → ${dest}` }], ms: null, err: null, errLn: null }));
        } else {
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `File not found: ${from}` }], ms: null, err: null, errLn: null }));
        }
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: 'Usage: mv <from> <to>' }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('head ')) {
      const args = cmd.slice(5).trim().split(/\s+/);
      const n = args.length > 1 && /^\d+$/.test(args[0]) ? parseInt(args[0]) : 10;
      const path = args.length > 1 ? args[1] : args[0];
      const f = getFile(path);
      if (f) {
        const headLines = f.content.split('\n').slice(0, n);
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F head ${cmd.slice(5).trim()}` },
          ...headLines.map(l => ({ t: 'log', v: l })),
          ...(f.content.split('\n').length > n ? [{ t: 'log', v: `  ... (${f.content.split('\n').length - n} more lines)` }] : []),
        ], ms: null, err: null, errLn: null }));
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `File not found: ${path}` }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('rm ')) {
      const path = cmd.slice(3).trim();
      const allPaths = Object.keys(editFiles);
      const src = allPaths.find(p => p === path || p.endsWith('/' + path) || p.split('/').pop() === path);
      if (src && !initFiles[src]) {
        // Only allow deleting user-created files
        setEditFiles(prev => { const n = { ...prev }; delete n[src]; return n; });
        setOpenTabs(prev => prev.filter(t => t !== src));
        if (activeFile === src) setActiveFile(openTabs.filter(t => t !== src)[0] || 'src/main.js');
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F rm ${path}` }, { t: 'warn', v: `Deleted ${src}` }], ms: null, err: null, errLn: null }));
      } else if (src) {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `Cannot delete built-in file: ${src}` }], ms: null, err: null, errLn: null }));
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `File not found: ${path}` }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd === 'export') {
      const data = tp?.export();
      if (data) {
        const json = JSON.stringify(data, null, 2);
        navigator.clipboard?.writeText(json);
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F export' },
          { t: 'log', v: `Exported ${data.shapes?.length || 0} shapes to clipboard (${(json.length / 1024).toFixed(1)}KB)` },
        ], ms: null, err: null, errLn: null }));
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: 'tp API not available' }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('find ')) {
      const needle = cmd.slice(5).trim().toLowerCase();
      if (needle) {
        const results = [];
        const allPaths = [...Object.keys(editFiles), ...Object.keys(GEN_FILES)];
        for (const p of allPaths) {
          if (p.toLowerCase().includes(needle)) results.push(p);
        }
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F find ${needle}` },
          ...(results.length ? results.map(p => ({ t: 'log', v: `  ${p}` })) : [{ t: 'log', v: '  No matching files' }]),
        ], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('tail ')) {
      const args = cmd.slice(5).trim().split(/\s+/);
      const n = args.length > 1 && /^\d+$/.test(args[0]) ? parseInt(args[0]) : 10;
      const path = args.length > 1 ? args[1] : args[0];
      const f = getFile(path);
      if (f) {
        const allLines = f.content.split('\n');
        const tailLines = allLines.slice(-n);
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F tail ${cmd.slice(5).trim()}` },
          ...(allLines.length > n ? [{ t: 'log', v: `  ... (${allLines.length - n} lines above)` }] : []),
          ...tailLines.map(l => ({ t: 'log', v: l })),
        ], ms: null, err: null, errLn: null }));
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `tail: ${path}: No such file` }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('sed ')) {
      const m = cmd.match(/^sed\s+'s\/(.+?)\/(.+?)\/([gi]*)'\s+(.+)$/);
      if (m) {
        const [, pattern, replacement, flags, path] = m;
        const f = getFile(path);
        if (f && !f.readonly) {
          try {
            const rx = new RegExp(pattern, flags);
            const result = f.content.replace(rx, replacement);
            setEditFiles(prev => ({ ...prev, [path]: result }));
            const changes = f.content.split('\n').filter((l, i) => l !== result.split('\n')[i]).length;
            setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F ${cmd}` }, { t: 'log', v: `${changes} line(s) changed in ${path}` }], ms: null, err: null, errLn: null }));
          } catch (e) {
            setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `sed: ${e.message}` }], ms: null, err: null, errLn: null }));
          }
        } else if (f?.readonly) {
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `sed: ${path}: Read-only file` }], ms: null, err: null, errLn: null }));
        } else {
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `sed: ${path}: No such file` }], ms: null, err: null, errLn: null }));
        }
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: "Usage: sed 's/pattern/replacement/flags' <file>" }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('cp ')) {
      const args = cmd.slice(3).trim().split(/\s+/);
      if (args.length === 2) {
        const [from, to] = args;
        const f = getFile(from);
        if (f) {
          const destPath = to.includes('/') ? to : 'user/' + to;
          setEditFiles(prev => ({ ...prev, [destPath]: f.content }));
          setOpenFolders(prev => ({ ...prev, user: true }));
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F cp ${from} ${to}` }, { t: 'log', v: `Copied to ${destPath}` }], ms: null, err: null, errLn: null }));
        } else {
          setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: `cp: ${from}: No such file` }], ms: null, err: null, errLn: null }));
        }
      } else {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: 'Usage: cp <source> <dest>' }], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd.startsWith('man ') || cmd.startsWith('which ')) {
      const method = cmd.split(' ')[1]?.replace('tp.', '').replace('()', '');
      if (method && TP_DOCS[method]) {
        const lines = TP_DOCS[method].split('\n');
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: `\u276F ${cmd}` },
          ...lines.map(l => ({ t: 'log', v: `  ${l}` })),
          ...(PARAM_HINTS[method] ? [{ t: 'log', v: '' }, { t: 'log', v: '  Parameters:' }, ...PARAM_HINTS[method].map(p => ({ t: 'log', v: `    ${p}` }))] : []),
        ], ms: null, err: null, errLn: null }));
      } else {
        const suggestions = Object.keys(TP_DOCS).filter(k => k.toLowerCase().includes((method || '').toLowerCase()));
        setOutput(prev => ({ logs: [...(prev?.logs || []),
          { t: 'err', v: `No docs for "${method}". ${suggestions.length ? 'Did you mean: ' + suggestions.join(', ') + '?' : 'Use: man <tp-method>'}` },
        ], ms: null, err: null, errLn: null }));
      }
      setTermInput(''); return;
    }
    if (cmd === 'alias' || cmd === 'aliases') {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F alias' },
        { t: 'log', v: '  Shortcuts:' },
        { t: 'log', v: '    run     → execute active file' },
        { t: 'log', v: '    man <m> → show docs for tp method' },
        { t: 'log', v: '    \u2191/\u2193    → navigate history' },
        { t: 'log', v: '    Tab    → autocomplete commands' },
      ], ms: null, err: null, errLn: null }));
      setTermInput(''); return;
    }
    const logs = [];
    const fc = {
      log: (...a) => logs.push({ t: 'log', v: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ') }),
      error: (...a) => logs.push({ t: 'err', v: a.map(String).join(' ') }),
      warn: (...a) => logs.push({ t: 'warn', v: a.map(String).join(' ') }),
      info: (...a) => logs.push({ t: 'log', v: a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ') }),
      debug: (...a) => logs.push({ t: 'dbg', v: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ') }),
      clear: () => { logs.length = 0 },
      table: (...a) => logs.push({ t: 'log', v: a.map(x => JSON.stringify(x, null, 2)).join(' ') }),
    };
    const isAsync = /\bawait\b/.test(input);
    if (isAsync) {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F ' + input }], ms: null, err: null, errLn: null }));
      const fn = new Function('console', 'tp', `return (async () => {\n${input}\n})()`);
      fn(fc, tp || {}).then(r => {
        if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
        setOutput(prev => ({ logs: [...(prev?.logs || []), ...logs], ms: null, err: null, errLn: null }));
      }).catch(e => {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'err', v: e.message }], ms: null, err: null, errLn: null }));
      });
    } else {
      try {
        const r = new Function('console', 'tp', input)(fc, tp || {});
        if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F ' + input }, ...logs], ms: null, err: null, errLn: null }));
      } catch (e) {
        setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F ' + input }, { t: 'err', v: e.message }], ms: null, err: null, errLn: null }));
      }
    }
    setTermInput('');
  };

  const file = getFile(activeFile);
  const code = file?.content || '';
  const readonly = file?.readonly || false;
  const lines = code.split('\n');

  /* ---- Bracket matching (must be after code) ---- */
  const matchBracket = React.useMemo(() => {
    if (!taRef.current) return null;
    const pos = taRef.current.selectionStart;
    const actualPos = code[pos] && '()[]{}' .includes(code[pos]) ? pos : (code[pos - 1] && '()[]{}' .includes(code[pos - 1]) ? pos - 1 : -1);
    if (actualPos === -1) return null;
    const c = code[actualPos];
    const open = '([{'; const close = ')]}';
    const oi = open.indexOf(c), ci = close.indexOf(c);
    if (oi !== -1) {
      let depth = 1, i = actualPos + 1;
      while (i < code.length && depth > 0) { if (code[i] === open[oi]) depth++; if (code[i] === close[oi]) depth--; i++; }
      if (depth === 0) return [actualPos, i - 1];
    } else if (ci !== -1) {
      let depth = 1, i = actualPos - 1;
      while (i >= 0 && depth > 0) { if (code[i] === close[ci]) depth++; if (code[i] === open[ci]) depth--; i--; }
      if (depth === 0) return [i + 1, actualPos];
    }
    return null;
  }, [code, activeLn, cursor]);

  /* ---- Word occurrences (must be after code) ---- */
  const wordOccurrences = React.useMemo(() => {
    if (!selectedWord || selectedWord.length < 2) return new Set();
    const occ = new Set();
    let idx = 0;
    while (idx < code.length) {
      const found = code.indexOf(selectedWord, idx);
      if (found === -1) break;
      occ.add(code.substring(0, found).split('\n').length);
      idx = found + 1;
    }
    return occ;
  }, [code, selectedWord]);

  /* ---- Breadcrumb scope detection ---- */
  const currentScope = React.useMemo(() => {
    const upTo = lines.slice(0, activeLn);
    for (let i = upTo.length - 1; i >= 0; i--) {
      const m = upTo[i].match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\(|function|async)|(\w+)\s*\(.*\)\s*\{)/);
      if (m) return m[1] || m[2] || m[3];
    }
    return null;
  }, [lines, activeLn]);

  /* ---- Outline: extract symbols from code ---- */
  const outlineSymbols = React.useMemo(() => {
    const syms = [];
    lines.forEach((l, i) => {
      const fnMatch = l.match(/^\s*(?:async\s+)?function\s+(\w+)/);
      if (fnMatch) { syms.push({ name: fnMatch[1], kind: 'fn', line: i + 1 }); return; }
      const constFn = l.match(/^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:\(|async\s*\(|function|\(?\s*\w+\s*\)\s*=>)/);
      if (constFn) { syms.push({ name: constFn[1], kind: 'fn', line: i + 1 }); return; }
      const constVar = l.match(/^\s*(?:const|let|var)\s+(\w+)\s*=/);
      if (constVar) { syms.push({ name: constVar[1], kind: 'var', line: i + 1 }); return; }
      const classMatch = l.match(/^\s*class\s+(\w+)/);
      if (classMatch) { syms.push({ name: classMatch[1], kind: 'class', line: i + 1 }); }
    });
    return syms;
  }, [lines]);

  /* ---- Bracket colorization: compute bracket depth per position ---- */
  const BRACKET_COLORS = ['#f9e2af', '#89b4fa', '#a6e3a1', '#f38ba8', '#cba6f7', '#fab387'];

  /* ---- Foldable lines (lines that start a block with { ) ---- */
  const foldableRanges = React.useMemo(() => {
    const ranges = {};
    const stack = [];
    for (let i = 0; i < lines.length; i++) {
      for (let j = 0; j < lines[i].length; j++) {
        const ch = lines[i][j];
        if (ch === '{' || ch === '[' || ch === '(') stack.push({ line: i, ch });
        else if ((ch === '}' || ch === ']' || ch === ')') && stack.length) {
          const open = stack.pop();
          if (open.line < i) ranges[open.line] = i; // multi-line block
        }
      }
    }
    return ranges;
  }, [lines]);

  /* ---- Visible lines (accounting for folds) ---- */
  const visibleLines = React.useMemo(() => {
    const vis = [];
    let i = 0;
    while (i < lines.length) {
      vis.push(i);
      if (foldedLines.has(i) && foldableRanges[i] !== undefined) {
        i = foldableRanges[i] + 1; // skip to after the closing brace
      } else {
        i++;
      }
    }
    return vis;
  }, [lines, foldedLines, foldableRanges]);

  /* ---- Active scope guide: find enclosing bracket pair at cursor ---- */
  const activeScope = React.useMemo(() => {
    if (!code) return null;
    const pos = taRef.current?.selectionStart ?? 0;
    const opens = '({[', closes = ')}]';
    // Walk backward from cursor to find unmatched opening bracket
    const depth = [0, 0, 0]; // (, {, [
    for (let i = pos - 1; i >= 0; i--) {
      const oi = opens.indexOf(code[i]);
      const ci = closes.indexOf(code[i]);
      if (ci !== -1) depth[ci]++;
      if (oi !== -1) {
        if (depth[oi] > 0) depth[oi]--;
        else {
          // Found unmatched open — find its close
          let d = 1, j = i + 1;
          while (j < code.length && d > 0) {
            if (code[j] === opens[oi]) d++;
            if (code[j] === closes[oi]) d--;
            j++;
          }
          if (d === 0) {
            const startLn = code.substring(0, i).split('\n').length;
            const endLn = code.substring(0, j - 1).split('\n').length;
            if (endLn > startLn) {
              const indent = lines[startLn - 1]?.match(/^(\s*)/)?.[0]?.length || 0;
              return { startLn, endLn, indent };
            }
          }
          break;
        }
      }
    }
    return null;
  }, [code, activeLn, lines]);

  /* ---- Global search results ---- */
  const globalSearchResults = React.useMemo(() => {
    if (!globalSearchTerm || !globalSearchOpen) return [];
    const term = globalSearchTerm.toLowerCase();
    const results = [];
    // Search editable files
    for (const [path, content] of Object.entries(editFiles)) {
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(term)) {
          results.push({ path, line: i + 1, text: line.trim(), col: line.toLowerCase().indexOf(term) });
        }
      });
    }
    // Search generated files
    for (const [path, gen] of Object.entries(GEN_FILES)) {
      const content = gen();
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(term)) {
          results.push({ path, line: i + 1, text: line.trim(), col: line.toLowerCase().indexOf(term) });
        }
      });
    }
    return results.slice(0, 50);
  }, [globalSearchTerm, globalSearchOpen, editFiles]);

  /* ---- Diff computation ---- */
  const diffLines = React.useMemo(() => {
    if (!diffOpen) return null;
    const original = initFiles[activeFile];
    if (!original) return null;
    const current = editFiles[activeFile];
    if (!current || current === original) return null;
    const origLines = original.split('\n');
    const currLines = current.split('\n');
    const result = [];
    const maxLen = Math.max(origLines.length, currLines.length);
    for (let i = 0; i < maxLen; i++) {
      const o = origLines[i], c = currLines[i];
      if (o === c) result.push({ type: 'same', text: c || '' });
      else if (o === undefined) result.push({ type: 'added', text: c });
      else if (c === undefined) result.push({ type: 'removed', text: o });
      else result.push({ type: 'changed', oldText: o, text: c });
    }
    return result;
  }, [diffOpen, activeFile, editFiles, initFiles]);

  const setCode = (c, skipHist) => {
    if (readonly) return;
    if (!skipHist) {
      editorHist.current = [...editorHist.current.slice(-50), code];
      editorFuture.current = [];
    }
    setEditFiles(prev => ({ ...prev, [activeFile]: c }));
  };

  const editorUndo = () => {
    if (!editorHist.current.length) return;
    editorFuture.current = [...editorFuture.current, code];
    const prev = editorHist.current[editorHist.current.length - 1];
    editorHist.current = editorHist.current.slice(0, -1);
    setEditFiles(p => ({ ...p, [activeFile]: prev }));
  };

  const editorRedo = () => {
    if (!editorFuture.current.length) return;
    editorHist.current = [...editorHist.current, code];
    const next = editorFuture.current[editorFuture.current.length - 1];
    editorFuture.current = editorFuture.current.slice(0, -1);
    setEditFiles(p => ({ ...p, [activeFile]: next }));
  };

  const openFile = (path) => {
    // Save current file position
    if (activeFile && taRef.current) {
      filePositions.current[activeFile] = {
        scrollTop: taRef.current.scrollTop,
        selStart: taRef.current.selectionStart,
        selEnd: taRef.current.selectionEnd,
        activeLn,
        cursor,
      };
    }
    setActiveFile(path);
    if (!openTabs.includes(path)) setOpenTabs(prev => [...prev, path]);
    // Restore saved position or reset
    const saved = filePositions.current[path];
    if (saved) {
      setActiveLn(saved.activeLn);
      setCursor(saved.cursor);
      setTimeout(() => {
        const el = taRef.current;
        if (el) {
          el.scrollTop = saved.scrollTop;
          el.selectionStart = saved.selStart;
          el.selectionEnd = saved.selEnd;
        }
      }, 0);
    } else {
      setActiveLn(1);
      setCursor({ ln: 1, col: 1 });
    }
    setRecentFiles(prev => [path, ...prev.filter(p => p !== path)].slice(0, 10));
  };

  const closeTab = (path, e) => {
    e?.stopPropagation();
    if (pinnedTabs.has(path)) return; // cannot close pinned tabs
    const next = openTabs.filter(t => t !== path);
    if (next.length === 0) return;
    closedTabs.current = [...closedTabs.current, path].slice(-20);
    setOpenTabs(next);
    if (activeFile === path) setActiveFile(next[next.length - 1]);
  };

  /* ---- Terminal auto-scroll ---- */
  React.useEffect(() => {
    if (termRef.current && output) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [output]);

  /* ---- Search helpers ---- */
  const searchMatches = React.useMemo(() => {
    if (!searchTerm || !searchOpen) return [];
    const matches = [];
    if (searchRegex) {
      try {
        const rx = new RegExp(searchTerm, searchCase ? 'g' : 'gi');
        let m;
        while ((m = rx.exec(code)) !== null) { matches.push({ pos: m.index, len: m[0].length }); if (!m[0].length) rx.lastIndex++; }
      } catch (_) { /* invalid regex */ }
    } else {
      let idx = 0;
      const haystack = searchCase ? code : code.toLowerCase();
      const needle = searchCase ? searchTerm : searchTerm.toLowerCase();
      while (idx < haystack.length) {
        const found = haystack.indexOf(needle, idx);
        if (found === -1) break;
        if (searchWholeWord) {
          const before = found > 0 ? code[found - 1] : ' ';
          const after = found + needle.length < code.length ? code[found + needle.length] : ' ';
          if (/\w/.test(before) || /\w/.test(after)) { idx = found + 1; continue; }
        }
        matches.push({ pos: found, len: searchTerm.length });
        idx = found + 1;
      }
    }
    return matches;
  }, [code, searchTerm, searchOpen, searchCase, searchRegex, searchWholeWord]);

  const replaceNext = () => {
    if (!searchMatches.length || readonly) return;
    const el = taRef.current;
    const pos = el ? el.selectionStart : 0;
    const match = searchMatches.find(m => m.pos >= pos) ?? searchMatches[0];
    const nc = code.substring(0, match.pos) + replaceWith + code.substring(match.pos + match.len);
    setCode(nc);
  };

  const replaceAll = () => {
    if (!searchMatches.length || readonly) return;
    let nc = code, offset = 0;
    for (const m of searchMatches) {
      nc = nc.substring(0, m.pos + offset) + replaceWith + nc.substring(m.pos + offset + m.len);
      offset += replaceWith.length - m.len;
    }
    setCode(nc);
  };

  const jumpToMatch = (dir) => {
    if (!searchMatches.length) return;
    const next = dir > 0 ? (searchIdx + 1) % searchMatches.length : (searchIdx - 1 + searchMatches.length) % searchMatches.length;
    setSearchIdx(next);
    const m = searchMatches[next];
    const el = taRef.current;
    if (el && m) { el.selectionStart = m.pos; el.selectionEnd = m.pos + m.len; el.focus(); }
  };

  /* ---- Command palette ---- */
  const ALL_FILES = React.useMemo(() => {
    const files = [];
    TREE.forEach(f => f.children.forEach(c => files.push(c.path)));
    return files;
  }, [TREE]);

  const commands = React.useMemo(() => {
    const cmds = [
      { label: 'Run Code', key: 'run', hint: '\u2318+Enter' },
      { label: 'Run Selection', key: 'runsel', hint: '\u2318+\u21E7+Enter' },
      { label: 'Toggle Terminal', key: 'term', hint: '' },
      { label: 'Toggle Explorer', key: 'tree', hint: '' },
      { label: 'Find', key: 'find', hint: '\u2318+F' },
      { label: 'Find & Replace', key: 'replace', hint: '\u2318+H' },
      { label: 'New File...', key: 'newfile', hint: '' },
      { label: 'Save State', key: 'save', hint: '' },
      { label: 'Reset to Default', key: 'reset', hint: '' },
      { label: wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap', key: 'wrap', hint: '' },
      { label: 'Format Document', key: 'format', hint: '' },
      { label: 'Search in Files', key: 'gsearch', hint: '\u2318+Shift+F' },
      { label: diffOpen ? 'Close Diff View' : 'Show Changes (Diff)', key: 'diff', hint: '' },
      { label: outlineOpen ? 'Hide Outline' : 'Show Outline', key: 'outline', hint: '' },
      { label: 'Fold All', key: 'foldall', hint: '' },
      { label: 'Unfold All', key: 'unfoldall', hint: '' },
      { label: 'Go to Line...', key: 'goto', hint: 'Ctrl+G' },
      { label: 'Toggle Minimap', key: 'minimap', hint: '' },
      { label: 'Go to Symbol...', key: 'symbol', hint: '\u2318+\u21E7+O' },
      { label: 'Toggle Bookmark', key: 'bookmark', hint: '\u2318+B' },
      { label: 'Next Bookmark', key: 'nextbm', hint: 'F2' },
      { label: 'Previous Bookmark', key: 'prevbm', hint: 'Shift+F2' },
      { label: 'Clear All Bookmarks', key: 'clearbm', hint: '' },
      { label: 'Keyboard Shortcuts', key: 'help', hint: '\u2318+K' },
      { label: showBracketColors ? 'Disable Bracket Colors' : 'Enable Bracket Colors', key: 'bracketcolor', hint: '' },
      { label: showIndentRainbow ? 'Disable Indent Rainbow' : 'Enable Indent Rainbow', key: 'indentrainbow', hint: '' },
      { label: 'Surround With...', key: 'surround', hint: '\u2318+Shift+S' },
      { label: 'Zoom In', key: 'zoomin', hint: '\u2318+=' },
      { label: 'Zoom Out', key: 'zoomout', hint: '\u2318+-' },
      { label: 'Reset Zoom', key: 'zoomreset', hint: '\u2318+0' },
      { label: 'Transform to Uppercase', key: 'upper', hint: '' },
      { label: 'Transform to Lowercase', key: 'lower', hint: '' },
      { label: 'Transform to Title Case', key: 'title', hint: '' },
      { label: 'Transform to camelCase', key: 'camel', hint: '' },
      { label: 'Sort Lines Ascending', key: 'sortasc', hint: '' },
      { label: 'Sort Lines Descending', key: 'sortdesc', hint: '' },
      { label: 'Remove Duplicate Lines', key: 'dedup', hint: '' },
      { label: 'Join Lines', key: 'join', hint: '' },
      { label: 'Trim Trailing Whitespace', key: 'trim', hint: '' },
      { label: 'Close All Tabs', key: 'closeall', hint: '' },
      { label: 'Close Saved Tabs', key: 'closesaved', hint: '' },
      { label: 'Reopen Closed Tab', key: 'reopentab', hint: '' },
      ...ALL_FILES.map(f => ({ label: f, key: 'file:' + f, hint: '' })),
    ];
    if (!cmdQuery) return cmds;
    const q = cmdQuery.toLowerCase();
    // Fuzzy match: characters must appear in order
    const fuzzy = (str, query) => {
      let qi = 0;
      for (let i = 0; i < str.length && qi < query.length; i++) {
        if (str[i] === query[qi]) qi++;
      }
      return qi === query.length;
    };
    // Score: prefer exact includes > prefix > fuzzy
    const scored = cmds.filter(c => fuzzy(c.label.toLowerCase(), q)).map(c => {
      const ll = c.label.toLowerCase();
      const score = ll.startsWith(q) ? 0 : ll.includes(q) ? 1 : 2;
      return { ...c, score };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored;
  }, [cmdQuery, ALL_FILES]);

  const runCommand = (key) => {
    setCmdOpen(false); setCmdQuery('');
    if (key === 'run') runCode();
    else if (key === 'runsel') { const el = taRef.current; if (el && el.selectionStart !== el.selectionEnd) runSelection(); else showToast('Select code to run', 'warn'); }
    else if (key === 'term') setTermOpen(t => !t);
    else if (key === 'tree') setSidebarMode(m => m === 'files' ? null : 'files');
    else if (key === 'find') { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }
    else if (key === 'replace') { setSearchOpen(true); setShowReplace(true); setTimeout(() => searchRef.current?.focus(), 50); }
    else if (key === 'newfile') { setNewFileInput(true); setSidebarMode('files'); setNewFileName(''); setTimeout(() => newFileRef.current?.focus(), 100); }
    else if (key === 'save') { tp?.save(); showToast('State saved!', 'success'); }
    else if (key === 'reset') { tp?.reset(); showToast('Reset to default!', 'warn'); }
    else if (key === 'wrap') setWordWrap(w => !w);
    else if (key === 'format') formatCode();
    else if (key === 'gsearch') { setGlobalSearchOpen(true); setSidebarMode('search'); setGlobalSearchTerm(''); setTimeout(() => globalSearchRef.current?.focus(), 50); }
    else if (key === 'diff') setDiffOpen(d => !d);
    else if (key === 'outline') setSidebarMode(m => m === 'outline' ? 'files' : 'outline');
    else if (key === 'foldall') { setFoldedLines(new Set(Object.keys(foldableRanges).map(Number))); showToast('All folded', 'info'); }
    else if (key === 'unfoldall') { setFoldedLines(new Set()); showToast('All unfolded', 'info'); }
    else if (key === 'goto') { setGotoOpen(true); setGotoVal(''); setTimeout(() => gotoRef.current?.focus(), 50); }
    else if (key === 'minimap') setShowMinimap(m => !m);
    else if (key === 'symbol') { setSymbolOpen(true); setSymbolQuery(''); setSymbolIdx(0); setTimeout(() => symbolRef.current?.focus(), 50); }
    else if (key === 'bookmark') { toggleBookmark(activeLn); showToast(bookmarks.has(activeLn) ? 'Bookmark removed' : 'Bookmark added', 'info'); }
    else if (key === 'nextbm') jumpBookmark(1);
    else if (key === 'prevbm') jumpBookmark(-1);
    else if (key === 'clearbm') { setBookmarks(new Set()); showToast('Bookmarks cleared', 'info'); }
    else if (key === 'help') setHelpOpen(h => !h);
    else if (key === 'bracketcolor') setShowBracketColors(v => !v);
    else if (key === 'indentrainbow') setShowIndentRainbow(v => !v);
    else if (key === 'surround') {
      const el = taRef.current;
      if (el && el.selectionStart !== el.selectionEnd) { setSurroundMenu({ s: el.selectionStart, en: el.selectionEnd }); }
      else showToast('Select code to surround', 'warn');
    }
    else if (key === 'zoomin') setEditorZoom(z => Math.min(2, z + 0.1));
    else if (key === 'zoomout') setEditorZoom(z => Math.max(0.6, z - 0.1));
    else if (key === 'zoomreset') setEditorZoom(1);
    else if (key === 'upper' || key === 'lower' || key === 'title' || key === 'camel') {
      if (readonly) return;
      const el = taRef.current;
      if (el) {
        const s = el.selectionStart, en = el.selectionEnd;
        if (s !== en) {
          const sel = code.substring(s, en);
          let transformed;
          if (key === 'upper') transformed = sel.toUpperCase();
          else if (key === 'lower') transformed = sel.toLowerCase();
          else if (key === 'title') transformed = sel.replace(/\b\w/g, c => c.toUpperCase());
          else transformed = sel.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase());
          setCode(code.substring(0, s) + transformed + code.substring(en));
          setTimeout(() => { el.selectionStart = s; el.selectionEnd = s + transformed.length; el.focus(); }, 0);
          showToast(`Transformed to ${key}`, 'info');
        } else showToast('Select text first', 'warn');
      }
    }
    else if (key === 'sortasc' || key === 'sortdesc') {
      if (readonly) return;
      const el = taRef.current;
      if (el) {
        const s = el.selectionStart, en = el.selectionEnd;
        if (s !== en) {
          const sel = code.substring(s, en);
          const sorted = sel.split('\n').sort((a, b) => key === 'sortasc' ? a.localeCompare(b) : b.localeCompare(a)).join('\n');
          setCode(code.substring(0, s) + sorted + code.substring(en));
          showToast(`Lines sorted ${key === 'sortasc' ? 'A-Z' : 'Z-A'}`, 'info');
        } else {
          const sorted = code.split('\n').sort((a, b) => key === 'sortasc' ? a.localeCompare(b) : b.localeCompare(a)).join('\n');
          setCode(sorted);
          showToast(`All lines sorted ${key === 'sortasc' ? 'A-Z' : 'Z-A'}`, 'info');
        }
      }
    }
    else if (key === 'dedup') {
      if (readonly) return;
      const all = code.split('\n');
      const seen = new Set();
      const deduped = all.filter(l => { const trimmed = l.trim(); if (!trimmed || !seen.has(trimmed)) { seen.add(trimmed); return true; } return false; });
      const removed = all.length - deduped.length;
      setCode(deduped.join('\n'));
      showToast(removed ? `Removed ${removed} duplicate lines` : 'No duplicates found', removed ? 'info' : 'warn');
    }
    else if (key === 'join') {
      if (readonly) return;
      const el = taRef.current;
      if (el) {
        const s = el.selectionStart, en = el.selectionEnd;
        if (s !== en) {
          const sel = code.substring(s, en);
          const joined = sel.split('\n').map(l => l.trim()).join(' ');
          setCode(code.substring(0, s) + joined + code.substring(en));
          showToast('Lines joined', 'info');
        } else {
          // Join current line with next
          const [ls, le] = getLineRange(s);
          if (le < code.length) {
            const nextLineEnd = code.indexOf('\n', le + 1);
            const nextEnd = nextLineEnd === -1 ? code.length : nextLineEnd;
            const nextLine = code.substring(le + 1, nextEnd).trim();
            setCode(code.substring(0, le) + ' ' + nextLine + code.substring(nextEnd));
            showToast('Line joined', 'info');
          }
        }
      }
    }
    else if (key === 'trim') {
      if (readonly) return;
      const trimmed = code.split('\n').map(l => l.trimEnd()).join('\n');
      const diff = code.length - trimmed.length;
      setCode(trimmed);
      showToast(diff ? `Trimmed ${diff} chars` : 'No trailing whitespace', diff ? 'info' : 'warn');
    }
    else if (key === 'closeall') {
      closedTabs.current = [...closedTabs.current, ...openTabs].slice(-20);
      setOpenTabs(['src/main.js']); setActiveFile('src/main.js');
      showToast('All tabs closed', 'info');
    }
    else if (key === 'closesaved') {
      const unsaved = openTabs.filter(t => editFiles.hasOwnProperty(t) && initFiles[t] !== undefined && editFiles[t] !== initFiles[t]);
      const toKeep = unsaved.length ? unsaved : ['src/main.js'];
      closedTabs.current = [...closedTabs.current, ...openTabs.filter(t => !toKeep.includes(t))].slice(-20);
      setOpenTabs(toKeep); if (!toKeep.includes(activeFile)) setActiveFile(toKeep[0]);
      showToast('Saved tabs closed', 'info');
    }
    else if (key === 'reopentab') {
      const last = closedTabs.current.pop();
      if (last) { openFile(last); showToast(`Reopened ${last.split('/').pop()}`, 'info'); }
      else showToast('No closed tabs', 'warn');
    }
    else if (key.startsWith('file:')) openFile(key.slice(5));
  };

  /* ---- Code execution ---- */
  const runCode = () => {
    if (readonly) return;
    if (autoSave && tp) { tp.save(); }
    setBusy(true);
    setTermOpen(true);
    const logs = [];
    const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fc = {
      log: (...a) => logs.push({ t: 'log', v: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), ts: ts() }),
      error: (...a) => logs.push({ t: 'err', v: a.map(String).join(' '), ts: ts() }),
      warn: (...a) => logs.push({ t: 'warn', v: a.map(String).join(' '), ts: ts() }),
      info: (...a) => logs.push({ t: 'log', v: a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '), ts: ts() }),
      debug: (...a) => logs.push({ t: 'dbg', v: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), ts: ts() }),
      clear: () => { logs.length = 0 },
      table: (...a) => logs.push({ t: 'log', v: a.map(x => JSON.stringify(x, null, 2)).join(' '), ts: ts() }),
    };
    const genSuggestion = (msg) => {
      if (msg.includes('is not defined')) {
        const varM = msg.match(/(\w+) is not defined/);
        if (varM) {
          const w = varM[1];
          if (TP_AC.some(a => a.label.startsWith(w))) return `Did you mean tp.${w}()?`;
          if (['cosole', 'consol', 'consloe'].includes(w)) return 'Did you mean console?';
          return `"${w}" is not defined — check spelling or add a declaration`;
        }
      } else if (msg.includes('is not a function')) {
        return 'Check the method name — use \u2318+Space after tp. for autocomplete';
      } else if (msg.includes('Unexpected token')) {
        return 'Syntax error — check for missing brackets, quotes, or semicolons';
      } else if (msg.includes('Unexpected end of input')) {
        return 'Missing closing bracket } or ) — try Format Document (\u2318P \u2192 Format)';
      }
      return null;
    };
    const t0 = performance.now();
    // Detect async code and run accordingly
    const isAsync = /\bawait\b/.test(code);
    if (isAsync) {
      const timeout = 10000; // 10s timeout for async code
      const fn = new Function('console', 'tp', `return (async () => {\n${code}\n})()`);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        const ms = (performance.now() - t0).toFixed(1);
        logs.push({ t: 'err', v: `Execution timed out after ${timeout / 1000}s`, ts: ts() });
        setOutput({ logs: logs.slice(-100), ms, err: `Timeout: execution exceeded ${timeout / 1000}s`, errLn: null, suggest: 'Check for infinite loops or long-running operations' });
        setBusy(false);
      }, timeout);
      fn(fc, tp || {}).then(r => {
        if (timedOut) return;
        clearTimeout(timer);
        const ms = (performance.now() - t0).toFixed(1);
        if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
        setOutput({ logs: logs.slice(-100), ms, err: null, errLn: null });
        setBusy(false);
      }).catch(e => {
        if (timedOut) return;
        clearTimeout(timer);
        let ln = null;
        const m = e.stack?.match(/<anonymous>:(\d+)/);
        if (m) ln = parseInt(m[1]) - 3; // -3 for async wrapper
        setOutput({ logs, ms: null, err: e.message, errLn: ln, suggest: genSuggestion(e.message) });
        setBusy(false);
      });
    } else {
      try {
        const r = new Function('console', 'tp', code)(fc, tp || {});
        const ms = (performance.now() - t0).toFixed(1);
        if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
        setOutput({ logs: logs.slice(-100), ms, err: null, errLn: null });
      } catch (e) {
        let ln = null;
        const m = e.stack?.match(/<anonymous>:(\d+)/);
        if (m) ln = parseInt(m[1]) - 2;
        setOutput({ logs, ms: null, err: e.message, errLn: ln, suggest: genSuggestion(e.message) });
      }
      setTimeout(() => setBusy(false), 300);
    }
  };

  /* ---- Run selected code only ---- */
  const runSelection = () => {
    const el = taRef.current;
    if (!el || el.selectionStart === el.selectionEnd) return;
    const sel = code.substring(el.selectionStart, el.selectionEnd);
    setBusy(true); setTermOpen(true);
    const logs = [];
    const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fc = {
      log: (...a) => logs.push({ t: 'log', v: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), ts: ts() }),
      error: (...a) => logs.push({ t: 'err', v: a.map(String).join(' '), ts: ts() }),
      warn: (...a) => logs.push({ t: 'warn', v: a.map(String).join(' '), ts: ts() }),
      info: (...a) => logs.push({ t: 'log', v: a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '), ts: ts() }),
    };
    logs.push({ t: 'log', v: '\u25B7 Running selection...', ts: ts() });
    const t0 = performance.now();
    const isAsync = /\bawait\b/.test(sel);
    if (isAsync) {
      const fn = new Function('console', 'tp', `return (async () => {\n${sel}\n})()`);
      fn(fc, tp || {}).then(r => {
        const ms = (performance.now() - t0).toFixed(1);
        if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
        setOutput(prev => ({ logs: [...(prev?.logs || []), ...logs], ms, err: null, errLn: null }));
        setBusy(false);
      }).catch(e => {
        setOutput(prev => ({ logs: [...(prev?.logs || []), ...logs, { t: 'err', v: e.message }], ms: null, err: e.message, errLn: null }));
        setBusy(false);
      });
    } else {
      try {
        const r = new Function('console', 'tp', sel)(fc, tp || {});
        const ms = (performance.now() - t0).toFixed(1);
        if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
        setOutput(prev => ({ logs: [...(prev?.logs || []), ...logs], ms, err: null, errLn: null }));
      } catch (e) {
        setOutput(prev => ({ logs: [...(prev?.logs || []), ...logs, { t: 'err', v: e.message }], ms: null, err: e.message, errLn: null }));
      }
      setTimeout(() => setBusy(false), 300);
    }
  };

  /* ---- Format code (simple auto-indent) ---- */
  const formatCode = () => {
    if (readonly) return;
    const lines = code.split('\n');
    let indent = 0;
    const formatted = lines.map(l => {
      const trimmed = l.trim();
      if (!trimmed) return '';
      // Decrease indent for closing brackets
      if (/^[}\])]/.test(trimmed)) indent = Math.max(0, indent - 1);
      // Decrease indent for case/default (already indented by switch)
      if (/^(case\b|default\s*:)/.test(trimmed) && indent > 0) {
        // Don't dedent the first case in a switch
        const prev = formatted.filter(Boolean);
        const lastNonEmpty = prev[prev.length - 1]?.trim();
        if (lastNonEmpty && !/[{]$/.test(lastNonEmpty)) indent = Math.max(0, indent - 1);
      }
      // Handle chained method calls: lines starting with .method()
      const isChained = /^\./.test(trimmed);
      const chainIndent = isChained ? 1 : 0;
      const result = ' '.repeat(tabSize).repeat(indent + chainIndent) + trimmed;
      // Increase indent for opening brackets
      const opens = (trimmed.match(/[{[(]/g) || []).length;
      const closes = (trimmed.match(/[}\])]/g) || []).length;
      indent = Math.max(0, indent + opens - closes);
      // If line started with close bracket, we already decreased, re-add opens
      if (/^[}\])]/.test(trimmed)) indent += opens;
      // Increase indent after case/default:
      if (/^(case\b.*:|default\s*:)/.test(trimmed) && !trimmed.includes('{')) indent++;
      return result;
    });
    // Remove trailing whitespace on empty lines
    const cleaned = formatted.map(l => l.trimEnd() || '');
    setCode(cleaned.join('\n'));
    showToast('Formatted!', 'info');
  };

  /* ---- Cursor tracking with scroll-into-view ---- */
  const updateCursor = (el) => {
    if (!el) return;
    const s = el.selectionStart;
    const before = code.substring(0, s);
    const ln = before.split('\n').length;
    const col = s - before.lastIndexOf('\n');
    setCursor({ ln, col });
    setActiveLn(ln);
    // Ensure cursor line is visible
    const lineH = Math.round(16 * zf);
    const viewH = el.clientHeight;
    const cursorY = (ln - 1) * lineH;
    if (cursorY < el.scrollTop + lineH) {
      el.scrollTop = Math.max(0, cursorY - lineH);
    } else if (cursorY > el.scrollTop + viewH - lineH * 2) {
      el.scrollTop = cursorY - viewH + lineH * 2;
    }
  };

  /* ---- Scroll to line (smooth) ---- */
  const scrollToLine = (ln) => {
    const el = taRef.current;
    if (!el) return;
    const lineH = Math.round(16 * zf);
    const target = (ln - 1) * lineH - el.clientHeight / 3;
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  };

  /* ---- Navigate to line (set cursor + scroll) ---- */
  const goToLine = (ln) => {
    setActiveLn(ln); setCursor({ ln, col: 1 });
    const pos = code.split('\n').slice(0, ln - 1).join('\n').length + (ln > 1 ? 1 : 0);
    scrollToLine(ln);
    setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = pos; el.focus(); } }, 0);
  };

  /* ---- Line helpers ---- */
  const getLineRange = (pos) => {
    const start = code.lastIndexOf('\n', pos - 1) + 1;
    const end = code.indexOf('\n', pos);
    return [start, end === -1 ? code.length : end];
  };

  /* ---- Key handling ---- */
  const handleKey = (e) => {
    e.stopPropagation();
    const el = e.target;
    const s = el.selectionStart, en = el.selectionEnd;

    /* Cmd+Shift+Enter: run selection if selected, else insert line above */
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      if (s !== en) { runSelection(); return; }
      if (readonly) return;
      const lineStart = code.lastIndexOf('\n', s - 1) + 1;
      const currentIndent = code.substring(lineStart, s).match(/^(\s*)/)[0];
      const nc = code.substring(0, lineStart) + currentIndent + '\n' + code.substring(lineStart);
      setCode(nc);
      setTimeout(() => { el.selectionStart = el.selectionEnd = lineStart + currentIndent.length }, 0);
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runCode(); return; }

    /* Save: Cmd+S */
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      tp?.save();
      showToast('State saved!', 'success');
      return;
    }

    /* New file: Cmd+N */
    if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      setNewFileInput(true); setSidebarMode('files'); setNewFileName('');
      setTimeout(() => newFileRef.current?.focus(), 100);
      return;
    }

    /* Select next occurrence: Cmd+D */
    if (e.key === 'd' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      if (s === en) {
        // Select current word
        const wordStart = code.lastIndexOf(' ', s - 1) + 1;
        const wordEnd = code.indexOf(' ', s); const we = wordEnd === -1 ? code.length : wordEnd;
        const lineEnd = code.indexOf('\n', s); const le = lineEnd === -1 ? code.length : lineEnd;
        const end = Math.min(we, le);
        const lineStart = code.lastIndexOf('\n', s - 1) + 1;
        const start = Math.max(wordStart, lineStart);
        setTimeout(() => { el.selectionStart = start; el.selectionEnd = end; }, 0);
      } else {
        // Find next occurrence of selection
        const sel = code.substring(s, en);
        const after = code.indexOf(sel, en);
        if (after !== -1) {
          setTimeout(() => { el.selectionStart = after; el.selectionEnd = after + sel.length; }, 0);
        }
      }
      return;
    }

    /* Select current line: Cmd+L */
    if (e.key === 'l' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      const [ls, le] = getLineRange(s);
      const lineEnd = le < code.length ? le + 1 : le;
      setTimeout(() => { el.selectionStart = ls; el.selectionEnd = lineEnd; el.focus(); }, 0);
      return;
    }

    /* Select all occurrences: Cmd+Shift+L */
    if (e.key === 'l' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      if (s !== en) {
        const sel = code.substring(s, en);
        // Select the last occurrence (native textarea can't do multi-cursor, so we select all text matching)
        setSelectedWord(/^\w+$/.test(sel) ? sel : '');
        const count = code.split(sel).length - 1;
        showToast(`${count} occurrences highlighted`, 'info');
      } else if (selectedWord) {
        const count = code.split(selectedWord).length - 1;
        showToast(`${count} occurrences of "${selectedWord}"`, 'info');
      }
      return;
    }

    /* Global search: Cmd+Shift+F */
    if (e.key === 'f' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault(); setGlobalSearchOpen(true); setSidebarMode('search'); setGlobalSearchTerm('');
      setTimeout(() => globalSearchRef.current?.focus(), 50); return;
    }

    /* Recent files: Cmd+E */
    if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); setRecentOpen(o => !o);
      setTimeout(() => recentRef.current?.focus(), 50); return;
    }

    /* Search: Cmd+F */
    if (e.key === 'f' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault(); setSearchOpen(true); setShowReplace(false);
      setTimeout(() => searchRef.current?.focus(), 50); return;
    }

    /* Replace: Cmd+H */
    if (e.key === 'h' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); setSearchOpen(true); setShowReplace(true);
      setTimeout(() => searchRef.current?.focus(), 50); return;
    }

    /* Command palette: Cmd+P or Cmd+Shift+P */
    if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); setCmdOpen(o => !o); setCmdQuery('');
      setTimeout(() => cmdRef.current?.focus(), 50); return;
    }

    /* Escape: close overlays */
    if (e.key === 'Escape') {
      if (peekDef) { setPeekDef(null); return; }
      if (acOpen) { setAcOpen(false); return; }
      if (surroundMenu) { setSurroundMenu(null); return; }
      if (searchOpen) { setSearchOpen(false); return; }
      if (cmdOpen) { setCmdOpen(false); return; }
      if (gotoOpen) { setGotoOpen(false); return; }
      if (helpOpen) { setHelpOpen(false); return; }
      if (recentOpen) { setRecentOpen(false); return; }
      if (notifOpen) { setNotifOpen(false); return; }
      if (symbolOpen) { setSymbolOpen(false); return; }
    }

    /* Tab cycling: Ctrl+Tab / Ctrl+Shift+Tab */
    if (e.key === 'Tab' && e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const idx = openTabs.indexOf(activeFile);
      if (e.shiftKey) {
        const prev = idx <= 0 ? openTabs.length - 1 : idx - 1;
        setActiveFile(openTabs[prev]);
      } else {
        const next = idx >= openTabs.length - 1 ? 0 : idx + 1;
        setActiveFile(openTabs[next]);
      }
      return;
    }

    /* Jump to matching bracket: Cmd+Shift+\ */
    if (e.key === '\\' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      if (matchBracket) {
        const [a, b] = matchBracket;
        const target = s === a || s === a + 1 ? b : a;
        setTimeout(() => { el.selectionStart = el.selectionEnd = target; updateCursor(el); }, 0);
      }
      return;
    }

    /* Go to Symbol: Cmd+Shift+O */
    if (e.key === 'o' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault(); setSymbolOpen(o => !o); setSymbolQuery(''); setSymbolIdx(0);
      setTimeout(() => symbolRef.current?.focus(), 50); return;
    }

    /* Toggle terminal: Cmd+J or Ctrl+` */
    if ((e.key === 'j' && (e.metaKey || e.ctrlKey) && !e.shiftKey) || (e.key === '`' && e.ctrlKey)) {
      e.preventDefault(); setTermOpen(t => !t); return;
    }

    /* Close tab: Cmd+W */
    if (e.key === 'w' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      if (openTabs.length > 1) closeTab(activeFile, e);
      return;
    }
    /* Cmd+Shift+T: reopen last closed tab */
    if (e.key === 't' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      const last = closedTabs.current.pop();
      if (last) { openFile(last); showToast(`Reopened ${last.split('/').pop()}`, 'info'); }
      return;
    }

    /* Autocomplete navigation */
    if (acOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcIdx(i => Math.min(i + 1, acItems.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAcIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = acItems[acIdx];
        if (item) {
          const before = code.substring(0, s);
          const dotIdx = before.lastIndexOf('tp.');
          if (dotIdx !== -1 && item.desc !== 'keyword') {
            // tp.method completion
            const nc = code.substring(0, dotIdx + 3) + item.insert + code.substring(s);
            setCode(nc);
            const newPos = dotIdx + 3 + item.insert.length;
            setTimeout(() => { el.selectionStart = el.selectionEnd = newPos }, 0);
          } else {
            // JS keyword completion — append remaining chars
            const nc = code.substring(0, s) + item.insert + code.substring(s);
            setCode(nc);
            const newPos = s + item.insert.length;
            setTimeout(() => { el.selectionStart = el.selectionEnd = newPos }, 0);
          }
        }
        setAcOpen(false);
        return;
      }
    }

    /* Undo: Cmd+Z */
    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault(); editorUndo(); return;
    }

    /* Redo: Cmd+Shift+Z */
    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault(); editorRedo(); return;
    }

    /* Go to line: Ctrl+G or Cmd+G */
    if (e.key === 'g' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault(); setGotoOpen(true); setGotoVal('');
      setTimeout(() => gotoRef.current?.focus(), 50); return;
    }

    /* Select all: Cmd+A */
    if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setTimeout(() => { el.selectionStart = 0; el.selectionEnd = code.length; }, 0);
      return;
    }

    /* Shortcuts help: Cmd+K */
    if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault(); helpFilterRef.current.q = ''; setHelpOpen(h => !h);
      setTimeout(() => helpSearchRef.current?.focus(), 50); return;
    }

    /* Fold/Unfold at cursor: Cmd+Shift+[ / ] */
    if (e.key === '[' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      const lineIdx = activeLn - 1;
      if (foldableRanges[lineIdx] !== undefined && !foldedLines.has(lineIdx)) {
        toggleFold(lineIdx);
        showToast('Folded', 'info');
      }
      return;
    }
    if (e.key === ']' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      const lineIdx = activeLn - 1;
      if (foldedLines.has(lineIdx)) {
        toggleFold(lineIdx);
        showToast('Unfolded', 'info');
      }
      return;
    }

    /* Expand selection to enclosing brackets: Cmd+Shift+Space */
    if (e.key === ' ' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      // Find enclosing bracket pair
      const pos = s;
      const opens = '([{', closes = ')]}';
      let depth = {};
      for (let ci = 0; ci < opens.length; ci++) depth[opens[ci]] = 0;
      for (let i = pos - 1; i >= 0; i--) {
        const ch = code[i];
        const oi = opens.indexOf(ch), cci = closes.indexOf(ch);
        if (cci !== -1) depth[opens[cci]]++;
        if (oi !== -1) {
          if (depth[ch] > 0) depth[ch]--;
          else {
            // Found unmatched open bracket — find its close
            let d = 1, j = i + 1;
            while (j < code.length && d > 0) {
              if (code[j] === opens[oi]) d++;
              if (code[j] === closes[oi]) d--;
              j++;
            }
            if (d === 0) {
              setTimeout(() => { el.selectionStart = i + 1; el.selectionEnd = j - 1; el.focus(); }, 0);
              updateCursor(el);
            }
            break;
          }
        }
      }
      return;
    }

    /* Editor zoom: Cmd+= / Cmd+- */
    if ((e.key === '=' || e.key === '+') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); setEditorZoom(z => Math.min(2, z + 0.1)); return;
    }
    if (e.key === '-' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault(); setEditorZoom(z => Math.max(0.6, z - 0.1)); return;
    }
    if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); setEditorZoom(1); return;
    }

    /* F3/Shift+F3: jump to next/prev search match */
    if (e.key === 'F3' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (searchOpen && searchMatches.length) {
        jumpToMatch(e.shiftKey ? -1 : 1);
      }
      return;
    }

    /* Toggle bookmark: Cmd+B */
    if (e.key === 'b' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault(); toggleBookmark(activeLn);
      showToast(bookmarks.has(activeLn) ? 'Bookmark removed' : 'Bookmark added', 'info');
      return;
    }

    /* Next bookmark: F2, Previous: Shift+F2 */
    if (e.key === 'F2' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault(); jumpBookmark(e.shiftKey ? -1 : 1); return;
    }

    /* Rename symbol: Cmd+R */
    if (e.key === 'r' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      if (readonly) return;
      // Get word under cursor
      const before = code.substring(0, s);
      const after = code.substring(s);
      const wBefore = before.match(/(\w+)$/);
      const wAfter = after.match(/^(\w*)/);
      if (wBefore || wAfter) {
        const word = (wBefore ? wBefore[1] : '') + (wAfter ? wAfter[1] : '');
        if (word.length >= 2) {
          setRenameSymbol({ word, newName: word });
          setTimeout(() => renameSymbolRef.current?.focus(), 50);
        }
      }
      return;
    }

    /* Toggle comment: Cmd+/ */
    if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (readonly) return;
      const ls = code.substring(0, s).split('\n');
      const le = code.substring(0, en).split('\n');
      const startLn = ls.length - 1, endLn = le.length - 1;
      const all = code.split('\n');
      const range = all.slice(startLn, endLn + 1);
      const allCommented = range.every(l => /^\s*\/\//.test(l) || l.trim() === '');
      const newLines = [...all];
      for (let i = startLn; i <= endLn; i++) {
        if (allCommented) {
          newLines[i] = all[i].replace(/^(\s*)\/\/ ?/, '$1');
        } else {
          newLines[i] = all[i].replace(/^(\s*)/, '$1// ');
        }
      }
      const nc = newLines.join('\n');
      const diff = nc.length - code.length;
      setCode(nc);
      setTimeout(() => { el.selectionStart = s; el.selectionEnd = en + diff }, 0);
      return;
    }

    /* Move line: Alt+Up/Down */
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey && !e.shiftKey) {
      e.preventDefault();
      if (readonly) return;
      const all = code.split('\n');
      const curLn = code.substring(0, s).split('\n').length - 1;
      if (e.key === 'ArrowUp' && curLn > 0) {
        const tmp = all[curLn - 1]; all[curLn - 1] = all[curLn]; all[curLn] = tmp;
        const nc = all.join('\n');
        const lineLen = all[curLn - 1].length;
        const prevLen = tmp.length;
        const ns = s - prevLen - 1;
        setCode(nc);
        setTimeout(() => { el.selectionStart = ns; el.selectionEnd = ns + (en - s) }, 0);
      } else if (e.key === 'ArrowDown' && curLn < all.length - 1) {
        const tmp = all[curLn + 1]; all[curLn + 1] = all[curLn]; all[curLn] = tmp;
        const nc = all.join('\n');
        const ns = s + tmp.length + 1;
        setCode(nc);
        setTimeout(() => { el.selectionStart = ns; el.selectionEnd = ns + (en - s) }, 0);
      }
      return;
    }

    /* Copy line up/down: Alt+Shift+Up/Down */
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey && e.shiftKey) {
      e.preventDefault();
      if (readonly) return;
      const [ls, le] = getLineRange(s);
      const line = code.substring(ls, le);
      if (e.key === 'ArrowUp') {
        const nc = code.substring(0, ls) + line + '\n' + code.substring(ls);
        setCode(nc);
        // Keep cursor on original position (which moved down)
      } else {
        const nc = code.substring(0, le) + '\n' + line + code.substring(le);
        const ns = s + line.length + 1;
        setCode(nc);
        setTimeout(() => { el.selectionStart = ns; el.selectionEnd = ns + (en - s) }, 0);
      }
      return;
    }

    /* Surround with: Cmd+Shift+S */
    if (e.key === 's' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      if (readonly || s === en) { showToast('Select code to surround', 'warn'); return; }
      setSurroundMenu({ s, en });
      return;
    }

    /* Duplicate line: Cmd+Shift+D */
    if (e.key === 'd' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      if (readonly) return;
      const [ls, le] = getLineRange(s);
      const line = code.substring(ls, le);
      const nc = code.substring(0, le) + '\n' + line + code.substring(le);
      const ns = s + line.length + 1;
      setCode(nc);
      setTimeout(() => { el.selectionStart = ns; el.selectionEnd = ns + (en - s) }, 0);
      return;
    }

    /* Select line: Cmd+L */
    if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const [ls, le] = getLineRange(s);
      setTimeout(() => { el.selectionStart = ls; el.selectionEnd = le }, 0);
      return;
    }

    /* Delete line: Ctrl+Shift+K */
    if (e.key === 'k' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      if (readonly) return;
      const [ls, le] = getLineRange(s);
      const delEnd = le < code.length ? le + 1 : ls > 0 ? ls - 1 : le;
      const delStart = le < code.length ? ls : ls > 0 ? ls - 1 : ls;
      const nc = code.substring(0, delStart) + code.substring(delEnd);
      setCode(nc || '\n');
      setTimeout(() => { el.selectionStart = el.selectionEnd = delStart }, 0);
      return;
    }

    /* Home: go to first non-whitespace, then to column 0 */
    if (e.key === 'Home' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const lineStart = code.lastIndexOf('\n', s - 1) + 1;
      const lineText = code.substring(lineStart);
      const firstNonWs = lineStart + (lineText.match(/^\s*/)[0].length);
      const target = s === firstNonWs ? lineStart : firstNonWs;
      if (e.shiftKey) {
        setTimeout(() => { el.selectionStart = Math.min(target, en); el.selectionEnd = Math.max(target, s === el.selectionStart ? en : s); }, 0);
      } else {
        setTimeout(() => { el.selectionStart = el.selectionEnd = target; }, 0);
      }
      return;
    }

    /* End: go to end of line */
    if (e.key === 'End' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const lineEnd = code.indexOf('\n', s);
      const target = lineEnd === -1 ? code.length : lineEnd;
      if (e.shiftKey) {
        setTimeout(() => { el.selectionStart = Math.min(s, target); el.selectionEnd = target; }, 0);
      } else {
        setTimeout(() => { el.selectionStart = el.selectionEnd = target; }, 0);
      }
      return;
    }

    if (readonly) return;

    /* Ctrl+Backspace: delete word left */
    if (e.key === 'Backspace' && (e.ctrlKey || e.altKey) && !e.metaKey) {
      e.preventDefault();
      if (s === en && s > 0) {
        let j = s - 1;
        // Skip whitespace
        while (j > 0 && /\s/.test(code[j])) j--;
        // Skip word characters
        while (j > 0 && /\w/.test(code[j - 1])) j--;
        setCode(code.substring(0, j) + code.substring(s));
        setTimeout(() => { el.selectionStart = el.selectionEnd = j }, 0);
      }
      return;
    }

    /* Ctrl+Delete: delete word right */
    if (e.key === 'Delete' && (e.ctrlKey || e.altKey) && !e.metaKey) {
      e.preventDefault();
      if (s === en && s < code.length) {
        let j = s;
        // Skip word characters
        while (j < code.length && /\w/.test(code[j])) j++;
        // Skip whitespace
        while (j < code.length && /\s/.test(code[j])) j++;
        if (j === s) j++; // at least delete one char
        setCode(code.substring(0, s) + code.substring(j));
        setTimeout(() => { el.selectionStart = el.selectionEnd = s }, 0);
      }
      return;
    }

    /* Tab / Shift+Tab: indent/outdent */
    if (e.key === 'Tab') {
      e.preventDefault();
      if (s !== en) {
        // Multi-line indent/outdent
        const all = code.split('\n');
        const startLn = code.substring(0, s).split('\n').length - 1;
        const endLn = code.substring(0, en).split('\n').length - 1;
        const newLines = [...all];
        let diff = 0;
        for (let i = startLn; i <= endLn; i++) {
          if (e.shiftKey) {
            const sp = ' '.repeat(tabSize);
            if (newLines[i].startsWith(sp)) { newLines[i] = newLines[i].slice(tabSize); diff -= tabSize; }
            else { const ws = newLines[i].match(/^ */)[0].length; if (ws) { newLines[i] = newLines[i].slice(ws); diff -= ws; } }
          } else {
            newLines[i] = ' '.repeat(tabSize) + newLines[i]; diff += tabSize;
          }
        }
        const nc = newLines.join('\n');
        setCode(nc);
        setTimeout(() => { el.selectionStart = s; el.selectionEnd = en + diff }, 0);
      } else if (e.shiftKey) {
        // Single line outdent
        const lineStart = code.lastIndexOf('\n', s - 1) + 1;
        const line = code.substring(lineStart);
        const sp = ' '.repeat(tabSize);
        if (line.startsWith(sp)) {
          setCode(code.substring(0, lineStart) + line.slice(tabSize));
          setTimeout(() => { el.selectionStart = el.selectionEnd = Math.max(lineStart, s - tabSize) }, 0);
        }
      } else {
        // Check for snippet trigger before plain Tab
        const lineStart = code.lastIndexOf('\n', s - 1) + 1;
        const beforeCursor = code.substring(lineStart, s);
        const wordMatch = beforeCursor.match(/(\w+)$/);
        if (wordMatch && SNIPPETS[wordMatch[1]]) {
          const trigger = wordMatch[1];
          const currentIndent = beforeCursor.match(/^(\s*)/)[0];
          let snippet = SNIPPETS[trigger];
          // Apply indent to each line
          const snipLines = snippet.split('\n');
          const expanded = snipLines.map((l, idx) => idx === 0 ? l : currentIndent + l).join('\n');
          // Remove placeholder markers ${N:text} → text, ${0} → cursor position
          let cursorOffset = -1;
          let clean = expanded.replace(/\$\{0(?::([^}]*))?\}/g, (m, def, off) => {
            cursorOffset = expanded.indexOf(m) - (expanded.substring(0, expanded.indexOf(m)).split('${').length - 1) * 0; // approximate
            return def || '';
          });
          clean = clean.replace(/\$\{\d+:([^}]*)\}/g, '$1');
          // Find cursor position (where ${0} was)
          const zeroIdx = expanded.indexOf('${0');
          const beforeZero = zeroIdx >= 0 ? expanded.substring(0, zeroIdx).replace(/\$\{\d+:([^}]*)\}/g, '$1') : clean;
          const replaceStart = s - trigger.length;
          const nc = code.substring(0, replaceStart) + clean + code.substring(s);
          setCode(nc);
          const newPos = replaceStart + beforeZero.length;
          setTimeout(() => { el.selectionStart = el.selectionEnd = newPos; }, 0);
          showToast(`Snippet: ${trigger}`, 'info');
          return;
        }
        const sp = ' '.repeat(tabSize);
        setCode(code.substring(0, s) + sp + code.substring(en));
        setTimeout(() => { el.selectionStart = el.selectionEnd = s + tabSize }, 0);
      }
      return;
    }
    /* Selection wrapping: typing bracket/quote with selection wraps it */
    if (PAIRS[e.key] && s !== en) {
      e.preventDefault();
      const close = PAIRS[e.key];
      const selected = code.substring(s, en);
      setCode(code.substring(0, s) + e.key + selected + close + code.substring(en));
      setTimeout(() => { el.selectionStart = s + 1; el.selectionEnd = s + 1 + selected.length }, 0);
      return;
    }
    if (PAIRS[e.key]) { e.preventDefault(); const close = PAIRS[e.key]; setCode(code.substring(0, s) + e.key + close + code.substring(en)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + 1 }, 0); return; }
    if (e.key === 'Enter') {
      const lineStart = code.lastIndexOf('\n', s - 1) + 1;
      const currentLine = code.substring(lineStart, s);
      const indent = currentLine.match(/^\s*/)[0];
      const bef = code[s - 1];
      const OPEN_CLOSE = { '{': '}', '[': ']', '(': ')' };
      if (OPEN_CLOSE[bef]) {
        e.preventDefault();
        const closer = OPEN_CLOSE[bef];
        const after = code[s] === closer;
        const tab = ' '.repeat(tabSize);
        const nc = code.substring(0, s) + '\n' + indent + tab + (after ? '\n' + indent : '') + code.substring(s);
        setCode(nc);
        setTimeout(() => { el.selectionStart = el.selectionEnd = s + indent.length + tabSize + 1 }, 0);
        return;
      }
      if (indent) { e.preventDefault(); setCode(code.substring(0, s) + '\n' + indent + code.substring(en)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + indent.length + 1 }, 0); return; }
    }
    if (')]}"\'`'.includes(e.key) && code[s] === e.key) {
      e.preventDefault(); setTimeout(() => { el.selectionStart = el.selectionEnd = s + 1 }, 0); return;
    }
    /* Smart semicolon: skip duplicate at end of line */
    if (e.key === ';' && s === en) {
      const lineEnd = code.indexOf('\n', s);
      const afterCursor = code.substring(s, lineEnd === -1 ? code.length : lineEnd).trimEnd();
      if (afterCursor === ';') {
        e.preventDefault();
        setTimeout(() => { el.selectionStart = el.selectionEnd = s + 1 }, 0);
        return;
      }
    }
    if (e.key === 'Backspace' && s === en && s > 0) {
      const ch = code[s - 1];
      if (PAIRS[ch] && code[s] === PAIRS[ch]) {
        e.preventDefault(); setCode(code.substring(0, s - 1) + code.substring(s + 1));
        setTimeout(() => { el.selectionStart = el.selectionEnd = s - 1 }, 0); return;
      }
      // Smart unindent: if cursor is right after leading spaces, remove one indent level
      const lineStart = code.lastIndexOf('\n', s - 1) + 1;
      const beforeCursor = code.substring(lineStart, s);
      if (/^\s+$/.test(beforeCursor) && beforeCursor.length >= tabSize) {
        const removeCount = ((beforeCursor.length - 1) % tabSize) + 1; // align to tab stops
        e.preventDefault();
        setCode(code.substring(0, s - removeCount) + code.substring(s));
        setTimeout(() => { el.selectionStart = el.selectionEnd = s - removeCount }, 0);
        return;
      }
    }
  };

  const stop = e => e.stopPropagation();

  /* ========== RENDER ========== */
  return (
    <div data-ide-scroll style={{ ...b, background: '#1e1e2e', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: MONO }}>
      {/* Custom scrollbar styling */}
      <style>{`
        [data-ide-scroll] *::-webkit-scrollbar { width: 6px; height: 6px; }
        [data-ide-scroll] *::-webkit-scrollbar-track { background: transparent; }
        [data-ide-scroll] *::-webkit-scrollbar-thumb { background: #ffffff15; border-radius: 3px; }
        [data-ide-scroll] *::-webkit-scrollbar-thumb:hover { background: #ffffff25; }
        [data-ide-scroll] *::-webkit-scrollbar-corner { background: transparent; }
        [data-ide-scroll] textarea::selection { background: #cba6f730; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

      {/* Title bar — drag handle for moving IDE on canvas */}
      <div data-ide-drag style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderBottom: '1px solid #ffffff10', gap: 6, flexShrink: 0, background: '#181825', cursor: 'grab' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { c: '#ff5f56', title: 'Close IDE', action: () => { const ids = tp?.find('code-block'); if (ids?.length) tp.remove(ids[0]); } },
            { c: '#ffbd2e', title: 'Toggle terminal', action: () => setTermOpen(t => !t) },
            { c: '#27c93f', title: 'Run code', action: () => runCode() },
          ].map((btn, i) => <div key={i} onClick={btn.action} onMouseDown={stop}
            style={{ width: 7, height: 7, borderRadius: 99, background: btn.c, opacity: .6, cursor: 'pointer', transition: 'opacity .15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '.6'}
            title={btn.title} />)}
        </div>
        <span onClick={() => setSidebarMode(m => m === 'files' ? null : 'files')} onMouseDown={stop}
          style={{ fontSize: 11, color: sidebarMode === 'files' ? '#cba6f7' : '#555', cursor: 'pointer', marginLeft: 4, lineHeight: 1 }}
          title="Toggle explorer">{sidebarMode === 'files' ? '\u25E7' : '\u2630'}</span>
        <span style={{ fontSize: fs(9), color: '#666', flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          tasteprint <span style={{ color: '#444' }}>/</span> {activeFile}{editFiles.hasOwnProperty(activeFile) && initFiles[activeFile] !== undefined && editFiles[activeFile] !== initFiles[activeFile] && <span style={{ color: '#f9e2af', marginLeft: 3, fontSize: 7 }} title="Modified">{'\u25CF'}</span>}
        </span>
        <span onClick={() => { setCmdOpen(o => !o); setCmdQuery(''); setTimeout(() => cmdRef.current?.focus(), 50); }} onMouseDown={stop}
          style={{ fontSize: 9, color: cmdOpen ? '#cba6f7' : '#555', cursor: 'pointer', lineHeight: 1, padding: '1px 4px', borderRadius: 3, background: '#ffffff06' }} title="Command palette (Cmd+P)">{'\u2318P'}</span>
        <span onClick={() => setTermOpen(t => !t)} onMouseDown={stop}
          style={{ fontSize: 10, color: termOpen ? '#cba6f7' : '#555', cursor: 'pointer', lineHeight: 1 }} title="Toggle terminal">&gt;_</span>
        <span onClick={() => { tp?.save(); showToast('State saved!', 'success'); }} onMouseDown={stop}
          style={{ fontSize: 8, color: '#89b4fa', cursor: 'pointer', lineHeight: 1, opacity: .7 }} title="Save current state (⌘S)">Save</span>
        <span onClick={() => { tp?.reset(); showToast('Reset to default!', 'warn'); }} onMouseDown={stop}
          style={{ fontSize: 8, color: '#f9e2af', cursor: 'pointer', lineHeight: 1, opacity: .7 }} title="Reset to defaults">Reset</span>
        <button onClick={runCode} disabled={busy || readonly} onMouseDown={stop}
          style={{
            background: busy ? '#27c93f' : '#27c93f22', color: busy ? '#000' : '#27c93f',
            border: 'none', borderRadius: 6, padding: '2px 10px', fontSize: 9, fontWeight: 600,
            cursor: busy || readonly ? 'default' : 'pointer', fontFamily: MONO, transition: 'all .2s',
            opacity: readonly ? .3 : 1
          }}>
          {busy ? '\u25CF RUN' : '\u25B6 Run'}
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* Activity bar */}
        {(() => {
          const modCount = Object.keys(editFiles).filter(p => initFiles[p] !== undefined && editFiles[p] !== initFiles[p]).length;
          return (
            <div style={{ width: 28, background: '#11111b', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, gap: 2, flexShrink: 0, borderRight: '1px solid #ffffff06' }}>
              {[
                { id: 'files', icon: '\u2630', title: 'Explorer', badge: modCount || null },
                { id: 'search', icon: '\u26B2', title: 'Search' },
                { id: 'outline', icon: '\u2261', title: 'Outline', badge: outlineSymbols.length || null },
                { id: 'settings', icon: '\u2699', title: 'Settings' },
              ].map(item => (
                <div key={item.id}
                  onClick={() => setSidebarMode(m => m === item.id ? null : item.id)}
                  onMouseDown={stop}
                  style={{
                    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, cursor: 'pointer', borderRadius: 4, userSelect: 'none', position: 'relative',
                    color: sidebarMode === item.id ? '#cba6f7' : '#555',
                    background: sidebarMode === item.id ? '#cba6f710' : 'transparent',
                    borderLeft: sidebarMode === item.id ? '2px solid #cba6f7' : '2px solid transparent',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (sidebarMode !== item.id) e.currentTarget.style.color = '#888'; }}
                  onMouseLeave={e => { if (sidebarMode !== item.id) e.currentTarget.style.color = '#555'; }}
                  title={item.title}
                >
                  {item.icon}
                  {item.badge && <span style={{
                    position: 'absolute', top: -2, right: -2, fontSize: 6, fontWeight: 700,
                    background: '#cba6f7', color: '#11111b', borderRadius: 99,
                    minWidth: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 2px', lineHeight: 1, fontFamily: 'system-ui',
                  }}>{item.badge}</span>}
                </div>
              ))}
            </div>
          );
        })()}

        {/* File tree sidebar */}
        {sidebarMode === 'files' && <div onClick={() => setExplorerCtx(null)} style={{
          width: explorerW, background: '#181825', borderRight: 'none',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'auto', position: 'relative'
        }}>
          <div style={{ padding: '6px 10px 4px', fontSize: 8, color: '#555', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ flex: 1 }}>Explorer</span>
            <input
              placeholder="Filter..."
              spellCheck={false}
              onMouseDown={stop}
              onKeyDown={e => e.stopPropagation()}
              onChange={e => setExplorerFilter(e.target.value)}
              value={explorerFilter}
              style={{
                width: explorerFilter ? 70 : 40, background: '#1e1e2e', border: '1px solid #ffffff10',
                borderRadius: 3, padding: '1px 4px', fontSize: 7, color: '#cdd6f4', outline: 'none',
                fontFamily: MONO, transition: 'width .15s',
              }}
              onFocus={e => e.currentTarget.style.width = '70px'}
              onBlur={e => { if (!explorerFilter) e.currentTarget.style.width = '40px'; }}
            />
          </div>
          {TREE.map(folder => {
            const filteredChildren = explorerFilter ? folder.children.filter(f => f.name.toLowerCase().includes(explorerFilter.toLowerCase())) : folder.children;
            if (explorerFilter && filteredChildren.length === 0) return null;
            return (
            <React.Fragment key={folder.name}>
              <div
                onClick={() => setOpenFolders(prev => ({ ...prev, [folder.name]: !prev[folder.name] }))}
                onMouseDown={stop}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                  cursor: 'pointer', fontSize: fs(9), color: '#888', userSelect: 'none'
                }}>
                <span style={{ fontSize: 7, color: '#555', transition: 'transform .15s', display: 'inline-block',
                  transform: openFolders[folder.name] ? 'rotate(90deg)' : 'rotate(0deg)' }}>{'\u25B8'}</span>
                <span style={{ fontSize: 10, opacity: .6 }}>{openFolders[folder.name] ? '\uD83D\uDCC2' : '\uD83D\uDCC1'}</span>
                <span>{folder.name}</span>
              </div>
              {(openFolders[folder.name] || explorerFilter) && folder.children.filter(f => !explorerFilter || f.name.toLowerCase().includes(explorerFilter.toLowerCase())).map(f => {
                const isActive = f.path === activeFile;
                const isReadonly = !editFiles.hasOwnProperty(f.path) && GEN_FILES[f.path];
                const isDeletable = editFiles.hasOwnProperty(f.path) && !initFiles[f.path];
                const isModified = editFiles.hasOwnProperty(f.path) && initFiles[f.path] !== undefined && editFiles[f.path] !== initFiles[f.path];
                return (
                  <div key={f.path}
                    onClick={() => { openFile(f.path); setExplorerCtx(null); }}
                    onMouseDown={stop}
                    onContextMenu={e => {
                      e.preventDefault(); e.stopPropagation();
                      const rect = e.currentTarget.closest('[style*="width: 130"]')?.getBoundingClientRect();
                      setExplorerCtx({ path: f.path, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0), deletable: isDeletable, readonly: isReadonly });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px 2px 22px',
                      cursor: 'pointer', fontSize: fs(9), userSelect: 'none',
                      background: isActive ? '#ffffff0a' : 'transparent',
                      color: isActive ? '#cdd6f4' : '#777',
                      borderLeft: isActive ? '2px solid #cba6f7' : '2px solid transparent',
                    }}>
                    <span style={{ fontSize: FICONS[f.name] ? 8 : 6, color: FCOLORS[f.name] || (f.path.startsWith('user/') ? '#cba6f7' : '#555'), width: 14, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{FICONS[f.name] || (f.path.startsWith('user/') ? 'JS' : '\u25CF')}</span>
                    {renameFile === f.path ? (
                      <input ref={renameRef} value={renameName} onChange={e => setRenameName(e.target.value)}
                        spellCheck={false} autoFocus
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          e.stopPropagation();
                          if (e.key === 'Enter' && renameName.trim()) { renameFileFn(f.path, renameName.trim()); setRenameFile(null); }
                          if (e.key === 'Escape') setRenameFile(null);
                        }}
                        onBlur={() => { if (renameName.trim()) renameFileFn(f.path, renameName.trim()); setRenameFile(null); }}
                        style={{ flex: 1, background: '#1e1e2e', border: '1px solid #cba6f740', borderRadius: 2, padding: '0 3px', fontSize: 8, color: '#cdd6f4', outline: 'none', fontFamily: MONO, minWidth: 0 }} />
                    ) : (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                    )}
                    {(() => {
                      const fc = getFile(f.path);
                      if (fc) {
                        const sz = fc.content.length;
                        return <span style={{ fontSize: 7, color: '#333', flexShrink: 0, marginLeft: 'auto' }}>{sz > 1024 ? `${(sz / 1024).toFixed(0)}K` : `${sz}B`}</span>;
                      }
                      return null;
                    })()}
                    {isModified && <span style={{ fontSize: 6, color: '#f9e2af', flexShrink: 0, marginLeft: 2 }} title="Modified">{'\u25CF'}</span>}
                    {isReadonly && <span style={{ fontSize: 7, color: '#555', flexShrink: 0 }}>{'\uD83D\uDD12'}</span>}
                  </div>
                );
              })}
            </React.Fragment>
          );})}
          {/* Explorer context menu */}
          {explorerCtx && (
            <div onMouseDown={stop} style={{
              position: 'absolute', left: explorerCtx.x, top: explorerCtx.y, zIndex: 15,
              background: '#181825', border: '1px solid #ffffff15', borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,.5)', minWidth: 100, overflow: 'hidden'
            }}>
              {[
                { label: 'Open', action: () => openFile(explorerCtx.path) },
                null,
                { label: 'Copy Path', action: () => { navigator.clipboard?.writeText(explorerCtx.path); showToast('Path copied!', 'info'); } },
                { label: 'Copy Name', action: () => { navigator.clipboard?.writeText(explorerCtx.path.split('/').pop()); showToast('Name copied!', 'info'); } },
                ...(explorerCtx.deletable ? [
                  null,
                  { label: 'Duplicate', action: () => {
                    const name = explorerCtx.path.split('/').pop();
                    const base = name.replace(/\.\w+$/, '');
                    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
                    const newName = `${base}-copy${ext}`;
                    const folder = explorerCtx.path.substring(0, explorerCtx.path.lastIndexOf('/') + 1);
                    const content = editFiles[explorerCtx.path] || '';
                    setEditFiles(prev => ({ ...prev, [folder + newName]: content }));
                    openFile(folder + newName);
                    showToast(`Duplicated as ${newName}`, 'info');
                  }},
                  { label: 'Rename', action: () => {
                    const name = explorerCtx.path.split('/').pop();
                    setRenameFile(explorerCtx.path); setRenameName(name);
                    setTimeout(() => renameRef.current?.focus(), 50);
                  }},
                  null,
                  { label: 'Delete', action: () => deleteFile(explorerCtx.path), color: '#f38ba8' },
                ] : []),
              ].map((item, i) => item === null ? (
                <div key={`sep${i}`} style={{ height: 1, background: '#ffffff08', margin: '1px 0' }} />
              ) : (
                <div key={item.label} onClick={() => { item.action(); setExplorerCtx(null); }}
                  style={{ padding: '4px 10px', fontSize: 9, color: item.color || '#a6adc8', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {item.label}
                </div>
              ))}
            </div>
          )}

          {/* New file input or button */}
          {newFileInput ? (
            <div style={{ padding: '3px 8px', borderTop: '1px solid #ffffff06', marginTop: 4 }}>
              <input ref={newFileRef} value={newFileName} onChange={e => setNewFileName(e.target.value)}
                placeholder="filename.js" spellCheck={false} autoFocus
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && newFileName.trim()) { createFile(newFileName.trim()); setNewFileInput(false); setNewFileName(''); }
                  if (e.key === 'Escape') { setNewFileInput(false); setNewFileName(''); }
                }}
                onBlur={() => { if (newFileName.trim()) createFile(newFileName.trim()); setNewFileInput(false); setNewFileName(''); }}
                style={{ width: '100%', background: '#1e1e2e', border: '1px solid #cba6f740', borderRadius: 3, padding: '2px 4px', fontSize: 8, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
            </div>
          ) : (
            <div onClick={() => { setNewFileInput(true); setNewFileName(''); setTimeout(() => newFileRef.current?.focus(), 50); }}
              onMouseDown={stop}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', marginTop: 4,
                cursor: 'pointer', fontSize: fs(8), color: '#555', userSelect: 'none', borderTop: '1px solid #ffffff06' }}>
              <span style={{ fontSize: 10, lineHeight: 1 }}>+</span>
              <span>New file</span>
            </div>
          )}
        </div>}

        {/* Global search panel */}
        {(sidebarMode === 'search' || globalSearchOpen) && <div onMouseDown={stop} style={{
          width: explorerW + 20, background: '#181825', borderRight: 'none',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden'
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #ffffff08' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 8, color: '#cba6f7', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', flex: 1 }}>Search</span>
              <span onClick={() => { setGlobalSearchOpen(false); setSidebarMode('files'); }} style={{ fontSize: 9, color: '#555', cursor: 'pointer' }}>{'\u00D7'}</span>
            </div>
            <input ref={globalSearchRef} value={globalSearchTerm} onChange={e => setGlobalSearchTerm(e.target.value)}
              placeholder="Search in files..." spellCheck={false} autoFocus
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { setGlobalSearchOpen(false); setSidebarMode('files'); taRef.current?.focus(); } }}
              style={{ width: '100%', background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '3px 6px', fontSize: 9, color: '#cdd6f4', outline: 'none', fontFamily: MONO, boxSizing: 'border-box' }} />
            {globalSearchTerm && <div style={{ fontSize: 8, color: '#555', marginTop: 3 }}>{globalSearchResults.length} results</div>}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '2px 0' }}>
            {globalSearchResults.map((r, i) => (
              <div key={i} onClick={() => { openFile(r.path); setActiveLn(r.line); setCursor({ ln: r.line, col: 1 });
                const pos = code.split('\n').slice(0, r.line - 1).join('\n').length + (r.line > 1 ? 1 : 0);
                setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = pos; el.focus(); } }, 50);
              }}
                style={{ padding: '2px 8px', cursor: 'pointer', borderLeft: '2px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ffffff06'; e.currentTarget.style.borderLeftColor = '#cba6f7'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}>
                <div style={{ fontSize: 8, color: '#89b4fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.path.split('/').pop()} <span style={{ color: '#555' }}>:{r.line}</span>
                </div>
                <div style={{ fontSize: 8, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.text.substring(0, 60)}
                </div>
              </div>
            ))}
            {globalSearchTerm && !globalSearchResults.length && (
              <div style={{ fontSize: 8, color: '#555', padding: '8px', textAlign: 'center' }}>No matches</div>
            )}
          </div>
        </div>}

        {/* Outline sidebar */}
        {sidebarMode === 'outline' && (
          <div onMouseDown={stop} style={{
            width: explorerW, background: '#181825', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden'
          }}>
            <div style={{ padding: '6px 10px', fontSize: 8, color: '#555', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #ffffff06', display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>Outline</span>
              <span style={{ fontSize: 7, color: '#555', marginRight: 2 }}>{outlineSymbols.length}</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '2px 0' }}>
              {outlineSymbols.length === 0 ? (
                <div style={{ fontSize: 8, color: '#444', padding: '8px', textAlign: 'center' }}>No symbols</div>
              ) : outlineSymbols.map((sym, si) => (
                <div key={si}
                  onClick={() => goToLine(sym.line)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                    cursor: 'pointer', fontSize: 8,
                    color: sym.line === activeLn ? '#cdd6f4' : '#777',
                    background: sym.line === activeLn ? '#ffffff08' : 'transparent',
                    borderLeft: sym.line === activeLn ? '2px solid #cba6f7' : '2px solid transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
                  onMouseLeave={e => e.currentTarget.style.background = sym.line === activeLn ? '#ffffff08' : 'transparent'}>
                  <span style={{
                    fontSize: 7, fontWeight: 600, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 3, flexShrink: 0,
                    color: sym.kind === 'fn' ? '#cba6f7' : sym.kind === 'class' ? '#f9e2af' : '#89b4fa',
                    background: sym.kind === 'fn' ? '#cba6f712' : sym.kind === 'class' ? '#f9e2af12' : '#89b4fa12',
                  }}>{sym.kind === 'fn' ? 'F' : sym.kind === 'class' ? 'C' : 'V'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{sym.name}</span>
                  <span style={{ fontSize: 7, color: '#444', flexShrink: 0 }}>{sym.line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings sidebar */}
        {sidebarMode === 'settings' && (
          <div onMouseDown={stop} style={{
            width: explorerW + 10, background: '#181825', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'auto'
          }}>
            <div style={{ padding: '6px 10px', fontSize: 8, color: '#555', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #ffffff06' }}>
              Settings
            </div>
            <div style={{ padding: '4px 0' }}>
              {[
                { label: 'Word Wrap', val: wordWrap, set: setWordWrap },
                { label: 'Minimap', val: showMinimap, set: setShowMinimap },
                { label: 'Bracket Colors', val: showBracketColors, set: setShowBracketColors },
                { label: 'Indent Rainbow', val: showIndentRainbow, set: setShowIndentRainbow },
                { label: 'Color Decorators', val: showColorDecorators, set: setShowColorDecorators },
                { label: 'Line Numbers', val: showLineNumbers, set: setShowLineNumbers },
                { label: 'Auto Save on Run', val: autoSave, set: setAutoSave },
              ].map(opt => (
                <div key={opt.label}
                  onClick={() => opt.set(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                    cursor: 'pointer', fontSize: 8, color: '#a6adc8', userSelect: 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{
                    width: 14, height: 8, borderRadius: 4, flexShrink: 0,
                    background: opt.val ? '#cba6f7' : '#333',
                    position: 'relative', transition: 'background .2s',
                  }}>
                    <span style={{
                      position: 'absolute', width: 6, height: 6, borderRadius: 3,
                      background: '#fff', top: 1, transition: 'left .2s',
                      left: opt.val ? 7 : 1,
                    }} />
                  </span>
                  <span>{opt.label}</span>
                </div>
              ))}
              <div style={{ height: 1, background: '#ffffff06', margin: '4px 0' }} />
              <div style={{ padding: '4px 10px', fontSize: 8, color: '#555' }}>
                Zoom: {Math.round(editorZoom * 100)}%
                <span onClick={() => setEditorZoom(1)} style={{ color: '#cba6f7', cursor: 'pointer', marginLeft: 6 }}>Reset</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', fontSize: 8, color: '#555', gap: 4 }}>
                <span>Tab Size:</span>
                {[2, 4].map(sz => (
                  <span key={sz} onClick={() => setTabSize(sz)}
                    style={{ padding: '1px 5px', borderRadius: 3, cursor: 'pointer', fontSize: 8,
                      background: tabSize === sz ? '#cba6f720' : '#ffffff06',
                      color: tabSize === sz ? '#cba6f7' : '#555',
                    }}>{sz}</span>
                ))}
              </div>
              <div style={{ padding: '4px 10px', fontSize: 8, color: '#555' }}>
                Snippets: {Object.keys(SNIPPETS).join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* Explorer resize handle */}
        {sidebarMode === 'files' && <div
          onMouseDown={e => {
            e.preventDefault(); e.stopPropagation();
            explorerDrag.current = { startX: e.clientX, startW: explorerW };
            const onMove = ev => {
              const dx = ev.clientX - explorerDrag.current.startX;
              setExplorerW(Math.max(80, Math.min(250, explorerDrag.current.startW + dx)));
            };
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); explorerDrag.current = null; };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
          style={{ width: 3, cursor: 'col-resize', background: 'transparent', flexShrink: 0, position: 'relative', zIndex: 5 }}
          onMouseEnter={e => e.currentTarget.style.background = '#cba6f740'}
          onMouseLeave={e => { if (!explorerDrag.current) e.currentTarget.style.background = 'transparent'; }}
        />}

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ffffff08', background: '#16162a', flexShrink: 0, overflow: 'auto' }}>
            {openTabs.map(path => {
              const name = path.split('/').pop();
              const isActive = path === activeFile;
              const isRO = !editFiles.hasOwnProperty(path);
              const isModified = !isRO && editFiles[path] !== initFiles[path];
              return (
                <div key={path} onClick={() => { setActiveFile(path); setTabCtx(null); }}
                  onMouseDown={e => { stop(e); if (e.button === 1) { e.preventDefault(); closeTab(path, e); } }}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setTabCtx({ path, x: e.clientX, y: e.clientY }); }}
                  draggable onDragStart={() => setDragTab(path)} onDragEnd={() => { setDragTab(null); setDragOverTab(null); }}
                  onDragOver={e => { e.preventDefault(); setDragOverTab(path); }}
                  onDrop={() => {
                    if (dragTab && dragTab !== path) {
                      setOpenTabs(prev => {
                        const next = prev.filter(t => t !== dragTab);
                        const idx = next.indexOf(path);
                        next.splice(idx, 0, dragTab);
                        return next;
                      });
                    }
                    setDragTab(null); setDragOverTab(null);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    fontSize: fs(9), color: isActive ? '#cdd6f4' : '#555',
                    background: isActive ? '#1e1e2e' : 'transparent',
                    cursor: 'pointer', borderRight: '1px solid #ffffff06',
                    position: 'relative', whiteSpace: 'nowrap',
                    borderLeft: dragOverTab === path && dragTab !== path ? '2px solid #cba6f7' : '2px solid transparent',
                    opacity: dragTab === path ? .4 : 1,
                  }}>
                  <span style={{ fontSize: pinnedTabs.has(path) ? 6 : (FICONS[name] ? 8 : 6), color: FCOLORS[name] || (path.startsWith('user/') ? '#cba6f7' : '#555'), lineHeight: 1, width: 12, textAlign: 'center', flexShrink: 0 }}>{pinnedTabs.has(path) ? '\uD83D\uDCCC' : (FICONS[name] || 'JS')}</span>
                  <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: pinnedTabs.has(path) ? 'italic' : 'normal' }}>{name}</span>
                  {isRO && <span style={{ fontSize: 7, color: '#555', opacity: .5 }}>ro</span>}
                  {pinnedTabs.has(path) ? null : openTabs.length > 1 ? (
                    <span onClick={(e) => closeTab(path, e)}
                      onMouseEnter={() => setHoverTab(path)}
                      onMouseLeave={() => setHoverTab(null)}
                      style={{ fontSize: isModified && hoverTab !== path ? 8 : 10, color: isModified && hoverTab !== path ? '#f9e2af' : '#555', cursor: 'pointer', marginLeft: 2, lineHeight: 1, width: 10, textAlign: 'center' }}
                      title={isModified ? 'Modified - click to close' : 'Close'}>{isModified && hoverTab !== path ? '\u25CF' : '\u00D7'}</span>
                  ) : isModified ? (
                    <span style={{ fontSize: 8, color: '#f9e2af', lineHeight: 1, marginLeft: 2 }} title="Modified">{'\u25CF'}</span>
                  ) : null}
                  {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#cba6f7' }} />}
                </div>
              );
            })}
          </div>

          {/* Tab context menu */}
          {tabCtx && (
            <div onMouseDown={stop} onClick={() => setTabCtx(null)} style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 25,
            }}>
              <div style={{
                position: 'absolute', left: tabCtx.x, top: tabCtx.y,
                background: '#181825', border: '1px solid #ffffff15', borderRadius: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,.5)', minWidth: 140, overflow: 'hidden', zIndex: 26,
              }}>
                {[
                  { label: pinnedTabs.has(tabCtx.path) ? 'Unpin Tab' : 'Pin Tab', action: () => {
                    setPinnedTabs(prev => { const n = new Set(prev); if (n.has(tabCtx.path)) n.delete(tabCtx.path); else n.add(tabCtx.path); return n; });
                  }},
                  null,
                  { label: 'Close', action: () => closeTab(tabCtx.path) },
                  { label: 'Close Others', action: () => { setOpenTabs(prev => prev.filter(t => t === tabCtx.path || pinnedTabs.has(t))); setActiveFile(tabCtx.path); } },
                  { label: 'Close to the Right', action: () => { const idx = openTabs.indexOf(tabCtx.path); setOpenTabs(prev => prev.filter((t, i) => i <= idx || pinnedTabs.has(t))); if (!openTabs.slice(0, openTabs.indexOf(tabCtx.path) + 1).includes(activeFile)) setActiveFile(tabCtx.path); } },
                  { label: 'Close All Unpinned', action: () => { const pinned = openTabs.filter(t => pinnedTabs.has(t)); setOpenTabs(pinned.length ? pinned : ['src/main.js']); if (!pinnedTabs.has(activeFile)) setActiveFile(pinned[0] || 'src/main.js'); } },
                  null,
                  { label: 'Copy Path', action: () => { navigator.clipboard?.writeText(tabCtx.path); showToast('Path copied!', 'info'); } },
                  { label: 'Copy Name', action: () => { navigator.clipboard?.writeText(tabCtx.path.split('/').pop()); showToast('Name copied!', 'info'); } },
                ].map((item, i) => item === null ? (
                  <div key={`sep${i}`} style={{ height: 1, background: '#ffffff08', margin: '2px 0' }} />
                ) : (
                  <div key={item.label} onClick={e => { e.stopPropagation(); item.action(); setTabCtx(null); }}
                    style={{ padding: '4px 10px', fontSize: 9, color: '#a6adc8', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '2px 10px', background: '#1a1a2e', borderBottom: '1px solid #ffffff06', flexShrink: 0, gap: 4, position: 'relative' }}
            onClick={() => setBreadcrumbDrop(null)}>
            {activeFile.split('/').map((part, i, arr) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ fontSize: 7, color: '#444' }}>{'\u203A'}</span>}
                <span style={{ fontSize: fs(8), color: breadcrumbDrop === i ? '#cba6f7' : i === arr.length - 1 ? '#cdd6f4' : '#666', cursor: 'pointer', position: 'relative', padding: '1px 2px', borderRadius: 3, background: breadcrumbDrop === i ? '#cba6f712' : 'transparent' }}
                  onClick={e => {
                    e.stopPropagation();
                    if (i === arr.length - 1) {
                      // Last segment: show sibling files in same folder
                      setBreadcrumbDrop(breadcrumbDrop === i ? null : i);
                    } else {
                      // Folder segment: show children
                      setBreadcrumbDrop(breadcrumbDrop === i ? null : i);
                      setOpenFolders(prev => ({ ...prev, [part]: true }));
                    }
                  }}
                  onMouseDown={stop}>{part}
                  {breadcrumbDrop === i && (() => {
                    const parts = arr.slice(0, i + 1);
                    const isFolder = i < arr.length - 1;
                    const folderName = isFolder ? part : arr.slice(0, -1).join('/');
                    const folder = TREE.find(f => f.name === (isFolder ? part : arr[0]));
                    const items = folder ? folder.children : [];
                    return (
                      <div onMouseDown={stop} onClick={e => e.stopPropagation()} style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: 2, zIndex: 20,
                        background: '#181825', border: '1px solid #ffffff15', borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,.5)', minWidth: 120, maxHeight: 150, overflow: 'auto',
                      }}>
                        {items.map(f => (
                          <div key={f.path} onClick={() => { openFile(f.path); setBreadcrumbDrop(null); }}
                            style={{
                              padding: '3px 10px', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                              color: f.path === activeFile ? '#cba6f7' : '#a6adc8',
                              background: f.path === activeFile ? '#cba6f710' : 'transparent',
                            }}
                            onMouseEnter={e => { if (f.path !== activeFile) e.currentTarget.style.background = '#ffffff08'; }}
                            onMouseLeave={e => { if (f.path !== activeFile) e.currentTarget.style.background = 'transparent'; }}>
                            <span style={{ fontSize: 5, color: FCOLORS[f.name] || '#555' }}>{'\u25CF'}</span>
                            {f.name}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </span>
              </React.Fragment>
            ))}
            {currentScope && <>
              <span style={{ fontSize: 7, color: '#444' }}>{'\u203A'}</span>
              <span style={{ fontSize: fs(8), color: '#cba6f7', opacity: .7 }}>{currentScope}()</span>
            </>}
            {readonly && <span style={{ fontSize: 7, color: '#f9e2af', opacity: .4, marginLeft: 4 }}>read-only</span>}
          </div>

          {/* Search bar */}
          {searchOpen && (
            <div onMouseDown={stop} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px', background: '#181825', borderBottom: '1px solid #ffffff08', flexShrink: 0, alignItems: 'center' }}>
              <input ref={searchRef} value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSearchIdx(0); }}
                placeholder="Find..." spellCheck={false}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { setSearchOpen(false); taRef.current?.focus(); } if (e.key === 'Enter') { e.shiftKey ? jumpToMatch(-1) : jumpToMatch(1); } }}
                style={{ flex: 1, minWidth: 80, maxWidth: 140, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
              <span onClick={() => setSearchCase(c => !c)} style={{ fontSize: 7, color: searchCase ? '#cba6f7' : '#555', cursor: 'pointer', padding: '1px 3px', borderRadius: 2, background: searchCase ? '#cba6f718' : 'transparent', fontWeight: 600 }} title="Case sensitive">Aa</span>
              <span onClick={() => setSearchWholeWord(w => !w)} style={{ fontSize: 7, color: searchWholeWord ? '#cba6f7' : '#555', cursor: 'pointer', padding: '1px 3px', borderRadius: 2, background: searchWholeWord ? '#cba6f718' : 'transparent', fontWeight: 600, fontFamily: MONO }} title="Whole word">ab</span>
              <span onClick={() => setSearchRegex(r => !r)} style={{ fontSize: 7, color: searchRegex ? '#cba6f7' : '#555', cursor: 'pointer', padding: '1px 3px', borderRadius: 2, background: searchRegex ? '#cba6f718' : 'transparent', fontWeight: 600 }} title="Regex">.*</span>
              <span onClick={() => jumpToMatch(-1)} style={{ fontSize: 9, color: '#555', cursor: 'pointer', lineHeight: 1 }} title="Previous match">{'\u2191'}</span>
              <span onClick={() => jumpToMatch(1)} style={{ fontSize: 9, color: '#555', cursor: 'pointer', lineHeight: 1 }} title="Next match">{'\u2193'}</span>
              <span style={{ fontSize: 8, color: '#555' }}>{searchMatches.length ? `${searchIdx + 1}/${searchMatches.length}` : 'No results'}</span>
              <span onClick={() => setShowReplace(r => !r)} style={{ fontSize: 8, color: showReplace ? '#cba6f7' : '#555', cursor: 'pointer' }}>{showReplace ? '\u25BC' : '\u25B6'} Replace</span>
              <span onClick={() => { setSearchOpen(false); taRef.current?.focus(); }} style={{ fontSize: 9, color: '#555', cursor: 'pointer', lineHeight: 1 }}>{'\u00D7'}</span>
              {showReplace && (
                <div style={{ width: '100%', display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                  <input value={replaceWith} onChange={e => setReplaceWith(e.target.value)}
                    placeholder="Replace..." spellCheck={false}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setSearchOpen(false); }}
                    style={{ flex: 1, minWidth: 80, maxWidth: 140, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
                  <span onClick={replaceNext} style={{ fontSize: 8, color: '#89b4fa', cursor: 'pointer' }}>Replace</span>
                  <span onClick={replaceAll} style={{ fontSize: 8, color: '#89b4fa', cursor: 'pointer' }}>All</span>
                </div>
              )}
            </div>
          )}

          {/* Command palette */}
          {cmdOpen && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '10%', right: '10%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden', maxHeight: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #ffffff08', padding: '0 10px', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#cba6f7', flexShrink: 0 }}>{'\u2318'}</span>
                <input ref={cmdRef} value={cmdQuery} onChange={e => { setCmdQuery(e.target.value); setCmdIdx(0); }}
                  placeholder="Type a command or file..." spellCheck={false}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Escape') { setCmdOpen(false); taRef.current?.focus(); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); setCmdIdx(i => Math.min(i + 1, Math.min(commands.length, 12) - 1)); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setCmdIdx(i => Math.max(i - 1, 0)); }
                    if (e.key === 'Enter' && commands.length) { runCommand(commands[Math.min(cmdIdx, commands.length - 1)].key); }
                  }}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '6px 0', fontSize: 10, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
                {cmdQuery && <span onClick={() => { setCmdQuery(''); setCmdIdx(0); }} style={{ fontSize: 8, color: '#555', cursor: 'pointer' }}>{'\u2715'}</span>}
              </div>
              <div style={{ maxHeight: 210, overflow: 'auto' }}>
                {commands.slice(0, 12).map((c, ci) => {
                  const isFile = c.key.startsWith('file:');
                  return (
                    <div key={c.key} onClick={() => runCommand(c.key)}
                      onMouseEnter={() => setCmdIdx(ci)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '4px 10px', fontSize: 9,
                        color: ci === cmdIdx ? '#cdd6f4' : '#a6adc8', cursor: 'pointer', gap: 6,
                        background: ci === cmdIdx ? '#ffffff10' : 'transparent',
                      }}>
                      <span style={{ fontSize: 8, color: isFile ? '#89b4fa' : '#cba6f7', width: 12, textAlign: 'center', flexShrink: 0 }}>{isFile ? '\u2630' : '\u25B8'}</span>
                      <span style={{ flex: 1 }}>{c.label}</span>
                      {c.hint && <span style={{ fontSize: 7, color: '#555', background: '#ffffff08', padding: '1px 4px', borderRadius: 3 }}>{c.hint}</span>}
                    </div>
                  );
                })}
                {commands.length === 0 && <div style={{ padding: '8px 10px', fontSize: 9, color: '#555' }}>No matching commands</div>}
              </div>
            </div>
          )}

          {/* Surround with menu */}
          {surroundMenu && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '15%', right: '15%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden' }}>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #ffffff08', fontSize: 9, color: '#cba6f7', fontWeight: 600 }}>Surround with...</div>
              {[
                { label: 'if (...) { }', key: 'if', wrap: (sel, ind) => `${ind}if (condition) {\n${sel}\n${ind}}` },
                { label: 'if (...) { } else { }', key: 'ife', wrap: (sel, ind) => `${ind}if (condition) {\n${sel}\n${ind}} else {\n${ind}  \n${ind}}` },
                { label: 'for (...) { }', key: 'for', wrap: (sel, ind) => `${ind}for (let i = 0; i < length; i++) {\n${sel}\n${ind}}` },
                { label: 'while (...) { }', key: 'while', wrap: (sel, ind) => `${ind}while (condition) {\n${sel}\n${ind}}` },
                { label: 'try { } catch { }', key: 'try', wrap: (sel, ind) => `${ind}try {\n${sel}\n${ind}} catch (e) {\n${ind}  console.error(e);\n${ind}}` },
                { label: 'function (...) { }', key: 'fn', wrap: (sel, ind) => `${ind}function name() {\n${sel}\n${ind}}` },
                { label: 'console.log( )', key: 'log', wrap: (sel) => `console.log(${sel.trim()})` },
                { label: '( ) => { }', key: 'arrow', wrap: (sel, ind) => `${ind}() => {\n${sel}\n${ind}}` },
                { label: 'async ( ) => { }', key: 'async', wrap: (sel, ind) => `${ind}async () => {\n${sel}\n${ind}}` },
                { label: '( )', key: 'paren', wrap: (sel) => `(${sel.trim()})` },
                { label: '[ ]', key: 'bracket', wrap: (sel) => `[${sel.trim()}]` },
                { label: '` ` (template)', key: 'template', wrap: (sel) => `\`${sel.trim()}\`` },
              ].map(item => (
                <div key={item.key} onClick={() => {
                  const { s: ss, en: se } = surroundMenu;
                  const selected = code.substring(ss, se);
                  // Detect indent of selected lines
                  const lineStart = code.lastIndexOf('\n', ss - 1) + 1;
                  const indent = code.substring(lineStart, ss).match(/^(\s*)/)[0];
                  // Re-indent selected code by adding one level
                  const tab = ' '.repeat(tabSize);
                  const reindented = selected.split('\n').map(l => tab + l).join('\n');
                  const inlineKeys = ['paren', 'bracket', 'log', 'template'];
                  const wrapped = inlineKeys.includes(item.key) ? item.wrap(selected) : item.wrap(reindented, indent);
                  const nc = code.substring(0, ss) + wrapped + code.substring(se);
                  setCode(nc);
                  setSurroundMenu(null);
                  showToast(`Surrounded with ${item.label}`, 'info');
                  setTimeout(() => taRef.current?.focus(), 0);
                }}
                  style={{ padding: '4px 10px', fontSize: 9, color: '#a6adc8', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {item.label}
                </div>
              ))}
            </div>
          )}

          {/* Go to line dialog */}
          {gotoOpen && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '20%', right: '20%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#555' }}>Go to line:</span>
              <input ref={gotoRef} value={gotoVal} onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  setGotoVal(v);
                  // Live preview: scroll to the line as you type
                  const ln = parseInt(v);
                  if (ln >= 1 && ln <= lines.length) {
                    setActiveLn(ln);
                    scrollToLine(ln);
                  }
                }}
                placeholder={`1-${lines.length}`} spellCheck={false}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Escape') { setGotoOpen(false); taRef.current?.focus(); }
                  if (e.key === 'Enter') {
                    const ln = parseInt(gotoVal);
                    if (ln >= 1 && ln <= lines.length) goToLine(ln);
                    setGotoOpen(false);
                  }
                }}
                style={{ flex: 1, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
              {gotoVal && parseInt(gotoVal) >= 1 && parseInt(gotoVal) <= lines.length && (
                <span style={{ fontSize: 7, color: '#555', fontFamily: MONO, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {lines[parseInt(gotoVal) - 1]?.trim().substring(0, 30)}
                </span>
              )}
            </div>
          )}

          {/* Recent files quick open (Cmd+E) */}
          {recentOpen && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '10%', right: '10%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden', maxHeight: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #ffffff08' }}>
                <span style={{ fontSize: 9, color: '#cba6f7', fontWeight: 600 }}>Recent Files</span>
                <span style={{ fontSize: 8, color: '#555', marginLeft: 8 }}>{'\u2318E'}</span>
                <span onClick={() => setRecentOpen(false)} style={{ marginLeft: 'auto', fontSize: 9, color: '#555', cursor: 'pointer' }}>{'\u00D7'}</span>
              </div>
              <div style={{ maxHeight: 150, overflow: 'auto' }}>
                {recentFiles.map((path, i) => (
                  <div key={path} onClick={() => { openFile(path); setRecentOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                      fontSize: 9, cursor: 'pointer',
                      color: path === activeFile ? '#cdd6f4' : '#a6adc8',
                      background: path === activeFile ? '#ffffff08' : 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = path === activeFile ? '#ffffff08' : 'transparent'}>
                    <span style={{ fontSize: 6, color: FCOLORS[path.split('/').pop()] || '#555' }}>{'\u25CF'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                    {i === 0 && <span style={{ fontSize: 7, color: '#cba6f7', opacity: .5 }}>current</span>}
                  </div>
                ))}
                {recentFiles.length === 0 && (
                  <div style={{ fontSize: 8, color: '#555', padding: '8px', textAlign: 'center' }}>No recent files</div>
                )}
              </div>
            </div>
          )}

          {/* Keyboard shortcuts help */}
          {helpOpen && (() => {
            const helpQuery = helpFilterRef.current.q || '';
            const q = helpQuery.toLowerCase();
            return (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '5%', right: '5%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden', maxHeight: 320 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #ffffff08', gap: 6 }}>
                <span style={{ fontSize: 9, color: '#cba6f7', fontWeight: 600, flexShrink: 0 }}>Keyboard Shortcuts</span>
                <input ref={helpSearchRef} value={helpQuery} onChange={e => { helpFilterRef.current.q = e.target.value; setHelpOpen(true); }}
                  placeholder="Filter..." spellCheck={false}
                  onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { helpFilterRef.current.q = ''; setHelpOpen(false); taRef.current?.focus(); } }}
                  style={{ flex: 1, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '2px 6px', fontSize: 8, color: '#cdd6f4', outline: 'none', fontFamily: MONO, minWidth: 40 }} />
                <span onClick={() => { helpFilterRef.current.q = ''; setHelpOpen(false); }} style={{ fontSize: 9, color: '#555', cursor: 'pointer' }}>{'\u00D7'}</span>
              </div>
              <div style={{ padding: '4px 10px', maxHeight: 265, overflow: 'auto' }}>
                {SHORTCUTS.map(group => {
                  const filtered = q ? group.items.filter(([key, desc]) => key.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) : group.items;
                  if (!filtered.length) return null;
                  return (
                    <div key={group.cat}>
                      <div style={{ fontSize: 7, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 0 2px', borderBottom: '1px solid #ffffff06', marginTop: 2 }}>{group.cat}</div>
                      {filtered.map(([key, desc]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '2px 0', fontSize: 9 }}>
                          <span style={{ color: '#cba6f7', minWidth: 110, fontWeight: 500, fontSize: 8 }}>{key}</span>
                          <span style={{ color: '#a6adc8' }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {/* Rename symbol dialog */}
          {renameSymbol && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '15%', right: '15%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', padding: '6px 10px' }}>
              <div style={{ fontSize: 8, color: '#cba6f7', fontWeight: 600, marginBottom: 4 }}>
                Rename "{renameSymbol.word}" ({code.split(renameSymbol.word).length - 1} occurrences)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input ref={renameSymbolRef} value={renameSymbol.newName}
                  onChange={e => setRenameSymbol(prev => ({ ...prev, newName: e.target.value }))}
                  spellCheck={false} autoFocus
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Escape') { setRenameSymbol(null); taRef.current?.focus(); }
                    if (e.key === 'Enter' && renameSymbol.newName.trim() && renameSymbol.newName !== renameSymbol.word) {
                      // Replace all occurrences as whole words
                      const rx = new RegExp('\\b' + renameSymbol.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
                      const nc = code.replace(rx, renameSymbol.newName);
                      if (nc !== code) {
                        setCode(nc);
                        const count = code.split(renameSymbol.word).length - 1;
                        showToast(`Renamed ${count} occurrences`, 'success');
                      }
                      setRenameSymbol(null); taRef.current?.focus();
                    }
                  }}
                  style={{ flex: 1, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '3px 6px', fontSize: 10, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
                <span onClick={() => setRenameSymbol(null)} style={{ fontSize: 9, color: '#555', cursor: 'pointer' }}>{'\u00D7'}</span>
              </div>
            </div>
          )}

          {/* Go to Symbol */}
          {symbolOpen && (() => {
            const q = symbolQuery.toLowerCase();
            const filtered = q ? outlineSymbols.filter(s => s.name.toLowerCase().includes(q)) : outlineSymbols;
            return (
              <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '10%', right: '10%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden', maxHeight: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #ffffff08', padding: '0 10px', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#cba6f7', flexShrink: 0 }}>@</span>
                  <input ref={symbolRef} value={symbolQuery} onChange={e => { setSymbolQuery(e.target.value); setSymbolIdx(0); }}
                    placeholder="Go to symbol..." spellCheck={false}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Escape') { setSymbolOpen(false); taRef.current?.focus(); }
                      if (e.key === 'ArrowDown') { e.preventDefault(); setSymbolIdx(i => Math.min(i + 1, filtered.length - 1)); }
                      if (e.key === 'ArrowUp') { e.preventDefault(); setSymbolIdx(i => Math.max(i - 1, 0)); }
                      if (e.key === 'Enter' && filtered.length) {
                        const sym = filtered[Math.min(symbolIdx, filtered.length - 1)];
                        goToLine(sym.line); setSymbolOpen(false);
                      }
                    }}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '6px 0', fontSize: 10, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
                </div>
                <div style={{ maxHeight: 210, overflow: 'auto' }}>
                  {filtered.slice(0, 15).map((sym, i) => (
                    <div key={`${sym.name}-${sym.line}`} onClick={() => {
                      goToLine(sym.line); setSymbolOpen(false);
                    }}
                      onMouseEnter={() => setSymbolIdx(i)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '4px 10px', fontSize: 9, gap: 6,
                        color: i === symbolIdx ? '#cdd6f4' : '#a6adc8', cursor: 'pointer',
                        background: i === symbolIdx ? '#ffffff10' : 'transparent',
                      }}>
                      <span style={{
                        width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 3, fontSize: 7, fontWeight: 700, flexShrink: 0,
                        background: sym.kind === 'fn' ? '#cba6f712' : sym.kind === 'class' ? '#f9e2af12' : '#89b4fa12',
                        color: sym.kind === 'fn' ? '#cba6f7' : sym.kind === 'class' ? '#f9e2af' : '#89b4fa',
                      }}>{sym.kind === 'fn' ? 'F' : sym.kind === 'class' ? 'C' : 'V'}</span>
                      <span style={{ flex: 1, fontWeight: i === symbolIdx ? 600 : 400 }}>{sym.name}</span>
                      <span style={{ fontSize: 7, color: '#555' }}>:{sym.line}</span>
                    </div>
                  ))}
                  {filtered.length === 0 && <div style={{ padding: '8px 10px', fontSize: 9, color: '#555' }}>No symbols found</div>}
                </div>
              </div>
            );
          })()}

          {/* Diff view */}
          {diffOpen && diffLines && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 24, zIndex: 18, background: '#1e1e2e', overflow: 'auto', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px 6px', borderBottom: '1px solid #ffffff08', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: '#cba6f7', fontWeight: 600 }}>Changes: {activeFile}</span>
                <span style={{ fontSize: 8, color: '#555', marginLeft: 8 }}>
                  +{diffLines.filter(d => d.type === 'added').length} -{diffLines.filter(d => d.type === 'removed').length} ~{diffLines.filter(d => d.type === 'changed').length}
                </span>
                <span onClick={() => setDiffOpen(false)} style={{ marginLeft: 'auto', fontSize: 9, color: '#555', cursor: 'pointer' }}>{'\u00D7'}</span>
              </div>
              {diffLines.map((d, i) => (
                <div key={i} style={{
                  fontSize: fs(9), lineHeight: lh, fontFamily: MONO, whiteSpace: 'pre',
                  padding: '0 10px 0 28px', position: 'relative',
                  background: d.type === 'added' ? '#27c93f08' : d.type === 'removed' ? '#f38ba808' : d.type === 'changed' ? '#f9e2af08' : 'transparent',
                  color: d.type === 'removed' ? '#f38ba880' : '#a6adc8',
                  textDecoration: d.type === 'removed' ? 'line-through' : 'none',
                }}>
                  <span style={{ position: 'absolute', left: 6, color: d.type === 'added' ? '#27c93f' : d.type === 'removed' ? '#f38ba8' : d.type === 'changed' ? '#f9e2af' : '#444', fontSize: 8, width: 16, textAlign: 'right' }}>
                    {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : d.type === 'changed' ? '~' : ''}{i + 1}
                  </span>
                  {d.type === 'changed' ? <><span style={{ color: '#f38ba860', textDecoration: 'line-through' }}>{d.oldText}</span>{'\n'}<span style={{ color: '#27c93f90' }}>{d.text}</span></> : (d.text || ' ')}
                </div>
              ))}
            </div>
          )}
          {diffOpen && !diffLines && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 24, zIndex: 18, background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 9, color: '#27c93f' }}>{'\u2713'} No changes</span>
              <span style={{ fontSize: 8, color: '#555' }}>File matches original</span>
              <span onClick={() => setDiffOpen(false)} style={{ fontSize: 8, color: '#cba6f7', cursor: 'pointer', marginTop: 4 }}>Close</span>
            </div>
          )}

          {/* Welcome tab */}
          {!welcomeDismissed && activeFile === 'src/main.js' && !output && (
            <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 24, zIndex: 12, background: '#1e1e2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#cba6f7', letterSpacing: '-.02em' }}>Tasteprint IDE</div>
              <div style={{ fontSize: 9, color: '#555', maxWidth: 260, textAlign: 'center', lineHeight: '1.5' }}>
                Code your designs. The <span style={{ color: '#cba6f7' }}>tp</span> API gives you full control over the canvas — add components, change themes, and automate layouts.
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[
                  { label: '\u25B6 Run main.js', action: () => { setWelcomeDismissed(true); runCode(); }, color: '#27c93f' },
                  { label: 'Open Playground', action: () => { setWelcomeDismissed(true); openFile('src/playground.js'); }, color: '#f9e2af' },
                  { label: 'API Docs', action: () => { setWelcomeDismissed(true); openFile('docs/api.js'); }, color: '#89b4fa' },
                ].map(b => (
                  <button key={b.label} onClick={b.action} onMouseDown={stop}
                    style={{
                      background: b.color + '18', color: b.color, border: `1px solid ${b.color}30`,
                      borderRadius: 6, padding: '4px 12px', fontSize: 9, fontWeight: 600,
                      cursor: 'pointer', fontFamily: MONO, transition: 'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = b.color + '30'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = b.color + '18'; }}
                  >{b.label}</button>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 8, color: '#555' }}>
                {[
                  ['\u2318+Enter', 'Run code'],
                  ['\u2318+P', 'Command palette'],
                  ['\u2318+F', 'Find in file'],
                  ['\u2318+K', 'All shortcuts'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: '#ffffff08', padding: '1px 5px', borderRadius: 3, fontSize: 7, color: '#888', minWidth: 60, textAlign: 'center', border: '1px solid #ffffff0a' }}>{key}</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
              <span onClick={() => setWelcomeDismissed(true)} onMouseDown={stop}
                style={{ fontSize: 8, color: '#444', cursor: 'pointer', marginTop: 8 }}>Dismiss</span>
            </div>
          )}

          {/* Editor + Terminal split */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Code editor */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative', outline: editorFocused ? '1px solid #cba6f720' : 'none', outlineOffset: -1, transition: 'outline-color .2s' }}>
              {/* Sticky scroll — show enclosing function/block when scrolled */}
              {scrollTop > 50 && (() => {
                const topVisibleLine = Math.floor(scrollTop / Math.round(16 * zf));
                // Find the enclosing function for the top visible line
                for (let i = topVisibleLine; i >= 0; i--) {
                  const l = lines[i];
                  if (l && /(?:function\s+\w|(?:const|let|var)\s+\w+\s*=\s*(?:\(|function|async|\w+\s*=>)|class\s+\w|(?:if|for|while)\s*\()/.test(l)) {
                    const endRange = foldableRanges[i];
                    if (endRange !== undefined && endRange > topVisibleLine) {
                      const gutterW = showLineNumbers ? (lines.length >= 1000 ? 48 : lines.length >= 100 ? 42 : 36) : 0;
                      return (
                        <div onClick={() => {
                          setActiveLn(i + 1); setCursor({ ln: i + 1, col: 1 });
                          const pos = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                          if (taRef.current) { taRef.current.scrollTop = i * Math.round(16 * zf); taRef.current.selectionStart = taRef.current.selectionEnd = pos; }
                        }} style={{
                          position: 'absolute', top: 0, left: gutterW + 1, right: 0, zIndex: 5,
                          background: '#1e1e2eee', borderBottom: '1px solid #ffffff10',
                          padding: '2px 8px', fontSize: fs(9), lineHeight: lh,
                          fontFamily: MONO, cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          <HighlightLine text={l.trimStart()} />
                        </div>
                      );
                    }
                    break;
                  }
                }
                return null;
              })()}
              {/* Scroll shadows */}
              {scrollTop > 10 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: 'linear-gradient(to bottom, #1e1e2e, transparent)', zIndex: 4, pointerEvents: 'none' }} />}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12, background: 'linear-gradient(to top, #1e1e2e, transparent)', zIndex: 4, pointerEvents: 'none' }} />
              {/* Line numbers with fold arrows */}
              {showLineNumbers && (() => {
                const gutterW = lines.length >= 1000 ? 48 : lines.length >= 100 ? 42 : 36;
                // Compute line change indicators (modified/added vs original)
                const lineChanges = {};
                const origContent = initFiles[activeFile];
                if (origContent !== undefined && origContent !== code) {
                  const origLines = origContent.split('\n');
                  for (let li = 0; li < lines.length; li++) {
                    if (li >= origLines.length) lineChanges[li] = 'added';
                    else if (lines[li] !== origLines[li]) lineChanges[li] = 'modified';
                  }
                }
                // Compute selection range for gutter highlight
                const selGutter = {};
                const el = taRef.current;
                if (el && el.selectionStart !== el.selectionEnd) {
                  const ss = Math.min(el.selectionStart, el.selectionEnd);
                  const se = Math.max(el.selectionStart, el.selectionEnd);
                  const sl1 = code.substring(0, ss).split('\n').length;
                  const sl2 = code.substring(0, se).split('\n').length;
                  for (let gl = sl1; gl <= sl2; gl++) selGutter[gl] = true;
                }
                return (
                  <div ref={lnRef} style={{
                    padding: '8px 0', width: gutterW, textAlign: 'right', userSelect: 'none',
                    borderRight: '1px solid #ffffff08', background: '#16162a', flexShrink: 0, overflow: 'hidden'
                  }}>
                    <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                      {visibleLines.map((i) => {
                        const isBracketLine = matchBracket && (
                          code.substring(0, matchBracket[0]).split('\n').length === i + 1 ||
                          code.substring(0, matchBracket[1]).split('\n').length === i + 1
                        );
                        const isInSel = selGutter[i + 1];
                        const isFoldable = foldableRanges[i] !== undefined;
                        const isFolded = foldedLines.has(i);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            {/* Fold arrow */}
                            <span
                              onClick={e => { e.stopPropagation(); if (isFoldable) toggleFold(i); }}
                              style={{
                                width: 10, fontSize: 7, textAlign: 'center', flexShrink: 0,
                                color: isFoldable ? (isFolded ? '#cba6f7' : '#555') : 'transparent',
                                cursor: isFoldable ? 'pointer' : 'default',
                                lineHeight: lh, transition: 'color .15s',
                              }}
                              onMouseEnter={e => { if (isFoldable) e.currentTarget.style.color = '#cba6f7'; }}
                              onMouseLeave={e => { if (isFoldable) e.currentTarget.style.color = isFolded ? '#cba6f7' : '#555'; }}
                            >{isFoldable ? (isFolded ? '\u25B8' : '\u25BE') : ' '}</span>
                            <span
                              onMouseDown={e => {
                                e.preventDefault(); e.stopPropagation();
                                const startLine = i;
                                const lineStart = code.split('\n').slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                                const lineEnd = lineStart + lines[i].length;
                                setActiveLn(i + 1); setCursor({ ln: i + 1, col: 1 });
                                setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = lineStart; el.selectionEnd = lineEnd; el.focus(); } }, 0);
                                // Drag to select multiple lines
                                const onMove = ev => {
                                  const lineH = Math.round(16 * zf);
                                  const gutter = lnRef.current;
                                  if (!gutter) return;
                                  const rect = gutter.getBoundingClientRect();
                                  const relY = ev.clientY - rect.top + scrollTop - 8;
                                  const hoverLine = Math.max(0, Math.min(lines.length - 1, Math.floor(relY / lineH)));
                                  const fromLine = Math.min(startLine, hoverLine);
                                  const toLine = Math.max(startLine, hoverLine);
                                  const selStart = code.split('\n').slice(0, fromLine).join('\n').length + (fromLine > 0 ? 1 : 0);
                                  const selEnd = code.split('\n').slice(0, toLine).join('\n').length + (toLine > 0 ? 1 : 0) + lines[toLine].length;
                                  const el = taRef.current;
                                  if (el) { el.selectionStart = selStart; el.selectionEnd = selEnd; el.focus(); }
                                };
                                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                                document.addEventListener('mousemove', onMove);
                                document.addEventListener('mouseup', onUp);
                              }}
                              style={{
                                fontSize: fs(9), lineHeight: lh, cursor: 'pointer', flex: 1,
                                color: i + 1 === activeLn ? '#cdd6f4' : isBracketLine ? '#cba6f7' : output?.errLn === i + 1 ? '#f38ba8' : isInSel ? '#a6adc8' : '#444',
                                paddingRight: 4,
                                background: i + 1 === activeLn ? '#ffffff06' : output?.errLn === i + 1 ? '#f38ba810' : isInSel ? '#cba6f708' : 'transparent'
                              }}>{i + 1}</span>
                            {isFolded && <span style={{ position: 'absolute', right: -2, fontSize: 6, color: '#cba6f760' }}>...</span>}
                            {bookmarks.has(i + 1) && <span style={{ position: 'absolute', left: 0, top: 0, fontSize: 7, color: '#89b4fa', lineHeight: lh }}>{'\u25CF'}</span>}
                            {lineChanges[i] && <span style={{ position: 'absolute', right: -1, top: 2, bottom: 2, width: 2, borderRadius: 1, background: lineChanges[i] === 'added' ? '#27c93f' : '#89b4fa' }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Syntax highlight overlay */}
              {(() => {
                const gutterW = showLineNumbers ? (lines.length >= 1000 ? 48 : lines.length >= 100 ? 42 : 36) : 0;
                const charW = fs(6.1);
                // Precompute bracket match line positions
                const bracketLines = {};
                if (matchBracket) {
                  const ln1 = code.substring(0, matchBracket[0]).split('\n').length;
                  const col1 = matchBracket[0] - code.lastIndexOf('\n', matchBracket[0] - 1) - 1;
                  const ln2 = code.substring(0, matchBracket[1]).split('\n').length;
                  const col2 = matchBracket[1] - code.lastIndexOf('\n', matchBracket[1] - 1) - 1;
                  bracketLines[ln1] = col1;
                  bracketLines[ln2] = col2;
                }
                // Precompute bracket colorization depths per line
                // Precompute inline lint hints for error-lens display
                const lintMap = {};
                if (!readonly) {
                  lines.forEach((ll, li) => {
                    if (/^\s*\/\//.test(ll)) return;
                    if (/\bvar\b/.test(ll)) lintMap[li] = { msg: 'Prefer const/let', sev: 'warn' };
                    else if (/==(?!=)/.test(ll) && !/===/.test(ll)) lintMap[li] = { msg: 'Use === instead of ==', sev: 'warn' };
                    else if (/\beval\s*\(/.test(ll)) lintMap[li] = { msg: 'Avoid eval()', sev: 'warn' };
                    else if (/\bdebugger\b/.test(ll.trim())) lintMap[li] = { msg: 'Debugger statement', sev: 'warn' };
                    else if (/\balert\s*\(/.test(ll)) lintMap[li] = { msg: 'Avoid alert()', sev: 'warn' };
                  });
                }
                const bracketColorMap = {}; // { lineIdx: [{ col, color }] }
                let depth = 0;
                for (let li = 0; li < lines.length; li++) {
                  const entries = [];
                  for (let ci = 0; ci < lines[li].length; ci++) {
                    const ch = lines[li][ci];
                    if (ch === '(' || ch === '[' || ch === '{') {
                      entries.push({ col: ci, color: BRACKET_COLORS[depth % BRACKET_COLORS.length] });
                      depth++;
                    } else if (ch === ')' || ch === ']' || ch === '}') {
                      depth = Math.max(0, depth - 1);
                      entries.push({ col: ci, color: BRACKET_COLORS[depth % BRACKET_COLORS.length] });
                    }
                  }
                  if (entries.length) bracketColorMap[li] = entries;
                }
                return (
                  <div ref={hlRef} style={{ position: 'absolute', left: gutterW + 1, top: 0, right: 0, bottom: 0, padding: 8, pointerEvents: 'none', overflow: 'hidden' }}>
                    <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                    {visibleLines.map((i) => {
                      const l = lines[i];
                      const isFolded = foldedLines.has(i) && foldableRanges[i] !== undefined;
                      /* Indent guides */
                      const indent = l.match(/^(\s*)/)[0].length;
                      const INDENT_COLORS = ['#cba6f718', '#89b4fa18', '#a6e3a118', '#f9e2af18', '#fab38718', '#f38ba818'];
                      const guides = [];
                      for (let g = tabSize; g <= indent; g += tabSize) {
                        const depthIdx = Math.floor((g - tabSize) / tabSize);
                        guides.push(
                          <span key={`g${g}`} style={{
                            position: 'absolute', left: (g - 1) * charW, top: 0, bottom: 0, width: 1,
                            background: showIndentRainbow
                              ? (g === indent ? INDENT_COLORS[depthIdx % INDENT_COLORS.length].replace('18', '30') : INDENT_COLORS[depthIdx % INDENT_COLORS.length])
                              : (g === indent ? '#ffffff0a' : '#ffffff06')
                          }} />
                        );
                      }

                      /* Search match highlighting */
                      let searchHighlights = null;
                      if (searchOpen && searchTerm) {
                        const lineStart = i === 0 ? 0 : code.split('\n').slice(0, i).join('\n').length + 1;
                        const lineMatches = searchMatches.filter(m => m.pos >= lineStart && m.pos < lineStart + l.length);
                        if (lineMatches.length) {
                          const parts = [];
                          let cursor = 0, pidx = 0;
                          for (const m of lineMatches) {
                            const col = m.pos - lineStart;
                            if (col > cursor) parts.push(<span key={pidx++}><HighlightLine text={l.substring(cursor, col)} /></span>);
                            parts.push(<span key={pidx++} style={{ background: '#f9e2af40', borderRadius: 2, outline: '1px solid #f9e2af60' }}><HighlightLine text={l.substring(col, col + m.len)} /></span>);
                            cursor = col + m.len;
                          }
                          if (cursor < l.length) parts.push(<span key={pidx}><HighlightLine text={l.substring(cursor)} /></span>);
                          searchHighlights = parts;
                        }
                      }

                      /* Word occurrence highlight on this line — inline highlights */
                      const hasOccurrence = wordOccurrences.has(i + 1) && !searchHighlights;
                      let wordHighlights = null;
                      if (hasOccurrence && selectedWord) {
                        const parts = [];
                        let cur = 0, pidx = 0;
                        const rx = new RegExp(`\\b(${selectedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'g');
                        let wm;
                        while ((wm = rx.exec(l)) !== null) {
                          if (wm.index > cur) parts.push(<span key={pidx++}><HighlightLine text={l.substring(cur, wm.index)} /></span>);
                          parts.push(<span key={pidx++} style={{ background: '#cba6f725', borderRadius: 2, outline: '1px solid #cba6f740' }}><HighlightLine text={wm[0]} /></span>);
                          cur = wm.index + wm[0].length;
                        }
                        if (parts.length) {
                          if (cur < l.length) parts.push(<span key={pidx}><HighlightLine text={l.substring(cur)} /></span>);
                          wordHighlights = parts;
                        }
                      }

                      /* Bracket match indicator */
                      const bracketCol = bracketLines[i + 1];

                      return (
                        <div key={i} style={{
                          fontSize: fs(10), lineHeight: lh, whiteSpace: 'pre',
                          height: Math.round(16 * zf), position: 'relative',
                          background: i + 1 === activeLn ? '#ffffff08' : output?.errLn === i + 1 ? '#f38ba808' : hasOccurrence ? '#cba6f706' : 'transparent',
                          borderLeft: i + 1 === activeLn ? '2px solid #cba6f730' : '2px solid transparent',
                        }}>
                          {guides}
                          {searchHighlights || wordHighlights || <HighlightLine text={l} />}
                          {isFolded && (
                            <span onClick={() => toggleFold(i)} style={{
                              background: '#cba6f715', border: '1px solid #cba6f730', borderRadius: 3,
                              padding: '0 4px', fontSize: 8, color: '#cba6f7', cursor: 'pointer', marginLeft: 4,
                              pointerEvents: 'auto', position: 'relative', zIndex: 3,
                            }}>{`... ${foldableRanges[i] - i} lines`}</span>
                          )}
                          {/* Active scope guide line */}
                          {activeScope && i + 1 > activeScope.startLn && i + 1 < activeScope.endLn && (
                            <span style={{
                              position: 'absolute', left: activeScope.indent * charW + Math.floor(charW / 2), top: 0, bottom: 0,
                              width: 1, background: '#cba6f720', pointerEvents: 'none', zIndex: 1,
                            }} />
                          )}
                          {/* Bracket pair colorization */}
                          {showBracketColors && bracketColorMap[i]?.map((b, bi) => (
                            <span key={`bc${bi}`} style={{
                              position: 'absolute', left: b.col * charW, top: 0,
                              width: charW, height: '100%', color: b.color, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: fs(10), lineHeight: lh, fontFamily: MONO,
                              pointerEvents: 'none', zIndex: 2,
                            }}>{l[b.col]}</span>
                          ))}
                          {/* Inline color decorators */}
                          {showColorDecorators && (() => {
                            const hexMatches = [];
                            const rx = /#([0-9a-fA-F]{3,8})\b/g;
                            let hm;
                            while ((hm = rx.exec(l)) !== null) hexMatches.push({ col: hm.index, color: hm[0] });
                            return hexMatches.map((h, hi) => (
                              <span key={`cd${hi}`} style={{
                                position: 'absolute', left: (h.col - 1) * charW, top: '50%', transform: 'translateY(-50%)',
                                width: 6, height: 6, borderRadius: 2, border: '1px solid #ffffff30',
                                background: h.color, pointerEvents: 'none', zIndex: 2,
                              }} />
                            ));
                          })()}
                          {bracketCol !== undefined && (
                            <span style={{
                              position: 'absolute', left: bracketCol * charW, top: 0,
                              width: charW, height: '100%',
                              background: '#cba6f718', borderBottom: '1px solid #cba6f740'
                            }} />
                          )}
                          {output?.errLn === i + 1 && (<>
                            <span style={{
                              position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
                              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'2\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 1 Q1 0 2 1 Q3 2 4 1\' stroke=\'%23f38ba8\' fill=\'none\' stroke-width=\'0.8\'/%3E%3C/svg%3E")',
                              backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom',
                            }} />
                            {/* Error lens: inline error message */}
                            {output?.err && (
                              <span style={{
                                position: 'absolute', right: 8, top: 0, height: '100%',
                                display: 'flex', alignItems: 'center',
                                fontSize: 7, color: '#f38ba880', fontStyle: 'italic',
                                maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', pointerEvents: 'none',
                              }}>{output.err}</span>
                            )}
                          </>)}
                          {/* Inline lint warning (error lens style) */}
                          {lintMap[i] && output?.errLn !== i + 1 && (
                            <span style={{
                              position: 'absolute', right: 8, top: 0, height: '100%',
                              display: 'flex', alignItems: 'center',
                              fontSize: 7, color: '#f9e2af50', fontStyle: 'italic',
                              maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', pointerEvents: 'none',
                            }}>{lintMap[i].msg}</span>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })()}

              {/* Textarea */}
              <textarea
                ref={taRef} value={code}
                onChange={e => {
                  const val = e.target.value;
                  const pos = e.target.selectionStart;
                  setCode(val); updateCursor(e.target);
                  // Autocomplete trigger: check if cursor is after "tp."
                  const before = val.substring(0, pos);
                  const dotMatch = before.match(/tp\.(\w*)$/);
                  if (dotMatch) {
                    const partial = dotMatch[1].toLowerCase();
                    if (!partial) { setAcItems(TP_AC); setAcIdx(0); setAcOpen(true); }
                    else {
                      // Fuzzy match: prefix first, then contains
                      const prefix = TP_AC.filter(a => a.label.toLowerCase().startsWith(partial));
                      const contains = TP_AC.filter(a => !a.label.toLowerCase().startsWith(partial) && a.label.toLowerCase().includes(partial));
                      const filtered = [...prefix, ...contains];
                      if (filtered.length) { setAcItems(filtered); setAcIdx(0); setAcOpen(true); }
                      else setAcOpen(false);
                    }
                  } else {
                    // Autocomplete: JS keywords + local identifiers from current file
                    const wordMatch = before.match(/\b(\w{2,})$/);
                    if (wordMatch && !before.match(/\.\w*$/)) {
                      const partial = wordMatch[1].toLowerCase();
                      const JS_KW = ['const','let','var','function','return','if','else','for','while','console','forEach','map','filter','reduce','length','push','splice','indexOf','includes','toString','parseInt','parseFloat','JSON','stringify','parse','Math','random','floor','ceil','round','setTimeout','setInterval','Promise','async','await','try','catch','throw','true','false','null','undefined'];
                      // Extract local identifiers from code
                      const localIds = new Set();
                      const idRx = /(?:const|let|var|function)\s+(\w+)/g;
                      let idM;
                      while ((idM = idRx.exec(val)) !== null) { if (idM[1].length >= 2) localIds.add(idM[1]); }
                      const locals = [...localIds].filter(id => id.toLowerCase().startsWith(partial) && id.toLowerCase() !== partial);
                      const kwFiltered = JS_KW.filter(k => k.toLowerCase().startsWith(partial) && k.toLowerCase() !== partial);
                      const combined = [
                        ...locals.map(id => ({ label: id, desc: 'local', insert: id.slice(partial.length) })),
                        ...kwFiltered.map(k => ({ label: k, desc: 'keyword', insert: k.slice(partial.length) })),
                      ].slice(0, 10);
                      if (combined.length) {
                        setAcItems(combined);
                        setAcIdx(0); setAcOpen(true);
                      } else setAcOpen(false);
                    } else {
                      setAcOpen(false);
                    }
                  }
                  // Parameter hints: detect if cursor is inside tp.method(...)
                  const beforePos = val.substring(0, pos);
                  const phMatch = beforePos.match(/tp\.(\w+)\(([^)]*$)/);
                  if (phMatch && PARAM_HINTS[phMatch[1]]) {
                    const params = PARAM_HINTS[phMatch[1]];
                    const argsSoFar = phMatch[2].split(',').length - 1;
                    setParamHint({ method: phMatch[1], params, activeParam: Math.min(argsSoFar, params.length - 1) });
                  } else {
                    setParamHint(null);
                  }
                }}
                onScroll={e => setScrollTop(e.target.scrollTop)}
                onMouseDown={e => { stop(e); setCtxMenu(null); }}
                onMouseUp={e => {
                  updateCursor(e.target);
                  const el = e.target;
                  const s = el.selectionStart, en = el.selectionEnd;
                  if (s !== en) {
                    const sel = code.substring(s, en).trim();
                    if (sel && /^\w+$/.test(sel)) setSelectedWord(sel);
                    else setSelectedWord('');
                  } else setSelectedWord('');
                }
                }
                onDoubleClick={e => {
                  // Auto-select word on double click and highlight occurrences
                  const el = e.target;
                  const s = el.selectionStart, en = el.selectionEnd;
                  if (s !== en) {
                    const sel = code.substring(s, en).trim();
                    if (sel && /^\w+$/.test(sel)) setSelectedWord(sel);
                  }
                }}
                onClick={e => {
                  updateCursor(e.target);
                  // Cmd+Click: peek definition for tp methods
                  if (e.metaKey || e.ctrlKey) {
                    const el = e.target;
                    const pos = el.selectionStart;
                    const before = code.substring(Math.max(0, pos - 30), pos);
                    const after = code.substring(pos, Math.min(code.length, pos + 30));
                    const m = (before + after).match(/tp\.(\w+)/);
                    if (m && TP_DOCS[m[1]]) {
                      setPeekDef({ method: m[1], line: activeLn });
                    }
                  }
                }}
                onContextMenu={e => {
                  e.preventDefault(); e.stopPropagation();
                  updateCursor(e.target);
                  const rect = e.target.getBoundingClientRect();
                  setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseMove={e => {
                  // Hover docs: detect tp.method under cursor position
                  clearTimeout(hoverTimer.current);
                  const el = e.target;
                  const rect = el.getBoundingClientRect();
                  const gutterW = lines.length >= 1000 ? 44 : lines.length >= 100 ? 38 : 32;
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top + el.scrollTop;
                  const lineH = Math.round(16 * zf);
                  const lineIdx = Math.floor(y / lineH);
                  const charW = fs(6.1);
                  const colIdx = Math.floor(x / charW);
                  if (lineIdx >= 0 && lineIdx < lines.length) {
                    const line = lines[lineIdx];
                    // Find tp.word at this column
                    const tpMatch = line.match(/tp\.(\w+)/g);
                    if (tpMatch) {
                      for (const m of tpMatch) {
                        const col = line.indexOf(m);
                        if (colIdx >= col && colIdx <= col + m.length) {
                          const method = m.substring(3);
                          if (TP_DOCS[method]) {
                            hoverTimer.current = setTimeout(() => {
                              setHoverDoc({ text: TP_DOCS[method], x: Math.min(x, 220), y: (lineIdx + 1) * lineH - el.scrollTop });
                            }, 400);
                            return;
                          }
                        }
                      }
                    }
                  }
                  setHoverDoc(null);
                }}
                onMouseLeave={() => { clearTimeout(hoverTimer.current); setHoverDoc(null); }}
                onPaste={e => {
                  if (readonly) return;
                  const text = e.clipboardData?.getData('text');
                  if (!text || !text.includes('\n')) return; // single-line paste handled natively
                  e.preventDefault();
                  const el = e.target;
                  const s = el.selectionStart, en = el.selectionEnd;
                  // Detect current indent level
                  const lineStart = code.lastIndexOf('\n', s - 1) + 1;
                  const currentIndent = code.substring(lineStart, s).match(/^(\s*)/)[0];
                  // Re-indent pasted text to match context
                  const pastedLines = text.split('\n');
                  const pasteIndent = pastedLines[0].match(/^(\s*)/)[0];
                  const reindented = pastedLines.map((l, idx) => {
                    if (idx === 0) return l.trimStart(); // first line: just trim leading space, it joins inline
                    const stripped = l.startsWith(pasteIndent) ? l.slice(pasteIndent.length) : l.trimStart();
                    return currentIndent + stripped;
                  }).join('\n');
                  const nc = code.substring(0, s) + reindented + code.substring(en);
                  setCode(nc);
                  const newPos = s + reindented.length;
                  setTimeout(() => { el.selectionStart = el.selectionEnd = newPos; }, 0);
                }}
                onFocus={() => { setEditorFocused(true); if (!welcomeDismissed) setWelcomeDismissed(true); }}
                onBlur={() => setEditorFocused(false)}
                onKeyUp={e => updateCursor(e.target)} onKeyDown={handleKey}
                readOnly={readonly} spellCheck={false}
                style={{
                  flex: 1, background: 'transparent', color: 'transparent',
                  caretColor: readonly ? 'transparent' : '#cba6f7',
                  border: 'none', outline: 'none', resize: 'none', padding: 8,
                  fontSize: fs(10), lineHeight: lh, fontFamily: MONO,
                  tabSize: tabSize, whiteSpace: wordWrap ? 'pre-wrap' : 'pre', wordBreak: wordWrap ? 'break-all' : 'normal', overflow: 'auto', minWidth: 0,
                  position: 'relative', zIndex: 1, cursor: readonly ? 'default' : cmdHeld ? 'pointer' : 'text',
                }}
              />

              {/* Autocomplete dropdown */}
              {acOpen && acItems.length > 0 && (() => {
                const lineH = Math.round(16 * zf);
                const top = (activeLn * lineH) + 8 - scrollTop + lineH;
                const lineStart = code.lastIndexOf('\n', (taRef.current?.selectionStart || 0) - 1) + 1;
                const col = (taRef.current?.selectionStart || 0) - lineStart;
                const left = col * fs(6.1) + 8;
                const selItem = acItems[acIdx];
                return (
                  <div style={{ position: 'absolute', top: Math.min(top, 200), left: Math.min(left, 200), zIndex: 10, display: 'flex', gap: 0 }}>
                    {/* Autocomplete list */}
                    <div onMouseDown={stop} style={{
                      background: '#1e1e2e', border: '1px solid #ffffff15',
                      borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,.5)',
                      maxHeight: 150, overflow: 'auto', minWidth: 200
                    }}>
                      {acItems.map((item, i) => {
                        const isMethod = item.desc !== 'keyword';
                        const isActive = i === acIdx;
                        return (
                          <div key={item.label}
                            onClick={() => {
                              const s = taRef.current?.selectionStart || 0;
                              const before = code.substring(0, s);
                              const dotIdx = before.lastIndexOf('tp.');
                              if (dotIdx !== -1 && isMethod) {
                                const nc = code.substring(0, dotIdx + 3) + item.insert + code.substring(s);
                                setCode(nc);
                                const newPos = dotIdx + 3 + item.insert.length;
                                setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = newPos; el.focus(); } }, 0);
                              } else {
                                const nc = code.substring(0, s) + item.insert + code.substring(s);
                                setCode(nc);
                                const newPos = s + item.insert.length;
                                setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = newPos; el.focus(); } }, 0);
                              }
                              setAcOpen(false);
                            }}
                            onMouseEnter={() => setAcIdx(i)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
                              fontSize: 9, cursor: 'pointer',
                              background: isActive ? '#cba6f715' : 'transparent',
                              color: isActive ? '#cdd6f4' : '#a6adc8',
                            }}>
                            <span style={{
                              width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 3, fontSize: 7, fontWeight: 700, flexShrink: 0,
                              background: isMethod ? '#cba6f712' : '#89b4fa12',
                              color: isMethod ? '#cba6f7' : '#89b4fa',
                            }}>{isMethod ? (item.label.includes('(') ? 'M' : 'P') : 'K'}</span>
                            <span style={{ fontWeight: isActive ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                            <span style={{ color: '#555', fontSize: 7, flexShrink: 0 }}>{item.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Detail panel for selected item */}
                    {selItem && selItem.desc !== 'keyword' && TP_DOCS[selItem.label.replace(/\(.*/, '')] && (
                      <div style={{
                        background: '#1e1e2e', border: '1px solid #ffffff15', borderLeft: 'none',
                        borderRadius: '0 6px 6px 0', boxShadow: '0 4px 16px rgba(0,0,0,.3)',
                        padding: '6px 10px', maxWidth: 220, minWidth: 140,
                      }}>
                        {TP_DOCS[selItem.label.replace(/\(.*/, '')].split('\n').map((line, i) => (
                          <div key={i} style={{ fontSize: 8, lineHeight: '12px', fontFamily: MONO, color: i === 0 ? '#cba6f7' : '#777', fontWeight: i === 0 ? 600 : 400, whiteSpace: 'pre-wrap' }}>{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Parameter hints */}
              {paramHint && !acOpen && (() => {
                const lineH = Math.round(16 * zf);
                const top = (activeLn - 1) * lineH + 8 - scrollTop - 4;
                const lineStart = code.lastIndexOf('\n', (taRef.current?.selectionStart || 0) - 1) + 1;
                const col = (taRef.current?.selectionStart || 0) - lineStart;
                const left = col * fs(6.1) + 8;
                return (
                  <div style={{
                    position: 'absolute', top: Math.max(0, top), left: Math.min(Math.max(8, left - 40), 200),
                    zIndex: 11, background: '#1e1e2e', border: '1px solid #ffffff15',
                    borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.5)',
                    padding: '4px 8px', pointerEvents: 'none', maxWidth: 300,
                  }}>
                    <div style={{ fontSize: 8, color: '#cba6f7', fontWeight: 600, marginBottom: 2 }}>
                      tp.{paramHint.method}(
                      {paramHint.params.map((p, i) => (
                        <span key={i} style={{ color: i === paramHint.activeParam ? '#f9e2af' : '#a6adc860', fontWeight: i === paramHint.activeParam ? 600 : 400 }}>
                          {i > 0 ? ', ' : ''}{p}
                        </span>
                      ))}
                      )
                    </div>
                  </div>
                );
              })()}

              {/* Hover docs tooltip */}
              {hoverDoc && !acOpen && (
                <div style={{
                  position: 'absolute', left: Math.min(hoverDoc.x + 33, 240), top: hoverDoc.y + 16,
                  zIndex: 12, background: '#1e1e2e', border: '1px solid #ffffff15',
                  borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,.5)',
                  padding: '6px 10px', maxWidth: 280, pointerEvents: 'none'
                }}>
                  {hoverDoc.text.split('\n').map((line, i) => (
                    <div key={i} style={{
                      fontSize: 8, lineHeight: '13px', fontFamily: MONO,
                      color: i === 0 ? '#cba6f7' : '#a6adc8',
                      fontWeight: i === 0 ? 600 : 400,
                      whiteSpace: 'pre-wrap',
                    }}>{line}</div>
                  ))}
                </div>
              )}

              {/* Minimap */}
              {showMinimap && lines.length > 10 && (
                <div
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientY - rect.top) / rect.height;
                    const totalH = lines.length * Math.round(16 * zf);
                    if (taRef.current) taRef.current.scrollTop = pct * totalH;
                    // Set cursor to clicked line
                    const lineIdx = Math.min(lines.length - 1, Math.max(0, Math.floor(pct * lines.length)));
                    setActiveLn(lineIdx + 1);
                    setCursor({ ln: lineIdx + 1, col: 1 });
                    const pos = lines.slice(0, lineIdx).join('\n').length + (lineIdx > 0 ? 1 : 0);
                    setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = pos; el.focus(); } }, 0);
                  }}
                  style={{
                    position: 'absolute', top: 0, right: 0, width: 40, bottom: 0,
                    background: '#16162a', zIndex: 2, cursor: 'pointer', overflow: 'hidden',
                    borderLeft: '1px solid #ffffff06'
                  }}>
                  {/* Code density lines */}
                  <div style={{ padding: '2px 2px', pointerEvents: 'none' }}>
                    {(() => {
                      // Precompute which lines have search matches for minimap highlighting
                      const searchMatchLines = new Set();
                      if (searchOpen && searchMatches.length) {
                        for (const m of searchMatches) {
                          const ln = code.substring(0, m.pos).split('\n').length;
                          searchMatchLines.add(ln);
                        }
                      }
                      // Precompute word occurrence lines for minimap
                      const wordMatchLines = new Set();
                      if (selectedWord) {
                        wordOccurrences.forEach(ln => wordMatchLines.add(ln));
                      }
                      // Precompute selection range for minimap
                      const selRange = {};
                      const el = taRef.current;
                      if (el && el.selectionStart !== el.selectionEnd) {
                        const selStartLn = code.substring(0, Math.min(el.selectionStart, el.selectionEnd)).split('\n').length;
                        const selEndLn = code.substring(0, Math.max(el.selectionStart, el.selectionEnd)).split('\n').length;
                        for (let sl = selStartLn; sl <= selEndLn; sl++) selRange[sl] = true;
                      }
                      // Precompute lint warning lines for minimap
                      const lintLines = new Set();
                      lines.forEach((ll, li) => {
                        if (/^\s*\/\//.test(ll)) return;
                        if (/\bvar\b/.test(ll) || (/==(?!=)/.test(ll) && !/===/.test(ll)) || /\beval\s*\(/.test(ll) || /\bdebugger\b/.test(ll.trim())) lintLines.add(li + 1);
                      });
                      return lines.map((l, i) => {
                        const trimLen = Math.min(l.trimStart().length, 36);
                        const isErr = output?.errLn === i + 1;
                        const isLint = lintLines.has(i + 1);
                        const isActive = i + 1 === activeLn;
                        const isSearch = searchMatchLines.has(i + 1);
                        const isWordMatch = wordMatchLines.has(i + 1);
                        const isBookmark = bookmarks.has(i + 1);
                        const isSel = selRange[i + 1];
                        const isScope = activeScope && i + 1 >= activeScope.startLn && i + 1 <= activeScope.endLn;
                        return <div key={i} style={{
                          height: Math.max(1, Math.min(2, 120 / lines.length)),
                          marginBottom: lines.length > 100 ? 0 : 1,
                          width: `${Math.max(4, (trimLen / 36) * 100)}%`,
                          background: isErr ? '#f38ba8' : isSearch ? '#f9e2af' : isBookmark ? '#89b4fa' : isLint ? '#f9e2af60' : isWordMatch ? '#cba6f750' : isSel ? '#cba6f740' : isActive ? '#cba6f760' : isScope ? '#cba6f718' : l.trim().startsWith('//') ? '#585b7030' : '#a6adc820',
                          borderRadius: 1,
                          position: 'relative',
                        }}>
                          {isBookmark && <span style={{ position: 'absolute', right: -2, top: -1, width: 3, height: 3, borderRadius: 99, background: '#89b4fa' }} />}
                        </div>;
                      });
                    })()}
                  </div>
                  {/* Viewport indicator (draggable) */}
                  <div
                    onMouseDown={e => {
                      e.preventDefault(); e.stopPropagation();
                      const rect = e.currentTarget.parentElement.getBoundingClientRect();
                      const totalH = lines.length * Math.round(16 * zf);
                      const onMove = ev => {
                        const pct = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
                        if (taRef.current) taRef.current.scrollTop = pct * totalH;
                      };
                      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                      document.addEventListener('mousemove', onMove);
                      document.addEventListener('mouseup', onUp);
                    }}
                    style={{
                      position: 'absolute', left: 0, right: 0,
                      top: `${(scrollTop / Math.max(1, lines.length * Math.round(16 * zf))) * 100}%`,
                      height: `${Math.max(8, (100 / Math.max(1, lines.length)) * 20)}%`,
                      background: '#cba6f710', border: '1px solid #cba6f720',
                      borderRadius: 2, cursor: 'grab', minHeight: 8,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#cba6f720'}
                    onMouseLeave={e => e.currentTarget.style.background = '#cba6f710'}
                  />
                </div>
              )}

              {/* Right-click context menu */}
              {ctxMenu && (
                <div onMouseDown={stop} style={{
                  position: 'absolute', left: Math.min(ctxMenu.x + 33, 200), top: ctxMenu.y,
                  zIndex: 15, background: '#181825', border: '1px solid #ffffff15',
                  borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,.5)', minWidth: 140, overflow: 'hidden'
                }}>
                  {[
                    { label: 'Cut', action: () => { document.execCommand('cut'); }, disabled: readonly },
                    { label: 'Copy', action: () => { document.execCommand('copy'); } },
                    { label: 'Copy as Markdown', action: () => {
                      const el = taRef.current; if (el) {
                        const s = el.selectionStart, en = el.selectionEnd;
                        const sel = s !== en ? code.substring(s, en) : code;
                        navigator.clipboard?.writeText('```js\n' + sel + '\n```');
                        showToast('Copied as markdown', 'info');
                      }
                    }},
                    { label: 'Paste', action: () => { navigator.clipboard?.readText().then(t => { const el = taRef.current; if (el && t) { const s = el.selectionStart, en = el.selectionEnd; setCode(code.substring(0, s) + t + code.substring(en)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + t.length }, 0); } }); }, disabled: readonly },
                    { label: 'Select All', action: () => { const el = taRef.current; if (el) { el.selectionStart = 0; el.selectionEnd = code.length; el.focus(); } }, hint: '\u2318A' },
                    null,
                    { label: 'Toggle Comment', action: () => { const el = taRef.current; if (el) { const evt = new KeyboardEvent('keydown', { key: '/', metaKey: true }); handleKey({ ...evt, target: el, preventDefault: () => {}, stopPropagation: () => {} }); } }, hint: '\u2318/' },
                    { label: 'Duplicate Line', action: () => { const el = taRef.current; if (el) { const s = el.selectionStart, en = el.selectionEnd; const [ls, le] = getLineRange(s); const line = code.substring(ls, le); const nc = code.substring(0, le) + '\n' + line + code.substring(le); setCode(nc); } }, disabled: readonly },
                    { label: 'Delete Line', action: () => { const el = taRef.current; if (el) { const s = el.selectionStart; const [ls, le] = getLineRange(s); const delEnd = le < code.length ? le + 1 : ls > 0 ? ls - 1 : le; const delStart = le < code.length ? ls : ls > 0 ? ls - 1 : ls; setCode(code.substring(0, delStart) + code.substring(delEnd) || '\n'); } }, disabled: readonly },
                    null,
                    { label: 'Find', action: () => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }, hint: '\u2318F' },
                    { label: 'Go to Line', action: () => { setGotoOpen(true); setTimeout(() => gotoRef.current?.focus(), 50); }, hint: 'Ctrl+G' },
                    { label: 'Rename Symbol', action: () => { const el = taRef.current; if (el) { const s = el.selectionStart; const bef = code.substring(0, s); const aft = code.substring(s); const wB = bef.match(/(\w+)$/); const wA = aft.match(/^(\w*)/); const word = (wB ? wB[1] : '') + (wA ? wA[1] : ''); if (word.length >= 2) { setRenameSymbol({ word, newName: word }); setTimeout(() => renameSymbolRef.current?.focus(), 50); } } }, disabled: readonly, hint: '\u2318R' },
                    { label: 'Surround With...', action: () => { const el = taRef.current; if (el && el.selectionStart !== el.selectionEnd) { setSurroundMenu({ s: el.selectionStart, en: el.selectionEnd }); } else { showToast('Select code to surround', 'warn'); } }, disabled: readonly, hint: '\u2318\u21E7S' },
                    null,
                    { label: 'Format Document', action: formatCode, disabled: readonly },
                    { label: 'Run', action: runCode, hint: '\u2318+Enter', disabled: readonly },
                    { label: 'Run Selection', action: () => { const el = taRef.current; if (el && el.selectionStart !== el.selectionEnd) runSelection(); else showToast('Select code to run', 'warn'); }, disabled: readonly },
                  ].map((item, i) => item === null ? (
                    <div key={`sep-${i}`} style={{ height: 1, background: '#ffffff08', margin: '2px 0' }} />
                  ) : (
                    <div key={item.label} onClick={() => { if (!item.disabled) { item.action(); setCtxMenu(null); } }}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '4px 10px', fontSize: 9,
                        color: item.disabled ? '#444' : '#a6adc8', cursor: item.disabled ? 'default' : 'pointer', gap: 6
                      }}
                      onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = '#ffffff08'; }}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.hint && <span style={{ fontSize: 8, color: '#555' }}>{item.hint}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Peek definition panel */}
              {peekDef && TP_DOCS[peekDef.method] && (() => {
                const doc = TP_DOCS[peekDef.method];
                const docLines = doc.split('\n');
                const lineH = Math.round(16 * zf);
                const gutterW = showLineNumbers ? (lines.length >= 1000 ? 48 : lines.length >= 100 ? 42 : 36) : 0;
                const topPos = Math.min((peekDef.line) * lineH - scrollTop + 8, 200);
                return (
                  <div style={{
                    position: 'absolute', left: gutterW + 8, right: showMinimap ? 48 : 8,
                    top: Math.max(8, topPos), zIndex: 15,
                    background: '#1e1e2e', border: '1px solid #cba6f740',
                    borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,.6)', overflow: 'hidden',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', background: '#181825', borderBottom: '1px solid #ffffff10' }}>
                      <span style={{ fontSize: fs(8), color: '#cba6f7', fontWeight: 600, flex: 1 }}>tp.{peekDef.method}</span>
                      <span onClick={() => { openFile('docs/api.js'); setPeekDef(null); showToast(`Opened tp.${peekDef.method} docs`, 'info'); }}
                        style={{ fontSize: fs(7), color: '#89b4fa', cursor: 'pointer', marginRight: 8 }}
                        onMouseDown={stop}>Open Full Docs</span>
                      <span onClick={() => setPeekDef(null)} onMouseDown={stop}
                        style={{ fontSize: 10, color: '#555', cursor: 'pointer', lineHeight: 1 }}>{'\u00D7'}</span>
                    </div>
                    <div style={{ padding: '6px 10px', fontFamily: MONO, fontSize: fs(9), lineHeight: '1.5', maxHeight: 100, overflow: 'auto' }}>
                      {docLines.map((dl, di) => (
                        <div key={di} style={{ color: di === 0 ? '#cba6f7' : '#a6adc8' }}>
                          <HighlightLine text={dl} />
                        </div>
                      ))}
                      {PARAM_HINTS[peekDef.method] && (
                        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #ffffff08' }}>
                          {PARAM_HINTS[peekDef.method].map((p, pi) => (
                            <div key={pi} style={{ fontSize: fs(8), color: '#f9e2af' }}>{p}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Read-only badge */}
              {readonly && (
                <div style={{
                  position: 'absolute', top: 8, right: 12, zIndex: 2,
                  background: '#f9e2af18', borderRadius: 4, padding: '2px 8px',
                  fontSize: 8, color: '#f9e2af', fontWeight: 500, border: '1px solid #f9e2af20'
                }}>read-only</div>
              )}
            </div>

            {/* Terminal */}
            {termOpen && (
              <div style={{
                height: termHeight, minHeight: 50, maxHeight: 300,
                background: '#11111b', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative'
              }}>
                {/* Drag handle */}
                <div
                  onMouseDown={e => {
                    e.preventDefault(); e.stopPropagation();
                    termDrag.current = { startY: e.clientY, startH: termHeight };
                    const onMove = ev => {
                      const dy = termDrag.current.startY - ev.clientY;
                      setTermHeight(Math.max(50, Math.min(300, termDrag.current.startH + dy)));
                    };
                    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); termDrag.current = null; };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                  style={{ height: 3, cursor: 'ns-resize', background: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#cba6f740'}
                  onMouseLeave={e => { if (!termDrag.current) e.currentTarget.style.background = 'transparent'; }}
                />
                <div style={{ borderTop: '1px solid #ffffff10' }}></div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 0, padding: '0 10px 0 0',
                  borderBottom: '1px solid #ffffff08', flexShrink: 0
                }}>
                  {['output', 'problems'].map(tab => (
                    <span key={tab} onClick={() => setTermTab(tab)} onMouseDown={stop}
                      style={{
                        fontSize: 8, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
                        padding: '4px 10px', cursor: 'pointer',
                        color: termTab === tab ? '#cba6f7' : '#555',
                        borderBottom: termTab === tab ? '1px solid #cba6f7' : '1px solid transparent',
                      }}>{tab}{tab === 'problems' && (output?.err || lines.some(l => /\bvar\b/.test(l) || (/==(?!=)/.test(l) && !/===/.test(l)))) ? ' \u25CF' : ''}</span>
                  ))}
                  {output?.ms && <span style={{ fontSize: 8, color: '#27c93f', opacity: .5, marginLeft: 6 }}>{output.ms}ms</span>}
                  {output?.logs?.length > 0 && <span onClick={() => {
                    const text = output.logs.map(l => l.v).join('\n');
                    navigator.clipboard?.writeText(text);
                    showToast('Output copied!', 'info');
                  }} onMouseDown={stop}
                    style={{ marginLeft: 'auto', fontSize: 8, color: '#555', cursor: 'pointer' }} title="Copy output">⎘</span>}
                  <span onClick={() => setOutput(null)} onMouseDown={stop}
                    style={{ marginLeft: output?.logs?.length ? 0 : 'auto', fontSize: 8, color: '#555', cursor: 'pointer' }}>Clear</span>
                  <span onClick={() => setTermOpen(false)} onMouseDown={stop}
                    style={{ fontSize: 9, color: '#555', cursor: 'pointer', lineHeight: 1 }}>{'\u2500'}</span>
                </div>
                <div ref={termRef} style={{ flex: 1, overflow: 'auto', padding: '4px 10px' }}>
                  {termTab === 'output' ? (<>
                    {output ? (<>
                      {output.logs.map((l, i) => {
                        // Detect if output is a JSON object/array that can be collapsed
                        const isExpandable = l.v && (l.v.trim().startsWith('{') || l.v.trim().startsWith('[')) && l.v.length > 60;
                        const isExpanded = expandedLogs.has(i);
                        const collapsed = isExpandable && !isExpanded;
                        const preview = collapsed ? l.v.trim().substring(0, 50) + '...' : l.v;
                        return (
                          <div key={i} onDoubleClick={() => {
                            navigator.clipboard?.writeText(l.v);
                            showToast('Copied to clipboard', 'info');
                          }} style={{
                            fontSize: fs(9), lineHeight: Math.round(15 * zf) + 'px',
                            color: l.t === 'err' ? '#f38ba8' : l.t === 'warn' ? '#f9e2af' : l.t === 'ret' ? '#89b4fa' : l.t === 'dbg' ? '#6c7086' : '#a6adc8',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '1px 0',
                            borderRadius: 2,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            {isExpandable && (
                              <span onClick={() => setExpandedLogs(prev => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i); else next.add(i);
                                return next;
                              })} style={{ cursor: 'pointer', color: '#cba6f7', fontSize: 7, marginRight: 2, userSelect: 'none' }}>
                                {isExpanded ? '\u25BE' : '\u25B8'}
                              </span>
                            )}
                            {l.t === 'err' && <span style={{ fontSize: 6, background: '#f38ba820', color: '#f38ba8', padding: '0 3px', borderRadius: 2, marginRight: 3, fontWeight: 600, letterSpacing: '.03em' }}>ERR</span>}
                            {l.t === 'warn' && <span style={{ fontSize: 6, background: '#f9e2af20', color: '#f9e2af', padding: '0 3px', borderRadius: 2, marginRight: 3, fontWeight: 600, letterSpacing: '.03em' }}>WARN</span>}
                            {l.t === 'dbg' && <span style={{ fontSize: 6, background: '#6c708620', color: '#6c7086', padding: '0 3px', borderRadius: 2, marginRight: 3, fontWeight: 600, letterSpacing: '.03em' }}>DBG</span>}
                            {l.t === 'ret' ? '\u2190 ' : l.t !== 'err' && l.t !== 'warn' && l.t !== 'dbg' && !isExpandable ? '\u276F ' : l.t !== 'err' && l.t !== 'warn' && l.t !== 'dbg' ? '' : ' '}{l.t === 'ret' || l.t === 'log' ? (() => {
                              // Syntax highlight JS-like output
                              try {
                                const tokens = tokenize(preview);
                                return tokens.map((tk, ti) => <span key={ti} style={{ color: l.t === 'ret' ? (TC[tk.c] === '#cdd6f4' ? '#89b4fa' : TC[tk.c]) : TC[tk.c] || '#a6adc8' }}>{tk.v}</span>);
                              } catch(_) { return preview; }
                            })() : preview}
                            {l.ts && <span style={{ float: 'right', fontSize: 7, color: '#444', fontStyle: 'normal', marginLeft: 8 }}>{l.ts}</span>}
                          </div>
                        );
                      })}
                    </>) : (
                      <div style={{ fontSize: fs(9), color: '#444', padding: '4px 0' }}>
                        {'\u276F'} Run code with <span style={{ color: '#cba6f7' }}>{'\u25B6 Run'}</span> or <span style={{ color: '#cba6f7' }}>{'\u2318+Enter'}</span>
                      </div>
                    )}
                  </>) : (<>
                    {/* Problems tab — lint + runtime errors */}
                    {(() => {
                      const hints = [];
                      lines.forEach((l, i) => {
                        const trimmed = l.trim();
                        if (/^\s*\/\//.test(l)) return; // skip comments
                        if (/\bvar\b/.test(l)) hints.push({ ln: i + 1, msg: 'Prefer const/let over var', sev: 'warn', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/\bvar\b/, 'const'); setCode(all.join('\n')); showToast('Fixed: var → const', 'success');
                        }});
                        if (/console\.log/.test(l) && !activeFile.includes('playground')) hints.push({ ln: i + 1, msg: 'console.log left in code', sev: 'info', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/console\.log\([^)]*\);?\s*/, ''); if (!all[i].trim()) all.splice(i, 1); setCode(all.join('\n')); showToast('Removed console.log', 'success');
                        }});
                        if (/==(?!=)/.test(l) && !/===/.test(l)) hints.push({ ln: i + 1, msg: 'Use === instead of ==', sev: 'warn', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/==(?!=)/g, '==='); setCode(all.join('\n')); showToast('Fixed: == → ===', 'success');
                        }});
                        if (/!=(?!=)/.test(l) && !/!==/.test(l)) hints.push({ ln: i + 1, msg: 'Use !== instead of !=', sev: 'warn', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/!=(?!=)/g, '!=='); setCode(all.join('\n')); showToast('Fixed: != → !==', 'success');
                        }});
                        if (/\balert\s*\(/.test(l)) hints.push({ ln: i + 1, msg: 'Avoid using alert()', sev: 'warn', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/\balert\s*\(/, 'console.log('); setCode(all.join('\n')); showToast('Fixed: alert → console.log', 'success');
                        }});
                        if (l.length > 120 && !l.trim().startsWith('//')) hints.push({ ln: i + 1, msg: `Line too long (${l.length} chars)`, sev: 'info' });
                        if (/;\s*;/.test(l)) hints.push({ ln: i + 1, msg: 'Double semicolon', sev: 'warn', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/;\s*;/g, ';'); setCode(all.join('\n')); showToast('Fixed: removed double semicolon', 'success');
                        }});
                        if (/\{\}/.test(l) && !/\(\)/.test(l)) hints.push({ ln: i + 1, msg: 'Empty block statement', sev: 'info' });
                        if (/\beval\s*\(/.test(l)) hints.push({ ln: i + 1, msg: 'Avoid eval() — security risk', sev: 'warn' });
                        if (/\bdebugger\b/.test(trimmed)) hints.push({ ln: i + 1, msg: 'Debugger statement left in code', sev: 'warn', fix: () => {
                          const all = code.split('\n'); all.splice(i, 1); setCode(all.join('\n')); showToast('Removed debugger', 'success');
                        }});
                        if (/,\s*[}\]]/.test(l) && !/\/\//.test(l.substring(0, l.indexOf(',')))) { /* trailing comma OK */ }
                        if (/\bnew\s+Array\b/.test(l)) hints.push({ ln: i + 1, msg: 'Use [] instead of new Array()', sev: 'info', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/new\s+Array\(\)/g, '[]'); setCode(all.join('\n')); showToast('Fixed: new Array() → []', 'success');
                        }});
                        if (/\bnew\s+Object\b/.test(l)) hints.push({ ln: i + 1, msg: 'Use {} instead of new Object()', sev: 'info', fix: () => {
                          const all = code.split('\n'); all[i] = all[i].replace(/new\s+Object\(\)/g, '{}'); setCode(all.join('\n')); showToast('Fixed: new Object() → {}', 'success');
                        }});
                        if (/\btypeof\s+\w+\s*===?\s*'undefined'/.test(l)) hints.push({ ln: i + 1, msg: 'Consider optional chaining (?.) instead', sev: 'info' });
                        if (/[^=!<>]=\s*=(?!=)/.test(l) && /if|while|for/.test(l)) hints.push({ ln: i + 1, msg: 'Assignment in condition — use === for comparison', sev: 'warn' });
                        if (/\.then\s*\(/.test(l) && /\bawait\b/.test(code)) hints.push({ ln: i + 1, msg: 'Consider using await instead of .then()', sev: 'info' });
                      });
                      const fixable = hints.filter(h => h.fix);
                      return hints.length > 0 || output?.err ? (<>
                        {fixable.length > 1 && (
                          <div onClick={() => {
                            // Apply fixes in reverse order to preserve line numbers
                            [...fixable].reverse().forEach(h => h.fix());
                            showToast(`Fixed ${fixable.length} issues`, 'success');
                          }}
                            style={{ padding: '3px 8px', fontSize: 8, color: '#89b4fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}
                            onMouseDown={stop}
                            onMouseEnter={e => e.currentTarget.style.background = '#89b4fa08'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontSize: 10 }}>{'\u2728'}</span>
                            <span>Fix all {fixable.length} auto-fixable issues</span>
                          </div>
                        )}
                        {output?.err && (
                      <div style={{
                        fontSize: fs(9), color: '#f38ba8', marginTop: 4,
                        padding: '4px 6px', background: '#f38ba810',
                        borderRadius: 4, borderLeft: '2px solid #f38ba8',
                        cursor: output.errLn ? 'pointer' : 'default',
                      }} onClick={() => {
                        if (output.errLn) {
                          setActiveLn(output.errLn);
                          setCursor({ ln: output.errLn, col: 1 });
                          const pos = code.split('\n').slice(0, output.errLn - 1).join('\n').length + (output.errLn > 1 ? 1 : 0);
                          setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = pos; el.focus(); } }, 0);
                        }
                      }}>
                        <span style={{ color: '#f38ba8', fontWeight: 600 }}>{'\u2717'} Error</span>
                        {output.errLn && <span style={{ opacity: .5, marginLeft: 6 }}>line {output.errLn}</span>}
                        <div style={{ marginTop: 2, color: '#f38ba8cc' }}>{output.err}</div>
                        {output.suggest && (() => {
                          // Check if the suggestion is a tp.method() fix that can be auto-applied
                          const fixMatch = output.suggest.match(/Did you mean (tp\.\w+\(\)\??)/);
                          const errVarMatch = output.err?.match(/(\w+) is not defined/);
                          const canFix = fixMatch && errVarMatch && output.errLn;
                          return (
                            <div onClick={canFix ? () => {
                              // Apply the fix: replace the undefined variable with the suggestion
                              const all = code.split('\n');
                              const ln = output.errLn - 1;
                              if (ln >= 0 && ln < all.length) {
                                all[ln] = all[ln].replace(new RegExp('\\b' + errVarMatch[1] + '\\b'), fixMatch[1]);
                                setCode(all.join('\n'));
                                showToast('Fix applied!', 'success');
                                setOutput(prev => ({ ...prev, suggest: null }));
                              }
                            } : undefined}
                              style={{ marginTop: 4, fontSize: 8, color: '#89b4fa', background: '#89b4fa10', padding: '3px 6px', borderRadius: 3, borderLeft: '2px solid #89b4fa40', cursor: canFix ? 'pointer' : 'default' }}
                              onMouseEnter={canFix ? e => { e.currentTarget.style.background = '#89b4fa20'; } : undefined}
                              onMouseLeave={canFix ? e => { e.currentTarget.style.background = '#89b4fa10'; } : undefined}>
                              {'\uD83D\uDCA1'} {output.suggest}{canFix && <span style={{ marginLeft: 6, fontSize: 7, opacity: .7 }}>(click to fix)</span>}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {hints.map((h, i) => (
                      <div key={`h${i}`} onClick={() => goToLine(h.ln)} style={{
                        fontSize: fs(9), padding: '2px 6px', marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        color: h.sev === 'warn' ? '#f9e2af' : '#89b4fa',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span>{h.sev === 'warn' ? '\u26A0' : '\u24D8'}</span>
                        <span style={{ flex: 1 }}>{h.msg}</span>
                        {h.fix && <span onClick={e => { e.stopPropagation(); h.fix(); }}
                          style={{ fontSize: 7, color: '#89b4fa', background: '#89b4fa10', padding: '1px 4px', borderRadius: 2, cursor: 'pointer', flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.background = '#89b4fa20'}
                          onMouseLeave={e => e.currentTarget.style.background = '#89b4fa10'}>Fix</span>}
                        <span style={{ fontSize: 7, color: '#555' }}>:{h.ln}</span>
                      </div>
                    ))}
                      </>) : (
                        <div style={{ fontSize: fs(9), color: '#27c93f', padding: '4px 0', opacity: .5 }}>
                          {'\u2713'} No problems detected
                        </div>
                      );
                    })()}
                  </>)}
                </div>
                {/* REPL input */}
                <div style={{ display: 'flex', alignItems: 'flex-start', padding: '2px 10px 4px', borderTop: '1px solid #ffffff06', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: fs(9), color: '#cba6f7', flexShrink: 0, lineHeight: Math.round(15 * zf) + 'px', paddingTop: 2 }}>{termInput.includes('\n') ? '\u22EE' : '\u276F'}</span>
                  <textarea ref={termInputRef} value={termInput}
                    onChange={e => setTermInput(e.target.value)}
                    placeholder="tp.shapes()..."
                    spellCheck={false}
                    rows={Math.min(termInput.split('\n').length, 5)}
                    onMouseDown={stop}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && e.shiftKey) { return; /* allow newline */ }
                      if (e.key === 'Enter' && termInput.trim()) { e.preventDefault(); runTermInput(termInput); }
                      if (e.key === 'ArrowUp' && !termInput.includes('\n')) { e.preventDefault(); if (termHistory.length) { const idx = termHistIdx < 0 ? termHistory.length - 1 : Math.max(0, termHistIdx - 1); setTermHistIdx(idx); setTermInput(termHistory[idx]); } }
                      if (e.key === 'ArrowDown' && !termInput.includes('\n')) { e.preventDefault(); if (termHistIdx >= 0) { const idx = termHistIdx + 1; if (idx >= termHistory.length) { setTermHistIdx(-1); setTermInput(''); } else { setTermHistIdx(idx); setTermInput(termHistory[idx]); } } }
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const val = termInput;
                        const dotMatch = val.match(/tp\.(\w*)$/);
                        if (dotMatch) {
                          const partial = dotMatch[1].toLowerCase();
                          const methods = TP_AC.map(a => a.label.replace(/\(.*/, ''));
                          const match = methods.find(m => m.toLowerCase().startsWith(partial) && m.toLowerCase() !== partial);
                          if (match) setTermInput(val.replace(/tp\.\w*$/, 'tp.' + match + '('));
                        } else {
                          const cmds = ['clear', 'help', 'ls', 'cat', 'echo', 'pwd', 'run', 'date', 'whoami', 'history', 'touch', 'grep', 'wc', 'env', 'time', 'open', 'diff', 'mv', 'head', 'tail', 'rm', 'export', 'find', 'sed', 'cp', 'man', 'which', 'alias'];
                          const partial = val.toLowerCase();
                          const match = cmds.find(c => c.startsWith(partial) && c !== partial);
                          if (match) setTermInput(match + (['cat', 'echo', 'touch', 'grep', 'wc', 'time', 'open', 'mv', 'head', 'tail', 'rm', 'find', 'sed', 'cp', 'man', 'which'].includes(match) ? ' ' : ''));
                        }
                      }
                      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOutput(null); }
                      if (e.key === 'Escape') { setTermInput(''); termInputRef.current?.blur(); }
                    }}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: fs(9), color: '#cdd6f4', fontFamily: MONO, padding: '2px 0',
                      caretColor: '#cba6f7', resize: 'none', lineHeight: Math.round(15 * zf) + 'px',
                      minHeight: Math.round(15 * zf), overflow: 'hidden',
                    }} />
                  {termInput.includes('\n') && <span style={{ fontSize: 7, color: '#555', flexShrink: 0, paddingTop: 3, cursor: 'pointer' }}
                    onClick={() => { runTermInput(termInput); }} onMouseDown={stop} title="Run (Enter)">▶</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, padding: '4px 14px', borderRadius: 6, fontSize: 9, fontWeight: 500,
          background: toast.type === 'success' ? '#27c93f22' : toast.type === 'warn' ? '#f9e2af22' : toast.type === 'error' ? '#f38ba822' : '#89b4fa22',
          color: toast.type === 'success' ? '#27c93f' : toast.type === 'warn' ? '#f9e2af' : toast.type === 'error' ? '#f38ba8' : '#89b4fa',
          border: `1px solid ${toast.type === 'success' ? '#27c93f40' : toast.type === 'warn' ? '#f9e2af40' : toast.type === 'error' ? '#f38ba840' : '#89b4fa40'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,.3)', pointerEvents: 'none',
          animation: 'toastIn .2s ease-out', fontFamily: MONO, whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* Status bar */}
      {(() => {
        const el = taRef.current;
        const hasSel = el && el.selectionStart !== el.selectionEnd;
        const selLen = hasSel ? Math.abs(el.selectionEnd - el.selectionStart) : 0;
        const selLines = hasSel ? code.substring(Math.min(el.selectionStart, el.selectionEnd), Math.max(el.selectionStart, el.selectionEnd)).split('\n').length : 0;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', padding: '2px 10px',
            borderTop: '1px solid #ffffff08', gap: 8, flexShrink: 0, background: '#181825'
          }}>
            <span style={{ fontSize: fs(8), color: output?.err ? '#f38ba8' : '#27c93f' }}>{'\u25CF'}</span>
            <span style={{ fontSize: fs(8), color: '#555' }}>Ln {cursor.ln}, Col {cursor.col}</span>
            {hasSel && (() => {
              const selText = code.substring(Math.min(el.selectionStart, el.selectionEnd), Math.max(el.selectionStart, el.selectionEnd));
              const words = selText.trim().split(/\s+/).filter(Boolean).length;
              return <span style={{ fontSize: fs(8), color: '#cba6f7', opacity: .6 }}>({selLen} chars, {words} words, {selLines} lines)</span>;
            })()}
            <span style={{ fontSize: fs(8), color: '#555' }}>{lines.length} lines</span>
            {readonly && <span style={{ fontSize: fs(8), color: '#f9e2af', opacity: .5 }}>Read-only</span>}
            {output?.ms && <span style={{ fontSize: fs(8), color: '#27c93f', opacity: .5 }} title="Last execution time">{output.ms}ms</span>}
            {output?.err && <span onClick={() => { setTermOpen(true); setTermTab('problems'); }} onMouseDown={stop} style={{ fontSize: fs(8), color: '#f38ba8', cursor: 'pointer', opacity: .6 }} title="Click to see error">{'\u2717'} 1</span>}
            {(() => {
              let lintCount = 0;
              lines.forEach(l => { if (!/^\s*\/\//.test(l) && (/\bvar\b/.test(l) || (/==(?!=)/.test(l) && !/===/.test(l)) || /\beval\s*\(/.test(l) || /\bdebugger\b/.test(l.trim()) || /\balert\s*\(/.test(l))) lintCount++; });
              return lintCount > 0 ? <span onClick={() => { setTermOpen(true); setTermTab('problems'); }} onMouseDown={stop} style={{ fontSize: fs(8), color: '#f9e2af', cursor: 'pointer', opacity: .6 }} title="Click to see warnings">{'\u26A0'} {lintCount}</span> : null;
            })()}
            {tp && <span style={{ fontSize: fs(8), color: '#cba6f7', opacity: .4 }}>tp</span>}
            <span onClick={() => setWordWrap(w => !w)} onMouseDown={stop}
              style={{ fontSize: fs(8), color: wordWrap ? '#cba6f7' : '#555', marginLeft: 'auto', cursor: 'pointer' }}
              title="Toggle word wrap">{wordWrap ? 'Wrap: On' : 'Wrap: Off'}</span>
            <span onClick={() => setTabSize(t => t === 2 ? 4 : 2)} onMouseDown={stop}
              style={{ fontSize: fs(8), color: '#555', cursor: 'pointer' }} title="Toggle tab size">Spaces: {tabSize}</span>
            {editorZoom !== 1 && <span onClick={() => setEditorZoom(1)} onMouseDown={stop}
              style={{ fontSize: fs(8), color: '#89b4fa', cursor: 'pointer', opacity: .7 }}
              title="Reset zoom (⌘0)">{Math.round(editorZoom * 100)}%</span>}
            <span style={{ fontSize: fs(8), color: '#555' }}>
              {activeFile.endsWith('.js') ? 'JavaScript' : 'Text'}
            </span>
            <span style={{ fontSize: fs(8), color: '#555' }}>{code.length > 1024 ? `${(code.length / 1024).toFixed(1)}KB` : `${code.length}B`}</span>
            {(() => {
              const totalH = lines.length * Math.round(16 * zf);
              const viewH = el?.clientHeight || 1;
              const pct = totalH <= viewH ? 100 : Math.round((scrollTop / Math.max(1, totalH - viewH)) * 100);
              return <span style={{ fontSize: fs(8), color: '#555' }} title="Scroll position">
                {scrollTop <= 0 ? 'Top' : pct >= 99 ? 'Bot' : `${pct}%`}
              </span>;
            })()}
            <span style={{ fontSize: fs(8), color: '#555' }}>UTF-8</span>
            <span onClick={() => setNotifOpen(n => !n)} onMouseDown={stop} style={{ position: 'relative' }}>
              <span style={{ fontSize: fs(8), color: notifHistory.length ? '#cba6f7' : '#555', cursor: 'pointer', opacity: .6 }}
                title="Notifications">{'\u2709'}{notifHistory.length > 0 ? ` ${notifHistory.length}` : ''}</span>
              {notifOpen && (
                <div onMouseDown={stop} style={{
                  position: 'absolute', bottom: 18, right: 0, width: 200, maxHeight: 150,
                  background: '#181825', border: '1px solid #ffffff15', borderRadius: 6,
                  boxShadow: '0 -4px 16px rgba(0,0,0,.5)', overflow: 'auto', zIndex: 25,
                }}>
                  <div style={{ padding: '4px 8px', fontSize: 8, color: '#555', fontWeight: 600, borderBottom: '1px solid #ffffff08', display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>Notifications</span>
                    <span onClick={e => { e.stopPropagation(); setNotifHistory([]); }} style={{ color: '#cba6f7', cursor: 'pointer' }}>Clear</span>
                  </div>
                  {notifHistory.length === 0 ? (
                    <div style={{ fontSize: 8, color: '#444', padding: '8px', textAlign: 'center' }}>No notifications</div>
                  ) : [...notifHistory].reverse().map((n, i) => (
                    <div key={i} style={{ padding: '2px 8px', fontSize: 8, display: 'flex', alignItems: 'center', gap: 4,
                      color: n.type === 'success' ? '#27c93f' : n.type === 'warn' ? '#f9e2af' : n.type === 'error' ? '#f38ba8' : '#89b4fa',
                    }}>
                      <span style={{ fontSize: 6 }}>{'\u25CF'}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.msg}</span>
                      <span style={{ fontSize: 7, color: '#444', flexShrink: 0 }}>{new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
