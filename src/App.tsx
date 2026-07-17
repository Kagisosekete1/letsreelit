import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { VideoQualityProvider } from "@/contexts/VideoQualityContext";
import { DebugProvider } from "@/contexts/DebugContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import OfflineIndicator from "@/components/OfflineIndicator";
import { useNativeBackHandler } from "@/hooks/useNativeBackHandler";
import { useRouteMemory } from "@/hooks/useRouteMemory";
import Index from "./pages/Index";

// Lazy-loaded routes so pages open instantly (smaller initial bundle)
const Profile = lazy(() => import("./pages/Profile"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Activity = lazy(() => import("./pages/Activity"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Following = lazy(() => import("./pages/Following"));
const Search = lazy(() => import("./pages/Search"));
const SuggestedMuvaz = lazy(() => import("./pages/SuggestedMuvaz"));
const Trending = lazy(() => import("./pages/Trending"));
const NotificationPreferencesPage = lazy(() => import("./components/settings/NotificationPreferencesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPayouts = lazy(() => import("./pages/AdminPayouts"));
const MonetizationAnalytics = lazy(() => import("./pages/MonetizationAnalytics"));
const Settings = lazy(() => import("./pages/Settings"));
const LiveDiscovery = lazy(() => import("./pages/LiveDiscovery"));
const Studio = lazy(() => import("./pages/Studio"));
const Battles = lazy(() => import("./pages/Battles"));


const queryClient = new QueryClient();

// Inner component that uses router hooks
const AppRoutes = () => {
  // Handle native back button
  useNativeBackHandler();
  // Persist and restore route across restarts
  useRouteMemory();
  const navigate = useNavigate();

  // OneSignal notification-click deep-link handler (SPA navigation)
  useEffect(() => {
    const onNavigate = (evt: Event) => {
      const target = (evt as CustomEvent<string>).detail;
      if (typeof target === 'string' && target.startsWith('/')) navigate(target);
    };
    window.addEventListener('onesignal:navigate', onNavigate);
    return () => window.removeEventListener('onesignal:navigate', onNavigate);
  }, [navigate]);


  return (
    <div className="bg-background min-h-screen">
      <Suspense fallback={<div className="fixed inset-0 bg-background" />}>
      <Routes>

        <Route path="/" element={<Index />} />
        <Route path="/following" element={
          <ProtectedRoute>
            <Following />
          </ProtectedRoute>
        } />
        <Route path="/tutorials" element={
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        } />
        <Route path="/suggested-muvaz" element={
          <ProtectedRoute>
            <SuggestedMuvaz />
          </ProtectedRoute>
        } />
        <Route path="/trending" element={
          <ProtectedRoute>
            <Trending />
          </ProtectedRoute>
        } />
        <Route path="/inbox" element={
          <ProtectedRoute>
            <Inbox />
          </ProtectedRoute>
        } />
        <Route path="/activity" element={
          <ProtectedRoute>
            <Activity />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/settings/notifications" element={
          <ProtectedRoute>
            <NotificationPreferencesPage />
          </ProtectedRoute>
        } />
        <Route path="/user/:username" element={<UserProfile />} />
        <Route path="/search" element={<Search />} />
        <Route path="/battles" element={<Battles />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin/payouts" element={
          <ProtectedRoute>
            <AdminPayouts />
          </ProtectedRoute>
        } />
        <Route path="/monetization-analytics" element={
          <ProtectedRoute>
            <MonetizationAnalytics />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/live" element={
          <ProtectedRoute>
            <LiveDiscovery />
          </ProtectedRoute>
        } />
        <Route path="/studio" element={
          <ProtectedRoute>
            <Studio />
          </ProtectedRoute>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AudioProvider>
          <VideoQualityProvider>
            <DebugProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <OfflineIndicator />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </DebugProvider>
          </VideoQualityProvider>
        </AudioProvider>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
