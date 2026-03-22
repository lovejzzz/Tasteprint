import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

function ThrowingChild({ error }) {
  if (error) throw new Error(error);
  return <span>OK</span>;
}

describe("ErrorBoundary", () => {
  // Suppress React error boundary console noise during tests
  const originalError = console.error;
  beforeEach(() => { console.error = vi.fn(); });
  afterEach(() => { console.error = originalError; });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <span>child content</span>
      </ErrorBoundary>
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders default error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild error="test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Component error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowingChild error="test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
  });

  it("recovers when Retry button is clicked", async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingChild error="test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Component error")).toBeInTheDocument();

    // Click retry — this resets the error state
    screen.getByText("Retry").click();

    // Re-render with a non-throwing child to verify recovery
    rerender(
      <ErrorBoundary>
        <ThrowingChild error={null} />
      </ErrorBoundary>
    );
    expect(screen.getByText("OK")).toBeInTheDocument();
  });
});
