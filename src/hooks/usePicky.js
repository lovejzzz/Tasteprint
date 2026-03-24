import { useState, useCallback, useRef } from "react";
import { LIB, DEFAULT_PROPS, VARIANTS } from "../constants";
import { uid, generateDesignDNA, designerRandomize } from "../utils";

/* ── Page Templates ── */
export const PAGE_TEMPLATES = [
  { id: "landing",   label: "Landing Page", icon: "rocket",
    slots: [
      { type: "navbar",        label: "Navigation" },
      { type: "hero",          label: "Hero Section" },
      { type: "card",          label: "Features" },
      { type: "testimonial",   label: "Social Proof" },
      { type: "pricing-card",  label: "Pricing" },
      { type: "footer",        label: "Footer" },
    ],
  },
  { id: "dashboard", label: "Dashboard", icon: "chart",
    slots: [
      { type: "navbar",      label: "Top Bar" },
      { type: "stat-card",   label: "Stats" },
      { type: "chart",       label: "Chart" },
      { type: "table",       label: "Data Table" },
    ],
  },
  { id: "portfolio", label: "Portfolio", icon: "palette",
    slots: [
      { type: "navbar",       label: "Navigation" },
      { type: "hero",         label: "Intro" },
      { type: "bento-grid",   label: "Work Grid" },
      { type: "profile-card", label: "About Me" },
      { type: "footer",       label: "Footer" },
    ],
  },
  { id: "ecommerce", label: "Shop", icon: "cart",
    slots: [
      { type: "navbar",        label: "Navigation" },
      { type: "promo-banner",  label: "Promo" },
      { type: "product-card",  label: "Product" },
      { type: "feature-table", label: "Comparison" },
      { type: "footer",        label: "Footer" },
    ],
  },
  { id: "blog", label: "Blog", icon: "pencil",
    slots: [
      { type: "navbar",        label: "Navigation" },
      { type: "hero",          label: "Featured Post" },
      { type: "card",          label: "Article Card" },
      { type: "sidebar",       label: "Sidebar" },
      { type: "footer",        label: "Footer" },
    ],
  },
  { id: "saas", label: "SaaS Landing", icon: "cloud",
    slots: [
      { type: "navbar",        label: "Navigation" },
      { type: "hero",          label: "Hero" },
      { type: "stat-card",     label: "Metrics" },
      { type: "pricing-card",  label: "Pricing" },
      { type: "testimonial",   label: "Testimonials" },
      { type: "footer",        label: "Footer" },
    ],
  },
  { id: "restaurant", label: "Restaurant", icon: "fork",
    slots: [
      { type: "navbar",             label: "Navigation" },
      { type: "hero",               label: "Hero Banner" },
      { type: "bento-grid",         label: "Menu Grid" },
      { type: "testimonial",        label: "Reviews" },
      { type: "footer",             label: "Footer" },
    ],
  },
  { id: "event", label: "Event Page", icon: "calendar",
    slots: [
      { type: "navbar",        label: "Navigation" },
      { type: "hero",          label: "Event Banner" },
      { type: "card",          label: "Details" },
      { type: "timeline",      label: "Schedule" },
      { type: "profile-card",  label: "Speaker" },
      { type: "footer",        label: "Footer" },
    ],
  },
  { id: "resume", label: "Resume / CV", icon: "user",
    slots: [
      { type: "profile-card",  label: "Profile" },
      { type: "timeline",      label: "Experience" },
      { type: "stat-card",     label: "Skills" },
      { type: "accordion",     label: "Education" },
      { type: "footer",        label: "Contact" },
    ],
  },
];

/* Look up LIB entry (dimensions + label) for a component type */
export function libEntry(type) {
  for (const cat of LIB) {
    const item = cat.items.find(i => i.type === type);
    if (item) return item;
  }
  return { type, label: type, w: 300, h: 200 }; // fallback
}

