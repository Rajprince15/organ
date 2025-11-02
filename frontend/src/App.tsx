import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import DonorRegistration from "./pages/DonorRegistration";
import DonorDashboard from "./pages/DonorDashboard";
import DonorMatchingRequirements from "./pages/DonorMatchingRequirements";
import HospitalDashboard from "./pages/HospitalDashboard";
import HospitalRequirements from "./pages/HospitalRequirements";
import HospitalShortlist from "./pages/HospitalShortlist";
import HospitalCompatibleDonors from "./pages/HospitalCompatibleDonors";
import EnhancedDonorListPage from "./pages/EnhancedDonorListPage";
import RecipientPortal from "./pages/RecipientPortal";
import AdminDashboardEnhanced from "./pages/AdminDashboardEnhanced";
import Community from "./pages/Community";
import About from "./pages/About";
import Resources from "./pages/Resources";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/donate" element={<DonorRegistration />} />
            <Route path="/donor-registration" element={<DonorRegistration />} />
            <Route path="/donor-dashboard" element={<DonorDashboard />} />
            <Route path="/donor-matching-requirements" element={<DonorMatchingRequirements />} />
            <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
            <Route path="/hospital-requirements" element={<HospitalRequirements />} />
            <Route path="/hospital-shortlist" element={<HospitalShortlist />} />
            <Route path="/hospital-compatible-donors" element={<HospitalCompatibleDonors />} />
            <Route path="/donor-list" element={<EnhancedDonorListPage />} />
            <Route path="/recipient-portal" element={<RecipientPortal />} />
            <Route path="/admin-dashboard" element={<AdminDashboardEnhanced />} />
            <Route path="/community" element={<Community />} />
            <Route path="/events" element={<Events />} />
            <Route path="/about" element={<About />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/support" element={<Support />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;