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
  Users,
  X,
  Download,
  Star,
  MessageSquare,
  CheckCircle,
  MapPin,
  SlidersHorizontal,
  GitCompare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface PaginatedResponse {
  applications: DonationApplication[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const organOptions = [
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

const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EnhancedDonorListPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Data states
  const [donors, setDonors] = useState<DonationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 9;
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgans, setSelectedOrgans] = useState<string[]>([]);
  const [selectedBloodGroups, setSelectedBloodGroups] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Comparison states
  const [comparisonDonors, setComparisonDonors] = useState<DonationApplication[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Shortlist and contact states
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== "hospital") {
      navigate("/");
      return;
    }
    fetchShortlist();
    fetchContactHistory();
  }, [user, navigate]);

  useEffect(() => {
    fetchDonors();
  }, [currentPage, selectedOrgans, selectedBloodGroups, ageMin, ageMax, selectedState]);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      
      if (selectedOrgans.length > 0) {
        params.append('organs', selectedOrgans.join(','));
      }
      if (selectedBloodGroups.length > 0) {
        params.append('blood_groups', selectedBloodGroups.join(','));
      }
      if (ageMin) {
        params.append('age_min', ageMin);
      }
      if (ageMax) {
        params.append('age_max', ageMax);
      }
      if (selectedState) {
        params.append('state', selectedState);
      }

      const response = await fetch(
        `${API_URL}/api/donations/all?${params.toString()}`,
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

  const fetchShortlist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/shortlist/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const ids = new Set(data.map((item: any) => item.donor_id));
        setShortlistedIds(ids);
      }
    } catch (error) {
      console.error('Failed to fetch shortlist:', error);
    }
  };

  const fetchContactHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const ids = new Set(data.map((item: any) => item.donor_id));
        setContactedIds(ids);
      }
    } catch (error) {
      console.error('Failed to fetch contact history:', error);
    }
  };

  const handleAddToShortlist = async (donor: DonationApplication) => {
    try {
      const response = await fetch(`${API_URL}/api/shortlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          donor_id: donor.donor_id,
          notes: `Added from donor search on ${new Date().toLocaleDateString()}`
        })
      });

      if (response.ok) {
        setShortlistedIds(prev => new Set(prev).add(donor.donor_id));
        toast({
          title: "Added to Shortlist",
          description: `${donor.full_name} has been added to your shortlist.`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add to shortlist');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add to shortlist.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromShortlist = async (donor: DonationApplication) => {
    try {
      const response = await fetch(`${API_URL}/api/shortlist/${donor.donor_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShortlistedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(donor.donor_id);
          return newSet;
        });
        toast({
          title: "Removed from Shortlist",
          description: `${donor.full_name} has been removed from your shortlist.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from shortlist.",
        variant: "destructive",
      });
    }
  };

  const handleContactDonor = async (donor: DonationApplication) => {
    try {
      const response = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          donor_id: donor.donor_id,
          contact_method: 'email',
          notes: `Contacted via donor search on ${new Date().toLocaleString()}`
        })
      });

      if (response.ok) {
        setContactedIds(prev => new Set(prev).add(donor.donor_id));
        toast({
          title: "Contact Recorded",
          description: `Contact with ${donor.full_name} has been logged.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record contact.",
        variant: "destructive",
      });
    }
  };

  const handleExportDonors = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv'
      });
      
      if (selectedOrgans.length > 0) {
        params.append('organs', selectedOrgans.join(','));
      }
      if (selectedBloodGroups.length > 0) {
        params.append('blood_groups', selectedBloodGroups.join(','));
      }
      if (ageMin) {
        params.append('age_min', ageMin);
      }
      if (ageMax) {
        params.append('age_max', ageMax);
      }
      if (selectedState) {
        params.append('state', selectedState);
      }

      const response = await fetch(
        `${API_URL}/api/donations/export?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `donors_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: "Donor list has been downloaded.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export donor list.",
        variant: "destructive",
      });
    }
  };

  const toggleOrganFilter = (organ: string) => {
    setSelectedOrgans(prev => 
      prev.includes(organ) 
        ? prev.filter(o => o !== organ)
        : [...prev, organ]
    );
    setCurrentPage(1);
  };

  const toggleBloodGroupFilter = (bloodGroup: string) => {
    setSelectedBloodGroups(prev => 
      prev.includes(bloodGroup) 
        ? prev.filter(bg => bg !== bloodGroup)
        : [...prev, bloodGroup]
    );
    setCurrentPage(1);
  };

  const handleAddToComparison = (donor: DonationApplication) => {
    if (comparisonDonors.length >= 3) {
      toast({
        title: "Comparison Limit",
        description: "You can compare up to 3 donors at a time.",
        variant: "destructive",
      });
      return;
    }
    
    if (comparisonDonors.find(d => d.donor_id === donor.donor_id)) {
      toast({
        title: "Already Added",
        description: "This donor is already in comparison.",
        variant: "destructive",
      });
      return;
    }
    
    setComparisonDonors(prev => [...prev, donor]);
    setShowComparison(true);
    toast({
      title: "Added to Comparison",
      description: `${donor.full_name} added to comparison.`,
    });
  };

  const handleRemoveFromComparison = (donorId: string) => {
    setComparisonDonors(prev => prev.filter(d => d.donor_id !== donorId));
    if (comparisonDonors.length <= 1) {
      setShowComparison(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedOrgans([]);
    setSelectedBloodGroups([]);
    setAgeMin("");
    setAgeMax("");
    setSelectedState("");
    setSearchTerm("");
    setCurrentPage(1);
  };

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

  const filteredDonors = donors.filter(donor => 
    searchTerm === "" || 
    donor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (donor.city && donor.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (donor.state && donor.state.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeFiltersCount = selectedOrgans.length + selectedBloodGroups.length + 
    (ageMin ? 1 : 0) + (ageMax ? 1 : 0) + (selectedState ? 1 : 0);

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
                  Find <span className="bg-gradient-hero bg-clip-text text-transparent">Donors</span>
                </h1>
                <p className="text-muted-foreground">
                  Advanced search and management for organ donor applications
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportDonors}
                  data-testid="export-donors-button"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/hospital-dashboard")}
                  data-testid="back-to-dashboard-button"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>
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
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Shortlisted</p>
                  <p className="text-lg font-semibold">{shortlistedIds.size}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contacted</p>
                  <p className="text-lg font-semibold">{contactedIds.size}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Showing</p>
                  <p className="text-lg font-semibold">
                    {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, total)} of {total}
                  </p>
                </div>
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
                placeholder="Search by name, email, blood group, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
                data-testid="donor-search-input"
              />
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Advanced Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
              
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-muted-foreground"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            {/* Advanced Filters Section */}
            {showAdvancedFilters && (
              <Card className="p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Organs Multi-Select */}
                <div>
                  <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Select Organs (Multiple)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {organOptions.map((organ) => (
                      <Button
                        key={organ}
                        variant={selectedOrgans.includes(organ) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleOrganFilter(organ)}
                        className={selectedOrgans.includes(organ) ? "bg-gradient-primary" : ""}
                      >
                        {organ}
                        {selectedOrgans.includes(organ) && <X className="ml-1 h-3 w-3" />}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Blood Groups Multi-Select */}
                <div>
                  <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-primary" />
                    Select Blood Groups (Multiple)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {bloodGroupOptions.map((bg) => (
                      <Button
                        key={bg}
                        variant={selectedBloodGroups.includes(bg) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBloodGroupFilter(bg)}
                        className={selectedBloodGroups.includes(bg) ? "bg-gradient-primary" : ""}
                      >
                        {bg}
                        {selectedBloodGroups.includes(bg) && <X className="ml-1 h-3 w-3" />}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Age Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age-min">Minimum Age</Label>
                    <Input
                      id="age-min"
                      type="number"
                      placeholder="e.g., 18"
                      value={ageMin}
                      onChange={(e) => {
                        setAgeMin(e.target.value);
                        setCurrentPage(1);
                      }}
                      min="18"
                      max="99"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age-max">Maximum Age</Label>
                    <Input
                      id="age-max"
                      type="number"
                      placeholder="e.g., 65"
                      value={ageMax}
                      onChange={(e) => {
                        setAgeMax(e.target.value);
                        setCurrentPage(1);
                      }}
                      min="18"
                      max="99"
                    />
                  </div>
                </div>

                {/* State Filter */}
                <div>
                  <Label htmlFor="state-filter" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Filter by State
                  </Label>
                  <Input
                    id="state-filter"
                    type="text"
                    placeholder="e.g., California, Texas"
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* Donors Grid */}
          {filteredDonors.length === 0 ? (
            <Card className="p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Donors Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || activeFiltersCount > 0
                  ? "No donors match your search criteria. Try adjusting your filters."
                  : "No approved donor applications available at the moment."}
              </p>
              {activeFiltersCount > 0 && (
                <Button onClick={clearAllFilters} variant="outline">
                  Clear All Filters
                </Button>
              )}
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredDonors.map((donor, index) => (
                  <Card 
                    key={donor.id}
                    className="p-6 hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 border-l-4 border-l-primary relative"
                    style={{ animationDelay: `${400 + index * 50}ms` }}
                    data-testid={`donor-card-${index}`}
                  >
                    {/* Status Badges */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {shortlistedIds.has(donor.donor_id) && (
                        <div className="p-1 bg-yellow-100 rounded-full" title="Shortlisted">
                          <Star className="h-3 w-3 text-yellow-600 fill-yellow-600" />
                        </div>
                      )}
                      {contactedIds.has(donor.donor_id) && (
                        <div className="p-1 bg-green-100 rounded-full" title="Contacted">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        </div>
                      )}
                    </div>

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
                    </div>

                    {/* Donor Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Droplet className="h-4 w-4 text-primary" />
                        <span className="font-bold text-primary">{donor.blood_group}</span>
                      </div>
                      {donor.city && donor.state && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{donor.city}, {donor.state}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{donor.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{donor.phone}</span>
                      </div>
                    </div>

                    {/* Organs Available */}
                    <div className="border-t pt-3 mb-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Organs Available:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {donor.organs.map((organ) => (
                          <span
                            key={organ}
                            className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded text-xs"
                          >
                            {organ}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleContactDonor(donor)}
                        disabled={contactedIds.has(donor.donor_id)}
                        className="text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {contactedIds.has(donor.donor_id) ? "Contacted" : "Contact"}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => 
                          shortlistedIds.has(donor.donor_id) 
                            ? handleRemoveFromShortlist(donor)
                            : handleAddToShortlist(donor)
                        }
                        className="text-xs"
                      >
                        <Star className={`h-3 w-3 mr-1 ${shortlistedIds.has(donor.donor_id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        {shortlistedIds.has(donor.donor_id) ? "Shortlisted" : "Shortlist"}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToComparison(donor)}
                        className="col-span-2 text-xs"
                        disabled={comparisonDonors.length >= 3}
                      >
                        <GitCompare className="h-3 w-3 mr-1" />
                        Add to Compare
                      </Button>
                    </div>

                    {/* Registration Date */}
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
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
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    data-testid="prev-page-button"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* Comparison Sticky Bar */}
      {showComparison && comparisonDonors.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-2xl z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Comparing Donors ({comparisonDonors.length}/3)</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowComparison(false);
                  setComparisonDonors([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparisonDonors.map((donor) => (
                <Card key={donor.donor_id} className="p-4 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => handleRemoveFromComparison(donor.donor_id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="font-bold">{donor.full_name}</p>
                      <p className="text-sm text-muted-foreground">{calculateAge(donor.date_of_birth)} years</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Droplet className="h-3 w-3" />
                      <span className="font-semibold">{donor.blood_group}</span>
                    </div>
                    
                    {donor.city && donor.state && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3" />
                        <span>{donor.city}, {donor.state}</span>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Organs:</p>
                      <div className="flex flex-wrap gap-1">
                        {donor.organs.map((organ) => (
                          <span key={organ} className="px-1.5 py-0.5 bg-primary/10 rounded text-xs">
                            {organ}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Registered: {new Date(donor.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default EnhancedDonorListPage;
