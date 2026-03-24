import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[Tasteprint] Component error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (fallback) return fallback;
      return (
        <div style={{
          padding: 16,
          margin: 8,
          borderRadius: 8,
          background: "#FFF5F5",
          border: "1px solid #FCC",
          color: "#C53030",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
        }}>
          <strong>Component error</strong>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginLeft: 12,
              padding: "2px 10px",
              borderRadius: 4,
              border: "1px solid #FCC",
              background: "#FFF",
              color: "#C53030",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
