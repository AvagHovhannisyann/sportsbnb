import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useImportTargets } from "@/hooks/useOutreach";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PasteImportDialog({ open, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const importer = useImportTargets();

  const parse = (raw: string) =>
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return { name: parts[0], city: parts[1], country: parts[2] };
      });

  const handleImport = async () => {
    try {
      await importer.mutateAsync(parse(text));
      setText("");
      onOpenChange(false);
    } catch { /* toast handled */ }
  };

  const preview = parse(text);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import venues</DialogTitle>
          <DialogDescription>
            One per line. Format: <span className="font-mono text-foreground">Name, City, Country</span> — city and country optional.
            Language is auto-detected (Yerevan → Armenian, others → English).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`FC Pyunik Stadium, Yerevan, Armenia\nLA84 Soccer Field, Los Angeles, USA\nFootball Academy, Yerevan`}
          className="min-h-[220px] font-mono text-sm"
        />
        <div className="text-xs text-muted-foreground">{preview.length} venue{preview.length === 1 ? "" : "s"} ready</div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!preview.length || importer.isPending}>
            {importer.isPending ? "Importing…" : `Import ${preview.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
