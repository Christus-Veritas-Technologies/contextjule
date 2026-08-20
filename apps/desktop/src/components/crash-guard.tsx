"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * The last thing between a thrown render and a white rectangle.
 *
 * React unmounts the whole tree when a render throws and nothing catches it,
 * which on a frameless window looks exactly like the app crashing: the chrome
 * is ours, so it goes too, and what is left is an empty pane with no way back.
 * Every surface is its own webview, so one bad screen used to take that window
 * out silently while the others carried on — which is the worst version of this
 * failure, because it looks like the app is fine and one window is haunted.
 *
 * Deliberately plain. This runs when the design system may be the thing that
 * broke, so it leans on nothing but inline styles and one button.
 */
interface State {
  error: Error | null;
}

export class CrashGuard extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The webview console is the only place this can go, and it is where
    // anybody debugging a blank window will look first.
    console.error("[contextjule] surface crashed", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "flex-start",
          padding: 20,
          height: "100%",
          background: "#fdf6ea",
          color: "#231b12",
          overflow: "auto",
        }}
      >
        <strong style={{ fontSize: 13 }}>She tripped over something.</strong>
        <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: "#6b5b48" }}>
          This screen failed to draw. Nothing about your sessions is lost — it is all in the
          database on this machine.
        </p>
        <code
          style={{
            fontSize: 11,
            lineHeight: 1.5,
            wordBreak: "break-word",
            color: "#8a3b3b",
            userSelect: "text",
          }}
        >
          {error.message}
        </code>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            border: "3px solid #231b12",
            background: "#f0b13f",
            color: "#231b12",
            padding: "9px 14px",
            fontSize: 12,
            cursor: "default",
          }}
        >
          reload this window
        </button>
      </div>
    );
  }
}
