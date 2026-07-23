import { normalizePhoneE164 } from "@/lib/phone";

// Shared form model for AddVenuePage / EditVenuePage.
//
// Validation intentionally stays hand-rolled (not react-hook-form + zod) to
// preserve the existing behavior exactly: the create form shows inline
// per-field errors that clear as the user edits (with live character/photo
// counts baked into the messages), while the edit form only surfaces toast
// errors on submit.

export const SPORTS_OPTIONS = [
  "Football", "Basketball", "Tennis", "Swimming",
  "Volleyball", "Badminton", "Rugby", "Gym",
  "Cricket", "Golf", "Running", "Cycling"
];

export const AMENITY_OPTIONS = [
  "Parking", "Showers", "Lockers", "Equipment Rental",
  "Cafe", "Pro Shop", "Coaching", "First Aid",
  "Water Fountains", "Bleachers", "Scoreboard", "Floodlights"
];

export const MIN_DESCRIPTION_LENGTH = 100;
export const MIN_PHOTOS = 3;

export type VenueFormMode = "create" | "edit";

export interface VenueFormFields {
  name: string;
  description: string;
  address: string;
  city: string;
  /** Create only — the edit form has no zip code field. */
  zipCode: string;
  sports: string[];
  amenities: string[];
  pricePerHour: string;
  isIndoor: boolean;
  /** Edit only — new venues always start inactive (pending review). */
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  locationConfirmed: boolean;
  phone: string;
  contactName: string;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
}

export interface VenueFormValues extends VenueFormFields {
  /** Newly selected files (create: up to 10; edit: at most one replacement). */
  imageFiles: File[];
  /** Edit only: the existing image was removed without a replacement. */
  imageRemoved: boolean;
}

export interface VenueFormInitialValues extends VenueFormFields {
  /** Existing image to preview in edit mode. */
  imageUrl: string | null;
}

export const validateCreateVenue = (
  values: VenueFormFields,
  imageCount: number,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = "Venue name is required";
  }

  if (!values.city.trim()) {
    errors.city = "City is required";
  }

  if (!values.address.trim()) {
    errors.address = "Address is required for venue listings";
  }

  if (values.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    errors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters. Currently: ${values.description.trim().length} characters.`;
  }

  if (values.sports.length === 0) {
    errors.sports = "Please select at least one sport";
  }

  if (imageCount < MIN_PHOTOS) {
    errors.images = `Please upload at least ${MIN_PHOTOS} photos. Currently: ${imageCount} photo(s).`;
  }

  if (!values.locationConfirmed) {
    errors.location = "Please confirm the venue location on the map";
  }

  const normalizedPhone = normalizePhoneE164(values.phone);
  if (!normalizedPhone || normalizedPhone.replace(/\D/g, "").length < 8) {
    errors.phone = "A valid contact phone number is required so players can reach you";
  }

  return errors;
};