/* Pick a contrasting mood (not the current one, not auto) */
const CORE_MOODS = ["minimal", "bold", "elegant", "playful", "artdeco", "synthwave"];
function contrastingMood(current) {
  const pool = CORE_MOODS.filter(m => m !== current);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* Classify palette temperature from accent hex → warm/cool/neutral moods */
const WARM_MOODS = ["bold", "playful", "artdeco", "collage", "kawaii"];
const COOL_MOODS = ["elegant", "minimal", "synthwave", "scifi", "porcelain"];

function _hexHue(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return -1; // achromatic
  let hue;
  const d = max - min;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else hue = ((r - g) / d + 4) * 60;
  return hue;
}

export function paletteTemperature(palette) {
  const hue = _hexHue(palette.ac || "#888888");
  if (hue < 0) return "neutral"; // achromatic (noir, mono)
  // warm: 0-60 (red-yellow) and 330-360 (magenta-red)
  if ((hue >= 0 && hue <= 60) || hue >= 330) return "warm";
  // cool: 180-300 (cyan-blue-purple)
  if (hue >= 180 && hue <= 300) return "cool";
  return "neutral"; // green/mixed range
}

function paletteAwareMood(palette, exclude) {
  const temp = paletteTemperature(palette);
  const pool = temp === "warm" ? WARM_MOODS : temp === "cool" ? COOL_MOODS : CORE_MOODS;
  const filtered = pool.filter(m => m !== exclude);
  return filtered.length > 0
    ? filtered[Math.floor(Math.random() * filtered.length)]
    : contrastingMood(exclude);
}

/**
 * Generate 4 diverse options for a given component type.
 * @param {string} type - component type
 * @param {object} palette - current palette object (p)
 * @param {object} dna - session Design DNA
 * @param {string} sessionMood - the mood chosen for this Picky session
 * @param {object} libItem - LIB entry { type, w, h }
 * @returns {Array<object>} 4 option objects
 */
/** Generate a single option, retrying up to 5 times to avoid used variant indices. */
function _genUnique(type, palette, defaults, mood, otherShapes, dna, w, h, usedVariants) {
  const varCount = (VARIANTS[type] || []).length || 1;
  let best = designerRandomize(type, palette, defaults, mood, otherShapes, dna, w, h);
  if (usedVariants.size >= varCount) return best; // can't avoid duplicates if fewer variants than options
  for (let i = 0; i < 5 && usedVariants.has(best.variant); i++) {
    best = designerRandomize(type, palette, defaults, mood, otherShapes, dna, w, h);
  }
  return best;
}

function generateOptions(type, palette, dna, sessionMood, libItem) {
  const defaults = DEFAULT_PROPS[type] || {};
  const w = libItem.w;
  const h = libItem.h;
  const used = new Set();

  // Parse blend format: "blend:mood1+mood2"
  const isBlend = sessionMood.startsWith("blend:");
  const mood1 = isBlend ? sessionMood.split(":")[1].split("+")[0] : sessionMood;
  const mood2 = isBlend ? sessionMood.split(":")[1].split("+")[1] : null;

  // Option A: session DNA + primary mood
  const a = _genUnique(type, palette, defaults, mood1, [], dna, w, h, used);
  a.mood = mood1;
  used.add(a.variant);

  // Option B: session DNA + secondary mood (or same mood, different variant)
  const bMood = mood2 || mood1;
  const bDna = mood2 ? generateDesignDNA(palette, mood2) : dna;
  const b = _genUnique(type, palette, defaults, bMood, [], bDna, w, h, used);
  b.mood = bMood;
  used.add(b.variant);

  // Option C: palette-aware contrasting mood (or blend's secondary for variety)
  const cMood = isBlend ? paletteAwareMood(palette, mood2) : paletteAwareMood(palette, mood1);
  const c = _genUnique(type, palette, defaults, cMood, [], dna, w, h, used);
  c.mood = cMood;
  used.add(c.variant);

  // Option D: fresh DNA + palette-aware random mood (wild card)
  const dMood = paletteAwareMood(palette, cMood);
  const freshDna = generateDesignDNA(palette, dMood);
  const d = _genUnique(type, palette, defaults, dMood, [], freshDna, w, h, used);
  d.mood = dMood;

  return [a, b, c, d];
}

/**
 * Assemble picked options into positioned shapes for the canvas.
 * @param {object} template - the chosen PAGE_TEMPLATE
 * @param {Map} picks - Map<slotIndex, option>
 * @param {string} device - "desktop" | "phone" | "free"
 * @param {boolean} mobile - viewport is mobile
 * @returns {Array<object>} shapes array ready for push()
 */
/* Layout categories for smart assembly */
const FULL_WIDTH_TYPES = new Set(["navbar", "footer", "hero", "promo-banner", "heading"]);
const SMALL_TYPES = new Set(["stat-card", "card-sm", "badge", "button", "toggle", "rating"]);
const SIDEBAR_TYPE = "sidebar";

export function assembleShapes(template, picks, device, mobile) {
  const isPhone = device === "phone" || mobile;
  const canvasWidth = isPhone ? 390 : 1280;
  const pad = isPhone ? 16 : 32;
  const gap = isPhone ? 12 : 16;
  const maxW = canvasWidth - pad * 2;

  // Collect picked slots in order
  const pickedSlots = [];
  for (let i = 0; i < template.slots.length; i++) {
    const pick = picks.get(i);
    if (!pick) continue;
    pickedSlots.push({ slot: template.slots[i], pick, lib: libEntry(template.slots[i].type) });
  }

  const shapes = [];
  let cy = pad;
  let idx = 0;

  while (idx < pickedSlots.length) {
    const { slot, pick, lib } = pickedSlots[idx];
    const type = slot.type;

    // ── Full-width components: stretch to maxW ──
    if (FULL_WIDTH_TYPES.has(type)) {
      const w = maxW;
      const h = lib.h * (maxW / lib.w);
      shapes.push(_mkShape(type, pad, cy, w, h, pick, shapes.length));
      cy += h + gap;
      idx++;
      continue;
    }

    // ── Sidebar + next content: side-by-side (desktop only) ──
    if (!isPhone && type === SIDEBAR_TYPE && idx + 1 < pickedSlots.length) {
      const next = pickedSlots[idx + 1];
      const sideW = Math.min(lib.w, maxW * 0.22);
      const sideH = lib.h * (sideW / lib.w);
      const contentW = maxW - sideW - gap;
      const contentH = next.lib.h * (contentW / next.lib.w);
      const rowH = Math.max(sideH, contentH);
      shapes.push(_mkShape(type, pad, cy, sideW, rowH, pick, shapes.length));
      shapes.push(_mkShape(next.slot.type, pad + sideW + gap, cy, contentW, rowH, next.pick, shapes.length));
      cy += rowH + gap;
      idx += 2;
      continue;
    }

    // ── Small components: grid up to 3 per row (desktop only) ──
    if (!isPhone && SMALL_TYPES.has(type)) {
      const row = [pickedSlots[idx]];
      while (row.length < 3 && idx + row.length < pickedSlots.length && SMALL_TYPES.has(pickedSlots[idx + row.length].slot.type)) {
        row.push(pickedSlots[idx + row.length]);
      }
      const colW = (maxW - gap * (row.length - 1)) / row.length;
      let rowH = 0;
      for (const r of row) {
        const h = r.lib.h * (colW / r.lib.w);
        if (h > rowH) rowH = h;
      }
      for (let c = 0; c < row.length; c++) {
        const cx = pad + c * (colW + gap);
        shapes.push(_mkShape(row[c].slot.type, cx, cy, colW, rowH, row[c].pick, shapes.length));
      }
      cy += rowH + gap;
      idx += row.length;
      continue;
    }

    // ── Default: centered, scaled to fit ──
    const scale = Math.min(1, maxW / lib.w);
    const w = lib.w * scale;
    const h = lib.h * scale;
    const x = canvasWidth / 2 - w / 2;
    shapes.push(_mkShape(type, x, cy, w, h, pick, shapes.length));
    cy += h + gap;
    idx++;
  }

  return shapes;
}

function _mkShape(type, x, y, w, h, pick, idx) {
  return {
    id: uid(),
    type,
    x, y, w, h,
    variant: pick.variant,
    font: pick.font,
    fsize: pick.fsize,
    texts: {},
    props: pick.props || {},
    dStyles: pick.dStyles || {},
    _pickyDelay: idx * 120,
  };
}

/**
 * Core Picky hook — state machine, option generation, assembly.
 */
/* Mood choices shown in the mood picker */
export const PICKY_MOODS = [
  { id: "minimal",   label: "Minimal",   desc: "Clean & understated" },
  { id: "bold",      label: "Bold",      desc: "Strong & dramatic" },
  { id: "elegant",   label: "Elegant",   desc: "Refined & polished" },
  { id: "playful",   label: "Playful",   desc: "Fun & colorful" },
  { id: "artdeco",   label: "Art Deco",  desc: "Geometric & glamorous" },
  { id: "synthwave", label: "Synthwave", desc: "Retro neon vibes" },
];

export const QUICK_PRESETS = [
  { template: "landing",   mood: "minimal",   label: "Minimal Landing" },
  { template: "landing",   mood: "bold",      label: "Bold Landing" },
  { template: "dashboard", mood: "elegant",   label: "Elegant Dashboard" },
  { template: "portfolio", mood: "playful",   label: "Playful Portfolio" },
  { template: "saas",      mood: "synthwave", label: "Synthwave SaaS" },
  { template: "resume",    mood: "minimal",   label: "Clean Resume" },
];

/* Available component types for the custom template builder */
export const CUSTOM_SLOT_OPTIONS = [
  { type: "navbar",        label: "Navigation" },
  { type: "hero",          label: "Hero" },
  { type: "heading",       label: "Heading" },
  { type: "card",          label: "Card" },
  { type: "stat-card",     label: "Stats" },
  { type: "testimonial",   label: "Testimonial" },
  { type: "pricing-card",  label: "Pricing" },
  { type: "product-card",  label: "Product" },
  { type: "chart",         label: "Chart" },
  { type: "table",         label: "Table" },
  { type: "bento-grid",    label: "Grid" },
  { type: "timeline",      label: "Timeline" },
  { type: "accordion",     label: "Accordion" },
  { type: "profile-card",  label: "Profile" },
  { type: "sidebar",       label: "Sidebar" },
  { type: "promo-banner",  label: "Banner" },
  { type: "footer",        label: "Footer" },
];

/* ── Picky session history (localStorage) ── */
const HISTORY_KEY = "tp_picky_history";
const MAX_HISTORY = 3;

export function loadPickyHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw).slice(0, MAX_HISTORY) : [];
  } catch { return []; }
}

