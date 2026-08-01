import { useState, useCallback, lazy, Suspense } from "react";
import RouteErrorBoundary from "@/components/common/RouteErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/SplashScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { RegionProvider } from "@/hooks/useRegion";
import { YandexMapsProvider } from "@/components/maps/YandexMapsProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { RequireRole } from "@/components/auth/RequireRole";
import RouteMeta from "@/components/seo/RouteMeta";
import { RemotionScene } from "@/remotion/RemotionScene";
import { usePreloadScene } from "@/remotion/preload";
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
const EditTeamPage = lazy(() => import("./pages/EditTeamPage"));
const MyBookingsPage = lazy(() => import("./pages/MyBookingsPage"));
const TeamDetailsPage = lazy(() => import("./pages/TeamDetailsPage"));
const JoinTeamPage = lazy(() => import("./pages/JoinTeamPage"));
const GameJoinStatusPage = lazy(() => import("./features/booking/GameJoinStatusPage"));
const CheckoutPage = lazy(() => import("./features/booking/CheckoutPage"));
const BookingStatusPage = lazy(() => import("./features/booking/BookingStatusPage"));
const MockPayPage = lazy(() => import("./features/booking/MockPayPage"));
const VenueDetailsPage = lazy(() => import("./pages/VenueDetailsPage"));
const PlayerDashboard = lazy(() => import("./pages/PlayerDashboard"));
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
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
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
const VenueMapPage = lazy(() => import("./pages/VenueMapPage"));
const OwnerAnalyticsPage = lazy(() => import("./pages/owner/OwnerAnalyticsPage"));
const OwnerEarningsPage = lazy(() => import("./pages/owner/OwnerEarningsPage"));
const NearbyFieldsPage = lazy(() => import("./pages/NearbyFieldsPage"));
const SubmitFieldPage = lazy(() => import("./pages/SubmitFieldPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * `/game/:id/join-success` → `/game/:id/join-status`, keeping both halves.
 *
 * The id, because `<Navigate to>` takes a literal and would send everyone to
 * `/game/:id/join-status`. The query string, because `GameJoinStatusPage`
 * reads `?paymentId=` — dropping it would turn a payment return into a status
 * page that cannot say which payment it is about.
 */
const JoinSuccessRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  return <Navigate to={`/game/${id}/join-status${search}`} replace />;
};

/**
 * The route-transition screen — the first frame of the product on every
 * navigation to a lazily-loaded page, which is all of them.
 *
 * The spinner is still here and still does real work: it is what a
 * reduced-motion visitor sees, and what everyone sees for the moments before
 * the BrandLoader chunk has arrived. `RemotionScene` renders exactly one of
 * the two, never both.
 *
 * The square is capped rather than fluid — the composition is authored on a
 * 600×600 canvas with a wordmark and a caption in it, and below roughly 180px
 * the caption stops being readable, which is worse than not showing it.
 */
const LoaderSpinner = () => (
  <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
);

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <RemotionScene
      name="BrandLoader"
      fallback={<LoaderSpinner />}
      className="h-[min(72vw,260px)] w-[min(72vw,260px)]"
    />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinished = useCallback(() => setShowSplash(false), []);

  /*
   * Warm the BrandLoader chunk once the browser is idle.
   *
   * Without this the embed is theoretical: PageLoader is on screen for the few
   * hundred milliseconds a route chunk takes to download, and a player that
   * only starts fetching at that point never wins that race — every
   * navigation would fall back to the spinner. Idle-scheduled and after first
   * paint, so it cannot compete with the route, image and font requests the
   * landing page actually needs. Skipped entirely under reduced motion, where
   * the chunk would never be mounted.
   */
  usePreloadScene("BrandLoader");

  return (
    <>
      {showSplash && <SplashScreen onFinished={handleSplashFinished} />}
      <QueryClientProvider client={queryClient}>
        <YandexMapsProvider>
        <AuthProvider>
          <RegionProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                {/* Sits inside BrowserRouter — it reads the pathname to reset
                    on navigation — and outside Suspense, so it catches
                    lazy-chunk load failures as well as render errors. */}
                <RouteErrorBoundary>
                {/* Above <Routes>, deliberately. It gives every route a title
                    from one table (WCAG 2.4.2, Level A — 17 of 35 player
                    routes were still showing the string from index.html), and
                    react-helmet-async resolves competing tags in mount order,
                    so a page rendering its own SEOHead still overrides this. */}
                <RouteMeta />
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
                    <Route path="/game/:id/join-status" element={<ProtectedRoute><GameJoinStatusPage /></ProtectedRoute>} />
                    {/* An alias, not a second page. Both paths mounted the same
                        component, so the app had one screen under two URLs with
                        one title between them — a WCAG 2.4.2 duplicate, which
                        nothing noticed because no audit list contained this
                        route and none had ever loaded it. Nothing in the app
                        links here and the payment callback builds
                        `/join-status`, so it is redirected rather than removed:
                        a provider configured to it outside this repository
                        keeps working, and there is one canonical page again. */}
                    <Route path="/game/:id/join-success" element={<JoinSuccessRedirect />} />
                    {/* Teams */}
                    <Route path="/teams" element={<TeamsPage />} />
                    <Route path="/create-team" element={<ProtectedRoute><CreateTeamPage /></ProtectedRoute>} />
                    <Route path="/team/:id" element={<TeamDetailsPage />} />
                    <Route path="/team/:id/edit" element={<ProtectedRoute><EditTeamPage /></ProtectedRoute>} />
                    <Route path="/join-team/:code" element={<JoinTeamPage />} />
                    {/* Venue Details */}
                    <Route path="/venue/:id" element={<VenueDetailsPage />} />
                    {/* Dashboards */}
                    <Route path="/dashboard" element={<ProtectedRoute><PlayerDashboard /></ProtectedRoute>} />
                    <Route path="/my-bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                    
                    {/* New Owner Dashboard Routes */}
                    <Route path="/owner-dashboard" element={<ProtectedRoute><RequireRole role="owner"><OwnerOverviewPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/venues" element={<ProtectedRoute><RequireRole role="owner"><OwnerVenuesPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/schedule" element={<ProtectedRoute><RequireRole role="owner"><OwnerSchedulePageNew /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/bookings" element={<ProtectedRoute><RequireRole role="owner"><OwnerBookingsPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/hours" element={<ProtectedRoute><RequireRole role="owner"><OwnerHoursPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/pricing" element={<ProtectedRoute><RequireRole role="owner"><OwnerPricingPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/equipment" element={<ProtectedRoute><RequireRole role="owner"><OwnerEquipmentPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/integrations" element={<ProtectedRoute><RequireRole role="owner"><OwnerIntegrationsPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/integrations/callback" element={<ProtectedRoute><RequireRole role="owner"><CalendarCallbackPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/policies" element={<ProtectedRoute><RequireRole role="owner"><OwnerPoliciesPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/settings" element={<ProtectedRoute><RequireRole role="owner"><OwnerSettingsPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/widget" element={<ProtectedRoute><RequireRole role="owner"><OwnerWidgetPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/analytics" element={<ProtectedRoute><RequireRole role="owner"><OwnerAnalyticsPage /></RequireRole></ProtectedRoute>} />
                    <Route path="/owner/earnings" element={<ProtectedRoute><RequireRole role="owner"><OwnerEarningsPage /></RequireRole></ProtectedRoute>} />
                    
                    {/* Embed booking widget (public) */}
                    <Route path="/embed/booking/:venueId" element={<EmbedBookingPage />} />
                    
                    {/* Auth callback for magic link */}
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    
                    {/* Legacy owner routes */}
                    
                    {/* Venue Management */}
                    <Route path="/add-venue" element={<ProtectedRoute><AddVenuePage /></ProtectedRoute>} />
                    <Route path="/venue/:id/edit" element={<ProtectedRoute><EditVenuePage /></ProtectedRoute>} />
                    <Route path="/venue/:id/availability" element={<ProtectedRoute><VenueAvailabilityPage /></ProtectedRoute>} />
                    {/* /my-venues was a second, orphaned copy of /owner/venues:
                        same purpose, same "My Venues" heading on screen, and
                        linked from nowhere in the app — the only reference to
                        it in the whole repository was this route. The page
                        titles check found it as two pages sharing one title,
                        which is the visible symptom of two pages doing one
                        job. Redirected rather than deleted so an old bookmark
                        still lands somewhere sensible. */}
                    <Route path="/my-venues" element={<Navigate to="/owner/venues" replace />} />
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
                    <Route path="/demo" element={<DemoPage />} />
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
                    <Route path="/book/:bookingId" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                    <Route path="/booking/:bookingId/status" element={<ProtectedRoute><BookingStatusPage /></ProtectedRoute>} />
                    <Route path="/pay/mock/:paymentId" element={<ProtectedRoute><MockPayPage /></ProtectedRoute>} />
                    {/* Admin */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/operator" element={<AdminRoute><OperatorDashboard /></AdminRoute>} />
                    <Route path="/operator/outreach" element={<AdminRoute><OutreachConsole /></AdminRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </RouteErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </CurrencyProvider>
          </RegionProvider>
        </AuthProvider>
        </YandexMapsProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;