import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Tutorials from "./pages/Tutorials";
import Profile from "./pages/Profile";
import Inbox from "./pages/Inbox";
import UserProfile from "./pages/UserProfile";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Following from "./pages/Following";
import LiveDiscovery from "./pages/LiveDiscovery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
                  <Tutorials />
                </ProtectedRoute>
              } />
              <Route path="/live" element={
                <ProtectedRoute>
                  <LiveDiscovery />
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
              <Route path="/user/:username" element={<UserProfile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
  );
};

export default App;
