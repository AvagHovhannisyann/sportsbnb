import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { VenueForm } from "@/features/venues/VenueForm";
import { useUpdateVenue, useDeleteVenue } from "@/features/venues/hooks/useVenueMutations";
import type { VenueFormValues } from "@/features/venues/venueSchema";
import { toast } from "sonner";

const EditVenuePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { data: venue, isLoading: venueLoading } = useVenueById(id);
  const { updateVenue, isSubmitting, uploadingImage } = useUpdateVenue();
  const { deleteVenue, isDeleting } = useDeleteVenue();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    if (!authLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    // Verify ownership
    if (venue && venue.owner_id !== user?.id) {
      toast.error("You don't have permission to edit this venue");
      navigate("/owner-dashboard");
    }
  }, [venue, user, navigate]);

  const handleSubmit = async (values: VenueFormValues) => {
    if (!user || !id) return;
    const success = await updateVenue(values, { venueId: id, userId: user.id });
    if (success) {
      navigate("/owner-dashboard");
    }
  };

  const handleDelete = async () => {
    if (!user || !id) return;
    const success = await deleteVenue(id, user.id);
    if (success) {
      navigate("/owner-dashboard");
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
          {/* flex-wrap: the title block and the two-button action group are
              a ~486px row that pushed past a 375px screen. */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
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

          <VenueForm
            mode="edit"
            initialValues={{
              name: venue.name,
              description: venue.description || "",
              address: venue.address || "",
              city: venue.city,
              zipCode: "",
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
              imageUrl: venue.image_url || null,
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isUploadingImages={uploadingImage}
            onBeforeValidate={() => !!(user && id)}
          />
        </div>
      </div>
    </Layout>
  );
};

export default EditVenuePage;
