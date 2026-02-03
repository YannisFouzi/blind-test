import { memo, type CSSProperties, type ReactNode } from "react";

interface WorkCardShellProps {
  title: string;
  isInteractive: boolean;
  isActive: boolean;
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
    backgroundStyle,
    titleClassName,
    header,
    footer,
  }: WorkCardShellProps) => {
    return (
      <div className="relative uniform-card">
        <div
          className={`relative work-card h-full flex flex-col justify-center items-center p-4 ${
            isInteractive ? "work-card--interactive" : ""
          } ${isInteractive && isActive ? "work-card--active" : ""}`}
          style={backgroundStyle}
        >
          <div className="relative z-10 text-center w-full flex flex-col justify-center h-full">
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
          </div>
        </div>
      </div>
    );
  }
);

WorkCardShell.displayName = "WorkCardShell";
