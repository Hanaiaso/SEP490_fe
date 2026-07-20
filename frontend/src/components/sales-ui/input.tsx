import * as React from "react";
import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-muted-foreground border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-white transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 md:text-sm focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
