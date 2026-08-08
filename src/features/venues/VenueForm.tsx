import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Loader2, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VenueLocationPicker } from "@/components/venues/VenueLocationPicker";
import { toast } from "sonner";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";
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
    groupName: "sports" | "amenities",
  ) => (
    <div
      className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3"
      role="group"
      aria-labelledby={`venue-${groupName}-heading`}
      aria-describedby={groupName === "sports" && validationErrors.sports ? "venue-sports-error" : undefined}
      aria-invalid={groupName === "sports" && !!validationErrors.sports}
    >
      {options.map((option) => {
        const optionId = `venue-${groupName}-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const isSelected = selected.includes(option);

        return (
          <div
            key={option}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg border px-3 transition-[background-color,border-color] duration-150 motion-reduce:transition-none",
              isSelected
                ? "border-primary/50 bg-primary-soft"
                : "border-border bg-background hover:border-foreground/30 hover:bg-surface-1",
            )}
          >
            <Checkbox
              id={optionId}
              name={groupName}
              value={option}
              checked={isSelected}
              onCheckedChange={() => onToggle(option)}
            />
            <Label htmlFor={optionId} className="flex min-h-11 flex-1 cursor-pointer items-center py-2">
              {option}
            </Label>
          </div>
        );
      })}
    </div>
  );

  const basicInfoCard = mode === "create" ? (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2">Basic information</CardTitle>
        <CardDescription>Give players a clear, accurate picture of the venue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="space-y-2">
          <Label htmlFor="name">Venue name <span aria-hidden="true">*</span></Label>
          <Input
            id="name"
            name="name"
            autoComplete="organization"
            placeholder="e.g., Downtown Sports Complex"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setValidationErrors(prev => ({ ...prev, name: '' }));
            }}
            maxLength={100}
            aria-required="true"
            aria-invalid={!!validationErrors.name}
            aria-describedby={validationErrors.name ? "venue-name-error" : undefined}
          />
          {validationErrors.name && (
            <p id="venue-name-error" role="alert" className="text-sm text-destructive">{validationErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span aria-hidden="true">*</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Describe your venue in detail - include facilities, equipment available, special features, parking information, nearby amenities, and what makes your venue special for players..."
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              setValidationErrors(prev => ({ ...prev, description: '' }));
            }}
            className="min-h-36"
            maxLength={1000}
            aria-required="true"
            aria-invalid={!!validationErrors.description}
            aria-describedby={cn(
              "venue-description-hint",
              validationErrors.description && "venue-description-error",
            )}
          />
          <p id="venue-description-hint" className="text-xs text-muted-foreground">
            {formData.description.length} of {MIN_DESCRIPTION_LENGTH} minimum characters
          </p>
          {validationErrors.description && (
            <p id="venue-description-error" role="alert" className="text-sm text-destructive">{validationErrors.description}</p>
          )}
        </div>

      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2">Basic information</CardTitle>
        <CardDescription>Keep the public listing specific and up to date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="space-y-2">
          <Label htmlFor="name">Venue name <span aria-hidden="true">*</span></Label>
          <Input
            id="name"
            name="name"
            autoComplete="organization"
            placeholder="e.g., Downtown Sports Complex"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            maxLength={100}
            aria-required="true"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Tell players about your venue..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="min-h-32"
            maxLength={1000}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">City <span aria-hidden="true">*</span></Label>
            <Input
              id="city"
              name="city"
              autoComplete="address-level2"
              placeholder="e.g., Yerevan"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              maxLength={100}
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              autoComplete="street-address"
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
    <Card className={validationErrors.images ? "border-destructive/60" : undefined}>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2" id="venue-photos-heading">
          Venue photos <span aria-hidden="true">*</span>
        </CardTitle>
        <CardDescription>
          Add at least {MIN_PHOTOS} clear photos showing the playing area, access, and facilities.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        {imagePreviews.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Selected venue photos">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-1">
                <img
                  src={preview}
                  alt={`Venue preview ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 shadow-sm"
                  onClick={() => removeImageAt(index)}
                  aria-label={`Remove venue photo ${index + 1}`}
                >
                  <X aria-hidden="true" />
                </Button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {imageFiles.length < 10 && (
          <>
            <input
              id="venue-photos"
              name="venuePhotos"
              type="file"
              className="peer sr-only"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              aria-invalid={!!validationErrors.images}
              aria-describedby={cn("venue-photos-hint", validationErrors.images && "venue-photos-error")}
            />
            <Label
              htmlFor="venue-photos"
              className="flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-interactive bg-surface-1 px-5 text-center transition-colors duration-150 hover:border-primary hover:bg-primary-soft/50 peer-focus-visible:border-ring peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-xs">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-foreground">Choose venue photos</span>
              <span id="venue-photos-hint" className="mt-1 text-xs font-normal text-muted-foreground">
                {imageFiles.length} selected · 5MB each · up to 10 photos
              </span>
            </Label>
          </>
        )}

        {validationErrors.images && (
          <p id="venue-photos-error" role="alert" className="mt-2 text-sm text-destructive">{validationErrors.images}</p>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2">Venue image</CardTitle>
        <CardDescription>Use a clear, recent image of the main playing area.</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        {imagePreview ? (
          <div className="relative overflow-hidden rounded-lg border border-border bg-surface-1">
            <img
              src={imagePreview}
              alt="Venue preview"
              className="aspect-[16/9] w-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 shadow-sm"
              onClick={removeSingleImage}
              aria-label="Remove venue image"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <>
            <input
              id="venue-image"
              name="venueImage"
              type="file"
              className="peer sr-only"
              accept="image/*"
              onChange={handleSingleImageChange}
              aria-describedby="venue-image-hint"
            />
            <Label
              htmlFor="venue-image"
              className="flex min-h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-interactive bg-surface-1 px-5 text-center transition-colors duration-150 hover:border-primary hover:bg-primary-soft/50 peer-focus-visible:border-ring peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-xs">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-foreground">Choose venue image</span>
              <span id="venue-image-hint" className="mt-1 text-xs font-normal text-muted-foreground">Maximum file size: 5MB</span>
            </Label>
          </>
        )}
      </CardContent>
    </Card>
  );

  const sportsCard = (
    <Card className={mode === "create" && validationErrors.sports ? "border-destructive/60" : undefined}>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2" id="venue-sports-heading">Sports offered <span aria-hidden="true">*</span></CardTitle>
        <CardDescription>Select every sport players can book at this venue.</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        {renderOptionGrid(SPORTS_OPTIONS, formData.sports, handleSportToggle, "sports")}
        {mode === "create" && validationErrors.sports && (
          <p id="venue-sports-error" role="alert" className="mt-2 text-sm text-destructive">{validationErrors.sports}</p>
        )}
      </CardContent>
    </Card>
  );

  const amenitiesCard = (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2" id="venue-amenities-heading">Amenities</CardTitle>
        <CardDescription>Choose the facilities players can expect on arrival.</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        {renderOptionGrid(AMENITY_OPTIONS, formData.amenities, handleAmenityToggle, "amenities")}
      </CardContent>
    </Card>
  );

  const contactCard = mode === "create" ? (
    <Card className={validationErrors.phone ? "border-destructive/60" : undefined}>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2" className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          Booking contact
        </CardTitle>
        <CardDescription>
          Give players a reliable way to confirm booking details with your team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp / phone number <span aria-hidden="true">*</span></Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+374 99 11 22 33"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              setValidationErrors(prev => ({ ...prev, phone: '' }));
            }}
            aria-required="true"
            aria-invalid={!!validationErrors.phone}
            aria-describedby={cn(
              formData.phone && !validationErrors.phone && "venue-phone-preview",
              validationErrors.phone && "venue-phone-error",
            )}
          />
          {formData.phone && !validationErrors.phone && (
            <p id="venue-phone-preview" className="text-xs text-muted-foreground">
              Will be saved as: {formatPhoneDisplay(formData.phone)}
            </p>
          )}
          {validationErrors.phone && (
            <p id="venue-phone-error" role="alert" className="text-sm text-destructive">{validationErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Person (optional)</Label>
          <Input
            id="contactName"
            name="contactName"
            autoComplete="name"
            placeholder="e.g. Aram"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            maxLength={80}
          />
        </div>

        <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="venue-whatsapp-messages" className="cursor-pointer">Accept WhatsApp messages</Label>
            <p className="text-xs text-muted-foreground">Recommended — most players prefer this</p>
          </div>
          <Switch
            id="venue-whatsapp-messages"
            checked={formData.whatsappEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
          />
        </div>

        <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="venue-sms-fallback" className="cursor-pointer">Accept SMS as fallback</Label>
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
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2" className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          Booking contact
        </CardTitle>
        <CardDescription>
          How customers reach you to book. WhatsApp is the primary channel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
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
              name="contactName"
              autoComplete="name"
              placeholder="e.g., Armen"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            />
          </div>
        </div>

        <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="venue-whatsapp-bookings" className="cursor-pointer">Accept WhatsApp bookings</Label>
            <p className="text-sm text-muted-foreground">Primary booking channel</p>
          </div>
          <Switch
            id="venue-whatsapp-bookings"
            checked={formData.whatsappEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
          />
        </div>

        <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="venue-sms-bookings" className="cursor-pointer">Accept SMS bookings</Label>
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
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2">Pricing &amp; settings</CardTitle>
        <CardDescription>
          Set the base hourly rate shown for this venue. Players see the final booking total before payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="space-y-2">
          <Label htmlFor="price">Base price per hour (֏) <span aria-hidden="true">*</span></Label>
          <Input
            id="price"
            name="pricePerHour"
            type="number"
            inputMode="decimal"
            min="1"
            max="300000"
            placeholder="30"
            value={formData.pricePerHour}
            onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
            aria-required="true"
            aria-describedby="venue-price-hint"
          />
          <p id="venue-price-hint" className="text-xs text-muted-foreground">
            Enter the venue's hourly listing price in Armenian dram.
          </p>
        </div>

        <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="venue-indoor" className="cursor-pointer">Indoor venue</Label>
            <p className="text-sm text-muted-foreground">Is this an indoor facility?</p>
          </div>
          <Switch
            id="venue-indoor"
            checked={formData.isIndoor}
            onCheckedChange={(checked) => setFormData({ ...formData, isIndoor: checked })}
          />
        </div>

        {mode === "edit" && (
          <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="venue-active" className="cursor-pointer">Active listing</Label>
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
          <Alert>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="text-sm">
              Your venue will be reviewed before it becomes visible to players.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      {mode === "create" ? (
        <>
          <Alert>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              <strong className="text-foreground">Before you begin:</strong> prepare a detailed description, at least {MIN_PHOTOS} venue photos, and an exact map location. Required fields are marked with an asterisk.
            </AlertDescription>
          </Alert>

          {basicInfoCard}

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

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          className="w-full sm:w-auto sm:min-w-32"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isUploadingImages}
          className="w-full sm:w-auto sm:min-w-40"
        >
          {isSubmitting || isUploadingImages ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
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
