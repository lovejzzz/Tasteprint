import { renderHook, act } from "@testing-library/react";
import { usePicky, PAGE_TEMPLATES, PICKY_MOODS, assembleShapes, paletteTemperature } from "../hooks/usePicky";
import { PAL } from "../constants";

/** Build the ref-based params that usePicky expects. */
function makeParams(palKey = "warm", device = "desktop", mobile = false) {
  return {
    pRef: { current: PAL[palKey] },
    device,
    mobile,
  };
}

describe("usePicky", () => {
  it("initializes in idle phase", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    expect(result.current.phase).toBe("idle");
    expect(result.current.template).toBeNull();
    expect(result.current.step).toBe(0);
    expect(result.current.options).toEqual([]);
    expect(result.current.picks.size).toBe(0);
  });

  it("enterPicky transitions to template phase", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    expect(result.current.phase).toBe("template");
  });

  it("selectTemplate transitions to mood phase", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    expect(result.current.phase).toBe("mood");
    expect(result.current.template.id).toBe("landing");
    expect(result.current.totalSteps).toBe(PAGE_TEMPLATES.find(t => t.id === "landing").slots.length);
  });

  it("selectMood transitions to picking phase and generates options", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("bold"));
    expect(result.current.phase).toBe("picking");
    expect(result.current.sessionMood).toBe("bold");
    expect(result.current.options).toHaveLength(4);
    expect(result.current.step).toBe(0);
  });

  it("selectMood 'surprise' picks a random core mood (not 'surprise' itself)", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("surprise"));
    expect(result.current.phase).toBe("picking");
    expect(result.current.sessionMood).not.toBe("surprise");
    expect(result.current.sessionMood).not.toBe("auto");
  });

  it("pickOption records pick and auto-advances step", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("minimal"));
    expect(result.current.step).toBe(0);
    act(() => result.current.pickOption(0));
    expect(result.current.step).toBe(1);
    expect(result.current.picks.size).toBe(1);
    expect(result.current.picks.has(0)).toBe(true);
  });

  it("pickOption on last slot transitions to done phase", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("minimal"));
    const totalSlots = result.current.totalSteps;
    // Pick all slots
    for (let i = 0; i < totalSlots; i++) {
      act(() => result.current.pickOption(0));
    }
    expect(result.current.phase).toBe("done");
    expect(result.current.picks.size).toBe(totalSlots);
  });

  it("skipSlot advances without recording a pick", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("elegant"));
    act(() => result.current.skipSlot());
    expect(result.current.step).toBe(1);
    expect(result.current.picks.has(0)).toBe(false);
  });

  it("prevStep goes back from picking step > 0", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("bold"));
    act(() => result.current.pickOption(0));
    expect(result.current.step).toBe(1);
    act(() => result.current.prevStep());
    expect(result.current.step).toBe(0);
  });

  it("prevStep at step 0 goes back to mood phase", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("bold"));
    expect(result.current.step).toBe(0);
    act(() => result.current.prevStep());
    expect(result.current.phase).toBe("mood");
  });

  it("prevStep from done goes back to last picking step", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("dashboard")); // 4 slots
    act(() => result.current.selectMood("playful"));
    const total = result.current.totalSteps;
    for (let i = 0; i < total; i++) {
      act(() => result.current.pickOption(0));
    }
    expect(result.current.phase).toBe("done");
    act(() => result.current.prevStep());
    expect(result.current.phase).toBe("picking");
    expect(result.current.step).toBe(total - 1);
  });

  it("goToStep navigates to a specific step", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("minimal"));
    act(() => result.current.pickOption(0));
    act(() => result.current.pickOption(1));
    expect(result.current.step).toBe(2);
    act(() => result.current.goToStep(0));
    expect(result.current.step).toBe(0);
  });

  it("regenerate clears option cache for current step", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("bold"));
    const _optionsBefore = result.current.options.map(o => o.variant);
    // Regenerate — new random options (may or may not differ, but shouldn't throw)
    act(() => result.current.regenerate());
    expect(result.current.options).toHaveLength(4);
  });

  it("cancelPicky resets to idle", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("bold"));
    act(() => result.current.pickOption(0));
    act(() => result.current.cancelPicky());
    expect(result.current.phase).toBe("idle");
    expect(result.current.template).toBeNull();
    expect(result.current.picks.size).toBe(0);
  });

  it("options have required shape properties", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("minimal"));
    const opts = result.current.options;
    for (const opt of opts) {
      expect(typeof opt.variant).toBe("number");
      expect(typeof opt.font).toBe("number");
      expect(typeof opt.fsize).toBe("number");
      expect(opt.mood).toBeTruthy();
    }
  });

  it("selectTemplate with invalid id does nothing", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("nonexistent"));
    expect(result.current.phase).toBe("template");
    expect(result.current.template).toBeNull();
  });

  it("pickOption with out-of-range index is a no-op", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.selectTemplate("landing"));
    act(() => result.current.selectMood("bold"));
    act(() => result.current.pickOption(99));
    expect(result.current.step).toBe(0);
    expect(result.current.picks.size).toBe(0);
  });
  it("quickStart skips mood phase and goes straight to picking", () => {
    const { result } = renderHook(() => usePicky(makeParams()));
    act(() => result.current.enterPicky());
    act(() => result.current.quickStart("landing", "elegant"));
    expect(result.current.phase).toBe("picking");
    expect(result.current.template.id).toBe("landing");
    expect(result.current.sessionMood).toBe("elegant");
    expect(result.current.options).toHaveLength(4);
  });
});

