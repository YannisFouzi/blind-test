import { memo, type CSSProperties, type ReactNode } from "react";
import styles from "./GameUi.module.css";

interface WorkCardShellProps {
  title: string;
  isInteractive: boolean;
  isActive: boolean;
  layout?: "default" | "stacked";
  backgroundStyle?: CSSProperties;
  titleClassName?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export const WorkCardShell = memo(
  ({
    title,
    isInteractive,
    isActive,
    layout = "default",
    backgroundStyle,
    titleClassName,
    header,
    footer,
  }: WorkCardShellProps) => {
    const isStacked = layout === "stacked";
    const cardClassName = [
      "relative h-full flex flex-col justify-center items-center",
      styles.workCard,
      isStacked ? styles.workCardStacked : styles.workCardDefault,
      isInteractive ? styles.workCardInteractive : "",
      isInteractive && isActive ? styles.workCardActive : "",
    ]
      .filter(Boolean)
      .join(" ");

    const contentClassName = [
      styles.workCardContent,
      isStacked ? styles.workCardContentStacked : styles.workCardContentDefault,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={`relative ${styles.uniformCard}`}>
        <div
          className={cardClassName}
          style={backgroundStyle}
        >
          <div className={contentClassName}>
            {isStacked ? (
              <>
                <div className={styles.workCardHeader}>{header}</div>
                <h3
                  className={`${styles.uniformCardTitle} font-bold text-base transition-all duration-300 px-2 ${
                    titleClassName ?? "text-[var(--color-text-primary)]"
                  }`}
                  title={title}
                >
                  {title}
                </h3>
                <div className={styles.workCardFooter}>{footer}</div>
              </>
            ) : (
              <>
                {header}
                <h3
                  className={`${styles.uniformCardTitle} font-bold text-base transition-all duration-300 px-2 ${
                    titleClassName ?? "text-[var(--color-text-primary)]"
                  }`}
                  title={title}
                >
                  {title}
                </h3>
                {footer}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

WorkCardShell.displayName = "WorkCardShell";
