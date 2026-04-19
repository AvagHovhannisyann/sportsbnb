import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Trash2, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useVenueById } from "@/hooks/useVenues";
import { VenueLocationPicker } from "@/components/venues/VenueLocationPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { formatPhoneDisplay, normalizePhoneE164 } from "@/lib/phone";

const SPORTS_OPTIONS = [
  "Football", "Basketball", "Tennis", "Swimming", 
  "Volleyball", "Badminton", "Rugby", "Gym",
  "Cricket", "Golf", "Running", "Cycling"
];

const AMENITY_OPTIONS = [
  "Parking", "Showers", "Lockers", "Equipment Rental",
  "Cafe", "Pro Shop", "Coaching", "First Aid",
  "Water Fountains", "Bleachers", "Scoreboard", "Floodlights"
];

const EditVenuePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { data: venue, isLoading: venueLoading } = useVenueById(id);
  const queryClient = useQueryClient();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    sports: [] as string[],
    amenities: [] as string[],
    pricePerHour: "30",
    isIndoor: true,
    isActive: true,
    latitude: null as number | null,
    longitude: null as number | null,
    locationConfirmed: false,
    phone: "",
    contactName: "",
    whatsappEnabled: true,
    smsEnabled: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    if (!authLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (venue && !formInitialized) {
      // Verify ownership
      if (venue.owner_id !== user?.id) {
        toast.error("You don't have permission to edit this venue");
        navigate("/owner-dashboard");
        return;
      }

      setFormData({
        name: venue.name,
        description: venue.description || "",
        address: venue.address || "",
        city: venue.city,
        sports: venue.sports || [],
        amenities: venue.amenities || [],
        pricePerHour: String(venue.price_per_hour),
        isIndoor: venue.is_indoor,
        isActive: venue.is_active,
        latitude: venue.latitude || null,
        longitude: venue.longitude || null,
        locationConfirmed: venue.location_confirmed || false,
        phone: venue.phone || "",
        contactName: venue.contact_name || "",
        whatsappEnabled: venue.whatsapp_enabled ?? true,
        smsEnabled: venue.sms_enabled ?? true,
      });
      if (venue.image_url) {
        setImagePreview(venue.image_url);
      }
      setFormInitialized(true);
    }
  }, [venue, user, navigate, formInitialized]);

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport]
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;

    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id) return;
    
    if (!formData.name.trim() || !formData.city.trim()) {
      toast.error("Please fill in required fields");
      return;
    }

    if (formData.sports.length === 0) {
      toast.error("Please select at least one sport");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | null | undefined = undefined;
      
      if (imageFile) {
        imageUrl = await uploadImage();
      } else if (imagePreview === null && venue?.image_url) {
        // Image was removed
        imageUrl = null;
      }

      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim(),
        sports: formData.sports,
        amenities: formData.amenities,
        price_per_hour: parseFloat(formData.pricePerHour) || 30,
        is_indoor: formData.isIndoor,
        is_active: formData.isActive,
        latitude: formData.latitude,
        longitude: formData.longitude,
        location_confirmed: formData.locationConfirmed,
        phone: normalizePhoneE164(formData.phone) || null,
        contact_name: formData.contactName.trim() || null,
        whatsapp_enabled: formData.whatsappEnabled,
        sms_enabled: formData.smsEnabled,
      };

      if (imageUrl !== undefined) {
        updateData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from('venues')
        .update(updateData)
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["owner-venues"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["venue", id] });
      
      toast.success("Venue updated successfully!");
      navigate("/owner-dashboard");
    } catch (error) {
      console.error("Error updating venue:", error);
      toast.error("Failed to update venue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["owner-venues"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      
      toast.success("Venue deleted successfully!");
      navigate("/owner-dashboard");
    } catch (error) {
      console.error("Error deleting venue:", error);
      toast.error("Failed to delete venue. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || venueLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </Layout>
    );
  }

  if (!venue) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Venue Not Found</h1>
          <p className="text-muted-foreground mb-4">This venue doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate("/owner-dashboard")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Edit Venue</h1>
                <p className="text-muted-foreground">Update your venue details</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/venue/${id}/availability`}>
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Hours & Availability
                </Button>
              </Link>
              <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Venue</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{venue.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Venue Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Downtown Sports Complex"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell players about your venue..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-24"
                    maxLength={1000}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="e.g., New York"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Street address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      maxLength={200}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Venue Image</CardTitle>
              </CardHeader>
              <CardContent>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Venue preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload venue image</span>
                    <span className="text-xs text-muted-foreground mt-1">Max 5MB</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Sports */}
            <Card>
              <CardHeader>
                <CardTitle>Sports Offered *</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SPORTS_OPTIONS.map((sport) => (
                    <div
                      key={sport}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSportToggle(sport);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSportToggle(sport);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all text-left ${
                        formData.sports.includes(sport)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center ${
                        formData.sports.includes(sport) ? 'bg-primary text-primary-foreground' : ''
                      }`}>
                        {formData.sports.includes(sport) && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{sport}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <div
                      key={amenity}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAmenityToggle(amenity);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAmenityToggle(amenity);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all text-left ${
                        formData.amenities.includes(amenity)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center ${
                        formData.amenities.includes(amenity) ? 'bg-primary text-primary-foreground' : ''
                      }`}>
                        {formData.amenities.includes(amenity) && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Hour (֏) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    max="300000"
                    placeholder="30"
                    value={formData.pricePerHour}
                    onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Indoor Venue</Label>
                    <p className="text-sm text-muted-foreground">Is this an indoor facility?</p>
                  </div>
                  <Switch
                    checked={formData.isIndoor}
                    onCheckedChange={(checked) => setFormData({ ...formData, isIndoor: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active Listing</Label>
                    <p className="text-sm text-muted-foreground">Make this venue visible to players</p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Booking Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-[#25D366]" />
                  Booking Contact
                </CardTitle>
                <CardDescription>
                  How customers reach you to book. WhatsApp is the primary channel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+374 99 123 456"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    {formData.phone && (
                      <p className="text-xs text-muted-foreground">
                        Will be saved as: {formatPhoneDisplay(formData.phone) || "invalid"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      placeholder="e.g., Armen"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Accept WhatsApp bookings</Label>
                    <p className="text-sm text-muted-foreground">Primary booking channel</p>
                  </div>
                  <Switch
                    checked={formData.whatsappEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Accept SMS bookings</Label>
                    <p className="text-sm text-muted-foreground">Fallback if WhatsApp is off</p>
                  </div>
                  <Switch
                    checked={formData.smsEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, smsEnabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || uploadingImage}
                className="flex-1"
              >
                {isSubmitting || uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploadingImage ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditVenuePage;
