import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Mail, 
  Phone, 
  Heart,
  Droplet,
  ArrowLeft,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  status: string;
  created_at: string;
  updated_at: string;
}

interface MatchingRequirement {
  requirement_id: string;
  patient_name: string;
  organ_required: string;
  blood_group: string;
  urgency_level: string;
  match_score: number;
  score_breakdown: any;
}

interface CompatibleDonor {
  donor: DonationApplication;
  match_score: number;
  matching_requirements: MatchingRequirement[];
}

const HospitalCompatibleDonors = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [compatibleDonors, setCompatibleDonors] = useState<CompatibleDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactingDonor, setContactingDonor] = useState<string | null>(null);
  const [shortlistingDonor, setShortlistingDonor] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "hospital") {
      navigate("/");
      return;
    }
    fetchCompatibleDonors();
  }, [user, navigate]);

  const fetchCompatibleDonors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/matches/donors/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompatibleDonors(data.matches || []);
      }
    } catch (error) {
      console.error('Failed to fetch compatible donors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (donorId: string, method: string) => {
    setContactingDonor(donorId);
    
    try {
      const response = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          donor_id: donorId,
          contact_method: method,
          notes: `Contacted via ${method} from compatible donors list`
        })
      });

      if (response.ok) {
        toast({
          title: "Contact Recorded",
          description: `Your contact via ${method} has been recorded successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Contact Failed",
        description: "Failed to record contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setContactingDonor(null);
    }
  };

  const handleShortlist = async (donorId: string) => {
    setShortlistingDonor(donorId);
    
    try {
      const response = await fetch(`${API_URL}/api/shortlist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          donor_id: donorId,
          notes: 'Added from compatible donors list'
        })
      });

      if (response.ok) {
        toast({
          title: "Added to Shortlist",
          description: "The donor has been added to your shortlist successfully.",
        });
      } else {
        const error = await response.json();
        if (error.detail?.includes("already in shortlist")) {
          toast({
            title: "Already Shortlisted",
            description: "This donor is already in your shortlist.",
            variant: "default",
          });
        } else {
          throw new Error('Failed to shortlist');
        }
      }
    } catch (error) {
      toast({
        title: "Shortlist Failed",
        description: "Failed to add donor to shortlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShortlistingDonor(null);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading compatible donors...</div>
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
            <Button
              variant="ghost"
              onClick={() => navigate("/hospital-dashboard")}
              className="mb-4"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                  <TrendingUp className="h-10 w-10 text-primary" />
                  Compatible <span className="bg-gradient-hero bg-clip-text text-transparent">Donors</span>
                </h1>
                <p className="text-muted-foreground">
                  View all compatible donors matched across your active requirements
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <Card className="p-6 mb-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Compatible Donors Found</p>
                <p className="text-3xl font-bold text-primary">{compatibleDonors.length}</p>
              </div>
            </div>
          </Card>

          {/* Compatible Donors List */}
          {compatibleDonors.length === 0 ? (
            <Card className="p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Compatible Donors Found</h3>
              <p className="text-muted-foreground mb-6">
                Compatible donors will appear here when they match your active requirements.
              </p>
              <Button
                onClick={() => navigate("/recipient-portal")}
                className="bg-gradient-primary"
                data-testid="post-requirement-button"
              >
                Post a Requirement
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6">
              {compatibleDonors.map((item, index) => (
                <Card 
                  key={item.donor.id} 
                  className="p-6 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                  data-testid={`compatible-donor-card-${index}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                        <Heart className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{item.donor.full_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-red-50 border-red-200">
                            <Droplet className="h-3 w-3 mr-1 text-red-600" />
                            {item.donor.blood_group}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 border-blue-200">
                            <Heart className="h-3 w-3 mr-1 text-blue-600" />
                            {item.donor.organs.length} organs
                          </Badge>
                          <Badge className={`border ${getMatchScoreColor(item.match_score)}`}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {item.match_score}% Match
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium text-sm truncate">{item.donor.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium text-sm">{item.donor.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Willing to Donate</p>
                        <p className="font-medium text-sm">{item.donor.organs.join(", ")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Matching Requirements */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Matches {item.matching_requirements.length} of your requirements:
                    </p>
                    <div className="space-y-2">
                      {item.matching_requirements.map((req, reqIndex) => (
                        <div key={reqIndex} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{req.patient_name} - {req.organ_required}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold uppercase ${getUrgencyColor(req.urgency_level)}`}>
                              {req.urgency_level}
                            </span>
                            <Badge variant="outline" className={getMatchScoreColor(req.match_score)}>
                              {req.match_score}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContact(item.donor.donor_id, 'email')}
                      disabled={contactingDonor === item.donor.donor_id}
                      data-testid={`contact-email-${index}`}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contact via Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContact(item.donor.donor_id, 'phone')}
                      disabled={contactingDonor === item.donor.donor_id}
                      data-testid={`contact-phone-${index}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Contact via Phone
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleShortlist(item.donor.donor_id)}
                      disabled={shortlistingDonor === item.donor.donor_id}
                      className="bg-gradient-secondary"
                      data-testid={`shortlist-${index}`}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Add to Shortlist
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HospitalCompatibleDonors;
