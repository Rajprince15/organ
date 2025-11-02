"import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Heart, 
  Building2, 
  Activity,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Download,
  BarChart3,
  UserCog,
  FileText,
  MessageSquare
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

interface Stats {
  users: {
    total: number;
    donors: number;
    hospitals: number;
    admins: number;
  };
  donations: {
    total: number;
    pending: number;
    approved: number;
    cancelled: number;
  };
  requirements: {
    total: number;
    active: number;
    fulfilled: number;
    cancelled: number;
  };
  matches: {
    total_shortlisted: number;
    total_contacts: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mobile?: string;
  age?: number;
  mobile_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface DonationApplication {
  id: string;
  donor_id: string;
  donor_email: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  blood_group: string;
  organs: string[];
  city?: string;
  state?: string;
  country?: string;
  status: "pending" | "approved" | "active" | "cancelled";
  created_at: string;
}

interface HospitalRequirement {
  id: string;
  hospital_id: string;
  hospital_name: string;
  patient_name: string;
  age: number;
  blood_group: string;
  organ_required: string;
  urgency_level: "critical" | "high" | "medium";
  doctor_name: string;
  contact_number: string;
  email: string;
  medical_history: string;
  status: "active" | "fulfilled" | "cancelled";
  created_at: string;
}

interface Activity {
  type: string;
  action: string;
  status: string;
  timestamp: string;
  id: string;
}

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [donations, setDonations] = useState<DonationApplication[]>([]);
  const [requirements, setRequirements] = useState<HospitalRequirement[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [editDonationDialog, setEditDonationDialog] = useState(false);
  const [editRequirementDialog, setEditRequirementDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<DonationApplication | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<HospitalRequirement | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchAllData();
  }, [user, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchDonations(),
      fetchRequirements(),
      fetchActivity()
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchDonations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/donations?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDonations(data.donations);
      }
    } catch (error) {
      console.error('Failed to fetch donations:', error);
    }
  };

