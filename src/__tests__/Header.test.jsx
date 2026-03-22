import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "../components/Header";
import { PAL } from "../constants";

/* Minimal palette matching what Header expects */
const p = PAL.warm;

/* Default props factory — all callbacks are spies */
function makeProps(overrides = {}) {
  return {
    pal: "warm",
    setPal: vi.fn(),
    device: "desktop",
    setDevice: vi.fn(),
    shapeCount: 0,
    setShapes: vi.fn(),
    setCam: vi.fn(),
    clearAll: vi.fn(),
    exportPng: vi.fn(),
    exportJSON: vi.fn(),
    importJSON: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    p,
    mobile: false,
    randomizeAll: vi.fn(),
    designMood: "auto",
    setDesignMood: vi.fn(),
    lastRandomizeStats: null,
    pickyMode: false,
    enterPicky: vi.fn(),
    cancelPicky: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("Header (desktop)", () => {
  it("renders the Tasteprint brand", () => {
    render(<Header {...makeProps()} />);
    expect(screen.getByText("Tasteprint")).toBeInTheDocument();
  });

  it("renders device mode buttons", () => {
    render(<Header {...makeProps()} />);
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("renders toolbar actions", () => {
    render(<Header {...makeProps()} />);
    expect(screen.getByLabelText("New canvas")).toBeInTheDocument();
    expect(screen.getByLabelText("Import JSON")).toBeInTheDocument();
    expect(screen.getByLabelText("Undo")).toBeInTheDocument();
    expect(screen.getByLabelText("Redo")).toBeInTheDocument();
  });

  it("calls clearAll when New canvas is clicked", () => {
    const props = makeProps();
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("New canvas"));
    expect(props.clearAll).toHaveBeenCalledTimes(1);
  });

  it("calls importJSON when Import is clicked", () => {
    const props = makeProps();
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("Import JSON"));
    expect(props.importJSON).toHaveBeenCalledTimes(1);
  });

  it("disables undo/redo when no history", () => {
    render(<Header {...makeProps()} />);
    expect(screen.getByLabelText("Undo")).toBeDisabled();
    expect(screen.getByLabelText("Redo")).toBeDisabled();
  });

  it("enables undo when canUndo is true", () => {
    const props = makeProps({ canUndo: true });
    render(<Header {...props} />);
    const undoBtn = screen.getByLabelText("Undo");
    expect(undoBtn).not.toBeDisabled();
    fireEvent.click(undoBtn);
    expect(props.undo).toHaveBeenCalledTimes(1);
  });

  it("enables redo when canRedo is true", () => {
    const props = makeProps({ canRedo: true });
    render(<Header {...props} />);
    const redoBtn = screen.getByLabelText("Redo");
    expect(redoBtn).not.toBeDisabled();
    fireEvent.click(redoBtn);
    expect(props.redo).toHaveBeenCalledTimes(1);
  });

  it("disables PNG/JSON export when shapeCount is 0", () => {
    render(<Header {...makeProps({ shapeCount: 0 })} />);
    expect(screen.getByLabelText("Export as PNG")).toBeDisabled();
    expect(screen.getByLabelText("Export as JSON")).toBeDisabled();
  });

  it("enables export and shows randomize when shapes exist", () => {
    render(<Header {...makeProps({ shapeCount: 3 })} />);
    expect(screen.getByLabelText("Export as PNG")).not.toBeDisabled();
    expect(screen.getByLabelText("Export as JSON")).not.toBeDisabled();
    expect(screen.getByLabelText("Randomize canvas")).toBeInTheDocument();
  });

  it("calls randomizeAll when randomize button is clicked", () => {
    const props = makeProps({ shapeCount: 2 });
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("Randomize canvas"));
    expect(props.randomizeAll).toHaveBeenCalledTimes(1);
  });

  it("calls exportPng when PNG button is clicked", () => {
    const props = makeProps({ shapeCount: 1 });
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("Export as PNG"));
    expect(props.exportPng).toHaveBeenCalledTimes(1);
  });

  it("calls exportJSON when JSON button is clicked", () => {
    const props = makeProps({ shapeCount: 1 });
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("Export as JSON"));
    expect(props.exportJSON).toHaveBeenCalledTimes(1);
  });

  it("renders palette swatches as a radiogroup", () => {
    render(<Header {...makeProps()} />);
    const group = screen.getByRole("radiogroup", { name: /color palette/i });
    expect(group).toBeInTheDocument();
    // Should have one swatch per palette
    const palKeys = Object.keys(PAL);
    const buttons = group.querySelectorAll("button");
    expect(buttons.length).toBe(palKeys.length);
  });

  it("calls setPal when a palette swatch is clicked", () => {
    const props = makeProps();
    render(<Header {...props} />);
    const group = screen.getByRole("radiogroup", { name: /color palette/i });
    const buttons = group.querySelectorAll("button");
    // Click the second swatch
    fireEvent.click(buttons[1]);
    expect(props.setPal).toHaveBeenCalledTimes(1);
  });

  it("renders device mode as a radiogroup", () => {
    render(<Header {...makeProps()} />);
    const group = screen.getByRole("radiogroup", { name: /device mode/i });
    expect(group).toBeInTheDocument();
  });

  it("shows mood picker when shapes exist", () => {
    render(<Header {...makeProps({ shapeCount: 2 })} />);
    expect(screen.getByLabelText("Open mood picker")).toBeInTheDocument();
  });

  it("opens mood dropdown and calls setDesignMood on mood click", () => {
    const props = makeProps({ shapeCount: 2 });
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("Open mood picker"));
    // Mood grid should appear — click "Bold"
    const boldBtn = screen.getByText("Bold");
    expect(boldBtn).toBeInTheDocument();
    fireEvent.click(boldBtn);
    expect(props.setDesignMood).toHaveBeenCalledWith("bold");
  });

  it("has toolbar role for accessibility", () => {
    render(<Header {...makeProps()} />);
    expect(screen.getByRole("toolbar", { name: /canvas toolbar/i })).toBeInTheDocument();
  });
});

