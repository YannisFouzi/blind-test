import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Test content</Card>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies interactive styles when enabled", () => {
    const { container } = render(<Card interactive>Clickable</Card>);
    expect(container.firstChild).toHaveClass("cursor-pointer");
  });
});
