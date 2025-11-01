import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Heart, Edit, Trash2, Calendar, Mail, Phone, Droplet, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

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
  consent: boolean;
  status: "pending" | "approved" | "active" | "cancelled";
  created_at: string;
  updated_at: string;
}

const DonorDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [application, setApplication] = useState<DonationApplication | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    blood_group: "",
    organs: [] as string[],
    consent: false,
  });

  const organOptions = [
    "Heart", "Lungs", "Liver", "Kidneys", "Pancreas", "Intestines", "Corneas", "Skin", "Bone", "Heart Valves"
  ];

  useEffect(() => {
    if (!user || user.role !== "donor") {
      navigate("/");
      return;
    }
    fetchApplication();
  }, [user, navigate]);

  const fetchApplication = async () => {
    try {
      const response = await fetch(`${API_URL}/api/donations/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setApplication(data);
          setFormData({
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
            date_of_birth: data.date_of_birth,
            blood_group: data.blood_group,
            organs: data.organs,
            consent: data.consent,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    try {
      const response = await fetch(`${API_URL}/api/donations/${application.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedApp = await response.json();
        setApplication(updatedApp);
        setIsEditing(false);
        toast({
          title: "Application Updated",
          description: "Your donation application has been updated successfully.",
        });
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update your application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!application) return;

    try {
      const response = await fetch(`${API_URL}/api/donations/${application.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setApplication(null);
        setShowDeleteDialog(false);
        toast({
          title: "Application Deleted",
          description: "Your donation application has been deleted.",
        });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete your application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleOrgan = (organ: string) => {
    setFormData(prev => ({
      ...prev,
      organs: prev.organs.includes(organ)
        ? prev.organs.filter(o => o !== organ)
        : [...prev.organs, organ]
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "active":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <Card className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-4">No Donation Application</h2>
              <p className="text-muted-foreground mb-6">
                You haven't registered as a donor yet. Create your donation application to save lives.
              </p>
              <Button
                onClick={() => navigate("/donate")}
                className="bg-gradient-primary"
                data-testid="create-donation-button"
              >
                Register as Donor
                <Heart className="ml-2 h-5 w-5" />
              </Button>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              My Donation <span className="bg-gradient-hero bg-clip-text text-transparent">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              Manage your organ donation application
            </p>
          </div>

          {/* Status Card */}
          <Card className="p-6 mb-6" data-testid="application-status-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(application.status)}
                <div>
                  <p className="text-sm text-muted-foreground">Application Status</p>
                  <div className={`inline-block px-3 py-1 rounded-full border text-sm font-semibold capitalize ${getStatusColor(application.status)}`}>
                    {application.status}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {new Date(application.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Application Details or Edit Form */}
          {!isEditing ? (
            <Card className="p-8 shadow-strong" data-testid="application-details-card">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-semibold">Application Details</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    data-testid="edit-application-button"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="delete-application-button"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Personal Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{application.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{application.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{application.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{new Date(application.date_of_birth).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Droplet className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Blood Group</p>
                        <p className="font-medium">{application.blood_group}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organs to Donate */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-secondary">Organs to Donate</h3>
                  <div className="flex flex-wrap gap-2">
                    {application.organs.map((organ) => (
                      <div
                        key={organ}
                        className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-sm font-medium"
                      >
                        {organ}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registration Info */}
                <div className="pt-4 border-t">
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Registered on:</span>{" "}
                      {new Date(application.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Application ID:</span>{" "}
                      {application.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 shadow-strong" data-testid="application-edit-form">
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-semibold">Edit Application</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        full_name: application.full_name,
                        email: application.email,
                        phone: application.phone,
                        date_of_birth: application.date_of_birth,
                        blood_group: application.blood_group,
                        organs: application.organs,
                        consent: application.consent,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        data-testid="edit-full-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        data-testid="edit-email-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="edit-phone-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        required
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        data-testid="edit-dob-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
                  <div>
                    <Label htmlFor="bloodGroup">Blood Group *</Label>
                    <select
                      id="bloodGroup"
                      required
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      data-testid="edit-blood-group-select"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                {/* Organ Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Organs to Donate *</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {organOptions.map((organ) => (
                      <div
                        key={organ}
                        onClick={() => toggleOrgan(organ)}
                        className={`p-3 border rounded-lg cursor-pointer transition-smooth ${
                          formData.organs.includes(organ)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`edit-organ-${organ.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={formData.organs.includes(organ)} />
                          <span className="text-sm font-medium">{organ}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-primary"
                    data-testid="save-changes-button"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your donation application. This action cannot be undone.
              You can always register again later if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-button"
            >
              Delete Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default DonorDashboard;
