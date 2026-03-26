import * as React from "react";

import { cn } from "@/lib/utils";

type InputSize = "s" | "m" | "l";

type InputProps = React.ComponentProps<"input"> & {
  inputSize?: InputSize;
};

const INPUT_SIZE_STYLES: Record<InputSize, string> = {
  s: "h-9 rounded-lg px-3 text-xs",
  m: "h-10 rounded-lg px-3 text-sm",
  l: "h-12 rounded-xl px-3.5 text-sm",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize = "l", ...props }, ref) => {
    return (
      <input
        type={type}
        suppressHydrationWarning
        className={cn(
          "flex w-full border border-white/10 bg-white/5 py-2 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          INPUT_SIZE_STYLES[inputSize],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
