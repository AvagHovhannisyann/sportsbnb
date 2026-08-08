import { useId, useState } from "react";
import { AlertCircle, FileInput } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useImportTargets } from "@/hooks/useOutreach";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

const parseTargets = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((part) => part.trim());
      return { name: parts[0], city: parts[1], country: parts[2] };
    })
    .filter((target) => target.name.length > 0);

export function PasteImportDialog({ open, onOpenChange }: Props) {
  const fieldId = useId();
  const helpId = useId();
  const countId = useId();
  const [text, setText] = useState("");
  const importer = useImportTargets();
  const preview = parseTargets(text);

  const handleImport = async () => {
    try {
      await importer.mutateAsync(preview);
      setText("");
      onOpenChange(false);
    } catch {
      // The mutation exposes both the inline state below and the shared toast.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-5">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-1 text-primary">
            <FileInput aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle>Import venue targets</DialogTitle>
          <DialogDescription id={helpId}>
            Add one venue per line in the format <span className="font-medium text-foreground">Name, City, Country</span>.
            City and country are optional; language is detected from the location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={fieldId}>Venue list</Label>
          <Textarea
            id={fieldId}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (importer.isError) importer.reset();
            }}
            placeholder={"FC Pyunik Stadium, Yerevan, Armenia\nFootball Academy, Yerevan\nCommunity Sports Hall"}
            className="min-h-52 resize-y text-sm leading-6"
            aria-describedby={`${helpId} ${countId}`}
            autoFocus
          />
          <p id={countId} className="text-sm text-muted-foreground" aria-live="polite">
            {preview.length === 0
              ? "No valid rows detected yet."
              : `${preview.length} venue${preview.length === 1 ? "" : "s"} ready to import.`}
          </p>
        </div>

        {importer.isError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" className="h-4 w-4" />
            <AlertDescription>
              The import did not complete. Review the list and try again; no successful import has been assumed.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={preview.length === 0 || importer.isPending}
          >
            {importer.isPending
              ? "Importing…"
              : `Import ${preview.length || "venues"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
