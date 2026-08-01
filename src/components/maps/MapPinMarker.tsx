import React from "react";
import { cn } from "@/lib/utils";

/**
 * Marker visuals, drawn as ordinary DOM.
 *
 * The Google implementation had to encode each of these as an SVG data URI
 * passed to `Marker`'s `icon` — a string of markup inside a template literal
 * inside `encodeURIComponent`, with the size repeated in a
 * `new google.maps.Size(...)` beside it. That is also the line that took
 * /nearby down whenever no Maps key was set, because JSX evaluates children
 * before a wrapper can decide not to render them.
 *
 * The Yandex JS API v3 positions an element you give it, so markers are just
 * components. They can be buttons, they can carry an accessible name, and
 * they use the app's own colour tokens.
 */

export interface MapPinMarkerProps {
  /** Fill colour. Any CSS colour; callers pass sport colours through. */
  color?: string;
  /** Rendered inside the pin's head. Keep it to one small glyph. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * A teardrop pin. Its tip is the point, so mount it with `anchor="bottom"`.
 */
export const MapPinMarker: React.FC<MapPinMarkerProps> = ({
  color,
  children,
  className,
}) => (
  <span className={cn("relative block h-8 w-6", className)} aria-hidden="true">
    <svg viewBox="0 0 24 32" className="h-8 w-6 drop-shadow-md">
      <path
        d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20c0-6.6-5.4-12-12-12z"
        fill={color ?? "hsl(var(--primary))"}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
    {children && (
      <span className="absolute inset-x-0 top-[5px] flex justify-center text-white">
        {children}
      </span>
    )}
  </span>
);

export interface MapDotMarkerProps {
  color?: string;
  /** Diameter in px. */
  size?: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * A filled circle with a white ring. Mount with `anchor="center"` — its
 * centre is the point, which is what "you are here" and cluster-free game
 * pins want.
 */
export const MapDotMarker: React.FC<MapDotMarkerProps> = ({
  color,
  size = 20,
  children,
  className,
}) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex items-center justify-center rounded-full border-2 border-white text-white shadow-md",
      className,
    )}
    style={{
      width: size,
      height: size,
      backgroundColor: color ?? "hsl(var(--primary))",
    }}
  >
    {children}
  </span>
);

export interface MapMarkerButtonProps {
  /** Accessible name — what a screen-reader user hears instead of a shape. */
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a marker visual in a real button.
 *
 * Google's markers were canvas-drawn and unreachable by keyboard; these are
 * focusable, named, and activate on Enter or Space like anything else.
 */
export const MapMarkerButton: React.FC<MapMarkerButtonProps> = ({
  label,
  onClick,
  children,
  className,
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={cn(
      "block cursor-pointer rounded-full leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      className,
    )}
  >
    {children}
  </button>
);
