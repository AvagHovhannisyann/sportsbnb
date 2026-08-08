import { LucideIcon, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The two panels this app kept re-implementing: "something went wrong, retry"
 * and "there is nothing here, go somewhere useful".
 *
 * They existed as ad-hoc markup on every page that needed them, which is how
 * they drifted apart — and, more seriously, how they got *merged*. Several
 * pages had no error branch at all, so a failed request fell through to the
 * empty branch and rendered a confident falsehood: "Venue not found" when the
 * venue was fine, "This reservation has expired" when the hold was still live.
 * A failed request and an absent record are different facts and must not share
 * a rendering.
 *
 * Rule of thumb for call sites: if the query errored, use ErrorPanel — never
 * assert anything about the record itself, because you did not hear back.
 */

interface StatusPanelProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Visual weight of the icon chip. */
  tone?: "neutral" | "danger" | "positive";
  className?: string;
}

const toneChip = {
  neutral: "border-border bg-surface-1 text-muted-foreground",
  danger: "border-destructive/30 bg-destructive/5 text-destructive",
  positive: "border-primary/25 bg-primary/10 text-primary",
};

export const StatusPanel = ({
  icon: Icon,
  title,
  description,
  children,
  tone = "neutral",
  className,
}: StatusPanelProps) => (
  <div className={cn("px-5 py-12 text-center", className)}>
    <div
      className={cn(
        "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border",
        toneChip[tone],
      )}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </div>
    <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">{title}</h2>
    {description && (
      <p className="mx-auto mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    )}
    {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
  </div>
);

interface ErrorPanelProps {
  /** What failed to load, in the user's words: "this venue", "your bookings". */
  what: string;
  /** Extra reassurance where state matters — e.g. that a hold is still live. */
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const ErrorPanel = ({
  what,
  description,
  onRetry,
  isRetrying,
  children,
  className,
}: ErrorPanelProps) => (
  <StatusPanel
    icon={WifiOff}
    tone="danger"
    title={`Couldn't load ${what}`}
    description={description ?? "The connection dropped on the way to our servers."}
    className={className}
  >
    {onRetry && (
      <Button onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Retrying…
          </>
        ) : (
          "Try again"
        )}
      </Button>
    )}
    {children}
  </StatusPanel>
);
