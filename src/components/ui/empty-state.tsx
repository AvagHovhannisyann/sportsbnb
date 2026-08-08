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
        "flex flex-col items-center justify-center px-5 text-center",
        compact ? "py-8" : "py-12",
        !bordered && className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground-soft">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      {/* h2, because an empty state stands in for the main content of a page
          or a panel — it sits where a grid of cards would, at the level those
          cards would have had. As an h3 it skipped a level on every page whose
          only other heading is the page h1, which /owner/equipment was. Going
          *up* a level is never a skip, so this is safe wherever it lands. */}
      <h2 className="mb-1.5 text-lg font-semibold leading-snug tracking-tight text-foreground">{title}</h2>
      {description && (
        <p className="mb-5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}

      {(hasPrimary || hasSecondary) && (
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          {/* `asChild`, not `<Link><Button>`. The latter renders an <a> with a
              <button> inside it — nested interactive elements, which is
              invalid HTML and gives assistive tech two controls where the user
              sees one. I wrote it the wrong way here while moving this
              component, and a DOM sweep for `a button` found it on every page
              an empty state reaches. MyVenuesPage had already been fixed for
              exactly this, with a comment saying so, twenty lines from where I
              was working. */}
          {hasPrimary &&
            (actionHref ? (
              <Button asChild>
                <Link to={actionHref}>{actionLabel}</Link>
              </Button>
            ) : (
              <Button onClick={onAction}>{actionLabel}</Button>
            ))}

          {hasSecondary &&
            (secondaryHref ? (
              <Button asChild variant="outline">
                <Link to={secondaryHref}>{secondaryLabel}</Link>
              </Button>
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
        <p className="mt-5 flex max-w-xs items-start gap-1.5 rounded-lg bg-surface-1 px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground">
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
