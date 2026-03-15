import React from "react";
import { HighlightLine } from "./tokenizer";
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

/* Keyboard shortcuts */
const SHORTCUTS = [
  ['\u2318+Enter', 'Run code'],
  ['\u2318+S', 'Save state'],
  ['\u2318+/', 'Toggle comment'],
  ['\u2318+F', 'Find'],
  ['\u2318+H', 'Find & Replace'],
  ['\u2318+P', 'Command palette'],
  ['\u2318+L', 'Select line'],
  ['\u2318+D', 'Select next occurrence'],
  ['\u2318+Shift+D', 'Duplicate line'],
  ['Ctrl+G', 'Go to line'],
  ['Ctrl+Shift+K', 'Delete line'],
  ['Alt+\u2191/\u2193', 'Move line up/down'],
  ['Tab / Shift+Tab', 'Indent / Outdent'],
  ['\u2318+Z', 'Undo'],
  ['\u2318+Shift+Z', 'Redo'],
  ['\u2318+K', 'Shortcuts help'],
  ['Esc', 'Close overlay'],
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
  const fs = n => Math.round(n * fsize);
  const lh = Math.round(16 * fsize) + 'px';

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
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  /* ---- Tab drag reorder ---- */
  const [dragTab, setDragTab] = React.useState(null);
  const [dragOverTab, setDragOverTab] = React.useState(null);

  /* ---- Search options ---- */
  const [searchCase, setSearchCase] = React.useState(false);
  const [searchRegex, setSearchRegex] = React.useState(false);
  const [searchIdx, setSearchIdx] = React.useState(0);

  /* ---- Code folding ---- */
  const [foldedLines, setFoldedLines] = React.useState(new Set());

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
    try {
      const r = new Function('console', 'tp', input)(fc, tp || {});
      if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F ' + input }, ...logs], ms: null, err: null, errLn: null }));
    } catch (e) {
      setOutput(prev => ({ logs: [...(prev?.logs || []), { t: 'log', v: '\u276F ' + input }, { t: 'err', v: e.message }], ms: null, err: null, errLn: null }));
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
    setActiveFile(path);
    if (!openTabs.includes(path)) setOpenTabs(prev => [...prev, path]);
    setActiveLn(1);
    setCursor({ ln: 1, col: 1 });
  };

  const closeTab = (path, e) => {
    e?.stopPropagation();
    const next = openTabs.filter(t => t !== path);
    if (next.length === 0) return;
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
        matches.push({ pos: found, len: searchTerm.length });
        idx = found + 1;
      }
    }
    return matches;
  }, [code, searchTerm, searchOpen, searchCase, searchRegex]);

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
      { label: 'Toggle Terminal', key: 'term', hint: '' },
      { label: 'Toggle Explorer', key: 'tree', hint: '' },
      { label: 'Find', key: 'find', hint: '\u2318+F' },
      { label: 'Find & Replace', key: 'replace', hint: '\u2318+H' },
      { label: 'New File...', key: 'newfile', hint: '' },
      { label: 'Save State', key: 'save', hint: '' },
      { label: 'Reset to Default', key: 'reset', hint: '' },
      ...ALL_FILES.map(f => ({ label: f, key: 'file:' + f, hint: '' })),
    ];
    if (!cmdQuery) return cmds;
    const q = cmdQuery.toLowerCase();
    return cmds.filter(c => c.label.toLowerCase().includes(q));
  }, [cmdQuery, ALL_FILES]);

  const runCommand = (key) => {
    setCmdOpen(false); setCmdQuery('');
    if (key === 'run') runCode();
    else if (key === 'term') setTermOpen(t => !t);
    else if (key === 'tree') setShowTree(t => !t);
    else if (key === 'find') { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }
    else if (key === 'replace') { setSearchOpen(true); setShowReplace(true); setTimeout(() => searchRef.current?.focus(), 50); }
    else if (key === 'newfile') { setNewFileInput(true); setShowTree(true); setNewFileName(''); setTimeout(() => newFileRef.current?.focus(), 100); }
    else if (key === 'save') tp?.save();
    else if (key === 'reset') tp?.reset();
    else if (key.startsWith('file:')) openFile(key.slice(5));
  };

  /* ---- Code execution ---- */
  const runCode = () => {
    if (readonly) return;
    setBusy(true);
    setTermOpen(true);
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
    const t0 = performance.now();
    try {
      const r = new Function('console', 'tp', code)(fc, tp || {});
      const ms = (performance.now() - t0).toFixed(1);
      if (r !== undefined) logs.push({ t: 'ret', v: '\u2190 ' + JSON.stringify(r) });
      setOutput({ logs: logs.slice(-100), ms, err: null, errLn: null });
    } catch (e) {
      let ln = null;
      const m = e.stack?.match(/<anonymous>:(\d+)/);
      if (m) ln = parseInt(m[1]) - 2;
      setOutput({ logs, ms: null, err: e.message, errLn: ln });
    }
    setTimeout(() => setBusy(false), 300);
  };

  /* ---- Cursor tracking ---- */
  const updateCursor = (el) => {
    if (!el) return;
    const s = el.selectionStart;
    const before = code.substring(0, s);
    const ln = before.split('\n').length;
    const col = s - before.lastIndexOf('\n');
    setCursor({ ln, col });
    setActiveLn(ln);
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

    /* Run: Cmd+Enter */
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runCode(); return; }

    /* Save: Cmd+S */
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      tp?.save();
      showToast('State saved!', 'success');
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

    /* Command palette: Cmd+P */
    if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); setCmdOpen(o => !o); setCmdQuery('');
      setTimeout(() => cmdRef.current?.focus(), 50); return;
    }

    /* Escape: close overlays */
    if (e.key === 'Escape') {
      if (acOpen) { setAcOpen(false); return; }
      if (searchOpen) { setSearchOpen(false); return; }
      if (cmdOpen) { setCmdOpen(false); return; }
      if (gotoOpen) { setGotoOpen(false); return; }
      if (helpOpen) { setHelpOpen(false); return; }
    }

    /* Autocomplete navigation */
    if (acOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcIdx(i => Math.min(i + 1, acItems.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAcIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = acItems[acIdx];
        if (item) {
          // Find "tp." before cursor and replace with tp.{insert}
          const before = code.substring(0, s);
          const dotIdx = before.lastIndexOf('tp.');
          if (dotIdx !== -1) {
            const nc = code.substring(0, dotIdx + 3) + item.insert + code.substring(s);
            setCode(nc);
            const newPos = dotIdx + 3 + item.insert.length;
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

    /* Go to line: Ctrl+G */
    if (e.key === 'g' && e.ctrlKey && !e.metaKey) {
      e.preventDefault(); setGotoOpen(true); setGotoVal('');
      setTimeout(() => gotoRef.current?.focus(), 50); return;
    }

    /* Shortcuts help: Cmd+K */
    if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault(); setHelpOpen(h => !h); return;
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

    if (readonly) return;

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
            if (newLines[i].startsWith('  ')) { newLines[i] = newLines[i].slice(2); diff -= 2; }
            else if (newLines[i].startsWith(' ')) { newLines[i] = newLines[i].slice(1); diff -= 1; }
          } else {
            newLines[i] = '  ' + newLines[i]; diff += 2;
          }
        }
        const nc = newLines.join('\n');
        setCode(nc);
        setTimeout(() => { el.selectionStart = s; el.selectionEnd = en + diff }, 0);
      } else if (e.shiftKey) {
        // Single line outdent
        const lineStart = code.lastIndexOf('\n', s - 1) + 1;
        const line = code.substring(lineStart);
        if (line.startsWith('  ')) {
          setCode(code.substring(0, lineStart) + line.slice(2));
          setTimeout(() => { el.selectionStart = el.selectionEnd = Math.max(lineStart, s - 2) }, 0);
        }
      } else {
        setCode(code.substring(0, s) + '  ' + code.substring(en));
        setTimeout(() => { el.selectionStart = el.selectionEnd = s + 2 }, 0);
      }
      return;
    }
    if (PAIRS[e.key]) { e.preventDefault(); const close = PAIRS[e.key]; setCode(code.substring(0, s) + e.key + close + code.substring(en)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + 1 }, 0); return; }
    if (e.key === 'Enter') {
      const lineStart = code.lastIndexOf('\n', s - 1) + 1;
      const currentLine = code.substring(lineStart, s);
      const indent = currentLine.match(/^\s*/)[0];
      const bef = code[s - 1];
      if (bef === '{') {
        e.preventDefault();
        const after = code[s] === '}';
        const nc = code.substring(0, s) + '\n' + indent + '  ' + (after ? '\n' + indent : '') + code.substring(s);
        setCode(nc);
        setTimeout(() => { el.selectionStart = el.selectionEnd = s + indent.length + 3 }, 0);
        return;
      }
      if (indent) { e.preventDefault(); setCode(code.substring(0, s) + '\n' + indent + code.substring(en)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + indent.length + 1 }, 0); return; }
    }
    if (')]}"\'`'.includes(e.key) && code[s] === e.key) {
      e.preventDefault(); setTimeout(() => { el.selectionStart = el.selectionEnd = s + 1 }, 0); return;
    }
    if (e.key === 'Backspace' && s === en && s > 0) {
      const ch = code[s - 1];
      if (PAIRS[ch] && code[s] === PAIRS[ch]) {
        e.preventDefault(); setCode(code.substring(0, s - 1) + code.substring(s + 1));
        setTimeout(() => { el.selectionStart = el.selectionEnd = s - 1 }, 0); return;
      }
    }
  };

  const stop = e => e.stopPropagation();

  /* ========== RENDER ========== */
  return (
    <div data-ide-scroll style={{ ...b, background: '#1e1e2e', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: MONO }}>

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
        <span onClick={() => setShowTree(t => !t)} onMouseDown={stop}
          style={{ fontSize: 11, color: showTree ? '#cba6f7' : '#555', cursor: 'pointer', marginLeft: 4, lineHeight: 1 }}
          title="Toggle explorer">{showTree ? '\u25E7' : '\u2630'}</span>
        <span style={{ fontSize: fs(9), color: '#666', flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          tasteprint <span style={{ color: '#444' }}>/</span> {activeFile}
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

        {/* File tree sidebar */}
        {showTree && <div onClick={() => setExplorerCtx(null)} style={{
          width: 130, background: '#181825', borderRight: '1px solid #ffffff08',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'auto', position: 'relative'
        }}>
          <div style={{ padding: '6px 10px', fontSize: 8, color: '#555', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Explorer
          </div>
          {TREE.map(folder => (
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
              {openFolders[folder.name] && folder.children.map(f => {
                const isActive = f.path === activeFile;
                const isReadonly = !editFiles.hasOwnProperty(f.path) && GEN_FILES[f.path];
                const isDeletable = editFiles.hasOwnProperty(f.path) && !initFiles[f.path];
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
                    <span style={{ fontSize: 6, color: FCOLORS[f.name] || (f.path.startsWith('user/') ? '#cba6f7' : '#555') }}>{'\u25CF'}</span>
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
                    {isReadonly && <span style={{ fontSize: 7, color: '#555', flexShrink: 0 }}>{'\uD83D\uDD12'}</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          {/* Explorer context menu */}
          {explorerCtx && (
            <div onMouseDown={stop} style={{
              position: 'absolute', left: explorerCtx.x, top: explorerCtx.y, zIndex: 15,
              background: '#181825', border: '1px solid #ffffff15', borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,.5)', minWidth: 100, overflow: 'hidden'
            }}>
              <div onClick={() => { openFile(explorerCtx.path); setExplorerCtx(null); }}
                style={{ padding: '4px 10px', fontSize: 9, color: '#a6adc8', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Open
              </div>
              {explorerCtx.deletable && <>
                <div style={{ height: 1, background: '#ffffff08' }} />
                <div onClick={() => {
                  const name = explorerCtx.path.split('/').pop();
                  setRenameFile(explorerCtx.path); setRenameName(name); setExplorerCtx(null);
                  setTimeout(() => renameRef.current?.focus(), 50);
                }}
                  style={{ padding: '4px 10px', fontSize: 9, color: '#a6adc8', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  Rename
                </div>
                <div style={{ height: 1, background: '#ffffff08' }} />
                <div onClick={() => { deleteFile(explorerCtx.path); setExplorerCtx(null); }}
                  style={{ padding: '4px 10px', fontSize: 9, color: '#f38ba8', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  Delete
                </div>
              </>}
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
                <div key={path} onClick={() => setActiveFile(path)}
                  onMouseDown={e => { stop(e); if (e.button === 1) { e.preventDefault(); closeTab(path, e); } }}
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
                  <span style={{ fontSize: 6, color: FCOLORS[name] || '#555' }}>{'\u25CF'}</span>
                  <span>{name}</span>
                  {isRO && <span style={{ fontSize: 7, color: '#555', opacity: .5 }}>ro</span>}
                  {isModified && <span style={{ fontSize: 8, color: '#f9e2af', lineHeight: 1 }} title="Unsaved changes">{'\u25CF'}</span>}
                  {openTabs.length > 1 && (
                    <span onClick={(e) => closeTab(path, e)}
                      style={{ fontSize: 10, color: '#555', cursor: 'pointer', marginLeft: 2, lineHeight: 1 }}>{'\u00D7'}</span>
                  )}
                  {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#cba6f7' }} />}
                </div>
              );
            })}
          </div>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '2px 10px', background: '#1a1a2e', borderBottom: '1px solid #ffffff06', flexShrink: 0, gap: 4 }}>
            {activeFile.split('/').map((part, i, arr) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ fontSize: 7, color: '#444' }}>{'\u203A'}</span>}
                <span style={{ fontSize: fs(8), color: i === arr.length - 1 ? '#cdd6f4' : '#666', cursor: i < arr.length - 1 ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (i < arr.length - 1) {
                      const folder = arr.slice(0, i + 1).join('/');
                      setOpenFolders(prev => ({ ...prev, [part]: true }));
                    }
                  }}
                  onMouseDown={stop}>{part}</span>
              </React.Fragment>
            ))}
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
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '10%', right: '10%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden', maxHeight: 200 }}>
              <input ref={cmdRef} value={cmdQuery} onChange={e => { setCmdQuery(e.target.value); setCmdIdx(0); }}
                placeholder="Type a command or file..." spellCheck={false}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Escape') { setCmdOpen(false); taRef.current?.focus(); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); setCmdIdx(i => Math.min(i + 1, Math.min(commands.length, 8) - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setCmdIdx(i => Math.max(i - 1, 0)); }
                  if (e.key === 'Enter' && commands.length) { runCommand(commands[Math.min(cmdIdx, commands.length - 1)].key); }
                }}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #ffffff08', padding: '6px 10px', fontSize: 10, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
              <div style={{ maxHeight: 150, overflow: 'auto' }}>
                {commands.slice(0, 8).map((c, ci) => (
                  <div key={c.key} onClick={() => runCommand(c.key)}
                    onMouseEnter={() => setCmdIdx(ci)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '4px 10px', fontSize: 9,
                      color: ci === cmdIdx ? '#cdd6f4' : '#a6adc8', cursor: 'pointer', gap: 6,
                      background: ci === cmdIdx ? '#ffffff10' : 'transparent',
                    }}>
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {c.hint && <span style={{ fontSize: 8, color: '#555' }}>{c.hint}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Go to line dialog */}
          {gotoOpen && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '20%', right: '20%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#555' }}>Go to line:</span>
              <input ref={gotoRef} value={gotoVal} onChange={e => setGotoVal(e.target.value.replace(/\D/g, ''))}
                placeholder={`1-${lines.length}`} spellCheck={false}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Escape') { setGotoOpen(false); taRef.current?.focus(); }
                  if (e.key === 'Enter') {
                    const ln = parseInt(gotoVal);
                    if (ln >= 1 && ln <= lines.length) {
                      const pos = code.split('\n').slice(0, ln - 1).join('\n').length + (ln > 1 ? 1 : 0);
                      setActiveLn(ln); setCursor({ ln, col: 1 });
                      setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = pos; el.focus(); } }, 0);
                    }
                    setGotoOpen(false);
                  }
                }}
                style={{ flex: 1, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
            </div>
          )}

          {/* Keyboard shortcuts help */}
          {helpOpen && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '5%', right: '5%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden', maxHeight: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #ffffff08' }}>
                <span style={{ fontSize: 9, color: '#cba6f7', fontWeight: 600 }}>Keyboard Shortcuts</span>
                <span onClick={() => setHelpOpen(false)} style={{ marginLeft: 'auto', fontSize: 9, color: '#555', cursor: 'pointer' }}>{'\u00D7'}</span>
              </div>
              <div style={{ padding: '4px 10px', maxHeight: 230, overflow: 'auto' }}>
                {SHORTCUTS.map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '2px 0', fontSize: 9 }}>
                    <span style={{ color: '#cba6f7', minWidth: 100, fontWeight: 500 }}>{key}</span>
                    <span style={{ color: '#a6adc8' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor + Terminal split */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Code editor */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
              {/* Line numbers */}
              {(() => {
                const gutterW = lines.length >= 1000 ? 44 : lines.length >= 100 ? 38 : 32;
                return (
                  <div ref={lnRef} style={{
                    padding: '8px 0', width: gutterW, textAlign: 'right', userSelect: 'none',
                    borderRight: '1px solid #ffffff08', background: '#16162a', flexShrink: 0, overflow: 'hidden'
                  }}>
                    <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                      {lines.map((_, i) => {
                        const isBracketLine = matchBracket && (
                          code.substring(0, matchBracket[0]).split('\n').length === i + 1 ||
                          code.substring(0, matchBracket[1]).split('\n').length === i + 1
                        );
                        return (
                          <div key={i} style={{
                            fontSize: fs(9), lineHeight: lh,
                            color: i + 1 === activeLn ? '#cdd6f4' : isBracketLine ? '#cba6f7' : output?.errLn === i + 1 ? '#f38ba8' : '#444',
                            paddingRight: 6,
                            background: i + 1 === activeLn ? '#ffffff06' : output?.errLn === i + 1 ? '#f38ba810' : 'transparent'
                          }}>{i + 1}</div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Syntax highlight overlay */}
              {(() => {
                const gutterW = lines.length >= 1000 ? 44 : lines.length >= 100 ? 38 : 32;
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
                return (
                  <div ref={hlRef} style={{ position: 'absolute', left: gutterW + 1, top: 0, right: 0, bottom: 0, padding: 8, pointerEvents: 'none', overflow: 'hidden' }}>
                    <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                    {lines.map((l, i) => {
                      /* Indent guides */
                      const indent = l.match(/^(\s*)/)[0].length;
                      const guides = [];
                      for (let g = 2; g <= indent; g += 2) {
                        guides.push(
                          <span key={`g${g}`} style={{
                            position: 'absolute', left: (g - 1) * charW, top: 0, bottom: 0, width: 1,
                            background: g === indent ? '#ffffff0a' : '#ffffff06'
                          }} />
                        );
                      }

                      /* Search match highlighting */
                      let searchHighlights = null;
                      if (searchOpen && searchTerm) {
                        // Find matches on this line
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

                      /* Word occurrence highlight on this line */
                      const hasOccurrence = wordOccurrences.has(i + 1) && !searchHighlights;

                      /* Bracket match indicator */
                      const bracketCol = bracketLines[i + 1];

                      return (
                        <div key={i} style={{
                          fontSize: fs(10), lineHeight: lh, whiteSpace: 'pre',
                          height: Math.round(16 * fsize), position: 'relative',
                          background: i + 1 === activeLn ? '#ffffff04' : output?.errLn === i + 1 ? '#f38ba808' : hasOccurrence ? '#cba6f706' : 'transparent',
                        }}>
                          {guides}
                          {searchHighlights || <HighlightLine text={l} />}
                          {bracketCol !== undefined && (
                            <span style={{
                              position: 'absolute', left: bracketCol * charW, top: 0,
                              width: charW, height: '100%',
                              background: '#cba6f718', borderBottom: '1px solid #cba6f740'
                            }} />
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
                    const filtered = partial ? TP_AC.filter(a => a.label.toLowerCase().startsWith(partial)) : TP_AC;
                    if (filtered.length) { setAcItems(filtered); setAcIdx(0); setAcOpen(true); }
                    else setAcOpen(false);
                  } else {
                    setAcOpen(false);
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
                }}
                onClick={e => updateCursor(e.target)}
                onContextMenu={e => {
                  e.preventDefault(); e.stopPropagation();
                  updateCursor(e.target);
                  const rect = e.target.getBoundingClientRect();
                  setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onKeyUp={e => updateCursor(e.target)} onKeyDown={handleKey}
                readOnly={readonly} spellCheck={false}
                style={{
                  flex: 1, background: 'transparent', color: 'transparent',
                  caretColor: readonly ? 'transparent' : '#cba6f7',
                  border: 'none', outline: 'none', resize: 'none', padding: 8,
                  fontSize: fs(10), lineHeight: lh, fontFamily: MONO,
                  tabSize: 2, whiteSpace: 'pre', overflow: 'auto', minWidth: 0,
                  position: 'relative', zIndex: 1, cursor: readonly ? 'default' : 'text',
                }}
              />

              {/* Autocomplete dropdown */}
              {acOpen && acItems.length > 0 && (() => {
                const lineH = Math.round(16 * fsize);
                const top = (activeLn * lineH) + 8 - scrollTop + lineH;
                const lineStart = code.lastIndexOf('\n', (taRef.current?.selectionStart || 0) - 1) + 1;
                const col = (taRef.current?.selectionStart || 0) - lineStart;
                const left = col * fs(6.1) + 8;
                return (
                  <div onMouseDown={stop} style={{
                    position: 'absolute', top: Math.min(top, 200), left: Math.min(left, 200),
                    zIndex: 10, background: '#1e1e2e', border: '1px solid #ffffff15',
                    borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,.5)',
                    maxHeight: 150, overflow: 'auto', minWidth: 180
                  }}>
                    {acItems.map((item, i) => (
                      <div key={item.label}
                        onClick={() => {
                          const s = taRef.current?.selectionStart || 0;
                          const before = code.substring(0, s);
                          const dotIdx = before.lastIndexOf('tp.');
                          if (dotIdx !== -1) {
                            const nc = code.substring(0, dotIdx + 3) + item.insert + code.substring(s);
                            setCode(nc);
                            const newPos = dotIdx + 3 + item.insert.length;
                            setTimeout(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = newPos; el.focus(); } }, 0);
                          }
                          setAcOpen(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
                          fontSize: 9, cursor: 'pointer',
                          background: i === acIdx ? '#ffffff10' : 'transparent',
                          color: i === acIdx ? '#cdd6f4' : '#a6adc8',
                        }}>
                        <span style={{ color: '#cba6f7', fontWeight: 500, minWidth: 0 }}>{item.label}</span>
                        <span style={{ color: '#555', fontSize: 8, marginLeft: 'auto', flexShrink: 0 }}>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Minimap scrollbar */}
              {lines.length > 20 && (
                <div
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientY - rect.top) / rect.height;
                    const totalH = lines.length * Math.round(16 * fsize);
                    if (taRef.current) taRef.current.scrollTop = pct * totalH;
                  }}
                  style={{
                    position: 'absolute', top: 0, right: 0, width: 8, bottom: 0,
                    background: '#ffffff04', zIndex: 2, cursor: 'pointer'
                  }}>
                  <div style={{
                    position: 'absolute', top: `${(scrollTop / (lines.length * Math.round(16 * fsize))) * 100}%`,
                    width: '100%', height: `${Math.max(10, (100 / lines.length) * 20)}%`,
                    background: '#cba6f720', borderRadius: 4, minHeight: 8,
                    pointerEvents: 'none'
                  }} />
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
                    { label: 'Paste', action: () => { navigator.clipboard?.readText().then(t => { const el = taRef.current; if (el && t) { const s = el.selectionStart, en = el.selectionEnd; setCode(code.substring(0, s) + t + code.substring(en)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + t.length }, 0); } }); }, disabled: readonly },
                    null,
                    { label: 'Toggle Comment', action: () => { const el = taRef.current; if (el) { const evt = new KeyboardEvent('keydown', { key: '/', metaKey: true }); handleKey({ ...evt, target: el, preventDefault: () => {}, stopPropagation: () => {} }); } }, hint: '\u2318/' },
                    { label: 'Duplicate Line', action: () => { const el = taRef.current; if (el) { const s = el.selectionStart, en = el.selectionEnd; const [ls, le] = getLineRange(s); const line = code.substring(ls, le); const nc = code.substring(0, le) + '\n' + line + code.substring(le); setCode(nc); } }, disabled: readonly },
                    { label: 'Delete Line', action: () => { const el = taRef.current; if (el) { const s = el.selectionStart; const [ls, le] = getLineRange(s); const delEnd = le < code.length ? le + 1 : ls > 0 ? ls - 1 : le; const delStart = le < code.length ? ls : ls > 0 ? ls - 1 : ls; setCode(code.substring(0, delStart) + code.substring(delEnd) || '\n'); } }, disabled: readonly },
                    null,
                    { label: 'Find', action: () => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }, hint: '\u2318F' },
                    { label: 'Go to Line', action: () => { setGotoOpen(true); setTimeout(() => gotoRef.current?.focus(), 50); }, hint: 'Ctrl+G' },
                    { label: 'Run', action: runCode, hint: '\u2318+Enter', disabled: readonly },
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
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
                  borderBottom: '1px solid #ffffff08', flexShrink: 0
                }}>
                  <span style={{ fontSize: 8, color: '#cba6f7', fontWeight: 600, letterSpacing: '.04em' }}>TERMINAL</span>
                  {output?.ms && <span style={{ fontSize: 8, color: '#27c93f', opacity: .5 }}>{output.ms}ms</span>}
                  {output?.logs?.length > 0 && <span onClick={() => {
                    const text = output.logs.map(l => l.v).join('\n');
                    navigator.clipboard?.writeText(text);
                  }} onMouseDown={stop}
                    style={{ marginLeft: 'auto', fontSize: 8, color: '#555', cursor: 'pointer' }} title="Copy output">⎘</span>}
                  <span onClick={() => setOutput(null)} onMouseDown={stop}
                    style={{ marginLeft: output?.logs?.length ? 0 : 'auto', fontSize: 8, color: '#555', cursor: 'pointer' }}>Clear</span>
                  <span onClick={() => setTermOpen(false)} onMouseDown={stop}
                    style={{ fontSize: 9, color: '#555', cursor: 'pointer', lineHeight: 1 }}>{'\u2500'}</span>
                </div>
                <div ref={termRef} style={{ flex: 1, overflow: 'auto', padding: '4px 10px' }}>
                  {output ? (<>
                    {output.logs.map((l, i) => (
                      <div key={i} style={{
                        fontSize: fs(9), lineHeight: Math.round(15 * fsize) + 'px',
                        color: l.t === 'err' ? '#f38ba8' : l.t === 'warn' ? '#f9e2af' : l.t === 'ret' ? '#89b4fa' : l.t === 'dbg' ? '#6c7086' : '#a6adc8',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '1px 0'
                      }}>
                        {l.t === 'err' ? '\u2717 ' : l.t === 'warn' ? '\u26A0 ' : l.t === 'ret' ? '  ' : l.t === 'dbg' ? '\u25E6 ' : '\u276F '}{l.v}
                      </div>
                    ))}
                    {output.err && (
                      <div style={{
                        fontSize: fs(9), color: '#f38ba8', marginTop: 4,
                        padding: '4px 6px', background: '#f38ba810',
                        borderRadius: 4, borderLeft: '2px solid #f38ba8'
                      }}>
                        {output.errLn && <span style={{ opacity: .5, marginRight: 4 }}>Ln {output.errLn}:</span>}
                        {output.err}
                      </div>
                    )}
                  </>) : (
                    <div style={{ fontSize: fs(9), color: '#444', padding: '4px 0' }}>
                      {'\u276F'} Run code with <span style={{ color: '#cba6f7' }}>{'\u25B6 Run'}</span> or <span style={{ color: '#cba6f7' }}>{'\u2318+Enter'}</span>
                    </div>
                  )}
                </div>
                {/* REPL input */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '2px 10px 4px', borderTop: '1px solid #ffffff06', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: fs(9), color: '#cba6f7', flexShrink: 0 }}>{'\u276F'}</span>
                  <input ref={termInputRef} value={termInput}
                    onChange={e => setTermInput(e.target.value)}
                    placeholder="tp.shapes()..."
                    spellCheck={false}
                    onMouseDown={stop}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && termInput.trim()) { runTermInput(termInput); }
                      if (e.key === 'ArrowUp') { e.preventDefault(); if (termHistory.length) { const idx = termHistIdx < 0 ? termHistory.length - 1 : Math.max(0, termHistIdx - 1); setTermHistIdx(idx); setTermInput(termHistory[idx]); } }
                      if (e.key === 'ArrowDown') { e.preventDefault(); if (termHistIdx >= 0) { const idx = termHistIdx + 1; if (idx >= termHistory.length) { setTermHistIdx(-1); setTermInput(''); } else { setTermHistIdx(idx); setTermInput(termHistory[idx]); } } }
                      if (e.key === 'Escape') { setTermInput(''); termInputRef.current?.blur(); }
                    }}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: fs(9), color: '#cdd6f4', fontFamily: MONO, padding: '2px 0',
                      caretColor: '#cba6f7'
                    }} />
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
          animation: 'none', fontFamily: MONO, whiteSpace: 'nowrap',
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
            {hasSel && <span style={{ fontSize: fs(8), color: '#cba6f7', opacity: .6 }}>({selLen} chars, {selLines} lines)</span>}
            <span style={{ fontSize: fs(8), color: '#555' }}>{lines.length} lines</span>
            {readonly && <span style={{ fontSize: fs(8), color: '#f9e2af', opacity: .5 }}>Read-only</span>}
            {tp && <span style={{ fontSize: fs(8), color: '#cba6f7', opacity: .4 }}>tp</span>}
            <span style={{ fontSize: fs(8), color: '#555', marginLeft: 'auto' }}>Spaces: 2</span>
            <span style={{ fontSize: fs(8), color: '#555' }}>
              {activeFile.endsWith('.js') ? 'JavaScript' : 'Text'}
            </span>
            <span style={{ fontSize: fs(8), color: '#555' }}>UTF-8</span>
          </div>
        );
      })()}
    </div>
  );
}
