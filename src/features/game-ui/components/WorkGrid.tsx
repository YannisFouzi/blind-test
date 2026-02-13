import { memo, type ReactNode, Children, cloneElement, isValidElement, useRef, useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { getWorkGridLayout } from "../layout/workGridPolicy";
import { useContainerWidth } from "../hooks/useContainerWidth";
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
  const gridRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(gridRef);

  // Compute layout from policy
  const layout = useMemo(() => {
    // Fallback to 1280 si containerWidth pas encore mesuré
    return getWorkGridLayout(count, containerWidth || 1280);
  }, [count, containerWidth]);

  // Appliquer les placements explicites sur les children
  const childrenWithPlacements = useMemo(() => {
    const childArray = Children.toArray(children);

    return childArray.map((child, index) => {
      if (!isValidElement(child)) return child;

      const placement = layout.items.find((item) => item.index === index);
      if (!placement) return child;

      // Calculer la largeur pour les items centrés
      const centeredWidth = placement.centered
        ? `calc((100% - (var(--work-grid-gap) * ${layout.columns - 1})) / ${layout.columns})`
        : undefined;

      const itemStyle: CSSProperties = {
        gridColumn: placement.centered
          ? `${placement.column} / span ${placement.columnSpan}`
          : placement.column,
        gridRow: placement.row,
        justifySelf: placement.centered ? "center" : undefined,
        width: centeredWidth,
      };

      const childProps = child.props as { style?: CSSProperties };
      const mergedStyle: CSSProperties = {
        ...childProps.style,
        ...itemStyle,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return cloneElement(child as any, {
        style: mergedStyle,
      });
    });
  }, [children, layout]);

  return (
    <div
      ref={gridRef}
      className={cn(getWorkGridClassName(count), className)}
      data-count={count}
      data-mode={mode}
      data-density={layout.density}
      data-testid="work-grid"
      style={{
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
      }}
    >
      {childrenWithPlacements}
    </div>
  );
};

export const WorkGrid = memo(WorkGridComponent);
WorkGrid.displayName = "WorkGrid";