function saveToHistory(templateId, templateLabel, mood) {
  try {
    const hist = loadPickyHistory().filter(h => !(h.templateId === templateId && h.mood === mood));
    hist.unshift({ templateId, templateLabel, mood, timestamp: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, MAX_HISTORY)));
  } catch { /* ignore storage errors */ }
}

export function usePicky({ pRef, device, mobile }) {
  const [phase, setPhase] = useState("idle"); // idle | template | custom | mood | picking | done
  const [template, setTemplate] = useState(null);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState(new Map());

  // Cache options per step to avoid regeneration on back-navigation
  const optionsCache = useRef(new Map());
  const dnaRef = useRef(null);
  const moodRef = useRef("auto");

  const enterPicky = useCallback(() => {
    setPhase("template");
    setTemplate(null);
    setStep(0);
    setPicks(new Map());
    optionsCache.current = new Map();
    dnaRef.current = null;
  }, []);

  const selectTemplate = useCallback((templateId) => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    setTemplate(tmpl);
    setStep(0);
    setPicks(new Map());
    optionsCache.current = new Map();
    setPhase("mood");
  }, []);

  const enterCustom = useCallback(() => {
    setPhase("custom");
  }, []);

  const confirmCustom = useCallback((selectedTypes) => {
    if (!selectedTypes || selectedTypes.length === 0) return;
    const slots = selectedTypes.map(type => {
      const opt = CUSTOM_SLOT_OPTIONS.find(o => o.type === type);
      return { type, label: opt?.label || type };
    });
    const tmpl = { id: "custom", label: "Custom", icon: "wrench", slots };
    setTemplate(tmpl);
    setStep(0);
    setPicks(new Map());
    optionsCache.current = new Map();
    setPhase("mood");
  }, []);

  const selectMood = useCallback((moodId) => {
    let mood = moodId;
    if (moodId === "surprise") {
      mood = CORE_MOODS[Math.floor(Math.random() * CORE_MOODS.length)];
    }
    moodRef.current = mood;
    // For blends ("blend:x+y"), generate DNA from the first mood
    const dnaMood = mood.startsWith("blend:") ? mood.split(":")[1].split("+")[0] : mood;
    dnaRef.current = generateDesignDNA(pRef.current, dnaMood);
    optionsCache.current = new Map();
    setPhase("picking");
  }, [pRef]);

  const quickStart = useCallback((templateId, moodId) => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    const mood = moodId === "surprise"
      ? CORE_MOODS[Math.floor(Math.random() * CORE_MOODS.length)]
      : moodId;
    setTemplate(tmpl);
    setStep(0);
    setPicks(new Map());
    moodRef.current = mood;
    dnaRef.current = generateDesignDNA(pRef.current, mood);
    optionsCache.current = new Map();
    setPhase("picking");
  }, [pRef]);

  // Get options for current step (lazy + cached)
  const getOptions = useCallback((stepIdx, tmpl) => {
    if (!tmpl) return [];
    if (optionsCache.current.has(stepIdx)) return optionsCache.current.get(stepIdx);
    const slot = tmpl.slots[stepIdx];
    if (!slot) return [];
    const lib = libEntry(slot.type);
    const opts = generateOptions(slot.type, pRef.current, dnaRef.current, moodRef.current, lib);
    optionsCache.current.set(stepIdx, opts);
    return opts;
  }, [pRef]);

  const pickOption = useCallback((optionIndex) => {
    const opts = optionsCache.current.get(step);
    if (!opts || !opts[optionIndex]) return;
    setPicks(prev => {
      const next = new Map(prev);
      next.set(step, opts[optionIndex]);
      return next;
    });
    // Auto-advance
    if (template && step < template.slots.length - 1) {
      setStep(s => s + 1);
    } else {
      setPhase("done");
    }
  }, [step, template]);

  const skipSlot = useCallback(() => {
    setPicks(prev => {
      const next = new Map(prev);
      next.delete(step);
      return next;
    });
    if (template && step < template.slots.length - 1) {
      setStep(s => s + 1);
    } else {
      setPhase("done");
    }
  }, [step, template]);

  const prevStep = useCallback(() => {
    if (phase === "done") {
      // Go back to the last picking step
      if (template) setStep(template.slots.length - 1);
      setPhase("picking");
    } else if (step > 0) {
      setStep(s => s - 1);
    } else {
      // Go back to mood selection
      setPhase("mood");
    }
  }, [phase, step, template]);

  const regenerate = useCallback(() => {
    if (phase !== "picking" || !template) return;
    const slot = template.slots[step];
    if (!slot) return;
    // Clear cache for current step so getOptions generates fresh ones
    optionsCache.current.delete(step);
    // Force re-render by bumping a counter — we use setPicks identity to trigger
    setPicks(prev => new Map(prev));
  }, [phase, template, step]);

  const clearCache = useCallback(() => {
    optionsCache.current = new Map();
    setPicks(prev => new Map(prev)); // force re-render
  }, []);

  const goToStep = useCallback((idx) => {
    if (!template || idx < 0 || idx >= template.slots.length) return;
    if (phase === "done") setPhase("picking");
    setStep(idx);
  }, [template, phase]);

  const assemble = useCallback(() => {
    if (!template) return [];
    saveToHistory(template.id, template.label, moodRef.current);
    return assembleShapes(template, picks, device, mobile);
  }, [template, picks, device, mobile]);

  const addSlot = useCallback((type) => {
    if (!template) return;
    const opt = CUSTOM_SLOT_OPTIONS.find(o => o.type === type);
    const newSlot = { type, label: opt?.label || type };
    const newTemplate = { ...template, slots: [...template.slots, newSlot] };
    setTemplate(newTemplate);
    setStep(newTemplate.slots.length - 1); // jump to the new slot
    setPhase("picking");
  }, [template]);

  const remix = useCallback(() => {
    if (!template) return;
    // Keep template, mood, and picks — just regenerate all options
    optionsCache.current = new Map();
    // Regenerate DNA for fresh variety while keeping same mood
    dnaRef.current = generateDesignDNA(pRef.current, moodRef.current);
    setStep(0);
    setPhase("picking");
  }, [template, pRef]);

  const cancelPicky = useCallback(() => {
    setPhase("idle");
    setTemplate(null);
    setStep(0);
    setPicks(new Map());
    optionsCache.current = new Map();
    dnaRef.current = null;
  }, []);

  // Compute options for current step
  const options = phase === "picking" ? getOptions(step, template) : [];
  const totalSteps = template ? template.slots.length : 0;
  const currentSlot = template?.slots[step] || null;

  return {
    phase,
    template,
    step,
    totalSteps,
    options,
    picks,
    currentSlot,

    sessionMood: moodRef.current,

    enterPicky,
    selectTemplate,
    enterCustom,
    confirmCustom,
    selectMood,
    quickStart,
    pickOption,
    skipSlot,
    prevStep,
    regenerate,
    clearCache,
    goToStep,
    assemble,
    addSlot,
    remix,
    cancelPicky,
  };
}
