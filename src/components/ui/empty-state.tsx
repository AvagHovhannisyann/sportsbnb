import { LucideIcon, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

/**
 * The one empty state.
 *
 * This component already existed, correctly, at `components/owner/EmptyState`
 * — and only the eleven owner pages ever found it. Every player-facing screen
 * hand-rolled its own, and measuring them turned up eight variants that agreed
 * on nothing: four icon treatments (64px tinted tile / 48px muted circle /
 * bare 48px / bare 64px at 30% opacity), three heading sizes, an `h2` sitting
 * among `h3`s, and a Card-or-bare-div split decided per file.
 *
 * That matters more than the usual consistency argument, because these are the
 * screens a brand-new account sees *first*: sign up, and Games, Teams, the
 * community feed and your dashboard are all empty at once. Four different
 * shapes of "nothing here" in the first minute reads as four different apps.
 *
 * `bordered` draws the surface itself so an empty state inside a tabbed panel,
 * where the populated view is a grid of cards, still sits on a card — without
 * the caller re-deciding the padding each time.
 */
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Optional: some empty states are a title and a way out, nothing more. */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryHref?: string;
  tip?: string;
  /** Render on a card surface, for empty states that replace a grid of cards. */
  bordered?: boolean;
  /** Tighter vertical rhythm, for empty states inside a panel rather than a page. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
  onSecondaryAction,
  secondaryHref,
  tip,
  bordered,
  compact,
  className,
}: EmptyStateProps) {
  const hasPrimary = actionLabel && (onAction || actionHref);
  const hasSecondary = secondaryLabel && (onSecondaryAction || secondaryHref);

  const body = (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        compact ? "py-12" : "py-16",
        !bordered && className,
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-muted-foreground">{description}</p>
      )}

      {(hasPrimary || hasSecondary) && (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {hasPrimary &&
            (actionHref ? (
              <Link to={actionHref}>
                <Button>{actionLabel}</Button>
              </Link>
            ) : (
              <Button onClick={onAction}>{actionLabel}</Button>
            ))}

          {hasSecondary &&
            (secondaryHref ? (
              <Link to={secondaryHref}>
                <Button variant="outline">{secondaryLabel}</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={onSecondaryAction}>
                {secondaryLabel}
              </Button>
            ))}
        </div>
      )}

      {tip && (
        // Was a literal 💡. An emoji renders in the system emoji font at a size
        // and baseline nothing else on the page shares, and it is the only
        // pictogram in the app not drawn by Lucide.
        <p className="mt-6 flex max-w-xs items-start gap-1.5 text-xs text-muted-foreground">
          <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium">Tip:</span> {tip}
          </span>
        </p>
      )}
    </div>
  );

  return bordered ? <Card className={className}>{body}</Card> : body;
}

export default EmptyState;
