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
  Trash2,
  Heart,
  Droplet,
  ArrowLeft,
  Star,
  Calendar,
  FileText
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

interface Shortlist {
  id: string;
  hospital_id: string;
  donor_id: string;
  donor_name: string;
  donor_email: string;
  blood_group: string;
  organs: string[];
  notes?: string;
  added_at: string;
}

const HospitalShortlist = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shortlist, setShortlist] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [contactingDonor, setContactingDonor] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "hospital") {
      navigate("/");
      return;
    }
    fetchShortlist();
  }, [user, navigate]);

  const fetchShortlist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/shortlist/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setShortlist(data);
      }
    } catch (error) {
      console.error('Failed to fetch shortlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removeId) return;

    try {
      const response = await fetch(`${API_URL}/api/shortlist/${removeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShortlist(shortlist.filter(s => s.donor_id !== removeId));
        setRemoveId(null);
        toast({
          title: "Removed from Shortlist",
          description: "The donor has been removed from your shortlist.",
        });
      } else {
        throw new Error('Failed to remove');
      }
    } catch (error) {
      toast({
        title: "Remove Failed",
        description: "Failed to remove donor from shortlist. Please try again.",
        variant: "destructive",
      });
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
          notes: `Contacted via ${method} from shortlist`
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading shortlist...</div>
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
                  <Star className="h-10 w-10 text-yellow-500" />
                  Shortlisted <span className="bg-gradient-hero bg-clip-text text-transparent">Donors</span>
                </h1>
                <p className="text-muted-foreground">
                  Manage your shortlisted donors and contact them directly
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <Card className="p-6 mb-8 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shortlisted Donors</p>
                <p className="text-3xl font-bold text-yellow-700">{shortlist.length}</p>
              </div>
            </div>
          </Card>

          {/* Shortlist */}
          {shortlist.length === 0 ? (
            <Card className="p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Shortlisted Donors</h3>
              <p className="text-muted-foreground mb-6">
                Start by viewing available donors and shortlisting potential matches.
              </p>
              <Button
                onClick={() => navigate("/donor-list")}
                className="bg-gradient-primary"
                data-testid="view-donors-button"
              >
                View Available Donors
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6">
              {shortlist.map((item, index) => (
                <Card 
                  key={item.id} 
                  className="p-6 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                  data-testid={`shortlist-card-${index}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{item.donor_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-red-50 border-red-200">
                            <Droplet className="h-3 w-3 mr-1 text-red-600" />
                            {item.blood_group}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 border-blue-200">
                            <Heart className="h-3 w-3 mr-1 text-blue-600" />
                            {item.organs.length} organs
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRemoveId(item.donor_id)}
                      data-testid={`remove-shortlist-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium text-sm truncate">{item.donor_email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Willing to Donate</p>
                        <p className="font-medium text-sm">{item.organs.join(", ")}</p>
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">Notes:</p>
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContact(item.donor_id, 'email')}
                      disabled={contactingDonor === item.donor_id}
                      data-testid={`contact-email-${index}`}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contact via Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContact(item.donor_id, 'phone')}
                      disabled={contactingDonor === item.donor_id}
                      data-testid={`contact-phone-${index}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Contact via Phone
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Added on: {new Date(item.added_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent data-testid="remove-shortlist-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Shortlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this donor from your shortlist? You can always add them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-remove"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default HospitalShortlist;
