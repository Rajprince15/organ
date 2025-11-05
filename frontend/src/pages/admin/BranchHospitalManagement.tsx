import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  XCircle,
  Copy,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface BranchHospital {
  id: string;
  name: string;
  email: string;
  license_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  contact_number: string;
  contact_person: string | null;
  created_by_admin_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BranchFormData {
  name: string;
  email: string;
  license_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  contact_number: string;
  contact_person: string;
}

export default function BranchHospitalManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [branches, setBranches] = useState<BranchHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchHospital | null>(null);
  const [showCredentials, setShowCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<BranchFormData>({
    name: "",
    email: "",
    license_number: "",
    address: "",
    city: "",
    state: "",
    country: "",
    contact_number: "",
    contact_person: ""
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchBranchHospitals();
  }, [user, navigate]);

  const fetchBranchHospitals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/branch-hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to fetch branch hospitals");

      const data = await response.json();
      setBranches(data.branch_hospitals || []);
    } catch (error) {
      console.error("Failed to load branch hospitals:", error);
      toast({
        title: "Error",
        description: "Failed to load branch hospitals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      const url = editingBranch 
        ? `${API_URL}/api/admin/branch-hospitals/${editingBranch.id}`
        : `${API_URL}/api/admin/branch-hospitals`;
      
      const method = editingBranch ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to save branch hospital");
      }

      const data = await response.json();
      
      // If creating new, show credentials
      if (!editingBranch && data.credentials) {
        setShowCredentials(data.credentials);
      }
      
      toast({
        title: "Success",
        description: editingBranch 
          ? "Branch hospital updated successfully" 
          : "Branch hospital created successfully",
      });
      
      // Reset form and refresh list
      resetForm();
      fetchBranchHospitals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (branch: BranchHospital) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      email: branch.email,
      license_number: branch.license_number,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      country: branch.country,
      contact_number: branch.contact_number,
      contact_person: branch.contact_person || ""
    });
    setShowAddForm(true);
  };

  const handleDelete = async (branchId: string) => {
    if (!confirm("Are you sure you want to delete this branch hospital? This action cannot be undone.")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/branch-hospitals/${branchId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to delete branch hospital");

      toast({
        title: "Success",
        description: "Branch hospital deleted successfully"
      });
      
      fetchBranchHospitals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (branchId: string) => {
    if (!confirm("Are you sure you want to reset the password for this branch hospital?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/branch-hospitals/${branchId}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to reset password");

      const data = await response.json();
      setShowCredentials(data.credentials);
      
      toast({
        title: "Success",
        description: "Password reset successfully. New credentials are displayed."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      license_number: "",
      address: "",
      city: "",
      state: "",
      country: "",
      contact_number: "",
      contact_person: ""
    });
    setShowAddForm(false);
    setEditingBranch(null);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin-dashboard")}
                data-testid="back-to-dashboard-btn"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Building2 className="h-10 w-10 text-blue-600" />
                Branch Hospital Management
              </h1>
              <p className="text-lg text-gray-600">
                Manage branch hospital accounts and credentials
              </p>
            </div>
            {!showAddForm && (
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                data-testid="add-branch-hospital-btn"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Branch Hospital
              </Button>
            )}
          </div>

          {/* Credentials Display Modal */}
          {showCredentials && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-6 w-6" />
                  Branch Hospital Credentials
                </CardTitle>
                <CardDescription className="text-green-700">
                  ⚠️ IMPORTANT: Save these credentials now. The password will not be shown again!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-green-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Login Email</p>
                      <p className="text-lg font-mono font-bold text-gray-900">{showCredentials.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(showCredentials.email, "Email")}
                    >
                      {copiedField === "Email" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Password</p>
                      <p className="text-lg font-mono font-bold text-gray-900">{showCredentials.password}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(showCredentials.password, "Password")}
                    >
                      {copiedField === "Password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCredentials(null)}
                    className="flex-1"
                  >
                    I've Saved the Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingBranch ? "Edit Branch Hospital" : "Add New Branch Hospital"}
                </CardTitle>
                <CardDescription>
                  {editingBranch 
                    ? "Update branch hospital information" 
                    : "Create a new branch hospital account with auto-generated credentials"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Hospital Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Downtown Medical Branch"
                        required
                        data-testid="branch-name-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="branch@hospital.com"
                        required
                        disabled={!!editingBranch}
                        data-testid="branch-email-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="license_number">License Number *</Label>
                      <Input
                        id="license_number"
                        value={formData.license_number}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        placeholder="LIC-2024-001"
                        required
                        data-testid="branch-license-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contact_number">Contact Number *</Label>
                      <Input
                        id="contact_number"
                        value={formData.contact_number}
                        onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                        placeholder="+1234567890"
                        required
                        data-testid="branch-phone-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        placeholder="Dr. John Smith"
                        data-testid="branch-contact-person-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="New York"
                        required
                        data-testid="branch-city-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="New York"
                        required
                        data-testid="branch-state-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="USA"
                        required
                        data-testid="branch-country-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Medical Center Drive"
                      required
                      data-testid="branch-address-input"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button type="submit" data-testid="submit-branch-btn">
                      {editingBranch ? "Update Branch Hospital" : "Create Branch Hospital"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Branch Hospitals List */}
          <Card>
            <CardHeader>
              <CardTitle>Branch Hospitals ({branches.length})</CardTitle>
              <CardDescription>
                Manage all registered branch hospitals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : branches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No branch hospitals found. Create your first one!
                </div>
              ) : (
                <div className="space-y-4">
                  {branches.map((branch) => (
                    <Card key={branch.id} className="hover:shadow-md transition-shadow" data-testid={`branch-card-${branch.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{branch.name}</h3>
                                <p className="text-sm text-gray-500">License: {branch.license_number}</p>
                              </div>
                              {branch.is_active ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            
                            <div className="grid gap-2 md:grid-cols-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4" />
                                {branch.email}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4" />
                                {branch.contact_number}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="h-4 w-4" />
                                {branch.city}, {branch.state}, {branch.country}
                              </div>
                              {branch.contact_person && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Shield className="h-4 w-4" />
                                  {branch.contact_person}
                                </div>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-500">
                              Created by {branch.created_by_admin_name} on {new Date(branch.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(branch)}
                              data-testid={`edit-branch-btn-${branch.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetPassword(branch.id)}
                              data-testid={`reset-password-btn-${branch.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(branch.id)}
                              data-testid={`delete-branch-btn-${branch.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