describe("Header (mobile)", () => {
  it("renders brand and menu button", () => {
    render(<Header {...makeProps({ mobile: true })} />);
    expect(screen.getByText("Tasteprint")).toBeInTheDocument();
    expect(screen.getByLabelText("Menu")).toBeInTheDocument();
  });

  it("shows undo/redo buttons on mobile", () => {
    render(<Header {...makeProps({ mobile: true })} />);
    expect(screen.getByLabelText("Undo")).toBeInTheDocument();
    expect(screen.getByLabelText("Redo")).toBeInTheDocument();
  });

  it("opens menu with palette, device, and actions", () => {
    render(<Header {...makeProps({ mobile: true, shapeCount: 1 })} />);
    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.getByText("Palette")).toBeInTheDocument();
    expect(screen.getByText("Device")).toBeInTheDocument();
    expect(screen.getByText("Export PNG")).toBeInTheDocument();
    expect(screen.getByText("Export JSON")).toBeInTheDocument();
    expect(screen.getByText("Import JSON")).toBeInTheDocument();
    expect(screen.getByText("New canvas")).toBeInTheDocument();
  });

  it("calls clearAll from mobile menu", () => {
    const props = makeProps({ mobile: true });
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("New canvas"));
    expect(props.clearAll).toHaveBeenCalledTimes(1);
  });

  it("shows randomize button on mobile when shapes exist", () => {
    render(<Header {...makeProps({ mobile: true, shapeCount: 3 })} />);
    expect(screen.getByLabelText("Randomize all")).toBeInTheDocument();
  });

  it("shows mood section in mobile menu", () => {
    render(<Header {...makeProps({ mobile: true, shapeCount: 2 })} />);
    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.getByText("Mood")).toBeInTheDocument();
  });
});

describe("Header (Picky mode)", () => {
  it("shows Picky mode button on desktop when shapes exist", () => {
    render(<Header {...makeProps({ shapeCount: 2 })} />);
    expect(screen.getByLabelText("Picky mode")).toBeInTheDocument();
  });

  it("calls enterPicky when Picky button is clicked", () => {
    const props = makeProps({ shapeCount: 2 });
    render(<Header {...props} />);
    fireEvent.click(screen.getByLabelText("Picky mode"));
    expect(props.enterPicky).toHaveBeenCalledTimes(1);
  });

  it("hides main toolbar and shows Exit Picky button during Picky mode", () => {
    render(<Header {...makeProps({ shapeCount: 2, pickyMode: true })} />);
    // Main toolbar actions should be hidden
    expect(screen.queryByLabelText("New canvas")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Undo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Redo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Export as PNG")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Export as JSON")).not.toBeInTheDocument();
    // Exit button should be visible
    expect(screen.getByText("Exit Picky")).toBeInTheDocument();
  });

  it("calls cancelPicky when Exit Picky is clicked", () => {
    const props = makeProps({ shapeCount: 2, pickyMode: true });
    render(<Header {...props} />);
    fireEvent.click(screen.getByText("Exit Picky"));
    expect(props.cancelPicky).toHaveBeenCalledTimes(1);
  });

  it("still shows palette swatches during Picky mode", () => {
    render(<Header {...makeProps({ shapeCount: 2, pickyMode: true })} />);
    const group = screen.getByRole("radiogroup", { name: /color palette/i });
    expect(group).toBeInTheDocument();
  });

  it("hides device mode selector during Picky mode", () => {
    render(<Header {...makeProps({ shapeCount: 2, pickyMode: true })} />);
    expect(screen.queryByRole("radiogroup", { name: /device mode/i })).not.toBeInTheDocument();
  });
});
