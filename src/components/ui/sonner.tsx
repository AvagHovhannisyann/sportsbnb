import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
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
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg focus-visible:ring-2 focus-visible:ring-ring",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
