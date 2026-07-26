import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Loader2, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VenueLocationPicker } from "@/components/venues/VenueLocationPicker";
import { toast } from "sonner";
import { formatPhoneDisplay } from "@/lib/phone";
import {
  SPORTS_OPTIONS,
  AMENITY_OPTIONS,
  MIN_DESCRIPTION_LENGTH,
  MIN_PHOTOS,
  validateCreateVenue,
  type VenueFormMode,
  type VenueFormFields,
  type VenueFormValues,
  type VenueFormInitialValues,
} from "./venueSchema";

interface VenueFormProps {
  mode: VenueFormMode;
  initialValues?: VenueFormInitialValues;
  onSubmit: (values: VenueFormValues) => void | Promise<void>;
  isSubmitting: boolean;
  /** True while the page's mutation is uploading images (drives the button label). */
  isUploadingImages?: boolean;
  /** Runs before validation on submit; return false to abort silently (mirrors the pages' auth guards). */
  onBeforeValidate?: () => boolean;
}

const defaultFields: VenueFormFields = {
  name: "",
  description: "",
  address: "",
  city: "",
  zipCode: "",
  sports: [],
  amenities: [],
  pricePerHour: "30",
  isIndoor: true,
  isActive: true,
  latitude: null,
  longitude: null,
  locationConfirmed: false,
  phone: "",
  contactName: "",
  whatsappEnabled: true,
  smsEnabled: true,
};

