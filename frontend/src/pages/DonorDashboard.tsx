import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Heart, Edit, Trash2, Calendar, Mail, Phone, Droplet, AlertCircle, CheckCircle, Clock, XCircle, Download, Award, Users, Sparkles, MapPin, Quote, Target, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  consent: boolean;
  status: "pending" | "approved" | "active" | "cancelled";
  assigned_branch_hospital_id?: string;
  assigned_branch_hospital_name?: string;
  checkup_status?: "pending_checkup" | "scheduled" | "completed" | "eligible" | "not_eligible" | "none";
  checkup_date?: string;
  eligibility_report_url?: string;
  created_at: string;
  updated_at: string;
}

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
  is_active: boolean;
}

const DonorDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [application, setApplication] = useState<DonationApplication | null>(null);
  const [branchHospital, setBranchHospital] = useState<BranchHospital | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDonorCard, setShowDonorCard] = useState(false);
  const [matchingCount, setMatchingCount] = useState(0);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    blood_group: "",
    organs: [] as string[],
    city: "",
    state: "",
    country: "",
    consent: false,
  });

  const organOptions = [
    "Heart", "Lungs", "Liver", "Kidneys", "Pancreas", "Intestines", "Corneas", "Skin", "Bone", "Heart Valves"
  ];

  // Mock success stories
  const successStories = [
    {
      name: "Sarah Johnson",
      organ: "Kidney",
      quote: "Thanks to my donor, I got a second chance at life. I can now watch my grandchildren grow up.",
      year: "2023"
    },
    {
      name: "Michael Chen",
      organ: "Liver",
      quote: "The gift of life I received has allowed me to pursue my dreams and live without limitations.",
      year: "2022"
    },
    {
      name: "Emma Rodriguez",
      organ: "Heart",
      quote: "Every heartbeat reminds me of the incredible generosity of my donor and their family.",
      year: "2023"
    }
  ];

  // Calculate potential lives saved based on organs
  const calculateImpact = (organs: string[]) => {
    let lives = 0;
    const organImpact: { [key: string]: number } = {
      "Heart": 1,
      "Lungs": 2,
      "Liver": 1,
      "Kidneys": 2,
      "Pancreas": 1,
      "Intestines": 1,
      "Corneas": 2,
      "Skin": 50,  // Can help many burn victims
      "Bone": 10,  // Multiple recipients
      "Heart Valves": 4
    };
    
    organs.forEach(organ => {
      lives += organImpact[organ] || 0;
    });
    
    return lives;
  };

  // Calculate profile completion
  const calculateProfileCompletion = (app: DonationApplication | null) => {
    if (!app) return 0;
    
    let completed = 0;
    const total = 10;
    
    if (app.full_name) completed++;
    if (app.email) completed++;
    if (app.phone) completed++;
    if (app.date_of_birth) completed++;
    if (app.blood_group) completed++;
    if (app.organs.length > 0) completed++;
    if (app.city) completed++;
    if (app.state) completed++;
    if (app.country) completed++;
    if (app.consent) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const getProfileTips = (app: DonationApplication | null) => {
    if (!app) return [];
    
    const tips: string[] = [];
    
    if (!app.city || !app.state || !app.country) {
      tips.push("Add your location details to help hospitals find suitable matches in your area");
    }
    
    if (app.organs.length < 3) {
      tips.push("Consider pledging more organs - one donor can save up to 8 lives!");
    }
    
    if (app.status === "pending") {
      tips.push("Your application is pending approval. You'll be notified once approved.");
    }
    
    return tips;
  };

  useEffect(() => {
    if (!user || user.role !== "donor") {
      navigate("/");
      return;
    }
    fetchApplication();
    fetchMatchingCount();
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
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            consent: data.consent,
          });
          
          // Fetch assigned branch hospital if available
          if (data.assigned_branch_hospital_id) {
            fetchBranchHospital();
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBranchHospital = async () => {
    try {
      const response = await fetch(`${API_URL}/api/donations/me/branch-hospital`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.assigned && data.branch_hospital) {
          setBranchHospital(data.branch_hospital);
        }
      }
    } catch (error) {
      console.error('Failed to fetch branch hospital:', error);
    }
  };

  const fetchMatchingCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/matches/requirements/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMatchingCount(data.matches?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch matching count:', error);
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

  const downloadDonorCard = async () => {
    const cardElement = document.getElementById('donor-card');
    if (!cardElement) return;

    try {
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98] // Credit card size
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
      pdf.save(`donor-card-${application?.full_name.replace(/\s/g, '-')}.pdf`);
      
      toast({
        title: "Card Downloaded",
        description: "Your donor card has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download donor card. Please try again.",
        variant: "destructive",
      });
    }
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

  const profileCompletion = calculateProfileCompletion(application);
  const profileTips = getProfileTips(application);
  const potentialLives = calculateImpact(application.organs);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              My Donation <span className="bg-gradient-hero bg-clip-text text-transparent">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              Manage your organ donation application and see your impact
            </p>
          </div>

          {/* Impact Dashboard */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Potential Lives Saved</p>
                  <p className="text-3xl font-bold text-red-600">{potentialLives}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {application.organs.length} organs pledged
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profile Completion</p>
                  <p className="text-3xl font-bold text-blue-600">{profileCompletion}%</p>
                </div>
              </div>
              <Progress value={profileCompletion} className="mt-3 h-2" />
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration Status</p>
                  <p className="text-lg font-bold text-green-600 capitalize">{application.status}</p>
                </div>
              </div>
              <div className="mt-3">
                {getStatusIcon(application.status)}
              </div>
            </Card>
          </div>

          {/* Matching Requirements Card - Only show if approved */}
          {application.status === 'approved' && (
            <Card 
              className="p-6 mb-8 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 hover:shadow-strong transition-all cursor-pointer"
              onClick={() => navigate('/donor-matching-requirements')}
              data-testid="matching-requirements-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                    <Target className="h-7 w-7 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-purple-900 mb-1">
                      Matching Requirements
                    </h3>
                    <p className="text-sm text-purple-700">
                      {matchingCount > 0 
                        ? `${matchingCount} hospital${matchingCount !== 1 ? 's' : ''} need your help`
                        : 'No matching requirements at this time'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {matchingCount > 0 && (
                    <div className="text-center px-4 py-2 bg-purple-100 rounded-lg">
                      <p className="text-3xl font-bold text-purple-600">{matchingCount}</p>
                      <p className="text-xs text-purple-700">Matches</p>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Profile Completion Tips */}
          {profileTips.length > 0 && (
            <Card className="p-6 mb-8 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-2">Tips to Improve Your Profile</h3>
                  <ul className="space-y-1">
                    {profileTips.map((tip, index) => (
                      <li key={index} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="text-amber-600">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

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

          {/* Branch Hospital Checkup Card */}
          {application.checkup_status && application.checkup_status !== "none" && branchHospital && (
            <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200" data-testid="branch-hospital-card">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Eligibility Checkup Required</h3>
                      <p className="text-sm text-gray-600">You've been assigned to a branch hospital</p>
                    </div>
                  </div>
                  {application.checkup_status === "pending_checkup" && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium border border-amber-200">
                      Action Required
                    </span>
                  )}
                  {application.checkup_status === "completed" && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium border border-green-200">
                      ✓ Completed
                    </span>
                  )}
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-3">{branchHospital.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        {branchHospital.address}, {branchHospital.city}, {branchHospital.state}, {branchHospital.country}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <a href={`tel:${branchHospital.contact_number}`} className="text-blue-600 hover:underline">
                        {branchHospital.contact_number}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <a href={`mailto:${branchHospital.email}`} className="text-blue-600 hover:underline">
                        {branchHospital.email}
                      </a>
                    </div>
                    {branchHospital.contact_person && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <p className="text-gray-700">Contact Person: {branchHospital.contact_person}</p>
                      </div>
                    )}
                  </div>
                </div>

                {application.checkup_status === "pending_checkup" && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-amber-900">Next Steps:</p>
                        <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                          <li>Contact the branch hospital to schedule your eligibility checkup</li>
                          <li>Bring a valid government-issued ID and any relevant medical records</li>
                          <li>The checkup is FREE of charge</li>
                          <li>After the checkup, the hospital will upload your eligibility report</li>
                        </ol>
                        <p className="text-xs text-amber-700 mt-2">
                          ⏰ Please schedule within 7 days of registration
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {application.checkup_status === "completed" && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Checkup Completed!</p>
                        <p className="text-sm text-green-700">
                          Your eligibility report has been submitted. You'll be notified once it's reviewed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Application Details or Edit Form */}
          {!isEditing ? (
            <>
              <Card className="p-8 shadow-strong mb-8" data-testid="application-details-card">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-semibold">Application Details</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDonorCard(true)}
                      data-testid="view-donor-card-button"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Donor Card
                    </Button>
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
                      {(application.city || application.state || application.country) && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-medium">
                              {[application.city, application.state, application.country].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                      )}
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

              {/* Success Stories */}
              <Card className="p-8 mb-8 bg-gradient-to-br from-purple-50 to-pink-50">
                <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                  <Quote className="h-6 w-6 text-purple-600" />
                  Success Stories
                </h2>
                <p className="text-muted-foreground mb-6">
                  Read inspiring stories from organ recipients whose lives were transformed
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  {successStories.map((story, index) => (
                    <Card key={index} className="p-6 bg-white border-purple-200">
                      <div className="mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                          <Heart className="h-6 w-6 text-purple-600" />
                        </div>
                        <h4 className="font-semibold text-lg">{story.name}</h4>
                        <p className="text-sm text-purple-600 font-medium">{story.organ} Recipient</p>
                      </div>
                      <p className="text-sm text-muted-foreground italic mb-3">"{story.quote}"</p>
                      <p className="text-xs text-muted-foreground">Transplant Year: {story.year}</p>
                    </Card>
                  ))}
                </div>
              </Card>
            </>
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
                        city: application.city || "",
                        state: application.state || "",
                        country: application.country || "",
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

                {/* Location Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Location</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Organ Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Organs to Donate *</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {organOptions.map((organ) => (
                      <label
                        key={organ}
                        className={`p-3 border rounded-lg cursor-pointer transition-smooth ${
                          formData.organs.includes(organ)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`edit-organ-${organ.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={formData.organs.includes(organ)}
                            onCheckedChange={() => toggleOrgan(organ)}
                          />
                          <span className="text-sm font-medium select-none">{organ}</span>
                        </div>
                      </label>
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

      {/* Donor Card Modal */}
      {showDonorCard && application && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold">Your Donor Card</h2>
              <Button variant="ghost" onClick={() => setShowDonorCard(false)}>✕</Button>
            </div>
            
            <div id="donor-card" className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-8 text-white mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-1">ORGAN DONOR</h3>
                  <p className="text-red-100">Life Saving Card</p>
                </div>
                <Heart className="h-12 w-12" />
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-red-100 text-sm mb-1">Name</p>
                  <p className="font-bold text-lg">{application.full_name}</p>
                </div>
                <div>
                  <p className="text-red-100 text-sm mb-1">Blood Group</p>
                  <p className="font-bold text-lg">{application.blood_group}</p>
                </div>
                <div>
                  <p className="text-red-100 text-sm mb-1">Date of Birth</p>
                  <p className="font-semibold">{new Date(application.date_of_birth).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-red-100 text-sm mb-1">Donor ID</p>
                  <p className="font-semibold">{application.id.slice(0, 12)}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-red-100 text-sm mb-2">Organs Pledged:</p>
                <div className="flex flex-wrap gap-2">
                  {application.organs.map((organ) => (
                    <span key={organ} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                      {organ}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-red-100 text-xs">Emergency Contact</p>
                  <p className="font-semibold text-sm">{application.phone}</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <QRCodeCanvas 
                    value={JSON.stringify({
                      id: application.id,
                      name: application.full_name,
                      blood_group: application.blood_group,
                      organs: application.organs,
                      dob: application.date_of_birth
                    })}
                    size={80}
                    level="H"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button onClick={downloadDonorCard} className="flex-1 bg-gradient-primary">
                <Download className="h-4 w-4 mr-2" />
                Download as PDF
              </Button>
              <Button variant="outline" onClick={() => setShowDonorCard(false)} className="flex-1">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

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