import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 shadow-sm hover:shadow",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border border-border-strong bg-card text-foreground hover:bg-accent hover:border-foreground/30 shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline px-0 h-auto",
        hero:
          "bg-primary text-primary-foreground hover:bg-primary/92 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        heroOutline:
          "border border-foreground/15 bg-card/80 backdrop-blur text-foreground hover:bg-card hover:border-foreground/30 shadow-sm",
        subtle:
          "bg-surface-1 text-foreground hover:bg-surface-3 border border-border",
        // For use on a `bg-secondary` surface, which is where its name points
        // and its only call site sits. It previously resolved to --foreground,
        // which on the light secondary panel is the *same colour as the
        // background* — the button rendered at full size, took its place in
        // the flex row, and was simply invisible, which read as the adjacent
        // primary CTA being off-centre.
        secondaryOutline:
          "border border-secondary-foreground/25 text-secondary-foreground bg-transparent hover:bg-secondary-foreground/5",
        soft:
          "bg-primary-soft text-primary hover:bg-primary-soft/70",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm rounded-lg",
        sm: "h-9 px-3.5 text-sm rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        xl: "h-14 px-8 text-base rounded-xl font-semibold",
        icon: "h-10 w-10 rounded-lg",
        iconSm: "h-9 w-9 rounded-md",
        pill: "h-11 px-6 rounded-full text-sm font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