export const VenueForm = ({
  mode,
  initialValues,
  onSubmit,
  isSubmitting,
  isUploadingImages = false,
  onBeforeValidate,
}: VenueFormProps) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<VenueFormFields>(() =>
    initialValues
      ? {
          name: initialValues.name,
          description: initialValues.description,
          address: initialValues.address,
          city: initialValues.city,
          zipCode: initialValues.zipCode,
          sports: initialValues.sports,
          amenities: initialValues.amenities,
          pricePerHour: initialValues.pricePerHour,
          isIndoor: initialValues.isIndoor,
          isActive: initialValues.isActive,
          latitude: initialValues.latitude,
          longitude: initialValues.longitude,
          locationConfirmed: initialValues.locationConfirmed,
          phone: initialValues.phone,
          contactName: initialValues.contactName,
          whatsappEnabled: initialValues.whatsappEnabled,
          smsEnabled: initialValues.smsEnabled,
        }
      : defaultFields
  );

  // Create mode: multiple photos (min 3, max 10)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Edit mode: single replaceable image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.imageUrl ?? null);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport]
    }));
    if (mode === "create") {
      setValidationErrors(prev => ({ ...prev, sports: '' }));
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const removeImageAt = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSingleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const removeSingleImage = () => {
    setImageFile(null);
    setImagePreview(null);
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
    const errors = validateCreateVenue(formData, imageFiles.length);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (onBeforeValidate && !onBeforeValidate()) return;

    if (mode === "create") {
      if (!validateForm()) {
        toast.error("Please fix the errors before submitting");
        return;
      }
    } else {
      if (!formData.name.trim() || !formData.city.trim()) {
        toast.error("Please fill in required fields");
        return;
      }

      if (formData.sports.length === 0) {
        toast.error("Please select at least one sport");
        return;
      }
    }

    await onSubmit({
      ...formData,
      imageFiles: mode === "create" ? imageFiles : imageFile ? [imageFile] : [],
      imageRemoved: mode === "edit" && imagePreview === null && !!initialValues?.imageUrl,
    });
  };

  const renderOptionGrid = (
    options: string[],
    selected: string[],
    onToggle: (option: string) => void,
  ) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {options.map((option) => (
        <div
          key={option}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(option);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(option);
            }
          }}
          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all text-left ${
            selected.includes(option)
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className={`h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center ${
            selected.includes(option) ? 'bg-primary text-primary-foreground' : ''
          }`}>
            {selected.includes(option) && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
          <span className="text-sm font-medium">{option}</span>
        </div>
      ))}
    </div>
  );

  const basicInfoCard = mode === "create" ? (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Basic Information</CardTitle>
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
  ) : (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Basic Information</CardTitle>
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
              placeholder="e.g., Yerevan"
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
  );

  const imagesCard = mode === "create" ? (
    <Card className={validationErrors.images ? 'border-destructive' : ''}>
      <CardHeader>
        <CardTitle as="h2">
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
                  onClick={() => removeImageAt(index)}
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
              onChange={handleImagesChange}
            />
          </label>
        )}

        {validationErrors.images && (
          <p className="text-sm text-destructive mt-2">{validationErrors.images}</p>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Venue Image</CardTitle>
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
              onClick={removeSingleImage}
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
              onChange={handleSingleImageChange}
            />
          </label>
        )}
      </CardContent>
    </Card>
  );

  const sportsCard = (
    <Card className={mode === "create" && validationErrors.sports ? 'border-destructive' : ''}>
      <CardHeader>
        <CardTitle as="h2">Sports Offered *</CardTitle>
        {mode === "create" && (
          <CardDescription>Select all sports available at your venue</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {renderOptionGrid(SPORTS_OPTIONS, formData.sports, handleSportToggle)}
        {mode === "create" && validationErrors.sports && (
          <p className="text-sm text-destructive mt-2">{validationErrors.sports}</p>
        )}
      </CardContent>
    </Card>
  );

  const amenitiesCard = (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Amenities</CardTitle>
        {mode === "create" && (
          <CardDescription>Highlight what makes your venue special</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {renderOptionGrid(AMENITY_OPTIONS, formData.amenities, handleAmenityToggle)}
      </CardContent>
    </Card>
  );

  const contactCard = mode === "create" ? (
    <Card className={validationErrors.phone ? 'border-destructive' : ''}>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
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
            <Label htmlFor="venue-whatsapp-messages">Accept WhatsApp messages</Label>
            <p className="text-xs text-muted-foreground">Recommended — most players prefer this</p>
          </div>
          <Switch
            id="venue-whatsapp-messages"
            checked={formData.whatsappEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="venue-sms-fallback">Accept SMS as fallback</Label>
            <p className="text-xs text-muted-foreground">Used when WhatsApp isn't available</p>
          </div>
          <Switch
            id="venue-sms-fallback"
            checked={formData.smsEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, smsEnabled: checked })}
          />
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
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
            <Label htmlFor="venue-whatsapp-bookings">Accept WhatsApp bookings</Label>
            <p className="text-sm text-muted-foreground">Primary booking channel</p>
          </div>
          <Switch
            id="venue-whatsapp-bookings"
            checked={formData.whatsappEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="venue-sms-bookings">Accept SMS bookings</Label>
            <p className="text-sm text-muted-foreground">Fallback if WhatsApp is off</p>
          </div>
          <Switch
            id="venue-sms-bookings"
            checked={formData.smsEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, smsEnabled: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );

  const pricingCard = (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Pricing & Settings</CardTitle>
        {mode === "create" && (
          <CardDescription>You'll receive 90% of each booking</CardDescription>
        )}
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
          {mode === "create" && (
            <p className="text-xs text-muted-foreground">
              You will receive exactly ֏{(parseFloat(formData.pricePerHour) || 30).toLocaleString()}/hour. Players pay ֏{Math.ceil((parseFloat(formData.pricePerHour) || 30) * 1.05).toLocaleString()} (includes 5% platform fee).
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="venue-indoor">Indoor Venue</Label>
            <p className="text-sm text-muted-foreground">Is this an indoor facility?</p>
          </div>
          <Switch
            id="venue-indoor"
            checked={formData.isIndoor}
            onCheckedChange={(checked) => setFormData({ ...formData, isIndoor: checked })}
          />
        </div>

        {mode === "edit" && (
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="venue-active">Active Listing</Label>
              <p className="text-sm text-muted-foreground">Make this venue visible to players</p>
            </div>
            <Switch
            id="venue-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        )}

        {mode === "create" && (
          <Alert className="border-muted bg-muted/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Note:</strong> Your venue will be reviewed by our team and will become visible to players once approved. This ensures quality for our community.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === "create" ? (
        <>
          {/* Requirements Notice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Quality Requirements:</strong> All venues must have a detailed description (100+ characters), at least 3 photos of your facility, and confirm the location on map. Your venue will be reviewed by our team before going live.
            </AlertDescription>
          </Alert>

          {basicInfoCard}

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

          {imagesCard}
          {sportsCard}
          {amenitiesCard}
          {contactCard}
          {pricingCard}
        </>
      ) : (
        <>
          {basicInfoCard}
          {imagesCard}
          {sportsCard}
          {amenitiesCard}
          {pricingCard}
          {contactCard}
        </>
      )}

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
          disabled={isSubmitting || isUploadingImages}
          className="flex-1"
        >
          {isSubmitting || isUploadingImages ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isUploadingImages
                ? mode === "create" ? "Uploading photos..." : "Uploading..."
                : "Saving..."}
            </>
          ) : (
            mode === "create" ? "Add Venue" : "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
};
