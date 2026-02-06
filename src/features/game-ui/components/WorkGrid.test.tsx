import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkGrid } from "./WorkGrid";
import styles from "./GameUi.module.css";

const renderGrid = (count: number, mode: "solo" | "multi" = "solo") => {
  render(
    <WorkGrid count={count} mode={mode}>
      <div data-testid="child">Card</div>
    </WorkGrid>
  );

  return screen.getByTestId("child").parentElement as HTMLElement;
};

describe("WorkGrid", () => {
  it("uses stacked variant for small solo counts", () => {
    const grid = renderGrid(2, "solo");
    expect(grid).toHaveClass(styles.gridStacked);
    expect(grid).not.toHaveClass(styles.gridFour);
  });

  it("uses six variant for multi count 6", () => {
    const grid = renderGrid(6, "multi");
    expect(grid).toHaveClass(styles.gridSix);
    expect(grid).not.toHaveClass(styles.gridStacked);
  });

  it("uses seven variant for multi count 7", () => {
    const grid = renderGrid(7, "multi");
    expect(grid).toHaveClass(styles.gridSeven);
    expect(grid).not.toHaveClass(styles.gridEight);
  });

  it("uses eight variant for multi count 8", () => {
    const grid = renderGrid(8, "multi");
    expect(grid).toHaveClass(styles.gridEight);
  });

  it("falls back to base grid without count variant for out-of-range values", () => {
    const grid = renderGrid(9, "multi");
    expect(grid).toHaveClass(styles.uniformCardGrid);
    expect(grid).not.toHaveClass(styles.gridEight);
    expect(grid).not.toHaveClass(styles.gridSeven);
    expect(grid).not.toHaveClass(styles.gridSix);
  });
});
