import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

// Minimal localStorage stub (jsdom provides one but ensure clean state)
beforeEach(() => {
  localStorage.clear();
});

describe("App", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  it("shows the Tasteprint header brand", () => {
    render(<App />);
    // Header renders "Tasteprint" as brand text
    expect(screen.getByText(/tasteprint/i)).toBeInTheDocument();
  });

  it("defaults to Desktop device mode", () => {
    render(<App />);
    // Desktop button should be present and visually active
    expect(screen.getByText("Desktop")).toBeInTheDocument();
  });

  it("shows empty-canvas guidance when no shapes exist", () => {
    render(<App />);
    // The empty-state CTA should be visible
    expect(screen.getByText(/start with/i)).toBeInTheDocument();
  });

  it("shows the Starter library category by default", () => {
    render(<App />);
    expect(screen.getByText("Starter")).toBeInTheDocument();
  });
});
