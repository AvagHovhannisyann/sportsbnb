import { useState, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/SplashScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { RegionProvider } from "@/hooks/useRegion";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapsProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import Layout from "./components/layout/Layout";

// Eagerly load HomePage since it's the landing page
import HomePage from "./pages/HomePage";

// Lazy load all other pages
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const CreateGamePage = lazy(() => import("./pages/CreateGamePage"));
const GameDetailsPage = lazy(() => import("./pages/GameDetailsPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const CreateTeamPage = lazy(() => import("./pages/CreateTeamPage"));
const TeamDetailsPage = lazy(() => import("./pages/TeamDetailsPage"));
const JoinTeamPage = lazy(() => import("./pages/JoinTeamPage"));
const GameJoinSuccessPage = lazy(() => import("./pages/GameJoinSuccessPage"));
const VenueDetailsPage = lazy(() => import("./pages/VenueDetailsPage"));
const PlayerDashboard = lazy(() => import("./pages/PlayerDashboard"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const OperatorDashboard = lazy(() => import("./pages/OperatorDashboard"));
const OutreachConsole = lazy(() => import("./pages/operator/OutreachConsole"));
const AddVenuePage = lazy(() => import("./pages/AddVenuePage"));
const EditVenuePage = lazy(() => import("./pages/EditVenuePage"));
const VenueAvailabilityPage = lazy(() => import("./pages/VenueAvailabilityPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PlayerOnboarding = lazy(() => import("./pages/PlayerOnboarding"));
const OwnerOnboarding = lazy(() => import("./pages/OwnerOnboarding"));
const BookingSuccessPage = lazy(() => import("./pages/BookingSuccessPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const MyVenuesPage = lazy(() => import("./pages/MyVenuesPage"));
const OwnerSchedulePage = lazy(() => import("./pages/OwnerSchedulePage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForOwnersPage = lazy(() => import("./pages/ForOwnersPage"));
const EmbedBookingPage = lazy(() => import("./pages/EmbedBookingPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));

// Owner Dashboard Pages
const OwnerOverviewPage = lazy(() => import("./pages/owner/OwnerOverviewPage"));
const OwnerSchedulePageNew = lazy(() => import("./pages/owner/OwnerSchedulePage"));
const OwnerHoursPage = lazy(() => import("./pages/owner/OwnerHoursPage"));
const OwnerVenuesPage = lazy(() => import("./pages/owner/OwnerVenuesPage"));
const OwnerBookingsPage = lazy(() => import("./pages/owner/OwnerBookingsPage"));
const OwnerPricingPage = lazy(() => import("./pages/owner/OwnerPricingPage"));
const OwnerEquipmentPage = lazy(() => import("./pages/owner/OwnerEquipmentPage"));
const OwnerIntegrationsPage = lazy(() => import("./pages/owner/OwnerIntegrationsPage"));
const OwnerPoliciesPage = lazy(() => import("./pages/owner/OwnerPoliciesPage"));
const OwnerSettingsPage = lazy(() => import("./pages/owner/OwnerSettingsPage"));
const OwnerWidgetPage = lazy(() => import("./pages/owner/OwnerWidgetPage"));
const CalendarCallbackPage = lazy(() => import("./pages/owner/CalendarCallbackPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const VenueMapPage = lazy(() => import("./pages/VenueMapPage"));
const OwnerAnalyticsPage = lazy(() => import("./pages/owner/OwnerAnalyticsPage"));
const NearbyFieldsPage = lazy(() => import("./pages/NearbyFieldsPage"));
const SubmitFieldPage = lazy(() => import("./pages/SubmitFieldPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinished = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onFinished={handleSplashFinished} />}
      <QueryClientProvider client={queryClient}>
        <GoogleMapsProvider>
        <AuthProvider>
          <RegionProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Layout showMobileNav={false}><HomePage /></Layout>} />
                    {/* Venues - renamed from Discover */}
                    <Route path="/venues" element={<DiscoverPage />} />
                    <Route path="/venues/map" element={<VenueMapPage />} />
                    <Route path="/discover" element={<Navigate to="/venues" replace />} />
                    <Route path="/nearby" element={<NearbyFieldsPage />} />
                    <Route path="/nearby/submit" element={<ProtectedRoute><SubmitFieldPage /></ProtectedRoute>} />
                    {/* Games */}
                    <Route path="/games" element={<GamesPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/create-game" element={<ProtectedRoute><CreateGamePage /></ProtectedRoute>} />
                    <Route path="/game/:id" element={<GameDetailsPage />} />
                    <Route path="/game/:id/join-success" element={<ProtectedRoute><GameJoinSuccessPage /></ProtectedRoute>} />
                    {/* Teams */}
                    <Route path="/teams" element={<TeamsPage />} />
                    <Route path="/create-team" element={<ProtectedRoute><CreateTeamPage /></ProtectedRoute>} />
                    <Route path="/team/:id" element={<TeamDetailsPage />} />
                    <Route path="/join-team/:code" element={<JoinTeamPage />} />
                    {/* Venue Details */}
                    <Route path="/venue/:id" element={<VenueDetailsPage />} />
                    {/* Dashboards */}
                    <Route path="/dashboard" element={<ProtectedRoute><PlayerDashboard /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                    
                    {/* New Owner Dashboard Routes */}
                    <Route path="/owner-dashboard" element={<ProtectedRoute><OwnerOverviewPage /></ProtectedRoute>} />
                    <Route path="/owner/venues" element={<ProtectedRoute><OwnerVenuesPage /></ProtectedRoute>} />
                    <Route path="/owner/schedule" element={<ProtectedRoute><OwnerSchedulePageNew /></ProtectedRoute>} />
                    <Route path="/owner/bookings" element={<ProtectedRoute><OwnerBookingsPage /></ProtectedRoute>} />
                    <Route path="/owner/hours" element={<ProtectedRoute><OwnerHoursPage /></ProtectedRoute>} />
                    <Route path="/owner/pricing" element={<ProtectedRoute><OwnerPricingPage /></ProtectedRoute>} />
                    <Route path="/owner/equipment" element={<ProtectedRoute><OwnerEquipmentPage /></ProtectedRoute>} />
                    <Route path="/owner/integrations" element={<ProtectedRoute><OwnerIntegrationsPage /></ProtectedRoute>} />
                    <Route path="/owner/integrations/callback" element={<ProtectedRoute><CalendarCallbackPage /></ProtectedRoute>} />
                    <Route path="/owner/policies" element={<ProtectedRoute><OwnerPoliciesPage /></ProtectedRoute>} />
                    <Route path="/owner/settings" element={<ProtectedRoute><OwnerSettingsPage /></ProtectedRoute>} />
                    <Route path="/owner/widget" element={<ProtectedRoute><OwnerWidgetPage /></ProtectedRoute>} />
                    <Route path="/owner/analytics" element={<ProtectedRoute><OwnerAnalyticsPage /></ProtectedRoute>} />
                    
                    {/* Embed booking widget (public) */}
                    <Route path="/embed/booking/:venueId" element={<EmbedBookingPage />} />
                    
                    {/* Auth callback for magic link */}
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    
                    {/* Legacy owner routes */}
                    <Route path="/owner-schedule" element={<ProtectedRoute><OwnerSchedulePage /></ProtectedRoute>} />
                    
                    {/* Venue Management */}
                    <Route path="/add-venue" element={<ProtectedRoute><AddVenuePage /></ProtectedRoute>} />
                    <Route path="/venue/:id/edit" element={<ProtectedRoute><EditVenuePage /></ProtectedRoute>} />
                    <Route path="/venue/:id/availability" element={<ProtectedRoute><VenueAvailabilityPage /></ProtectedRoute>} />
                    <Route path="/my-venues" element={<ProtectedRoute><MyVenuesPage /></ProtectedRoute>} />
                    {/* Auth */}
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    {/* Onboarding */}
                    <Route path="/onboarding/player" element={<ProtectedRoute><PlayerOnboarding /></ProtectedRoute>} />
                    <Route path="/onboarding/owner" element={<ProtectedRoute><OwnerOnboarding /></ProtectedRoute>} />
                    <Route path="/list-venue" element={<Navigate to="/add-venue" replace />} />
                    {/* Settings - redirect to profile */}
                    <Route path="/settings" element={<Navigate to="/profile" replace />} />
                    {/* Info Pages */}
                    <Route path="/for-owners" element={<ForOwnersPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    <Route path="/cookies" element={<CookiePolicyPage />} />
                    {/* Profile & Billing */}
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="/booking-success" element={<ProtectedRoute><BookingSuccessPage /></ProtectedRoute>} />
                    {/* Admin */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/operator" element={<AdminRoute><OperatorDashboard /></AdminRoute>} />
                    <Route path="/operator/outreach" element={<AdminRoute><OutreachConsole /></AdminRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CurrencyProvider>
          </RegionProvider>
        </AuthProvider>
        </GoogleMapsProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;