import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#0a0f1a",
            color: "#e0e0e0",
            fontFamily: "system-ui, sans-serif",
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h1 style={{ fontSize: 20, marginBottom: 8, color: "#ff6b6b" }}>
            应用发生错误
          </h1>
          <p style={{ fontSize: 14, color: "#8899aa", maxWidth: 480, marginBottom: 24 }}>
            {this.state.error?.message ?? "未知错误"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 24px",
              background: "#1a2a3a",
              color: "#4fc3f7",
              border: "1px solid #4fc3f7",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
