import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OrganDonationChatbot from "@/components/OrganDonationChatbot";
import { Heart, Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || '';

const DonorRegistration = () => {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    bloodGroup: "",
    organs: [] as string[],
    city: "",
    state: "",
    country: "",
    donationType: "" as "living" | "deceased" | "",
    consent: false,
  });

  // All organs for deceased donation
  const allOrganOptions = [
    "Heart", 
    "Lungs", 
    "Liver", 
    "Kidneys", 
    "Pancreas", 
    "Intestines", 
    "Corneas", 
    "Skin", 
    "Bone", 
    "Heart Valves"
  ];

  // Living donor organs
  const livingDonorOrgans = [
    "Kidney",
    "Segment of the Liver"
  ];

  // Get available organs based on donation type
  const getAvailableOrgans = () => {
    if (formData.donationType === "living") {
      return livingDonorOrgans;
    } else if (formData.donationType === "deceased") {
      return allOrganOptions;
    }
    return [];
  };

  const organOptions = getAvailableOrgans();

  useEffect(() => {
    // Redirect to dashboard if donor already has an application
    if (user && user.role === "donor") {
      checkExistingApplication();
    }
  }, [user]);

  const checkExistingApplication = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/donations/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          // User already has an application, redirect to dashboard
          navigate("/donor-dashboard");
        }
      }
    } catch (error) {
      console.error('Failed to check existing application:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.donationType) {
      toast({
        title: "Donation Type Required",
        description: "Please select when you wish to donate.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.consent) {
      toast({
        title: "Consent Required",
        description: "Please provide your consent to proceed with registration.",
        variant: "destructive",
      });
      return;
    }

    if (formData.organs.length === 0) {
      toast({
        title: "Select Organs",
        description: "Please select at least one organ to donate.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is logged in as donor
    if (!user || user.role !== "donor") {
      toast({
        title: "Authentication Required",
        description: "Please login as a donor to register your donation application.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth,
          blood_group: formData.bloodGroup,
          organs: formData.organs,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          donation_type: formData.donationType,
          consent: formData.consent
        })
      });

      if (response.ok) {
        toast({
          title: "Registration Submitted",
          description: "Thank you for registering as an organ donor. Your information has been securely saved.",
        });
        // Redirect to dashboard
        navigate("/donor-dashboard");
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit application');
      }
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  const handleDonationTypeChange = (type: "living" | "deceased") => {
    setFormData(prev => ({
      ...prev,
      donationType: type,
      organs: [] // Clear previously selected organs when type changes
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <OrganDonationChatbot />

      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
              <Heart className="h-8 w-8 text-primary-foreground" fill="currentColor" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Become a <span className="bg-gradient-hero bg-clip-text text-transparent">Life Saver</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Register as an organ donor and give the gift of life
            </p>
          </div>

          {/* Security Notice */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">HIPAA Compliant</p>
                <p className="text-xs text-muted-foreground">Medical data protected</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Encrypted</p>
                <p className="text-xs text-muted-foreground">Bank-grade security</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Confidential</p>
                <p className="text-xs text-muted-foreground">Privacy guaranteed</p>
              </div>
            </Card>
          </div>

          {/* Registration Form */}
          <Card className="p-8 shadow-strong">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Donation Type Selection */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">1</span>
                  When Would You Like to Donate? *
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose when you wish to donate your organs
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <label
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.donationType === "living"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid="donation-type-living"
                  >
                    <input
                      type="radio"
                      name="donationType"
                      value="living"
                      checked={formData.donationType === "living"}
                      onChange={() => handleDonationTypeChange("living")}
                      className="sr-only"
                    />
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        formData.donationType === "living" ? "border-primary" : "border-gray-300"
                      }`}>
                        {formData.donationType === "living" && (
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1">While I'm Alive (Living Donor)</p>
                        <p className="text-sm text-muted-foreground">
                          Donate a kidney or segment of your liver while you're alive. This is a life-saving gift that allows you to see the immediate impact of your donation.
                        </p>
                        <p className="text-xs text-primary mt-2">
                          Available organs: Kidney, Segment of the Liver
                        </p>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.donationType === "deceased"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid="donation-type-deceased"
                  >
                    <input
                      type="radio"
                      name="donationType"
                      value="deceased"
                      checked={formData.donationType === "deceased"}
                      onChange={() => handleDonationTypeChange("deceased")}
                      className="sr-only"
                    />
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        formData.donationType === "deceased" ? "border-primary" : "border-gray-300"
                      }`}>
                        {formData.donationType === "deceased" && (
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1">After My Death (Deceased Donor)</p>
                        <p className="text-sm text-muted-foreground">
                          Donate multiple organs and tissues after death. One deceased donor can save up to 8 lives and enhance many more through tissue donation.
                        </p>
                        <p className="text-xs text-primary mt-2">
                          Available organs: All organs and tissues
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">2</span>
                  Personal Information
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter your full name"
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
                      placeholder="your.email@example.com"
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
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center text-sm font-bold text-secondary">3</span>
                  Medical Information
                </h2>
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
              </div>

              {/* Location Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center text-sm font-bold text-secondary">4</span>
                  Location Information
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Enter your city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Enter your state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Enter your country"
                    />
                  </div>
                </div>
              </div>

              {/* Organ Selection */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-sm font-bold text-accent">5</span>
                  Organs to Donate *
                </h2>
                {formData.donationType ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      {formData.donationType === "living" 
                        ? "Select organs available for living donation (multiple selection allowed)"
                        : "Select the organs you wish to donate (multiple selection allowed)"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {organOptions.map((organ) => (
                        <label
                          key={organ}
                          className={`p-3 border rounded-lg cursor-pointer transition-smooth ${
                            formData.organs.includes(organ)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          data-testid={`organ-${organ.toLowerCase().replace(/\s+/g, '-')}`}
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
                  </>
                ) : (
                  <div className="p-8 border-2 border-dashed rounded-lg text-center">
                    <p className="text-muted-foreground">
                      Please select a donation type above to view available organs
                    </p>
                  </div>
                )}
              </div>

              {/* Consent */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">6</span>
                  Consent & Agreement
                </h2>
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={formData.consent}
                      onCheckedChange={(checked) => setFormData({ ...formData, consent: checked as boolean })}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="consent" className="cursor-pointer">
                        {formData.donationType === "living" 
                          ? "I consent to organ donation while I'm alive *"
                          : formData.donationType === "deceased"
                          ? "I consent to organ donation after my death *"
                          : "I consent to organ donation *"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {formData.donationType === "living" ? (
                          <>
                            By checking this box, I voluntarily agree to donate organs while alive. I understand the medical procedures involved and that I will undergo thorough medical evaluation. I have read and understood the{" "}
                            <a href="#" className="text-primary hover:underline">
                              living donation process
                            </a>{" "}
                            and{" "}
                            <a href="#" className="text-primary hover:underline">
                              medical requirements
                            </a>
                            .
                          </>
                        ) : formData.donationType === "deceased" ? (
                          <>
                            By checking this box, I voluntarily agree to donate my organs after death. I understand that
                            this decision is legally binding and my family will be notified. I have read and understood the{" "}
                            <a href="#" className="text-primary hover:underline">
                              donation process
                            </a>{" "}
                            and{" "}
                            <a href="#" className="text-primary hover:underline">
                              legal framework
                            </a>
                            .
                          </>
                        ) : (
                          <>
                            By checking this box, I voluntarily agree to donate my organs. Please select a donation type above.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-medium hover:shadow-glow"
                  data-testid="complete-registration-button"
                >
                  {submitting ? "Submitting..." : "Complete Registration"}
                  <Heart className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Your information is encrypted and stored securely. We will never share your data without consent.
                </p>
              </div>
            </form>
          </Card>

          {/* Info Section */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">What Happens Next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Your profile enters our secure database
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Receive a donor card via email
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Family members notified of your decision
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Can update preferences anytime
                </li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Common Questions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-secondary">•</span>
                  Can I change my mind? Yes, anytime
                </li>
                <li className="flex gap-2">
                  <span className="text-secondary">•</span>
                  Age limit? 18-65 years for most donations
                </li>
                <li className="flex gap-2">
                  <span className="text-secondary">•</span>
                  Medical conditions? We'll assess eligibility
                </li>
                <li className="flex gap-2">
                  <span className="text-secondary">•</span>
                  Cost involved? Completely free
                </li>
                <li className="flex gap-2">
                  <span className="text-secondary">•</span>
                  Living vs Deceased? Choose what's right for you
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DonorRegistration;
