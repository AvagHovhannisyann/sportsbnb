import React, { useState } from "react";
import { Package, Plus, Trash2, Edit, Loader2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const PAGE_TITLE = "Equipment Rentals";
const PAGE_SUBTITLE = "Manage rental items and packages for your venues";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { 
  useVenueEquipment, 
  useAddEquipment, 
  useUpdateEquipment, 
  useDeleteEquipment,
  VenueEquipment 
} from "@/hooks/useVenueEquipment";
import { formatPrice } from "@/lib/pricing";

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

  const { data: equipment = [], isLoading: equipmentLoading } = useVenueEquipment(selectedVenueId);
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
  };

  const handleDelete = async (id: string) => {
    await deleteEquipment.mutateAsync({ id, venueId: selectedVenueId });
  };

  if (venuesLoading) {
    return (
      <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <div className="flex items-center justify-center py-16" role="status" aria-label="Loading equipment">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  if (venuesError) {
    return (
      <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        {/* Not "No venues yet". That sends an owner whose venue list failed to
            load off to /add-venue to re-create something they already own. */}
        <ErrorPanel
          what="your venues"
          onRetry={() => refetchVenues()}
          isRetrying={venuesFetching}
        />
      </OwnerLayout>
    );
  }

  if (venues.length === 0) {
    return (
      <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <EmptyState
          icon={Package}
          title="No venues yet"
          description="Add a venue first to manage equipment rentals"
          actionLabel="Add Venue"
          actionHref="/add-venue"
        />
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="space-y-6">
        {/* The h1 and the strapline come from OwnerLayout now, as they do on
            every other owner page. They used to be written out here instead,
            which meant the two early returns above — "still loading" and "no
            venues yet" — rendered no h1 at all. Measured with an empty owner
            account, the page's outline started at h2: a new owner arriving at
            this screen got a document with no heading for the page they were
            on. */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>

        {/* Venue Selector. This one sits alone in a toolbar row with no
            visible label, so the name is spelled out rather than borrowed
            from one. The placeholder is not a name: it disappears the moment
            a venue is chosen, which is when it would matter most. */}
        {venues.length > 1 && (
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger aria-label="Select venue" className="w-full sm:w-64">
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
        )}

        {equipmentLoading ? (
          <div className="flex items-center justify-center py-16" role="status" aria-label="Loading equipment">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : equipment.length === 0 ? (
          /* A ninth hand-rolled empty state, on a page that already imports
             the shared one for its no-venues case. The unification pass caught
             the eight on the player side and missed this because it sits
             behind `equipment.length === 0`, which no fixture had ever
             produced. Found by measuring heading levels, of all things. */
          <EmptyState
            bordered
            icon={Package}
            title="No equipment added"
            description="Add rental items like balls, rackets, or packages for customers to add to their booking."
            actionLabel="Add First Equipment"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="space-y-6">
            {/* Individual Items */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle as="h2" className="text-lg">Individual Items</CardTitle>
                  <CardDescription>Single items customers can rent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {!item.is_available && (
                              <Badge variant="secondary">Unavailable</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-primary">
                            {formatPrice(item.price)}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Packages */}
            {packages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle as="h2" className="text-lg">Equipment Packages</CardTitle>
                  <CardDescription>Bundled equipment sets at a discounted price</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-primary/5"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="font-medium">{pkg.name}</span>
                            {!pkg.is_available && (
                              <Badge variant="secondary">Unavailable</Badge>
                            )}
                          </div>
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-primary">
                            {formatPrice(pkg.price)}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(pkg)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Package</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{pkg.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(pkg.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEquipment ? "Edit Equipment" : "Add Equipment"}
            </DialogTitle>
            <DialogDescription>
              {editingEquipment 
                ? "Update the equipment details below" 
                : "Add a new rental item or package for customers"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.equipment_type} 
                onValueChange={(value: "item" | "package") => 
                  setFormData(prev => ({ ...prev, equipment_type: value }))
                }
              >
                {/* `id="type"`, which the label above has always named and
                    nothing has ever carried. Unlabelled, the trigger is
                    announced as whatever it currently reads — "Item" — so the
                    field's name changed every time its value did. */}
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Individual Item</SelectItem>
                  <SelectItem value="package">Equipment Package</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder={formData.equipment_type === 'package' ? "e.g., Full Tennis Kit" : "e.g., Tennis Racket"}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder={formData.equipment_type === 'package' 
                  ? "List what's included in this package..." 
                  : "Brief description of the item..."}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Rental Price (֏)</Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="100"
                  className="pl-9"
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Available for Rental</Label>
                <p className="text-sm text-muted-foreground">
                  Show this option to customers
                </p>
              </div>
              <Switch
                checked={formData.is_available}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_available: checked }))
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingEquipment ? "Save Changes" : "Add Equipment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerEquipmentPage;
