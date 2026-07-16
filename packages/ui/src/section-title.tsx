import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./lib/utils";

interface SectionTitleProps extends ComponentPropsWithoutRef<"div"> {
  title: string;
  description?: string;
}

export function SectionTitle({
  title,
  description,
  className,
  ...props
}: SectionTitleProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground text-sm sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
