import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The filters currently narrowing a list, each removable on its own.
 *
 * Both browse pages had the same shape of problem. Discover filtered on five
 * things and showed a badge reading "!"; Games filters on four and shows a
 * count. Neither named a single one of them, and neither let you drop one
 * without dropping all of them — so a grid narrowed to two results looked
 * exactly like a catalogue with two things in it.
 *
 * The presentation is shared here; *what counts as an active filter* is not,
 * because that is a per-page judgement with real decisions in it (see
 * `features/venues/activeFilters` on why an untouched price ceiling is not
 * one). Each page passes its own descriptor and its own remove handler.
 */
export interface Chip {
  key: string;
  /** Carries the value, not just the field name: "Basketball", not "Sport". */
  label: string;
}

interface FilterChipsProps {
  chips: Chip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  /** Leading text. Nulled out where the surrounding copy already says it. */
  legend?: string;
  className?: string;
}

export function FilterChips({
  chips,
  onRemove,
  onClearAll,
  legend = "Filtered by",
  className,
}: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {legend && <span className="text-sm text-muted-foreground">{legend}</span>}
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          // The name says what pressing it does, not just what it shows. A
          // chip reading "Basketball" announced as "Basketball, button" tells
          // a screen-reader user nothing about which way it goes.
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg border border-border bg-surface-1 py-2 pl-3 pr-2 text-sm font-medium text-foreground transition-[background-color,border-color,color] duration-150 ease-out motion-reduce:transition-none hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {chip.label}
          <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      {/* Only above one: with a single chip, "Clear all" and the × beside it
          do the same thing, and offering both invites a moment's thought
          about a difference that does not exist. */}
      {onClearAll && chips.length > 1 && (
        <Button variant="ghost" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}

export default FilterChips;
