import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
            <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Add New Venue</h1>
              <p className="text-muted-foreground">Create a quality venue listing</p>
            </div>
          </div>

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
