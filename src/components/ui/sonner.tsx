import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          // Sonner gives each toast `tabindex="0"` so a keyboard user can
          // reach it and its action button, which makes it a keyboard-operable
          // component and puts it under WCAG 2.4.7 — but it ships with no
          // focus styling, so tabbing onto one changed exactly 0 pixels.
          // Measured on /nearby, where the geolocation toast is reachable
          // within the first fourteen tab stops.
          //
          // A plain ring, not the app's `focus-ring` utility: that one is
          // `ring-offset-2` against `--background`, and a toast floats over
          // page content rather than sitting on the background, so the offset
          // gap would be painted in a colour that is not what is behind it.
          //
          // Deliberately no `outline-none`. Removing the browser default and
          // replacing it with a ring is only an improvement if the ring
          // actually paints, and the same edit on /nearby's view toggle made
          // that control measurably *worse* — 98 changed pixels down to 24 —
          // because the replacement was invisible against its own fill. Adding
          // a ring on top of the default cannot regress; suppressing the
          // default can.
          toast:
            "group toast rounded-lg group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:shadow-md !transition-[transform,opacity,height] !duration-150 ease-out motion-reduce:!transition-none focus-visible:ring-2 focus-visible:ring-ring",
          title: "text-sm font-semibold leading-5",
          description: "text-sm leading-5 group-[.toast]:text-muted-foreground",
          actionButton:
            "h-11 rounded-lg px-3.5 text-sm font-medium !transition-[background-color,color,opacity] !duration-150 motion-reduce:!transition-none group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90",
          cancelButton:
            "h-11 rounded-lg px-3.5 text-sm font-medium !transition-[background-color,color,opacity] !duration-150 motion-reduce:!transition-none group-[.toast]:bg-muted group-[.toast]:text-foreground group-[.toast]:hover:bg-accent",
          closeButton:
            "h-11 w-11 rounded-lg border-border bg-card text-muted-foreground !transition-[background-color,color,opacity] !duration-150 motion-reduce:!transition-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          success: "border-success/40",
          error: "border-destructive/40",
          warning: "border-warning/40",
          info: "border-information/40",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
