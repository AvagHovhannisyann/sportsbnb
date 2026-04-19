import { Link } from "react-router-dom";
import logoMark from "@/assets/logo-mark.png";
import logoFull from "@/assets/logo-full.png";

interface LogoProps {
  variant?: "full" | "mark";
  /** Tailwind height class for the image. Width auto-scales. */
  className?: string;
  /** If true, wraps in a Link to "/". */
  asLink?: boolean;
  /** Optional aria/alt label override. */
  label?: string;
}

/**
 * Brand logo. Use `full` (mark + wordmark) for headers/auth/footer,
 * `mark` (symbol only) for compact spots, splash, empty states.
 *
 * IMPORTANT: never recolor or distort — these are PNG brand assets.
 */
export const Logo = ({
  variant = "full",
  className = "h-8 w-auto",
  asLink = false,
  label = "Sportsbnb",
}: LogoProps) => {
  const src = variant === "full" ? logoFull : logoMark;
  const img = (
    <img
      src={src}
      alt={label}
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );
  if (asLink) {
    return (
      <Link to="/" aria-label={label} className="inline-flex items-center">
        {img}
      </Link>
    );
  }
  return img;
};

export default Logo;
