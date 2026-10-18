"use client";
import { Component, type ReactNode } from "react";

class DecorationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function HolidayBoundary({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  return <DecorationBoundary key={resetKey}>{children}</DecorationBoundary>;
}
