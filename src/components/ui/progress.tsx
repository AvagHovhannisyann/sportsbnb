import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    /* The track, not a secondary button.
       shadcn defaults this to `bg-secondary` because in its palette secondary
       is a muted grey. This design system defines --secondary as the inverted
       near-white surface that secondary buttons use for their dark text, so
       the unfilled part of every progress bar rendered as a bright white
       stripe on a near-black page — in ten places, including level progress,
       listing health, password strength and owner occupancy. */
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-transform duration-200 ease-out motion-reduce:transition-none"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
