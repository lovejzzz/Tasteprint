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
 * tp.shapes()     \u2192 [{ id, type, x, y, w, h, variant }]
 * tp.device()     \u2192 "free" | "desktop" | "phone"
 * tp.fonts()      \u2192 ["DM Sans", "Inter", ...]
 *
 * \u2500\u2500 WRITE \u2500\u2500
 * tp.setPalette(name)
 * tp.setDevice(mode)
 * tp.add(type, opts?)      \u2192 id
 *   opts: { x, y, w, h, variant }
 *   types: "button","card","hero","navbar","stat-card",
 *          "badge","toast","toggle","input","modal",...
 * tp.remove(id)
 * tp.update(id, changes)
 *   changes: { x, y, w, h, variant }
 * tp.clear()               \u2192 removes all (keeps IDE)
 *
 * \u2500\u2500 EXAMPLES \u2500\u2500
 * // Add a row of buttons
 * for (let i = 0; i < 3; i++) {
 *   tp.add('button', { x: 50 + i * 220, y: 100 });
 * }
 *
 * // Random palette
 * const pals = tp.palettes();
 * tp.setPalette(pals[Math.floor(Math.random() * pals.length)]);
 *
 * // Remove first shape
 * const first = tp.shapes()[0];
 * if (first) tp.remove(first.id);
 */
`;

/* File tree structure */
const TREE = [
  { name: 'src', children: [
    { name: 'main.js', path: 'src/main.js' },
    { name: 'playground.js', path: 'src/playground.js' },
  ]},
  { name: 'config', children: [
    { name: 'palette.js', path: 'config/palette.js' },
    { name: 'shapes.js', path: 'config/shapes.js' },
  ]},
  { name: 'docs', children: [
    { name: 'api.js', path: 'docs/api.js' },
  ]},
];

const FCOLORS = {
  'main.js':'#f9e2af', 'playground.js':'#f9e2af',
  'palette.js':'#89b4fa', 'shapes.js':'#89b4fa',
  'api.js':'#a6e3a1',
};

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

/* ========== Component ========== */
export default function CodeIDE({ b, p, fsize = 1 }) {
  const tp = React.useContext(TpContext);
  const fs = n => Math.round(n * fsize);
  const lh = Math.round(16 * fsize) + 'px';

  /* ---- File system ---- */
  const initFiles = React.useMemo(() => ({
    'src/main.js': MAIN_DEFAULT,
    'src/playground.js': PLAYGROUND_DEFAULT,
  }), []);
  const [editFiles, setEditFiles] = React.useState(initFiles);
  const [activeFile, setActiveFile] = React.useState('src/main.js');
  const [openTabs, setOpenTabs] = React.useState(['src/main.js']);
  const [openFolders, setOpenFolders] = React.useState({ src: true, config: false, docs: false });
  const [showTree, setShowTree] = React.useState(true);

  /* ---- Editor state ---- */
  const [cursor, setCursor] = React.useState({ ln: 1, col: 1 });
  const [activeLn, setActiveLn] = React.useState(1);
  const taRef = React.useRef(null);

  /* ---- Terminal state ---- */
  const [termOpen, setTermOpen] = React.useState(false);
  const [output, setOutput] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  /* ---- File helpers ---- */
  const getFile = (path) => {
    if (editFiles[path] !== undefined) return { content: editFiles[path], readonly: false };
    if (path === 'config/palette.js') return { content: genPalette(tp), readonly: true };
    if (path === 'config/shapes.js') return { content: genShapes(tp), readonly: true };
    if (path === 'docs/api.js') return { content: API_DOCS, readonly: true };
    return null;
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

    if (e.key === 'Tab') { e.preventDefault(); setCode(code.substring(0, s) + '  ' + code.substring(en)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + 2 }, 0); return; }
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
        <span onClick={() => setTermOpen(t => !t)} onMouseDown={stop}
          style={{ fontSize: 10, color: termOpen ? '#cba6f7' : '#555', cursor: 'pointer', lineHeight: 1 }} title="Toggle terminal">&gt;_</span>
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
                const isReadonly = !editFiles.hasOwnProperty(f.path);
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
                    <span style={{ fontSize: 6, color: FCOLORS[f.name] || '#555' }}>{'\u25CF'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                    {isReadonly && <span style={{ fontSize: 7, color: '#555', flexShrink: 0 }}>{'\uD83D\uDD12'}</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>}

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

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

          {/* Editor + Terminal split */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Code editor */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
              {/* Line numbers */}
              <div style={{
                padding: '8px 0', width: 32, textAlign: 'right', userSelect: 'none',
                borderRight: '1px solid #ffffff08', background: '#16162a', flexShrink: 0, overflow: 'hidden'
              }}>
                {lines.map((_, i) => (
                  <div key={i} style={{
                    fontSize: fs(9), lineHeight: lh,
                    color: i + 1 === activeLn ? '#cdd6f4' : output?.errLn === i + 1 ? '#f38ba8' : '#444',
                    paddingRight: 6,
                    background: i + 1 === activeLn ? '#ffffff06' : output?.errLn === i + 1 ? '#f38ba810' : 'transparent'
                  }}>{i + 1}</div>
                ))}
              </div>

              {/* Syntax highlight overlay */}
              <div style={{ position: 'absolute', left: 33, top: 0, right: 0, bottom: 0, padding: 8, pointerEvents: 'none', overflow: 'hidden' }}>
                {lines.map((l, i) => (
                  <div key={i} style={{
                    fontSize: fs(10), lineHeight: lh, whiteSpace: 'pre',
                    height: Math.round(16 * fsize),
                    background: i + 1 === activeLn ? '#ffffff04' : output?.errLn === i + 1 ? '#f38ba808' : 'transparent',
                  }}>
                    <HighlightLine text={l} />
                  </div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={taRef} value={code}
                onChange={e => { setCode(e.target.value); updateCursor(e.target); }}
                onMouseDown={stop} onClick={e => updateCursor(e.target)}
                onKeyUp={e => updateCursor(e.target)} onKeyDown={handleKey}
                readOnly={readonly} spellCheck={false}
                style={{
                  flex: 1, background: 'transparent', color: 'transparent',
                  caretColor: readonly ? 'transparent' : '#cba6f7',
                  border: 'none', outline: 'none', resize: 'none', padding: 8,
                  fontSize: fs(10), lineHeight: lh, fontFamily: MONO,
                  tabSize: 2, whiteSpace: 'pre', overflowX: 'auto', minWidth: 0,
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
                <div style={{ flex: 1, overflow: 'auto', padding: '4px 10px' }}>
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
