import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type TitleTone = "light" | "dark";

export interface OutlinedTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingTag;
  tone?: TitleTone;
}

export const OutlinedTitle = ({
  as: Component = "h2",
  tone = "light",
  className,
  ...props
}: OutlinedTitleProps) => {
  return (
    <Component
      className={cn(
        "fantasy-text",
        tone === "dark" ? "text-[var(--color-text-primary)]" : "text-white",
        className
      )}
      {...props}
    />
  );
};

export default OutlinedTitle;
