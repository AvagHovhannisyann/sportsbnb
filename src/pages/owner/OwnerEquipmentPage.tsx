import React, { useState } from "react";
import { Package, Plus, Trash2, Edit, Loader2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import {
  useVenueEquipment,
  useAddEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  VenueEquipment,
} from "@/hooks/useVenueEquipment";

const PAGE_TITLE = "Equipment Rentals";
const PAGE_SUBTITLE = "Track rental items and packages for each venue";

const OwnerEquipmentPage = () => {
  const { user } = useAuth();
  const {
    data: venues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch: refetchVenues,
  } = useOwnerVenues(user?.id);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<VenueEquipment | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "0",
    equipment_type: "item" as "item" | "package",
    is_available: true,
  });

  // Auto-select first venue
  React.useEffect(() => {
    if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  const {
    data: equipment = [],
    isLoading: equipmentLoading,
    isError: equipmentError,
    isFetching: equipmentFetching,
    refetch: refetchEquipment,
  } = useVenueEquipment(selectedVenueId);
  const addEquipment = useAddEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();

  const items = equipment.filter(e => e.equipment_type === 'item');
  const packages = equipment.filter(e => e.equipment_type === 'package');

  const handleOpenDialog = (equip?: VenueEquipment) => {
    if (equip) {
      setEditingEquipment(equip);
      setFormData({
        name: equip.name,
        description: equip.description || "",
        price: String(equip.price),
        equipment_type: equip.equipment_type,
        is_available: equip.is_available,
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        name: "",
        description: "",
        price: "0",
        equipment_type: "item",
        is_available: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVenueId || !formData.name.trim()) return;

    const equipmentData = {
      venue_id: selectedVenueId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      equipment_type: formData.equipment_type,
      is_available: formData.is_available,
    };

    try {
      if (editingEquipment) {
        await updateEquipment.mutateAsync({
          id: editingEquipment.id,
          venueId: selectedVenueId,
          ...equipmentData,
        });
      } else {
        await addEquipment.mutateAsync(equipmentData);
      }

      setIsDialogOpen(false);
    } catch {
      // The mutation hooks own the error toast. Keep the dialog open so the
      // owner's input is not lost and avoid an unhandled promise rejection.
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEquipment.mutateAsync({ id, venueId: selectedVenueId });
  };

  if (venuesLoading) {
    return (
      <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <div className="flex items-center justify-center py-16" role="status" aria-label="Loading equipment">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
        </div>
      </OwnerLayout>
    );
  }

  if (venuesError) {
    return (
      <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        {/* Not "No venues yet". That sends an owner whose venue list failed to
            load off to /add-venue to re-create something they already own. */}
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your venues"
            description="Your equipment catalog has not changed. Try loading your venues again."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
      </OwnerLayout>
    );
  }

  if (venues.length === 0) {
    return (
      <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <Card className="max-w-3xl">
          <EmptyState
            icon={Package}
            title="No venues yet"
            description="Add a venue first to create an equipment catalog."
            actionLabel="Add first venue"
            actionHref="/add-venue"
          />
        </Card>
      </OwnerLayout>
    );
  }

  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId);

  return (
    <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="max-w-5xl space-y-5">
        <section
          aria-labelledby="equipment-venue-context"
          className="rounded-lg border border-border bg-surface-1 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6"
        >
          <div className="min-w-0">
            <p className="eyebrow">Venue context</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h2
                id="equipment-venue-context"
                className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground"
              >
                {selectedVenue?.name || "Choose a venue"}
              </h2>
              {selectedVenue && (
                <Badge variant={selectedVenue.is_active ? "default" : "secondary"}>
                  {selectedVenue.is_active ? "Active" : "Draft"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Items and packages below belong only to this venue.
            </p>
          </div>

          <div className="mt-4 flex w-full flex-col gap-3 sm:mt-0 sm:w-auto sm:min-w-64 sm:flex-row sm:items-end">
            {venues.length > 1 && (
              <div className="w-full sm:w-64">
                <Label htmlFor="equipment-venue">Venue</Label>
                <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                  <SelectTrigger id="equipment-venue" className="mt-1.5">
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="button" className="w-full sm:w-auto" onClick={() => handleOpenDialog()}>
              <Plus aria-hidden="true" />
              Add equipment
            </Button>
          </div>
        </section>

        {equipmentLoading ? (
          <div className="flex items-center justify-center py-16" role="status" aria-label="Loading equipment">
            <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
          </div>
        ) : equipmentError ? (
          <Card>
            <ErrorPanel
              what="this venue's equipment"
              description="The catalog has not changed. Try loading it again."
              onRetry={() => refetchEquipment()}
              isRetrying={equipmentFetching}
            />
          </Card>
        ) : equipment.length === 0 ? (
          <EmptyState
            bordered
            icon={Package}
            title="No equipment in this catalog"
            description="Add individual items or packages to keep this venue's rental inventory organized."
            actionLabel="Add first item"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {/* Individual Items */}
            {items.length > 0 && (
              <Card>
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle as="h2" className="text-lg">Individual items</CardTitle>
                      <CardDescription className="mt-1.5">Single-item entries in this venue's catalog.</CardDescription>
                    </div>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-3 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{item.name}</span>
                            <Badge variant={item.is_available ? "default" : "secondary"}>
                              {item.is_available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <Price amount={item.price} className="font-semibold text-foreground" />
                          <div className="flex gap-1" role="group" aria-label={`Actions for ${item.name}`}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(item)}
                              aria-label={`Edit ${item.name}`}
                            >
                              <Edit aria-hidden="true" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete ${item.name}`}
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete equipment?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    Delete equipment
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Packages */}
            {packages.length > 0 && (
              <Card>
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle as="h2" className="text-lg">Equipment packages</CardTitle>
                      <CardDescription className="mt-1.5">Grouped rental entries kept as one catalog option.</CardDescription>
                    </div>
                    <Badge variant="secondary">{packages.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {packages.map((pkg) => (
                      <li
                        key={pkg.id}
                        className="flex flex-col gap-3 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="flex min-w-0 flex-1 items-start gap-2">
                              <Package aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary" />
                              <span className="min-w-0 break-words font-semibold text-foreground">{pkg.name}</span>
                            </span>
                            <Badge variant={pkg.is_available ? "default" : "secondary"}>
                              {pkg.is_available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          {pkg.description && (
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{pkg.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <Price amount={pkg.price} className="font-semibold text-foreground" />
                          <div className="flex gap-1" role="group" aria-label={`Actions for ${pkg.name}`}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(pkg)}
                              aria-label={`Edit ${pkg.name}`}
                            >
                              <Edit aria-hidden="true" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete ${pkg.name}`}
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete package?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{pkg.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
                                    onClick={() => handleDelete(pkg.id)}
                                  >
                                    Delete package
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEquipment ? "Edit equipment" : "Add equipment"}
            </DialogTitle>
            <DialogDescription>
              {editingEquipment
                ? "Update this entry in the selected venue's equipment catalog."
                : "Create an item or package in the selected venue's equipment catalog."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipment-type">Type</Label>
              <Select
                value={formData.equipment_type}
                onValueChange={(value: "item" | "package") =>
                  setFormData((prev) => ({ ...prev, equipment_type: value }))
                }
              >
                <SelectTrigger id="equipment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Individual item</SelectItem>
                  <SelectItem value="package">Equipment package</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment-name">Name</Label>
              <Input
                id="equipment-name"
                placeholder={formData.equipment_type === "package" ? "e.g., Full tennis kit" : "e.g., Tennis racket"}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment-description">Description</Label>
              <Textarea
                id="equipment-description"
                placeholder={
                  formData.equipment_type === "package"
                    ? "List what's included in this package…"
                    : "Add a brief description…"
                }
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment-price">Rental price (֏)</Label>
              <div className="relative">
                <Banknote
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="equipment-price"
                  type="number"
                  min="0"
                  step="100"
                  className="pl-9"
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-border bg-surface-2 px-3 py-2.5">
              <div>
                <Label htmlFor="equipment-available">Available</Label>
                <p id="equipment-available-help" className="text-sm text-muted-foreground">
                  Mark whether this catalog entry can currently be offered.
                </p>
              </div>
              <Switch
                id="equipment-available"
                aria-describedby="equipment-available-help"
                checked={formData.is_available}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_available: checked }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addEquipment.isPending || updateEquipment.isPending}
              >
                {(addEquipment.isPending || updateEquipment.isPending) && (
                  <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                )}
                {addEquipment.isPending || updateEquipment.isPending
                  ? "Saving…"
                  : editingEquipment
                    ? "Save changes"
                    : "Add equipment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerEquipmentPage;
