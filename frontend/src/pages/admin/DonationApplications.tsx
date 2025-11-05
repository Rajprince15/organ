import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Heart, 
  FileText, 
  Building2, 
  CheckCircle, 
  XCircle, 
  Eye,
  Download,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface DonationApplication {
  id: string;
  donor_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  blood_group: string;
  organs: string[];
  city?: string;
  state?: string;
  country?: string;
  status: "pending" | "approved" | "active" | "inactive" | "cancelled";
  checkup_status: "pending_checkup" | "scheduled" | "completed" | "eligible" | "not_eligible" | "none";
  assigned_branch_hospital_id?: string;
  assigned_branch_hospital_name?: string;
  checkup_date?: string;
  eligibility_report_url?: string;
  created_at: string;
  updated_at: string;
}

interface BranchHospital {
  id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  contact_number: string;
}

export default function DonationApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<DonationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonor, setSelectedDonor] = useState<DonationApplication | null>(null);
  const [branchHospital, setBranchHospital] = useState<BranchHospital | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchApplications();
  }, [user, navigate]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/donation-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch applications");

      const data = await response.json();
      setApplications(data.applications);
    } catch (error) {
      console.error("Failed to load applications:", error);
      toast({
        title: "Error",
        description: "Failed to load donation applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const viewDonorDetails = async (donor: DonationApplication) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/donors/${donor.donor_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch donor details");

      const data = await response.json();
      setSelectedDonor(data.donor);
      setBranchHospital(data.branch_hospital);
      setNewStatus(data.donor.status);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Failed to load donor details:", error);
      toast({
        title: "Error",
        description: "Failed to load donor details",
        variant: "destructive",
      });
    }
  };

  const updateDonorStatus = async () => {
    if (!selectedDonor || !newStatus) return;

    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/donors/${selectedDonor.donor_id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: "Success",
        description: `Donor status updated to ${newStatus}`,
      });

      setShowDetailsDialog(false);
      fetchApplications();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: "Failed to update donor status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-blue-100 text-blue-800 border-blue-300",
      active: "bg-green-100 text-green-800 border-green-300",
      inactive: "bg-gray-100 text-gray-800 border-gray-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
    };
    return statusColors[status] || statusColors.pending;
  };

  const getCheckupStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending_checkup: "bg-yellow-100 text-yellow-800 border-yellow-300",
      eligible: "bg-green-100 text-green-800 border-green-300",
      not_eligible: "bg-red-100 text-red-800 border-red-300",
      scheduled: "bg-blue-100 text-blue-800 border-blue-300",
      completed: "bg-purple-100 text-purple-800 border-purple-300",
      none: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return statusColors[status] || statusColors.none;
  };

  const getStatusIcon = (checkupStatus: string) => {
    if (checkupStatus === "eligible") return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (checkupStatus === "not_eligible") return <XCircle className="h-5 w-5 text-red-600" />;
    return <FileText className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8 lg:pt-32 md:pt-28">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/admin")} data-testid="back-to-dashboard-btn">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Donation Applications</h1>
                <p className="text-gray-600 mt-1">
                  Review pending and not eligible donor applications
                </p>
              </div>
            </div>
            <Button onClick={fetchApplications} variant="outline" data-testid="refresh-applications-btn">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Applications</p>
                    <p className="text-2xl font-bold">{applications.length}</p>
                  </div>
                  <Heart className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold">
                      {applications.filter(a => a.status === "pending").length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Not Eligible</p>
                    <p className="text-2xl font-bold">
                      {applications.filter(a => a.checkup_status === "not_eligible").length}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <Card>
            <CardHeader>
              <CardTitle>All Donation Applications</CardTitle>
              <CardDescription>
                Review and manage all registered donor applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No applications requiring attention
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      data-testid={`donation-app-${app.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(app.checkup_status)}
                            <div>
                              <h3 className="font-semibold text-lg">{app.full_name}</h3>
                              <p className="text-sm text-gray-600">{app.email} • {app.phone}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Blood Group:</span>
                              <span className="ml-2 font-medium">{app.blood_group}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Organs:</span>
                              <span className="ml-2 font-medium">{app.organs.join(", ")}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-2 font-medium">{app.city}, {app.state}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Registered:</span>
                              <span className="ml-2 font-medium">
                                {new Date(app.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {app.assigned_branch_hospital_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <span className="text-gray-600">Branch Hospital:</span>
                              <span className="font-medium">{app.assigned_branch_hospital_name}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Badge className={getStatusBadge(app.status)}>
                              {app.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <Badge className={getCheckupStatusBadge(app.checkup_status)}>
                              {app.checkup_status.replace("_", " ").toUpperCase()}
                            </Badge>
                            {app.eligibility_report_url && (
                              <Badge variant="outline" className="bg-blue-50">
                                Report Available
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDonorDetails(app)}
                            data-testid={`view-donor-${app.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          {app.eligibility_report_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`${API_URL}${app.eligibility_report_url}`, "_blank")}
                              data-testid={`download-report-${app.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Donor Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Donor Details & Management</DialogTitle>
            <DialogDescription>
              View complete donor information and manage status
            </DialogDescription>
          </DialogHeader>
          
          {selectedDonor && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="font-semibold mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-gray-500">Full Name</Label>
                    <p className="font-medium">{selectedDonor.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Date of Birth</Label>
                    <p className="font-medium">{selectedDonor.date_of_birth}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Email</Label>
                    <p className="font-medium">{selectedDonor.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Phone</Label>
                    <p className="font-medium">{selectedDonor.phone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Blood Group</Label>
                    <p className="font-medium">{selectedDonor.blood_group}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Organs</Label>
                    <p className="font-medium">{selectedDonor.organs.join(", ")}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="font-semibold mb-3">Location</h3>
                <p className="text-sm">
                  {selectedDonor.city}, {selectedDonor.state}, {selectedDonor.country}
                </p>
              </div>

              {/* Branch Hospital */}
              {branchHospital && (
                <div>
                  <h3 className="font-semibold mb-3">Assigned Branch Hospital</h3>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-1">
                    <p className="font-medium">{branchHospital.name}</p>
                    <p className="text-gray-600">{branchHospital.address}, {branchHospital.city}, {branchHospital.state}</p>
                    <p className="text-gray-600">Contact: {branchHospital.contact_number}</p>
                  </div>
                </div>
              )}

              {/* Status Information */}
              <div>
                <h3 className="font-semibold mb-3">Current Status</h3>
                <div className="flex gap-2">
                  <Badge className={getStatusBadge(selectedDonor.status)}>
                    Status: {selectedDonor.status.toUpperCase()}
                  </Badge>
                  <Badge className={getCheckupStatusBadge(selectedDonor.checkup_status)}>
                    Checkup: {selectedDonor.checkup_status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Eligibility Report */}
              {selectedDonor.eligibility_report_url && (
                <div>
                  <h3 className="font-semibold mb-3">Eligibility Report</h3>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`${API_URL}${selectedDonor.eligibility_report_url}`, "_blank")}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              )}

              {/* Update Status */}
              <div>
                <h3 className="font-semibold mb-3">Update Status</h3>
                <div className="space-y-3">
                  <div>
                    <Label>Change Donor Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger data-testid="status-select">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-500">
                    Note: Active = Eligible donors, Inactive = Not eligible donors
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={updateDonorStatus} 
              disabled={updatingStatus || !newStatus}
              data-testid="update-status-btn"
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
