import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  /** Render solid white version (for dark backgrounds / favicon tile) */
  variant?: "color" | "white" | "mono";
  title?: string;
}

/**
 * Sportsbnb symbol — a single confident "S" stroke with two waypoint dots.
 * Hand-crafted SVG: mathematically smooth, scales perfectly from 16px to 1024px.
 * Slight intentional asymmetry (top-right dot smaller, bottom-left dot larger).
 */
export const LogoMark = ({ className, variant = "color", title = "Sportsbnb" }: LogoMarkProps) => {
  const gradientId = "sbnb-grad";
  const stroke =
    variant === "white"
      ? "#ffffff"
      : variant === "mono"
      ? "currentColor"
      : `url(#${gradientId})`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("block", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {variant === "color" && (
        <defs>
          <linearGradient id={gradientId} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16A34A" />
            <stop offset="100%" stopColor="#0B5132" />
          </linearGradient>
        </defs>
      )}
      {/* The flowing S — one continuous stroke */}
      <path
        d="M50 16 C50 10, 42 8, 34 8 C22 8, 14 14, 14 24 C14 32, 22 34, 32 36 C42 38, 50 40, 50 46 C50 54, 42 58, 30 58 C20 58, 14 54, 14 48"
        fill="none"
        stroke={stroke}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Top-right waypoint — smaller, asymmetric */}
      <circle cx="56" cy="12" r="3.2" fill={stroke} />
      {/* Bottom-left waypoint — larger anchor */}
      <circle cx="9" cy="54" r="3.8" fill={stroke} />
    </svg>
  );
};

interface LogoProps {
  className?: string;
  variant?: "color" | "white" | "mono";
  showWordmark?: boolean;
}

export const Logo = ({ className, variant = "color", showWordmark = true }: LogoProps) => {
  const wordPrimary =
    variant === "white" ? "text-white" : variant === "mono" ? "text-foreground" : "text-foreground";
  const wordAccent =
    variant === "white" ? "text-white/90" : variant === "mono" ? "text-foreground" : "text-primary";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark variant={variant} className="h-8 w-8" />
      {showWordmark && (
        <span className="font-display text-[1.35rem] font-bold tracking-extra-tight leading-none">
          <span className={wordPrimary}>Sports</span>
          <span className={wordAccent}>bnb</span>
        </span>
      )}
    </span>
  );
};

export default Logo;
