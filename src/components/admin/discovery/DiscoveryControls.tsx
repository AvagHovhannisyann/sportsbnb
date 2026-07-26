import React, { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Scan, MapPin, Zap, Search, Play, Square, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const REGIONS = [
  { key: "yerevan", label: "Yerevan", emoji: "🏙️" },
  { key: "gyumri", label: "Gyumri", emoji: "🏘️" },
  { key: "vanadzor", label: "Vanadzor", emoji: "🏘️" },
  { key: "kotayk", label: "Kotayk Province", emoji: "🏔️" },
  { key: "armavir", label: "Armavir Province", emoji: "🌾" },
  { key: "ararat", label: "Ararat Province", emoji: "🗻" },
  { key: "aragatsotn", label: "Aragatsotn Province", emoji: "⛰️" },
  { key: "gegharkunik", label: "Gegharkunik Province", emoji: "🌊" },
  { key: "lori", label: "Lori Province", emoji: "🌲" },
  { key: "tavush", label: "Tavush Province", emoji: "🌿" },
  { key: "syunik", label: "Syunik Province", emoji: "🏔️" },
  { key: "vayots_dzor", label: "Vayots Dzor Province", emoji: "🍇" },
  { key: "shirak", label: "Shirak Province", emoji: "❄️" },
];

interface BatchProgress {
  totalFound: number;
  autoApproved: number;
  flagged: number;
  rejected: number;
  tilesScanned: number;
  totalTiles: number;
  batchesCompleted: number;
  isRunning: boolean;
}

const DiscoveryControls: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>("yerevan");
  const [scanMode, setScanMode] = useState<string>("full");
  const [maxTiles, setMaxTiles] = useState<number>(15);
  const [showCustom, setShowCustom] = useState(false);
  const [customLat, setCustomLat] = useState<string>("40.1772");
  const [customLng, setCustomLng] = useState<string>("44.5126");
  const [customRadius, setCustomRadius] = useState<string>("2000");
  const [singleLoading, setSingleLoading] = useState(false);

  // Auto-continue state
  const [progress, setProgress] = useState<BatchProgress>({
    totalFound: 0, autoApproved: 0, flagged: 0, rejected: 0,
    tilesScanned: 0, totalTiles: 0, batchesCompleted: 0, isRunning: false,
  });
  const abortRef = useRef(false);

  const invokeScan = async (params: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("discover-fields", {
      body: { force: true, ...params },
    });
    if (error) throw error;
    return data;
  };

  // Single batch scan
  const handleSingleScan = async (params: Record<string, any>) => {
    setSingleLoading(true);
    try {
      const data = await invokeScan(params);
      queryClient.invalidateQueries({ queryKey: ["admin-candidate-fields"] });
      queryClient.invalidateQueries({ queryKey: ["verified-fields"] });
      const remaining = data.tiles_remaining > 0
        ? ` (${data.tiles_remaining} tiles remaining)`
        : "";
      toast.success(
        `${data.candidates_added} found, ${data.auto_approved} auto-approved, ${data.flagged_for_review} flagged, ${data.rejected_by_ai} rejected (${data.tiles_scanned}/${data.total_tiles} tiles)${remaining}`
      );
    } catch (e: any) {
      toast.error(`Discovery failed: ${e.message}`);
    } finally {
      setSingleLoading(false);
    }
  };

  // Auto-continue: chains batches until all tiles are done or stopped
  const handleAutoScan = useCallback(async (region: string) => {
    abortRef.current = false;
    const accumulated: BatchProgress = {
      totalFound: 0, autoApproved: 0, flagged: 0, rejected: 0,
      tilesScanned: 0, totalTiles: 0, batchesCompleted: 0, isRunning: true,
    };
    setProgress({ ...accumulated });

    let offset = 0;
    let totalTiles = 999; // Will be set on first response

    while (offset < totalTiles && !abortRef.current) {
      try {
        const data = await invokeScan({
          region: region,
          scan_mode: scanMode,
          max_tiles: maxTiles,
          tile_offset: offset,
        });

        totalTiles = data.total_tiles || 0;
        accumulated.totalFound += data.candidates_added || 0;
        accumulated.autoApproved += data.auto_approved || 0;
        accumulated.flagged += data.flagged_for_review || 0;
        accumulated.rejected += data.rejected_by_ai || 0;
        accumulated.tilesScanned += data.tiles_scanned || 0;
        accumulated.totalTiles = totalTiles;
        accumulated.batchesCompleted += 1;

        setProgress({ ...accumulated, isRunning: !abortRef.current });

        // Refresh UI data
        queryClient.invalidateQueries({ queryKey: ["admin-candidate-fields"] });
        queryClient.invalidateQueries({ queryKey: ["verified-fields"] });

        offset += data.tiles_scanned || maxTiles;

        // If no tiles remaining, we're done
        if ((data.tiles_remaining || 0) <= 0) break;

        // Small delay between batches to avoid hammering
        await new Promise(r => setTimeout(r, 1000));
      } catch (e: any) {
        console.error("Batch failed:", e);
        // Don't stop on error — the edge function may have saved results before timing out
        // Just skip ahead by maxTiles and continue
        accumulated.batchesCompleted += 1;
        offset += maxTiles;
        setProgress({ ...accumulated, isRunning: !abortRef.current });

        // Brief pause before retry
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    accumulated.isRunning = false;
    setProgress({ ...accumulated });

    queryClient.invalidateQueries({ queryKey: ["admin-candidate-fields"] });
    queryClient.invalidateQueries({ queryKey: ["verified-fields"] });

    toast.success(
      `🏁 Full scan complete! ${accumulated.totalFound} fields found, ${accumulated.autoApproved} auto-approved across ${accumulated.batchesCompleted} batches`
    );
  }, [scanMode, maxTiles, queryClient]);

  const handleStop = () => {
    abortRef.current = true;
    toast.info("Stopping after current batch finishes...");
  };

  const handleCustomScan = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    const radius = parseInt(customRadius);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    handleSingleScan({
      custom_lat: lat,
      custom_lng: lng,
      custom_radius: Math.min(radius || 2000, 5000),
      scan_mode: scanMode,
    });
  };

  const isLoading = singleLoading || progress.isRunning;
  const progressPercent = progress.totalTiles > 0
    ? Math.round((progress.tilesScanned / progress.totalTiles) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-primary" />
          AI Field Discovery
        </CardTitle>
        <CardDescription>
          Auto-scan mode chains multiple batches to find 200-300+ fields in one go.
          Each batch processes {maxTiles} tiles, and continues automatically until all tiles are covered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings row */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Scan Mode</Label>
            <Select value={scanMode} onValueChange={setScanMode} disabled={isLoading}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast"><Zap className="h-3 w-3 inline mr-1" />Fast (12 queries)</SelectItem>
                <SelectItem value="full"><Search className="h-3 w-3 inline mr-1" />Full (40 queries)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tiles / Batch</Label>
            <Select value={String(maxTiles)} onValueChange={(v) => setMaxTiles(Number(v))} disabled={isLoading}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 tiles</SelectItem>
                <SelectItem value="10">10 tiles</SelectItem>
                <SelectItem value="15">15 tiles</SelectItem>
                <SelectItem value="20">20 tiles</SelectItem>
                <SelectItem value="30">30 tiles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auto-scan with progress */}
        {progress.isRunning && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Auto-scanning... Batch {progress.batchesCompleted + 1}
              </span>
              <Button variant="destructive" size="sm" onClick={handleStop}>
                <Square className="h-3 w-3 mr-1" /> Stop
              </Button>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{progress.tilesScanned}/{progress.totalTiles} tiles</span>
              <span className="text-green-600 font-medium">{progress.totalFound} found</span>
              <span>{progress.autoApproved} auto-approved</span>
              <span>{progress.flagged} flagged</span>
              <span>{progress.rejected} rejected</span>
            </div>
          </div>
        )}

        {/* Completed summary */}
        {!progress.isRunning && progress.batchesCompleted > 0 && (
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-sm">
            <span className="font-medium text-success">Last scan complete:</span>{" "}
            {progress.totalFound} fields found, {progress.autoApproved} auto-approved
            across {progress.batchesCompleted} batches ({progress.tilesScanned} tiles)
          </div>
        )}

        {/* Region scan */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Region</Label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map(r => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.emoji} {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-scan (recommended) */}
          <Button
            onClick={() => handleAutoScan(selectedRegion)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {progress.isRunning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Auto-Scan Region</>
            )}
          </Button>

          {/* Full Armenia auto-scan */}
          <Button
            variant="outline"
            onClick={() => handleAutoScan("all")}
            disabled={isLoading}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Auto-Scan All Armenia
          </Button>

          {/* Single batch (legacy) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSingleScan({ region: selectedRegion, scan_mode: scanMode, max_tiles: maxTiles })}
            disabled={isLoading}
          >
            <Scan className="h-4 w-4 mr-1" /> Single Batch
          </Button>
        </div>

        {/* Quick region auto-scan buttons */}
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map(r => (
            <Button
              key={r.key}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={isLoading}
              onClick={() => {
                setSelectedRegion(r.key);
                handleAutoScan(r.key);
              }}
            >
              {r.emoji} {r.label}
            </Button>
          ))}
        </div>

        {/* Custom area scan */}
        <div className="border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCustom(!showCustom)}
            className="text-xs text-muted-foreground mb-2"
          >
            <MapPin className="h-3 w-3 mr-1" />
            {showCustom ? "Hide" : "Show"} Custom Area Scan
          </Button>

          {showCustom && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <Input
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  placeholder="40.1772"
                  className="w-[120px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <Input
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  placeholder="44.5126"
                  className="w-[120px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Radius (m)</Label>
                <Input
                  value={customRadius}
                  onChange={(e) => setCustomRadius(e.target.value)}
                  placeholder="2000"
                  className="w-[100px]"
                />
              </div>
              <Button onClick={handleCustomScan} disabled={isLoading} size="sm">
                <MapPin className="h-4 w-4 mr-1" /> Scan Area
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DiscoveryControls;
