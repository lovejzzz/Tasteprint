import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

/* A component that always throws on render */
function Bomb({ shouldThrow = true }) {
  if (shouldThrow) throw new Error("💥 boom");
  return <div>safe content</div>;
}

describe("ErrorBoundary", () => {
  // Suppress console.error noise from React and componentDidCatch during tests
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders default error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Component error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("Component error")).not.toBeInTheDocument();
  });

  it("recovers after clicking Retry when child no longer throws", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Component error")).toBeInTheDocument();

    // Swap to a non-throwing child, then click Retry
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(screen.getByText("safe content")).toBeInTheDocument();
    expect(screen.queryByText("Component error")).not.toBeInTheDocument();
  });
});
