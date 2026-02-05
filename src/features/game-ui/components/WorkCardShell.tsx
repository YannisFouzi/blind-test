import { memo, type CSSProperties, type ReactNode } from "react";

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
      "relative work-card h-full flex flex-col justify-center items-center",
      isStacked ? "work-card--stacked" : "work-card--default",
      isInteractive ? "work-card--interactive" : "",
      isInteractive && isActive ? "work-card--active" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const contentClassName = [
      "work-card-content relative z-10 text-center w-full h-full",
      isStacked ? "work-card-content--stacked" : "work-card-content--default",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="relative uniform-card">
        <div
          className={cardClassName}
          style={backgroundStyle}
        >
          <div className={contentClassName}>
            {isStacked ? (
              <>
                <div className="work-card-header">{header}</div>
                <h3
                  className={`uniform-card-title font-bold text-base transition-all duration-300 px-2 ${
                    titleClassName ?? "text-[var(--color-text-primary)]"
                  }`}
                  title={title}
                >
                  {title}
                </h3>
                <div className="work-card-footer">{footer}</div>
              </>
            ) : (
              <>
                {header}
                <h3
                  className={`uniform-card-title font-bold text-base transition-all duration-300 px-2 ${
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
