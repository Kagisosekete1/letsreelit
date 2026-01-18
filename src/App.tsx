import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { AudioProvider } from "@/contexts/AudioContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import OfflineIndicator from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Inbox from "./pages/Inbox";
import UserProfile from "./pages/UserProfile";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import Following from "./pages/Following";
import LiveDiscovery from "./pages/LiveDiscovery";
import Search from "./pages/Search";
import SuggestedMuvaz from "./pages/SuggestedMuvaz";
import Trending from "./pages/Trending";
import NotificationPreferencesPage from "./components/settings/NotificationPreferencesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AudioProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <BrowserRouter>
              <div className="bg-background min-h-screen">
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
                  <Route path="/live" element={
                    <ProtectedRoute>
                      <LiveDiscovery />
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
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/about" element={<About />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </AudioProvider>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;