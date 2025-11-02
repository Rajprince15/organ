import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  FileText,
  Plus,
  Activity
} from "lucide-react";

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
  const [requirements, setRequirements] = useState<HospitalRequirement[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card 
              className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
              onClick={() => navigate("/hospital-requirements")}
              data-testid="total-requirements-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Total Requirements</p>
                  <p className="text-2xl font-bold text-blue-700">{requirements.length}</p>
                  <p className="text-xs text-blue-600 mt-1">View Details →</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
              onClick={() => navigate("/hospital-shortlist")}
              data-testid="shortlisted-applications-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Shortlisted Applications</p>
                  <p className="text-lg font-semibold text-yellow-700">View Shortlist →</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20"
              onClick={() => navigate("/hospital-compatible-donors")}
              data-testid="compatible-donors-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Compatible Donors</p>
                  <p className="text-lg font-semibold text-primary">View Matches →</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              onClick={() => navigate("/donor-list")}
              data-testid="view-donors-card"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Available Donors</p>
                  <p className="text-lg font-semibold text-green-700">View All →</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Quick Actions
            </h2>
            <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-bold mb-2">Need to post a new requirement?</h3>
                <p className="text-muted-foreground mb-6">
                  Post organ requirements for your patients and get matched with compatible donors instantly.
                </p>
                <Button
                  onClick={() => navigate("/recipient-portal")}
                  className="bg-gradient-primary shadow-medium hover:shadow-glow transition-all duration-300"
                  data-testid="post-requirement-cta"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Post New Requirement
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HospitalDashboard;
