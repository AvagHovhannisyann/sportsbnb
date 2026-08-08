import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { VenueForm } from "@/features/venues/VenueForm";
import { useCreateVenue } from "@/features/venues/hooks/useVenueMutations";
import type { VenueFormValues } from "@/features/venues/venueSchema";
import { toast } from "sonner";

const AddVenuePage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { createVenue, isSubmitting, uploadingImages } = useCreateVenue();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: { pathname: "/add-venue" } } });
    }
    if (!authLoading && user && profile && profile.user_type !== "owner") {
      toast.info("Switch to an owner account to list a venue.");
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (values: VenueFormValues) => {
    if (!user) return;
    const success = await createVenue(values, user.id);
    if (success) {
      navigate("/owner-dashboard");
    }
  };

  if (authLoading) {
    return (
      <Layout showMobileNav={false} showAssistant={false}>
        <div className="container max-w-4xl py-8 sm:py-12" role="status" aria-label="Loading the venue form">
          <div className="mb-8 flex items-center gap-4">
            <Skeleton className="h-11 w-11 shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
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

  return (
    <Layout showMobileNav={false} showAssistant={false}>
      <div className="min-h-screen bg-surface-1/60">
        <div className="container max-w-4xl py-6 sm:py-10 lg:py-12">
          <header className="mb-7 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:mb-8 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2"
              aria-label="Go back"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <div className="min-w-0 pt-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Venue setup</p>
              <h1 className="page-title">Add a new venue</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Create a complete venue listing for players. You can refine the details after review.
              </p>
            </div>
          </header>

          <VenueForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isUploadingImages={uploadingImages}
            onBeforeValidate={() => !!user}
          />
        </div>
      </div>
    </Layout>
  );
};

export default AddVenuePage;
