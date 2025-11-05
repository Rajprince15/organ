import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Heart, 
  Building2, 
  Shield,
  Eye,
  Edit,
  Download,
  FileText,
  ArrowLeft,
  RefreshCw,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  mobile?: string;
  age?: number;
  is_active: boolean;
  created_at: string;
}

interface DonorDetails {
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
  status: string;
  checkup_status: string;
  eligibility_report_url?: string;
  assigned_branch_hospital_name?: string;
  created_at: string;
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

export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [donorDetails, setDonorDetails] = useState<DonorDetails | null>(null);
  const [branchHospital, setBranchHospital] = useState<BranchHospital | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedDonor, setEditedDonor] = useState<Partial<DonorDetails>>({});
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [user, navigate, selectedRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const roleParam = selectedRole !== "all" ? `?role=${selectedRole}` : "";
      const response = await fetch(`${API_URL}/api/admin/users${roleParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = async (selectedUser: User) => {
    setSelectedUser(selectedUser);
    
    // If user is a donor, fetch full donor details
    if (selectedUser.role === "donor") {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/admin/donors/${selectedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch donor details");

        const data = await response.json();
        setDonorDetails(data.donor);
        setBranchHospital(data.branch_hospital);
        setEditedDonor(data.donor);
      } catch (error) {
        console.error("Failed to load donor details:", error);
      }
    }
    
    setShowDetailsDialog(true);
    setEditMode(false);
  };

  const updateDonorInfo = async () => {
    if (!donorDetails) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      
      // Prepare update data
      const updateData = {
        full_name: editedDonor.full_name,
        email: editedDonor.email,
        phone: editedDonor.phone,
        blood_group: editedDonor.blood_group,
        organs: editedDonor.organs,
        city: editedDonor.city,
        state: editedDonor.state,
        country: editedDonor.country,
      };

      const response = await fetch(`${API_URL}/api/admin/donors/${donorDetails.donor_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to update donor");

      const data = await response.json();
      setDonorDetails(data.donor);
      setEditMode(false);
      
      toast({
        title: "Success",
        description: "Donor information updated successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error("Failed to update donor:", error);
      toast({
        title: "Error",
        description: "Failed to update donor information",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateDonorStatus = async (newStatus: string) => {
    if (!donorDetails) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/donors/${donorDetails.donor_id}/status`, {
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

      // Refresh donor details
      viewUserDetails(selectedUser!);
      fetchUsers();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: "Failed to update donor status",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      donor: "bg-blue-100 text-blue-800",
      hospital: "bg-green-100 text-green-800",
      admin: "bg-purple-100 text-purple-800",
      branch_hospital: "bg-cyan-100 text-cyan-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, JSX.Element> = {
      donor: <Heart className="h-4 w-4" />,
      hospital: <Building2 className="h-4 w-4" />,
      admin: <Shield className="h-4 w-4" />,
      branch_hospital: <Building2 className="h-4 w-4" />,
    };
    return icons[role] || <Users className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.pending;
  };

  const stats = {
    total: users.length,
    donors: users.filter(u => u.role === "donor").length,
    hospitals: users.filter(u => u.role === "hospital").length,
    branch_hospitals: users.filter(u => u.role === "branch_hospital").length,
    admins: users.filter(u => u.role === "admin").length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8 lg:pt-32">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/admin")} data-testid="back-to-dashboard-btn">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage all users, donors, hospitals, and admins
                </p>
              </div>
            </div>
            <Button onClick={fetchUsers} variant="outline" data-testid="refresh-users-btn">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Heart className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.donors}</p>
                  <p className="text-sm text-gray-600">Donors</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Building2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.hospitals}</p>
                  <p className="text-sm text-gray-600">Hospitals</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Building2 className="h-8 w-8 mx-auto text-cyan-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.branch_hospitals}</p>
                  <p className="text-sm text-gray-600">Branch Hospitals</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shield className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-sm text-gray-600">Admins</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="search-users-input"
                    />
                  </div>
                </div>
                <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full md:w-auto">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="donor">Donors</TabsTrigger>
                    <TabsTrigger value="hospital">Hospitals</TabsTrigger>
                    <TabsTrigger value="branch_hospital">Branch</TabsTrigger>
                    <TabsTrigger value="admin">Admins</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No users found</div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`user-${u.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(u.role)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{u.name}</h3>
                            <Badge className={getRoleBadgeColor(u.role)}>
                              {u.role.replace("_", " ").toUpperCase()}
                            </Badge>
                            {!u.is_active && (
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {u.email} {u.mobile && `• ${u.mobile}`}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewUserDetails(u)}
                        data-testid={`view-user-${u.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit User Information" : "User Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.role === "donor" 
                ? "Complete donor profile with checkup and eligibility information"
                : "User account information"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic User Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {getRoleIcon(selectedUser.role)}
                  Account Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-4 rounded-lg">
                  <div>
                    <Label className="text-gray-500">Name</Label>
                    <p className="font-medium">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Role</Label>
                    <Badge className={getRoleBadgeColor(selectedUser.role)}>
                      {selectedUser.role.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <Badge variant={selectedUser.is_active ? "default" : "destructive"}>
                      {selectedUser.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Donor Specific Details */}
              {selectedUser.role === "donor" && donorDetails && (
                <>
                  {/* Personal Information */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Donor Information</h3>
                      {!editMode && (
                        <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    {editMode ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Full Name</Label>
                            <Input
                              value={editedDonor.full_name || ""}
                              onChange={(e) => setEditedDonor({...editedDonor, full_name: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Phone</Label>
                            <Input
                              value={editedDonor.phone || ""}
                              onChange={(e) => setEditedDonor({...editedDonor, phone: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Blood Group</Label>
                            <Input
                              value={editedDonor.blood_group || ""}
                              onChange={(e) => setEditedDonor({...editedDonor, blood_group: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>City</Label>
                            <Input
                              value={editedDonor.city || ""}
                              onChange={(e) => setEditedDonor({...editedDonor, city: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>State</Label>
                            <Input
                              value={editedDonor.state || ""}
                              onChange={(e) => setEditedDonor({...editedDonor, state: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Country</Label>
                            <Input
                              value={editedDonor.country || ""}
                              onChange={(e) => setEditedDonor({...editedDonor, country: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={updateDonorInfo} disabled={updating}>
                            {updating ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button variant="outline" onClick={() => setEditMode(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <Label className="text-gray-500">Date of Birth</Label>
                          <p className="font-medium">{donorDetails.date_of_birth}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Blood Group</Label>
                          <p className="font-medium">{donorDetails.blood_group}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Phone</Label>
                          <p className="font-medium">{donorDetails.phone}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Organs</Label>
                          <p className="font-medium">{donorDetails.organs.join(", ")}</p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-gray-500">Location</Label>
                          <p className="font-medium">
                            {donorDetails.city}, {donorDetails.state}, {donorDetails.country}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branch Hospital */}
                  {branchHospital && (
                    <div>
                      <h3 className="font-semibold mb-3">Assigned Branch Hospital</h3>
                      <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
                        <p className="font-medium">{branchHospital.name}</p>
                        <p className="text-gray-600">
                          {branchHospital.address}, {branchHospital.city}, {branchHospital.state}
                        </p>
                        <p className="text-gray-600">Contact: {branchHospital.contact_number}</p>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <h3 className="font-semibold mb-3">Donor Status</h3>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Badge className={getStatusBadge(donorDetails.status)}>
                          {donorDetails.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          Checkup: {donorDetails.checkup_status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <Label>Change Status</Label>
                        <Select 
                          value={donorDetails.status} 
                          onValueChange={updateDonorStatus}
                        >
                          <SelectTrigger data-testid="donor-status-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="active">Active (Eligible)</SelectItem>
                            <SelectItem value="inactive">Inactive (Not Eligible)</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Active = Eligible • Inactive = Not Eligible
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Report */}
                  {donorDetails.eligibility_report_url && (
                    <div>
                      <h3 className="font-semibold mb-3">Eligibility Report</h3>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`${API_URL}${donorDetails.eligibility_report_url}`, "_blank")}
                        className="w-full"
                        data-testid="download-report-btn"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Eligibility Report
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
