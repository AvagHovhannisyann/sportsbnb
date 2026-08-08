import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel } from "@/components/common/StatusPanel";
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
  const {
    data: venue,
    isLoading: venueLoading,
    isError: venueError,
    refetch: refetchVenue,
    isFetching: venueFetching,
  } = useVenueById(id);
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

  if (authLoading || (venueLoading && !venueError)) {
    return (
      <Layout showMobileNav={false} showAssistant={false}>
        <div className="container max-w-4xl py-8 sm:py-12" role="status" aria-label="Loading the venue editor">
          <div className="mb-8 flex items-center gap-4">
            <Skeleton className="h-11 w-11 shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (venueError) {
    return (
      <Layout showMobileNav={false} showAssistant={false}>
        <div className="container max-w-3xl py-10 sm:py-16">
          <header className="mb-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Listing management</p>
            <h1 className="page-title">Edit venue</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              The listing could not be opened, but no venue details were changed.
            </p>
          </header>
          <Card>
            <ErrorPanel
              what="this venue"
              description="We couldn't retrieve the listing. No venue details were changed."
              onRetry={() => refetchVenue()}
              isRetrying={venueFetching}
            >
              <Button variant="outline" onClick={() => navigate("/owner-dashboard")}>Back to dashboard</Button>
            </ErrorPanel>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!venue) {
    return (
      <Layout showMobileNav={false} showAssistant={false}>
        <div className="container max-w-3xl py-10 sm:py-16">
          <Card>
            <CardContent className="p-6 text-center sm:p-10">
              <h1 className="font-display text-2xl font-semibold tracking-extra-tight text-foreground">Venue not found</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                This venue doesn't exist or your account cannot access it.
              </p>
              <Button className="mt-5" onClick={() => navigate("/owner-dashboard")}>Back to dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showMobileNav={false} showAssistant={false}>
      <div className="min-h-screen bg-surface-1/60">
        <div className="container max-w-4xl py-6 sm:py-10 lg:py-12">
          <header className="mb-7 sm:mb-8">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:gap-4">
              <Button
                aria-label="Go back"
                variant="ghost"
                size="icon"
                className="-ml-2"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <div className="min-w-0 pt-1">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Listing management</p>
                <h1 className="page-title">Edit venue</h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Update {venue.name}'s public details, booking contact, pricing, and listing status.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 min-[520px]:ml-[3.75rem] min-[520px]:grid-cols-2 sm:flex sm:justify-start">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/venue/${id}/availability`}>
                  <Clock aria-hidden="true" />
                  Hours &amp; availability
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 aria-hidden="true" />
                    Delete venue
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete venue?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{venue.name}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep venue</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting…" : "Delete venue"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>

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
