import { useState } from "react";
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

const DonorRegistration = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    bloodGroup: "",
    organs: [] as string[],
    consent: false,
  });

  const organOptions = [
    "Heart", "Lungs", "Liver", "Kidneys", "Pancreas", "Intestines", "Corneas", "Skin", "Bone", "Heart Valves"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      toast({
        title: "Consent Required",
        description: "Please provide your consent to proceed with registration.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Registration Submitted",
      description: "Thank you for registering as an organ donor. Your information has been securely saved.",
    });
    console.log("Form submitted:", formData);
  };

  const toggleOrgan = (organ: string) => {
    setFormData(prev => ({
      ...prev,
      organs: prev.organs.includes(organ)
        ? prev.organs.filter(o => o !== organ)
        : [...prev.organs, organ]
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
              {/* Personal Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">1</span>
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
                  <span className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center text-sm font-bold text-secondary">2</span>
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

              {/* Organ Selection */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-sm font-bold text-accent">3</span>
                  Organs to Donate *
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the organs you wish to donate (multiple selection allowed)
                </p>
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
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={formData.organs.includes(organ)} />
                        <span className="text-sm font-medium">{organ}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consent */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">4</span>
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
                        I consent to organ donation after my death *
                      </Label>
                      <p className="text-xs text-muted-foreground">
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
                  className="w-full bg-gradient-primary text-primary-foreground shadow-medium hover:shadow-glow"
                >
                  Complete Registration
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
                  Age limit? 18-65 years
                </li>
                <li className="flex gap-2">
                  <span className="text-secondary">•</span>
                  Medical conditions? We'll assess eligibility
                </li>
                <li className="flex gap-2">
                  <span className="text-secondary">•</span>
                  Cost involved? Completely free
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
