import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Heart, 
  Mail, 
  Phone, 
  Calendar, 
  Droplet,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Users
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
  consent: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  applications: DonationApplication[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const organOptions = [
  "All Organs",
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

const DonorListPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [donors, setDonors] = useState<DonationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgan, setSelectedOrgan] = useState<string>("All Organs");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 6;

  useEffect(() => {
    if (!user || user.role !== "hospital") {
      navigate("/");
      return;
    }
    fetchDonors();
  }, [user, navigate, selectedOrgan, currentPage]);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const organParam = selectedOrgan !== "All Organs" ? `&organ=${encodeURIComponent(selectedOrgan)}` : '';
      const response = await fetch(
        `${API_URL}/api/donations/all?page=${currentPage}&limit=${limit}${organParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setDonors(data.applications);
        setTotalPages(data.total_pages);
        setTotal(data.total);
      } else {
        throw new Error('Failed to fetch donors');
      }
    } catch (error) {
      console.error('Failed to fetch donors:', error);
      toast({
        title: "Error",
        description: "Failed to load donor applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrganFilter = (organ: string) => {
    setSelectedOrgan(organ);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const filteredDonors = donors.filter(donor => 
    donor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.blood_group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading && donors.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading donor applications...</div>
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
                  Available <span className="bg-gradient-hero bg-clip-text text-transparent">Donors</span>
                </h1>
                <p className="text-muted-foreground">
                  Browse approved donor applications and find matches
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/hospital-dashboard")}
                data-testid="back-to-dashboard-button"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Stats Banner */}
          <Card className="p-6 mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Approved Donors</p>
                  <p className="text-3xl font-bold text-primary">{total}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Showing</p>
                <p className="text-lg font-semibold">
                  {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, total)} of {total}
                </p>
              </div>
            </div>
          </Card>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, or blood group..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
                data-testid="donor-search-input"
              />
            </div>

            {/* Organ Filters */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Filter by Organ</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {organOptions.map((organ) => (
                  <Button
                    key={organ}
                    variant={selectedOrgan === organ ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleOrganFilter(organ)}
                    className={`transition-all duration-300 ${
                      selectedOrgan === organ 
                        ? "bg-gradient-primary shadow-md" 
                        : "hover:border-primary/50"
                    }`}
                    data-testid={`filter-${organ.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {organ}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Donors Grid */}
          {filteredDonors.length === 0 ? (
            <Card className="p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Donors Found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "No donors match your search criteria. Try different keywords."
                  : selectedOrgan !== "All Organs"
                  ? `No approved donors found for ${selectedOrgan}. Try selecting a different organ.`
                  : "No approved donor applications available at the moment."}
              </p>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredDonors.map((donor, index) => (
                  <Card 
                    key={donor.id}
                    className="p-6 hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 border-l-4 border-l-primary"
                    style={{ animationDelay: `${400 + index * 50}ms` }}
                    data-testid={`donor-card-${index}`}
                  >
                    {/* Donor Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {donor.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{donor.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {calculateAge(donor.date_of_birth)} years
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                        Approved
                      </div>
                    </div>

                    {/* Donor Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Droplet className="h-4 w-4 text-primary" />
                        <span className="font-medium">Blood Group:</span>
                        <span className="font-bold text-primary">{donor.blood_group}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium break-all">{donor.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{donor.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">DOB:</span>
                        <span className="font-medium">{new Date(donor.date_of_birth).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Organs Available */}
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">
                        <Heart className="h-4 w-4 inline mr-1" />
                        Organs Available:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {donor.organs.map((organ) => (
                          <span
                            key={organ}
                            className="px-2 py-1 bg-primary/10 border border-primary/30 rounded text-xs font-medium"
                          >
                            {organ}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Registration Date */}
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      Registered: {new Date(donor.created_at).toLocaleDateString()}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    data-testid="prev-page-button"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || loading}
                    data-testid="next-page-button"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DonorListPage;
