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

  /* ---- Search state ---- */
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [replaceWith, setReplaceWith] = React.useState('');
  const [showReplace, setShowReplace] = React.useState(false);
  const searchRef = React.useRef(null);

  /* ---- Command palette ---- */
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [cmdQuery, setCmdQuery] = React.useState('');
  const cmdRef = React.useRef(null);

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
    const path = 'user/' + name;
    if (editFiles[path] !== undefined) return;
    setEditFiles(prev => ({ ...prev, [path]: `// ${name}\n` }));
    openFile(path);
  };

  const file = getFile(activeFile);
  const code = file?.content || '';
  const readonly = file?.readonly || false;
  const lines = code.split('\n');

  const setCode = (c) => {
    if (readonly) return;
    setEditFiles(prev => ({ ...prev, [activeFile]: c }));
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
    let idx = 0;
    const lower = code.toLowerCase(), term = searchTerm.toLowerCase();
    while (idx < lower.length) {
      const found = lower.indexOf(term, idx);
      if (found === -1) break;
      matches.push(found);
      idx = found + 1;
    }
    return matches;
  }, [code, searchTerm, searchOpen]);

  const replaceNext = () => {
    if (!searchMatches.length || readonly) return;
    const el = taRef.current;
    const pos = el ? el.selectionStart : 0;
    const match = searchMatches.find(m => m >= pos) ?? searchMatches[0];
    const nc = code.substring(0, match) + replaceWith + code.substring(match + searchTerm.length);
    setCode(nc);
  };

  const replaceAll = () => {
    if (!searchTerm || readonly) return;
    setCode(code.split(searchTerm).join(replaceWith));
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
    else if (key === 'newfile') { const name = prompt('File name (e.g. script.js):'); if (name) createFile(name); }
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
      if (searchOpen) { setSearchOpen(false); return; }
      if (cmdOpen) { setCmdOpen(false); return; }
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
    <div style={{ ...b, background: '#1e1e2e', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: MONO }}>

      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderBottom: '1px solid #ffffff10', gap: 6, flexShrink: 0, background: '#181825' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#ff5f56','#ffbd2e','#27c93f'].map((c, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: 99, background: c, opacity: .6 }} />)}
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
        <span onClick={() => { tp?.save(); setOutput({ logs: [{ t: 'log', v: 'State saved!' }], ms: null, err: null, errLn: null }); setTermOpen(true); }} onMouseDown={stop}
          style={{ fontSize: 8, color: '#89b4fa', cursor: 'pointer', lineHeight: 1, opacity: .7 }} title="Save current state">Save</span>
        <span onClick={() => { tp?.reset(); setOutput({ logs: [{ t: 'log', v: 'Reset to default!' }], ms: null, err: null, errLn: null }); setTermOpen(true); }} onMouseDown={stop}
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
        {showTree && <div style={{
          width: 130, background: '#181825', borderRight: '1px solid #ffffff08',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'auto'
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
                return (
                  <div key={f.path}
                    onClick={() => openFile(f.path)} onMouseDown={stop}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px 2px 22px',
                      cursor: 'pointer', fontSize: fs(9), userSelect: 'none',
                      background: isActive ? '#ffffff0a' : 'transparent',
                      color: isActive ? '#cdd6f4' : '#777',
                      borderLeft: isActive ? '2px solid #cba6f7' : '2px solid transparent',
                    }}>
                    <span style={{ fontSize: 6, color: FCOLORS[f.name] || (f.path.startsWith('user/') ? '#cba6f7' : '#555') }}>{'\u25CF'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                    {isReadonly && <span style={{ fontSize: 7, color: '#555', flexShrink: 0 }}>{'\uD83D\uDD12'}</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          {/* New file button */}
          <div onClick={() => { const name = prompt('File name (e.g. script.js):'); if (name) createFile(name); }}
            onMouseDown={stop}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', marginTop: 4,
              cursor: 'pointer', fontSize: fs(8), color: '#555', userSelect: 'none', borderTop: '1px solid #ffffff06' }}>
            <span style={{ fontSize: 10, lineHeight: 1 }}>+</span>
            <span>New file</span>
          </div>
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
                <div key={path} onClick={() => setActiveFile(path)} onMouseDown={stop}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    fontSize: fs(9), color: isActive ? '#cdd6f4' : '#555',
                    background: isActive ? '#1e1e2e' : 'transparent',
                    cursor: 'pointer', borderRight: '1px solid #ffffff06',
                    position: 'relative', whiteSpace: 'nowrap',
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

          {/* Search bar */}
          {searchOpen && (
            <div onMouseDown={stop} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px', background: '#181825', borderBottom: '1px solid #ffffff08', flexShrink: 0, alignItems: 'center' }}>
              <input ref={searchRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Find..." spellCheck={false}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { setSearchOpen(false); taRef.current?.focus(); } if (e.key === 'Enter') { /* jump to next match */ const el = taRef.current; if (el && searchMatches.length) { const pos = el.selectionStart; const m = searchMatches.find(x => x > pos) ?? searchMatches[0]; el.selectionStart = m; el.selectionEnd = m + searchTerm.length; el.focus(); } } }}
                style={{ flex: 1, minWidth: 80, maxWidth: 160, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
              <span style={{ fontSize: 8, color: '#555' }}>{searchMatches.length} found</span>
              <span onClick={() => setShowReplace(r => !r)} style={{ fontSize: 8, color: showReplace ? '#cba6f7' : '#555', cursor: 'pointer' }}>{showReplace ? '\u25BC' : '\u25B6'} Replace</span>
              <span onClick={() => { setSearchOpen(false); taRef.current?.focus(); }} style={{ fontSize: 9, color: '#555', cursor: 'pointer', lineHeight: 1 }}>{'\u00D7'}</span>
              {showReplace && (
                <div style={{ width: '100%', display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                  <input value={replaceWith} onChange={e => setReplaceWith(e.target.value)}
                    placeholder="Replace..." spellCheck={false}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setSearchOpen(false); }}
                    style={{ flex: 1, minWidth: 80, maxWidth: 160, background: '#1e1e2e', border: '1px solid #ffffff10', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
                  <span onClick={replaceNext} style={{ fontSize: 8, color: '#89b4fa', cursor: 'pointer' }}>Replace</span>
                  <span onClick={replaceAll} style={{ fontSize: 8, color: '#89b4fa', cursor: 'pointer' }}>All</span>
                </div>
              )}
            </div>
          )}

          {/* Command palette */}
          {cmdOpen && (
            <div onMouseDown={stop} style={{ position: 'absolute', top: 30, left: '10%', right: '10%', zIndex: 20, background: '#181825', border: '1px solid #ffffff15', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden', maxHeight: 200 }}>
              <input ref={cmdRef} value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                placeholder="Type a command or file..." spellCheck={false}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Escape') { setCmdOpen(false); taRef.current?.focus(); }
                  if (e.key === 'Enter' && commands.length) { runCommand(commands[0].key); }
                }}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #ffffff08', padding: '6px 10px', fontSize: 10, color: '#cdd6f4', outline: 'none', fontFamily: MONO }} />
              <div style={{ maxHeight: 150, overflow: 'auto' }}>
                {commands.slice(0, 8).map(c => (
                  <div key={c.key} onClick={() => runCommand(c.key)}
                    style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', fontSize: 9, color: '#a6adc8', cursor: 'pointer', gap: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {c.hint && <span style={{ fontSize: 8, color: '#555' }}>{c.hint}</span>}
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
              <div ref={lnRef} style={{
                padding: '8px 0', width: 32, textAlign: 'right', userSelect: 'none',
                borderRight: '1px solid #ffffff08', background: '#16162a', flexShrink: 0, overflow: 'hidden'
              }}>
                <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                  {lines.map((_, i) => (
                    <div key={i} style={{
                      fontSize: fs(9), lineHeight: lh,
                      color: i + 1 === activeLn ? '#cdd6f4' : output?.errLn === i + 1 ? '#f38ba8' : '#444',
                      paddingRight: 6,
                      background: i + 1 === activeLn ? '#ffffff06' : output?.errLn === i + 1 ? '#f38ba810' : 'transparent'
                    }}>{i + 1}</div>
                  ))}
                </div>
              </div>

              {/* Syntax highlight overlay */}
              <div ref={hlRef} style={{ position: 'absolute', left: 33, top: 0, right: 0, bottom: 0, padding: 8, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                {lines.map((l, i) => {
                  /* Search match highlighting for this line */
                  let searchHighlights = null;
                  if (searchOpen && searchTerm && l.toLowerCase().includes(searchTerm.toLowerCase())) {
                    const parts = [];
                    let rest = l, idx = 0;
                    const tl = searchTerm.length;
                    while (true) {
                      const fi = rest.toLowerCase().indexOf(searchTerm.toLowerCase());
                      if (fi === -1) { parts.push(<span key={idx}><HighlightLine text={rest} /></span>); break; }
                      if (fi > 0) parts.push(<span key={idx++}><HighlightLine text={rest.substring(0, fi)} /></span>);
                      parts.push(<span key={idx++} style={{ background: '#f9e2af40', borderRadius: 2, outline: '1px solid #f9e2af60' }}><HighlightLine text={rest.substring(fi, fi + tl)} /></span>);
                      rest = rest.substring(fi + tl);
                    }
                    searchHighlights = parts;
                  }
                  return (
                    <div key={i} style={{
                      fontSize: fs(10), lineHeight: lh, whiteSpace: 'pre',
                      height: Math.round(16 * fsize),
                      background: i + 1 === activeLn ? '#ffffff04' : output?.errLn === i + 1 ? '#f38ba808' : 'transparent',
                    }}>
                      {searchHighlights || <HighlightLine text={l} />}
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={taRef} value={code}
                onChange={e => { setCode(e.target.value); updateCursor(e.target); }}
                onScroll={e => setScrollTop(e.target.scrollTop)}
                onMouseDown={stop} onClick={e => updateCursor(e.target)}
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
                height: '35%', minHeight: 60, maxHeight: 200,
                background: '#11111b', borderTop: '1px solid #ffffff10',
                display: 'flex', flexDirection: 'column', flexShrink: 0
              }}>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '2px 10px',
        borderTop: '1px solid #ffffff08', gap: 8, flexShrink: 0, background: '#181825'
      }}>
        <span style={{ fontSize: fs(8), color: output?.err ? '#f38ba8' : '#27c93f' }}>{'\u25CF'}</span>
        <span style={{ fontSize: fs(8), color: '#555' }}>Ln {cursor.ln}, Col {cursor.col}</span>
        <span style={{ fontSize: fs(8), color: '#555' }}>{lines.length} lines</span>
        {readonly && <span style={{ fontSize: fs(8), color: '#f9e2af', opacity: .5 }}>Read-only</span>}
        {tp && <span style={{ fontSize: fs(8), color: '#cba6f7', opacity: .4 }}>tp</span>}
        <span style={{ fontSize: fs(8), color: '#555', marginLeft: 'auto' }}>
          {activeFile.endsWith('.js') ? 'JavaScript' : 'Text'}
        </span>
        <span style={{ fontSize: fs(8), color: '#555' }}>UTF-8</span>
      </div>
    </div>
  );
}
