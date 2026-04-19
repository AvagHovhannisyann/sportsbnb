import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
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

const MIN_DESCRIPTION_LENGTH = 100;
const MIN_PHOTOS = 3;

const AddVenuePage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    zipCode: "",
    sports: [] as string[],
    amenities: [] as string[],
    pricePerHour: "30",
    isIndoor: true,
    latitude: null as number | null,
    longitude: null as number | null,
    locationConfirmed: false,
    phone: "",
    contactName: "",
    whatsappEnabled: true,
    smsEnabled: true,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: { pathname: "/add-venue" } } });
    }
    if (!authLoading && user && profile && profile.user_type !== "owner") {
      toast.info("Switch to an owner account to list a venue.");
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport]
    }));
    setValidationErrors(prev => ({ ...prev, sports: '' }));
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
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per image.`);
        return;
      }
      if (imageFiles.length + validFiles.length >= 10) {
        toast.error("Maximum 10 images allowed");
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        validPreviews.push(reader.result as string);
        if (validPreviews.length === validFiles.length) {
          setImageFiles(prev => [...prev, ...validFiles]);
          setImagePreviews(prev => [...prev, ...validPreviews]);
          setValidationErrors(prev => ({ ...prev, images: '' }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0 || !user) return [];

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('venue-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('venue-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload images");
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const handleLocationConfirm = (lat: number, lng: number, confirmed: boolean) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat || null,
      longitude: lng || null,
      locationConfirmed: confirmed,
    }));
    if (confirmed) {
      setValidationErrors(prev => ({ ...prev, location: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Venue name is required";
    }

    if (!formData.city.trim()) {
      errors.city = "City is required";
    }

    if (!formData.address.trim()) {
      errors.address = "Address is required for venue listings";
    }

    if (formData.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      errors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters. Currently: ${formData.description.trim().length} characters.`;
    }

    if (formData.sports.length === 0) {
      errors.sports = "Please select at least one sport";
    }

    if (imageFiles.length < MIN_PHOTOS) {
      errors.images = `Please upload at least ${MIN_PHOTOS} photos. Currently: ${imageFiles.length} photo(s).`;
    }

    if (!formData.locationConfirmed) {
      errors.location = "Please confirm the venue location on the map";
    }

    const normalizedPhone = normalizePhoneE164(formData.phone);
    if (!normalizedPhone || normalizedPhone.replace(/\D/g, "").length < 8) {
      errors.phone = "A valid contact phone number is required so players can reach you";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadImages();
      if (imageUrls.length < MIN_PHOTOS) {
        toast.error("Failed to upload required images. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('venues')
        .insert({
          owner_id: user.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          zip_code: formData.zipCode.trim() || null,
          sports: formData.sports,
          amenities: formData.amenities,
          price_per_hour: parseFloat(formData.pricePerHour) || 30,
          is_indoor: formData.isIndoor,
          is_active: false, // Always start as inactive - requires admin approval
          image_url: imageUrls[0],
          latitude: formData.latitude,
          longitude: formData.longitude,
          location_confirmed: formData.locationConfirmed,
          phone: normalizePhoneE164(formData.phone),
          contact_name: formData.contactName.trim() || null,
          whatsapp_enabled: formData.whatsappEnabled,
          sms_enabled: formData.smsEnabled,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["owner-venues"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      
      toast.success("Venue submitted for review! It will become visible to players once approved by our team.");
      navigate("/owner-dashboard");
    } catch (error) {
      console.error("Error adding venue:", error);
      toast.error("Failed to add venue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Add New Venue</h1>
              <p className="text-muted-foreground">Create a quality venue listing</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
              {/* Requirements Notice */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Quality Requirements:</strong> All venues must have a detailed description (100+ characters), at least 3 photos of your facility, and confirm the location on map. Your venue will be reviewed by our team before going live.
                </AlertDescription>
              </Alert>

              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Provide accurate details to attract more bookings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Venue Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Downtown Sports Complex"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setValidationErrors(prev => ({ ...prev, name: '' }));
                      }}
                      maxLength={100}
                      className={validationErrors.name ? 'border-destructive' : ''}
                    />
                    {validationErrors.name && (
                      <p className="text-sm text-destructive">{validationErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description * <span className="text-muted-foreground text-xs">({formData.description.length}/{MIN_DESCRIPTION_LENGTH} min characters)</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your venue in detail - include facilities, equipment available, special features, parking information, nearby amenities, and what makes your venue special for players..."
                      value={formData.description}
                      onChange={(e) => {
                        setFormData({ ...formData, description: e.target.value });
                        setValidationErrors(prev => ({ ...prev, description: '' }));
                      }}
                      className={`min-h-32 ${validationErrors.description ? 'border-destructive' : ''}`}
                      maxLength={1000}
                    />
                    {validationErrors.description && (
                      <p className="text-sm text-destructive">{validationErrors.description}</p>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* Location Picker with Map */}
              <VenueLocationPicker
                address={formData.address}
                city={formData.city}
                zipCode={formData.zipCode}
                onAddressChange={(address) => {
                  setFormData(prev => ({ ...prev, address }));
                  setValidationErrors(prev => ({ ...prev, address: '' }));
                }}
                onCityChange={(city) => {
                  setFormData(prev => ({ ...prev, city }));
                  setValidationErrors(prev => ({ ...prev, city: '' }));
                }}
                onZipCodeChange={(zipCode) => {
                  setFormData(prev => ({ ...prev, zipCode }));
                }}
                onLocationConfirm={handleLocationConfirm}
                latitude={formData.latitude}
                longitude={formData.longitude}
                locationConfirmed={formData.locationConfirmed}
                validationErrors={{
                  address: validationErrors.address,
                  city: validationErrors.city,
                  location: validationErrors.location,
                }}
              />

              {/* Image Upload - Multiple */}
              <Card className={validationErrors.images ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle>
                    Venue Photos * <span className="text-muted-foreground text-sm font-normal">({imageFiles.length}/{MIN_PHOTOS} minimum)</span>
                  </CardTitle>
                  <CardDescription>Upload at least 3 high-quality photos showing different areas of your venue</CardDescription>
                </CardHeader>
                <CardContent>
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-video">
                          <img
                            src={preview}
                            alt={`Venue preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {imageFiles.length < 10 && (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload venue photos</span>
                      <span className="text-xs text-muted-foreground mt-1">Max 5MB per image, up to 10 photos</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                  
                  {validationErrors.images && (
                    <p className="text-sm text-destructive mt-2">{validationErrors.images}</p>
                  )}
                </CardContent>
              </Card>

              {/* Sports */}
              <Card className={validationErrors.sports ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle>Sports Offered *</CardTitle>
                  <CardDescription>Select all sports available at your venue</CardDescription>
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
                  {validationErrors.sports && (
                    <p className="text-sm text-destructive mt-2">{validationErrors.sports}</p>
                  )}
                </CardContent>
              </Card>

              {/* Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                  <CardDescription>Highlight what makes your venue special</CardDescription>
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

              {/* Booking Contact (WhatsApp / SMS) */}
              <Card className={validationErrors.phone ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-[#25D366]" />
                    Booking Contact
                  </CardTitle>
                  <CardDescription>
                    Players will contact you directly via WhatsApp or SMS to confirm bookings. This is required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp / Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+374 99 11 22 33"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        setValidationErrors(prev => ({ ...prev, phone: '' }));
                      }}
                    />
                    {formData.phone && !validationErrors.phone && (
                      <p className="text-xs text-muted-foreground">
                        Will be saved as: {formatPhoneDisplay(formData.phone)}
                      </p>
                    )}
                    {validationErrors.phone && (
                      <p className="text-sm text-destructive">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Person (optional)</Label>
                    <Input
                      id="contactName"
                      placeholder="e.g. Aram"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      maxLength={80}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Accept WhatsApp messages</Label>
                      <p className="text-xs text-muted-foreground">Recommended — most players prefer this</p>
                    </div>
                    <Switch
                      checked={formData.whatsappEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Accept SMS as fallback</Label>
                      <p className="text-xs text-muted-foreground">Used when WhatsApp isn't available</p>
                    </div>
                    <Switch
                      checked={formData.smsEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, smsEnabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Settings</CardTitle>
                  <CardDescription>You'll receive 90% of each booking</CardDescription>
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
                    <p className="text-xs text-muted-foreground">
                      You will receive exactly ֏{(parseFloat(formData.pricePerHour) || 30).toLocaleString()}/hour. Players pay ֏{Math.ceil((parseFloat(formData.pricePerHour) || 30) * 1.05).toLocaleString()} (includes 5% platform fee).
                    </p>
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

                  <Alert className="border-muted bg-muted/30">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Note:</strong> Your venue will be reviewed by our team and will become visible to players once approved. This ensures quality for our community.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Submit */}
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
                  disabled={isSubmitting || uploadingImages}
                  className="flex-1"
                >
                  {isSubmitting || uploadingImages ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadingImages ? "Uploading photos..." : "Saving..."}
                    </>
                  ) : (
                    "Add Venue"
                  )}
                </Button>
              </div>
            </form>
          </div>
      </div>
    </Layout>
  );
};

export default AddVenuePage;
