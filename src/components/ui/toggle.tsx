import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex touch-manipulation select-none items-center justify-center rounded-lg border border-transparent text-sm font-medium text-foreground ring-offset-background transition-[background-color,border-color,color,box-shadow,opacity] duration-150 ease-out motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-border-strong data-[state=on]:bg-surface-2 data-[state=on]:text-foreground data-[state=on]:shadow-xs",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border-interactive bg-background hover:border-foreground/30",
      },
      size: {
        default: "h-11 px-3",
        sm: "h-11 px-2.5",
        lg: "h-12 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
