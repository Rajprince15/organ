import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { HospitalMatchedDonors } from "@/components/HospitalMatchedDonors";
import { 
  Building2, 
  Users, 
  AlertCircle, 
  Calendar, 
  Mail, 
  Phone, 
  Edit, 
  Trash2,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Plus
} from "lucide-react";
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

const API_URL = import.meta.env.VITE_API_URL || '';

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
  updated_at: string;
}

const HospitalDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<HospitalRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "hospital") {
      navigate("/");
      return;
    }
    fetchRequirements();
  }, [user, navigate]);

  const fetchRequirements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hospital-requirements/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequirements(data);
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`${API_URL}/api/hospital-requirements/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setRequirements(requirements.filter(r => r.id !== deleteId));
        setDeleteId(null);
        toast({
          title: "Requirement Deleted",
          description: "The requirement has been deleted successfully.",
        });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete requirement. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "fulfilled":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
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
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Hospital <span className="bg-gradient-hero bg-clip-text text-transparent">Dashboard</span>
                </h1>
                <p className="text-muted-foreground">
                  Manage your organ requirements and view donor applications
                </p>
              </div>
              <Button
                onClick={() => navigate("/recipient-portal")}
                className="bg-gradient-secondary shadow-medium hover:shadow-glow transition-all duration-300"
                data-testid="post-requirement-button"
              >
                <Plus className="h-5 w-5 mr-2" />
                Post New Requirement
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requirements</p>
                  <p className="text-2xl font-bold">{requirements.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Cases</p>
                  <p className="text-2xl font-bold">
                    {requirements.filter(r => r.status === "active").length}
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20"
              onClick={() => navigate("/donor-list")}
              data-testid="view-donors-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Available Donors</p>
                  <p className="text-lg font-semibold text-primary">View All Donors →</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Requirements List */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Your Posted Requirements
            </h2>

            {requirements.length === 0 ? (
              <Card className="p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Requirements Posted</h3>
                <p className="text-muted-foreground mb-6">
                  Start by posting a new organ requirement for your patients.
                </p>
                <Button
                  onClick={() => navigate("/recipient-portal")}
                  className="bg-gradient-primary"
                  data-testid="post-first-requirement-button"
                >
                  Post Your First Requirement
                  <Plus className="ml-2 h-5 w-5" />
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6">
                {requirements.map((req, index) => (
                  <Card 
                    key={req.id} 
                    className="p-6 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${400 + index * 100}ms` }}
                    data-testid={`requirement-card-${index}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(req.status)}
                        <div>
                          <h3 className="text-xl font-semibold">{req.patient_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold uppercase ${getUrgencyColor(req.urgency_level)}`}>
                              {req.urgency_level} Priority
                            </span>
                            <span className="text-sm text-muted-foreground capitalize">
                              • {req.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/recipient-portal", { state: { requirement: req } })}
                          data-testid={`edit-requirement-${index}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(req.id)}
                          data-testid={`delete-requirement-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-start gap-2">
                        <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Organ Required</p>
                          <p className="font-semibold text-primary">{req.organ_required}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Age / Blood</p>
                          <p className="font-medium">{req.age} yrs / {req.blood_group}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Contact</p>
                          <p className="font-medium text-sm">{req.contact_number}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium text-sm truncate">{req.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Doctor In-Charge:</p>
                        <p className="font-medium">{req.doctor_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Medical History:</p>
                        <p className="text-sm text-muted-foreground">{req.medical_history}</p>
                      </div>
                    </div>

                    {/* Matched Donors Section */}
                    {req.status === 'active' && (
                      <div className="mt-6">
                        <HospitalMatchedDonors
                          requirementId={req.id}
                          requirementDetails={{
                            organ_required: req.organ_required,
                            blood_group: req.blood_group,
                            urgency_level: req.urgency_level
                          }}
                        />
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <span>Posted on: {new Date(req.created_at).toLocaleDateString()}</span>
                      <span>Last updated: {new Date(req.updated_at).toLocaleDateString()}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="delete-requirement-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this requirement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default HospitalDashboard;