  const fetchRequirements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/requirements?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequirements(data.requirements);
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
    }
  };

  const fetchActivity = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/activity?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActivity(data.activity);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        toast({ title: "User updated successfully" });
        fetchUsers();
        setEditUserDialog(false);
      } else {
        toast({ title: "Failed to update user", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error updating user", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "User deleted successfully" });
        fetchUsers();
      } else {
        toast({ title: "Failed to delete user", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error deleting user", variant: "destructive" });
    }
  };

  const handleUpdateDonation = async (donationId: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/donations/${donationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast({ title: "Donation application updated successfully" });
        fetchDonations();
        setEditDonationDialog(false);
      } else {
        toast({ title: "Failed to update donation", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error updating donation", variant: "destructive" });
    }
  };

  const handleDeleteDonation = async (donationId: string) => {
    if (!confirm('Are you sure you want to delete this donation application?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/donations/${donationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "Donation application deleted successfully" });
        fetchDonations();
      } else {
        toast({ title: "Failed to delete donation", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error deleting donation", variant: "destructive" });
    }
  };

  const handleUpdateRequirement = async (requirementId: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/requirements/${requirementId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast({ title: "Requirement updated successfully" });
        fetchRequirements();
        setEditRequirementDialog(false);
      } else {
        toast({ title: "Failed to update requirement", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error updating requirement", variant: "destructive" });
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/requirements/${requirementId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "Requirement deleted successfully" });
        fetchRequirements();
      } else {
        toast({ title: "Failed to delete requirement", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error deleting requirement", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      pending: "outline",
      approved: "default",
      active: "default",
      fulfilled: "secondary",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors: { [key: string]: string } = {
      critical: "bg-red-500 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-yellow-500 text-white"
    };
    return <Badge className={colors[urgency] || ""}>{urgency}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" data-testid="admin-dashboard-title">
              Admin <span className="bg-gradient-hero bg-clip-text text-transparent">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              Manage users, donations, requirements, and view analytics
            </p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card data-testid="stats-users-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.users.donors} donors, {stats.users.hospitals} hospitals
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stats-donations-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Donation Applications
                  </CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.donations.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.donations.pending} pending, {stats.donations.approved} approved
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stats-requirements-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Requirements
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.requirements.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.requirements.active} active, {stats.requirements.fulfilled} fulfilled
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stats-matches-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Matches & Contacts
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.matches.total_shortlisted}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.matches.total_contacts} contacts made
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs for different sections */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="users" data-testid="tab-users">
                <UserCog className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="donations" data-testid="tab-donations">
                <Heart className="h-4 w-4 mr-2" />
                Donations
              </TabsTrigger>
              <TabsTrigger value="requirements" data-testid="tab-requirements">
                <FileText className="h-4 w-4 mr-2" />
                Requirements
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage all users in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.mobile || 'N/A'}</TableCell>
                            <TableCell>
                              {user.is_active ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setEditUserDialog(true);
                                  }}
                                  data-testid={`edit-user-${user.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(user.id)}
                                  data-testid={`delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Donations Tab */}
            <TabsContent value="donations">
              <Card>
                <CardHeader>
                  <CardTitle>Donation Applications</CardTitle>
                  <CardDescription>
                    Review and manage donation applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Donor Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Blood Group</TableHead>
                          <TableHead>Organs</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {donations.map((donation) => (
                          <TableRow key={donation.id}>
                            <TableCell className="font-medium">{donation.full_name}</TableCell>
                            <TableCell>{donation.email}</TableCell>
                            <TableCell>{donation.blood_group}</TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">
                                {donation.organs.join(', ')}
                              </div>
                            </TableCell>
                            <TableCell>{donation.city || 'N/A'}</TableCell>
                            <TableCell>{getStatusBadge(donation.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedDonation(donation);
                                    setEditDonationDialog(true);
                                  }}
                                  data-testid={`edit-donation-${donation.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteDonation(donation.id)}
                                  data-testid={`delete-donation-${donation.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements">
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Requirements</CardTitle>
                  <CardDescription>
                    Manage hospital organ requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hospital</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Organ</TableHead>
                          <TableHead>Blood Group</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requirements.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.hospital_name}</TableCell>
                            <TableCell>{req.patient_name}</TableCell>
                            <TableCell>{req.organ_required}</TableCell>
                            <TableCell>{req.blood_group}</TableCell>
                            <TableCell>{getUrgencyBadge(req.urgency_level)}</TableCell>
                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRequirement(req);
                                    setEditRequirementDialog(true);
                                  }}
                                  data-testid={`edit-requirement-${req.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteRequirement(req.id)}
                                  data-testid={`delete-requirement-${req.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest actions and events in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activity.map((item, index) => (
                      <div key={index} className="flex items-start gap-4 border-b pb-4 last:border-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {item.type === 'donation' && <Heart className="h-5 w-5 text-primary" />}
                          {item.type === 'requirement' && <Building2 className="h-5 w-5 text-secondary" />}
                          {item.type === 'contact' && <MessageSquare className="h-5 w-5 text-accent" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.action}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Analytics</CardTitle>
                    <CardDescription>
                      Overview of system performance and metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Success Rate</span>
                        </div>
                        <p className="text-3xl font-bold">
                          {stats && stats.requirements.total > 0
                            ? Math.round((stats.requirements.fulfilled / stats.requirements.total) * 100)
                            : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Requirements fulfilled</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-500" />
                          <span className="font-medium">Pending Reviews</span>
                        </div>
                        <p className="text-3xl font-bold">
                          {stats?.donations.pending || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Applications awaiting approval</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Active Matches</span>
                        </div>
                        <p className="text-3xl font-bold">
                          {stats?.matches.total_shortlisted || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Current shortlisted donors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                    <CardDescription>
                      Download reports and data exports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="outline" className="justify-start" data-testid="export-users-btn">
                        <Download className="h-4 w-4 mr-2" />
                        Export Users
                      </Button>
                      <Button variant="outline" className="justify-start" data-testid="export-donations-btn">
                        <Download className="h-4 w-4 mr-2" />
                        Export Donations
                      </Button>
                      <Button variant="outline" className="justify-start" data-testid="export-requirements-btn">
                        <Download className="h-4 w-4 mr-2" />
                        Export Requirements
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and status
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  defaultValue={selectedUser.name}
                  onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  defaultValue={selectedUser.is_active ? "active" : "inactive"}
                  onValueChange={(value) => 
                    setSelectedUser({...selectedUser, is_active: value === "active"})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedUser && handleUpdateUser(selectedUser.id, {
              name: selectedUser.name,
              is_active: selectedUser.is_active
            })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Donation Dialog */}
      <Dialog open={editDonationDialog} onOpenChange={setEditDonationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Donation Status</DialogTitle>
            <DialogDescription>
              Change the status of this donation application
            </DialogDescription>
          </DialogHeader>
          {selectedDonation && (
            <div className="space-y-4">
              <div>
                <Label>Donor: {selectedDonation.full_name}</Label>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  defaultValue={selectedDonation.status}
                  onValueChange={(value) => 
                    setSelectedDonation({...selectedDonation, status: value as any})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDonationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedDonation && handleUpdateDonation(
              selectedDonation.id, 
              selectedDonation.status
            )}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Requirement Dialog */}
      <Dialog open={editRequirementDialog} onOpenChange={setEditRequirementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Requirement Status</DialogTitle>
            <DialogDescription>
              Change the status of this hospital requirement
            </DialogDescription>
          </DialogHeader>
          {selectedRequirement && (
            <div className="space-y-4">
              <div>
                <Label>Patient: {selectedRequirement.patient_name}</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedRequirement.organ_required} - {selectedRequirement.blood_group}
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  defaultValue={selectedRequirement.status}
                  onValueChange={(value) => 
                    setSelectedRequirement({...selectedRequirement, status: value as any})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRequirementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedRequirement && handleUpdateRequirement(
              selectedRequirement.id, 
              selectedRequirement.status
            )}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
"