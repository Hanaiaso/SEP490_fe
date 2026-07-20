import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90 hover:text-white hover:shadow-sm",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const hasCustomBackgroundColor =
    typeof props.style === "object" &&
    props.style !== null &&
    "backgroundColor" in props.style &&
    Boolean(props.style.backgroundColor);

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        hasCustomBackgroundColor && "text-white hover:text-white hover:brightness-95 hover:shadow-sm",
        className,
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
