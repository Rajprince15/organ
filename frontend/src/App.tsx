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
import AdminDashboard from "./pages/AdminDashboard";
import Community from "./pages/Community";
import About from "./pages/About";
import Resources from "./pages/Resources";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

// Admin Management Pages
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import UsersPage from "./pages/admin/UsersPage";
import DonationsPage from "./pages/admin/DonationsPage";
import RequirementsPage from "./pages/admin/RequirementsPage";
import MatchingPage from "./pages/admin/MatchingPage";
import SupportPage from "./pages/admin/SupportPage";
import CommunityPage from "./pages/admin/CommunityPage";
import EventsPage from "./pages/admin/EventsPage";
import ResourcesPage from "./pages/admin/ResourcesPage";
import ActivityPage from "./pages/admin/ActivityPage";
import AuditPage from "./pages/admin/AuditPage";
import BroadcastPage from "./pages/admin/BroadcastPage";
import SettingsPage from "./pages/admin/SettingsPage";
import BranchHospitalManagement from "./pages/admin/BranchHospitalManagement";
import BranchHospitalDashboard from "./pages/BranchHospitalDashboard";

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
            
            {/* Branch Hospital Routes */}
            <Route path="/branch-hospital-dashboard" element={<BranchHospitalDashboard />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/donations" element={<DonationsPage />} />
            <Route path="/admin/requirements" element={<RequirementsPage />} />
            <Route path="/admin/branch-hospitals" element={<BranchHospitalManagement />} />
            <Route path="/admin/matching" element={<MatchingPage />} />
            <Route path="/admin/support" element={<SupportPage />} />
            <Route path="/admin/community" element={<CommunityPage />} />
            <Route path="/admin/events" element={<EventsPage />} />
            <Route path="/admin/resources" element={<ResourcesPage />} />
            <Route path="/admin/activity" element={<ActivityPage />} />
            <Route path="/admin/audit" element={<AuditPage />} />
            <Route path="/admin/broadcast" element={<BroadcastPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            
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