describe("assembleShapes", () => {
  it("produces positioned shapes for desktop device", () => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === "landing");
    const picks = new Map();
    // Create minimal picks for each slot
    tmpl.slots.forEach((slot, i) => {
      picks.set(i, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    });
    const shapes = assembleShapes(tmpl, picks, "desktop", false);
    expect(shapes).toHaveLength(tmpl.slots.length);
    for (const s of shapes) {
      expect(s.id).toBeTruthy();
      expect(typeof s.x).toBe("number");
      expect(typeof s.y).toBe("number");
      expect(s.w).toBeGreaterThan(0);
      expect(s.h).toBeGreaterThan(0);
      expect(s.x).toBeGreaterThanOrEqual(0);
    }
    // Shapes should be vertically stacked (each y > previous y)
    for (let i = 1; i < shapes.length; i++) {
      expect(shapes[i].y).toBeGreaterThan(shapes[i - 1].y);
    }
  });

  it("uses phone dimensions when device is phone", () => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === "dashboard");
    const picks = new Map();
    tmpl.slots.forEach((slot, i) => {
      picks.set(i, { variant: 0, font: 0, fsize: 1, props: {} });
    });
    const shapes = assembleShapes(tmpl, picks, "phone", false);
    // All shapes should fit within 390px phone width
    for (const s of shapes) {
      expect(s.x + s.w).toBeLessThanOrEqual(390);
    }
  });

  it("skips unpicked slots", () => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === "landing");
    const picks = new Map();
    // Only pick first and last
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {} });
    picks.set(tmpl.slots.length - 1, { variant: 1, font: 1, fsize: 1, props: {} });
    const shapes = assembleShapes(tmpl, picks, "desktop", false);
    expect(shapes).toHaveLength(2);
  });

  it("includes _pickyDelay for entrance animation", () => {
    const tmpl = PAGE_TEMPLATES.find(t => t.id === "dashboard");
    const picks = new Map();
    tmpl.slots.forEach((slot, i) => {
      picks.set(i, { variant: 0, font: 0, fsize: 1, props: {} });
    });
    const shapes = assembleShapes(tmpl, picks, "desktop", false);
    shapes.forEach((s, i) => {
      expect(s._pickyDelay).toBe(i * 120);
    });
  });
});

describe("PAGE_TEMPLATES", () => {
  it("all templates have non-empty slots", () => {
    for (const tmpl of PAGE_TEMPLATES) {
      expect(tmpl.id).toBeTruthy();
      expect(tmpl.label).toBeTruthy();
      expect(tmpl.slots.length).toBeGreaterThan(0);
      for (const slot of tmpl.slots) {
        expect(slot.type).toBeTruthy();
        expect(slot.label).toBeTruthy();
      }
    }
  });
});

describe("PICKY_MOODS", () => {
  it("all moods have id, label, and desc", () => {
    for (const mood of PICKY_MOODS) {
      expect(mood.id).toBeTruthy();
      expect(mood.label).toBeTruthy();
      expect(mood.desc).toBeTruthy();
    }
  });
});

describe("paletteTemperature", () => {
  it("classifies warm palettes (red/orange accent)", () => {
    expect(paletteTemperature(PAL.warm)).toBe("warm");  // #E07A5F (orange-red)
    expect(paletteTemperature(PAL.candy)).toBe("warm");  // #E8589C (pink/magenta ~330+)
  });

  it("classifies cool palettes (blue/purple accent)", () => {
    expect(paletteTemperature(PAL.cool)).toBe("cool");    // #5B8DB8 (blue)
    expect(paletteTemperature(PAL.ocean)).toBe("cool");   // #2B7A9E (cyan-blue)
    expect(paletteTemperature(PAL.lavender)).toBe("cool"); // #7C5CBF (purple)
  });

  it("classifies neutral/achromatic palettes", () => {
    expect(paletteTemperature(PAL.noir)).toBe("neutral");  // #FFFFFF (achromatic)
    expect(paletteTemperature(PAL.mono)).toBe("neutral");  // #555555 (achromatic)
  });
});
