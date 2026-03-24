import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PAL } from "../constants";

// Mock chatAI lazy import to avoid loading the heavy sentence encoder
vi.mock("../components/chatAI", () => ({
  getAIResponse: vi.fn(() => ({ text: "mock response", typingMs: 0, pause: null })),
}));

const { default: ChatBubble } = await import("../components/ChatBubble");

const p = PAL.warm;
const baseProps = {
  p,
  editable: false,
  texts: {},
  onText: vi.fn(),
  font: "DM Sans",
  fsize: 1,
  b: { width: 340, height: 400 },
  onAc: "#fff",
};

beforeEach(() => {
  // Clear chat localStorage before each test
  localStorage.removeItem("tasteprint_chat");
  // Mock scrollTo for jsdom (ChatBubble uses ref.scrollTo)
  Element.prototype.scrollTo = Element.prototype.scrollTo || vi.fn();
});

describe("ChatBubble", () => {
  // Variant smoke tests — each variant renders without crashing
  const variantNames = [
    "iMessage",   // v=0
    "Slack",      // v=1
    "Terminal",   // v=2
    "Glass",      // v=3
    "Gradient",   // v=4
    "Brutal",     // v=5
    "Glow",       // v=6
  ];

  variantNames.forEach((name, v) => {
    it(`renders variant ${v} (${name}) without crashing`, () => {
      const { container } = render(<ChatBubble {...baseProps} v={v} />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  it("shows default messages on first render", () => {
    render(<ChatBubble {...baseProps} v={0} />);
    // Default messages include these texts
    expect(screen.getByText(/what's up/)).toBeInTheDocument();
    expect(screen.getByText(/Just checking out/)).toBeInTheDocument();
  });

  it("renders input field for typing", () => {
    render(<ChatBubble {...baseProps} v={0} />);
    const input = screen.getByPlaceholderText(/type|message/i);
    expect(input).toBeInTheDocument();
  });

  it("has a new chat button", () => {
    render(<ChatBubble {...baseProps} v={0} />);
    const btn = screen.getByLabelText(/new chat/i);
    expect(btn).toBeInTheDocument();
  });

  it("clicking new chat resets messages", () => {
    render(<ChatBubble {...baseProps} v={0} />);
    const btn = screen.getByLabelText(/new chat/i);
    fireEvent.pointerDown(btn);
    // Default messages should still be present (reset restores defaults)
    expect(screen.getByText(/what's up/)).toBeInTheDocument();
  });

  it("emoji button toggles picker", () => {
    render(<ChatBubble {...baseProps} v={0} />);
    // Find emoji button (😊)
    const emojiBtn = screen.getByText("😊");
    expect(emojiBtn).toBeInTheDocument();
    fireEvent.click(emojiBtn);
    // Emoji picker should now be open with emoji grid
    expect(screen.getByText("👋")).toBeInTheDocument();
  });

  it("renders with dark palette without crashing", () => {
    const { container } = render(<ChatBubble {...baseProps} p={PAL.noir} v={0} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders all 7 variants with editable=true without crashing", () => {
    for (let v = 0; v < 7; v++) {
      const { unmount } = render(<ChatBubble {...baseProps} v={v} editable />);
      unmount();
    }
  });
});
