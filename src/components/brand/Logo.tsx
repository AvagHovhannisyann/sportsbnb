import { Link } from "react-router-dom";
import logoMark from "@/assets/logo-mark.png";

interface LogoProps {
  variant?: "full" | "mark";
  /** Tailwind height class for the symbol. The wordmark has its own responsive size. */
  className?: string;
  /** If true, wraps in a Link to "/". */
  asLink?: boolean;
  /** Optional aria/alt label override. */
  label?: string;
}

/**
 * Brand logo — symbol + wordmark.
 *
 * The symbol stays the original PNG (a green gradient mark, legible on both
 * light and dark surfaces). The wordmark is set in type rather than shipped as
 * a flat image: the original `logo-full.png` renders "Sports" in brand navy,
 * which is invisible against the dark nav and footer. Setting it live lets
 * "Sports" inherit `currentColor` — navy on light, near-white on dark — while
 * "bnb" keeps the brand green in both. It also stays crisp at any size and
 * drops a raster request from every page.
 *
 * Colour and proportion match the original asset; nothing is recoloured
 * arbitrarily.
 */
export const Logo = ({
  variant = "full",
  className = "h-8 w-auto",
  asLink = false,
  label = "Sportsbnb",
}: LogoProps) => {
  const mark = (
    <img
      src={logoMark}
      alt={variant === "mark" ? label : ""}
      aria-hidden={variant === "full" ? true : undefined}
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );

  const content =
    variant === "mark" ? (
      mark
    ) : (
      <span className="inline-flex items-baseline gap-[0.4em]">
        <span className="inline-flex shrink-0 items-center self-center">{mark}</span>
        <span className="font-display text-[1.05rem] md:text-[1.3rem] font-bold leading-none tracking-[-0.03em]">
          <span className="text-foreground">Sports</span>
          <span className="text-primary">bnb</span>
        </span>
      </span>
    );

  if (asLink) {
    return (
      <Link
        to="/"
        aria-label={label}
        className="inline-flex items-center rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {content}
      </Link>
    );
  }
  // No aria-label here: the wordmark is real text, so it is already announced.
  // Callers that wrap this in their own link (e.g. Header) supply the label
  // there — labelling both double-announces the brand to screen readers.
  return <span className="inline-flex items-center">{content}</span>;
};

export default Logo;
