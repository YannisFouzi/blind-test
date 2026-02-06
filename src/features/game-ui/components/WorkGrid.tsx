import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./GameUi.module.css";

type GridMode = "solo" | "multi";
type GridVariant = "stacked" | "four" | "five" | "six" | "seven" | "eight" | null;

type WorkGridProps = {
  count: number;
  mode?: GridMode;
  children: ReactNode;
  className?: string;
};

const VARIANT_BY_COUNT: Record<number, GridVariant> = {
  0: "stacked",
  1: "stacked",
  2: "stacked",
  3: "stacked",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
};

const getGridVariant = (count: number): GridVariant => {
  return VARIANT_BY_COUNT[count] ?? null;
};

const getWorkGridClassName = (count: number) => {
  let className = `${styles.uniformCardGrid} ${styles.workSelectorGrid}`;
  const variant = getGridVariant(count);

  if (variant === "stacked") className += ` ${styles.gridStacked}`;
  if (variant === "four") className += ` ${styles.gridFour}`;
  if (variant === "five") className += ` ${styles.gridFive}`;
  if (variant === "six") className += ` ${styles.gridSix}`;
  if (variant === "seven") className += ` ${styles.gridSeven}`;
  if (variant === "eight") className += ` ${styles.gridEight}`;

  return className;
};

const WorkGridComponent = ({ count, mode = "solo", children, className }: WorkGridProps) => {
  return (
    <div
      className={cn(getWorkGridClassName(count), className)}
      data-count={count}
      data-mode={mode}
      data-testid="work-grid"
    >
      {children}
    </div>
  );
};

export const WorkGrid = memo(WorkGridComponent);
WorkGrid.displayName = "WorkGrid";
