import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OrganDonationChatbot from "@/components/OrganDonationChatbot";
import { Activity, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || '';

const RecipientPortal = () => {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientName: "",
    age: "",
    bloodGroup: "",
    organRequired: "",
    urgencyLevel: "",
    hospitalName: "",
    doctorName: "",
    contactNumber: "",
    email: "",
    medicalHistory: "",
  });

  useEffect(() => {
    if (!user || user.role !== "hospital") {
      toast({
        title: "Access Denied",
        description: "Only hospitals can post requirements. Please login with a hospital account.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    // Check if we're in edit mode (requirement data passed via location state)
    if (location.state && location.state.requirement) {
      const req = location.state.requirement;
      setIsEditMode(true);
      setRequirementId(req.id);
      
      // Pre-populate form with existing data
      setFormData({
        patientName: req.patient_name || "",
        age: req.age?.toString() || "",
        bloodGroup: req.blood_group || "",
        organRequired: req.organ_required || "",
        urgencyLevel: req.urgency_level || "",
        hospitalName: req.hospital_name || "",
        doctorName: req.doctor_name || "",
        contactNumber: req.contact_number || "",
        email: req.email || "",
        medicalHistory: req.medical_history || "",
      });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please login to post requirements.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = {
        patient_name: formData.patientName,
        age: parseInt(formData.age),
        blood_group: formData.bloodGroup,
        organ_required: formData.organRequired,
        urgency_level: formData.urgencyLevel,
        hospital_name: formData.hospitalName,
        doctor_name: formData.doctorName,
        contact_number: formData.contactNumber,
        email: formData.email,
        medical_history: formData.medicalHistory
      };

      // Use PUT for edit mode, POST for create mode
      const url = isEditMode 
        ? `${API_URL}/api/hospital-requirements/${requirementId}` 
        : `${API_URL}/api/hospital-requirements`;
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        toast({
          title: isEditMode ? "Requirement Updated Successfully" : "Requirement Posted Successfully",
          description: isEditMode 
            ? "Your organ requirement has been updated successfully." 
            : "Your organ requirement has been submitted. You can view it in your dashboard.",
        });
        
        // Navigate to dashboard after a brief delay
        setTimeout(() => {
          navigate("/hospital-dashboard");
        }, 1500);
      } else {
        const error = await response.json();
        throw new Error(error.detail || `Failed to ${isEditMode ? 'update' : 'post'} requirement`);
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'post'} requirement:`, error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'post'} requirement. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <OrganDonationChatbot />

      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-secondary rounded-full mb-4">
              <Activity className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              {isEditMode ? "Edit Organ" : "Post Organ"} <span className="bg-gradient-hero bg-clip-text text-transparent">Requirement</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              {isEditMode 
                ? "Update patient details for organ matching" 
                : "Submit patient details for real-time AI-powered organ matching"}
            </p>
          </div>

          {/* Alert Notice */}
          <Card className="p-4 mb-8 border-accent bg-accent/5">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-foreground mb-1">For Medical Professionals & Authorized Personnel Only</p>
                <p className="text-muted-foreground">
                  This portal is restricted to registered hospitals and authorized medical staff. All submissions are verified and logged.
                </p>
              </div>
            </div>
          </Card>

          {/* Form */}
          <Card className="p-8 shadow-strong">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">1</span>
                  Patient Information
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patientName">Patient Name *</Label>
                    <Input
                      id="patientName"
                      required
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      placeholder="Full name of patient"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      required
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Patient age"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bloodGroup">Blood Group *</Label>
                    <select
                      id="bloodGroup"
                      required
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
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
                  <div>
                    <Label htmlFor="organRequired">Organ Required *</Label>
                    <select
                      id="organRequired"
                      required
                      value={formData.organRequired}
                      onChange={(e) => setFormData({ ...formData, organRequired: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Select organ</option>
                      <option value="Heart">Heart</option>
                      <option value="Lungs">Lungs</option>
                      <option value="Liver">Liver</option>
                      <option value="Kidney">Kidney</option>
                      <option value="Pancreas">Pancreas</option>
                      <option value="Intestines">Intestines</option>
                      <option value="Corneas">Corneas</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Urgency Level */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center text-sm font-bold text-secondary">2</span>
                  Urgency Level
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { value: "critical", label: "Critical", color: "destructive" },
                    { value: "high", label: "High Priority", color: "accent" },
                    { value: "medium", label: "Medium Priority", color: "secondary" },
                  ].map((level) => (
                    <div
                      key={level.value}
                      onClick={() => setFormData({ ...formData, urgencyLevel: level.value })}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-smooth ${
                        formData.urgencyLevel === level.value
                          ? `border-${level.color} bg-${level.color}/10`
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold text-center text-sm sm:text-base">{level.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hospital Details */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-sm font-bold text-accent">3</span>
                  Hospital & Contact Details
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hospitalName">Hospital Name *</Label>
                    <Input
                      id="hospitalName"
                      required
                      value={formData.hospitalName}
                      onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                      placeholder="Name of hospital"
                    />
                  </div>
                  <div>
                    <Label htmlFor="doctorName">Doctor In-Charge *</Label>
                    <Input
                      id="doctorName"
                      required
                      value={formData.doctorName}
                      onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                      placeholder="Doctor's name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      type="tel"
                      required
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
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
                      placeholder="hospital.email@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">4</span>
                  Medical History & Notes
                </h2>
                <div>
                  <Label htmlFor="medicalHistory">Relevant Medical Information *</Label>
                  <Textarea
                    id="medicalHistory"
                    required
                    value={formData.medicalHistory}
                    onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                    placeholder="Include relevant medical conditions, previous surgeries, medications, and any other important health information..."
                    className="min-h-32"
                  />
                </div>
              </div>

              {/* Security Notice */}
              <Card className="p-4 bg-muted/50 flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Data Security & Privacy</p>
                  <p className="text-muted-foreground">
                    All patient information is encrypted and stored securely in compliance with healthcare data
                    protection regulations. Access is restricted to authorized medical personnel only.
                  </p>
                </div>
              </Card>

              {/* Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-secondary text-secondary-foreground shadow-medium hover:shadow-glow"
                  data-testid="submit-requirement-button"
                >
                  {isSubmitting 
                    ? (isEditMode ? "Updating..." : "Submitting...") 
                    : (isEditMode ? "Update Requirement" : "Submit Requirement & Start Matching")}
                  <Activity className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  By submitting, you confirm that you are authorized to post this information and that all details are accurate.
                </p>
              </div>
            </form>
          </Card>

          {/* Info Cards */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">Instant</div>
              <p className="text-sm text-muted-foreground">AI matching starts immediately</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary mb-1">Pan-India</div>
              <p className="text-sm text-muted-foreground">Search across all databases</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1">24/7</div>
              <p className="text-sm text-muted-foreground">Continuous monitoring</p>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RecipientPortal;
