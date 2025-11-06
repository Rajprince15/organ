import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, 
  Filter,
  Search,
  Building2,
  RefreshCw
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

interface OrganBankEntry {
  id: string;
  hospital_id: string;
  hospital_name: string;
  organ_type: string;
  blood_type: string;
  quantity: number;
  status: "available" | "reserved" | "in_transit" | "allocated" | "expired";
  notes?: string;
  created_at: string;
  updated_at: string;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUS_OPTIONS = [
  { value: "available", label: "Available", color: "bg-green-100 text-green-800" },
  { value: "reserved", label: "Reserved", color: "bg-yellow-100 text-yellow-800" },
  { value: "in_transit", label: "In Transit", color: "bg-blue-100 text-blue-800" },
  { value: "allocated", label: "Allocated", color: "bg-purple-100 text-purple-800" },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-800" },
];

export default function OrganBankMarketplace() {
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<OrganBankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingHospitalsCount, setSharingHospitalsCount] = useState(0);
  
  const [filters, setFilters] = useState({
    organ_type: "",
    blood_type: "",
    status: "",
  });

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || user.role !== "hospital") {
      navigate("/");
      return;
    }
    fetchMarketplace();
  }, [user, navigate, isLoading]);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.organ_type) params.append("organ_type", filters.organ_type);
      if (filters.blood_type) params.append("blood_type", filters.blood_type);
      if (filters.status) params.append("status", filters.status);
      
      const response = await fetch(`${API_URL}/api/organ-bank/marketplace?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setSharingHospitalsCount(data.sharing_hospitals_count);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch marketplace data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ organ_type: "", blood_type: "", status: "" });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return statusConfig ? (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    ) : null;
  };

  // Group by hospital
  const entriesByHospital = entries.reduce((acc, entry) => {
    if (!acc[entry.hospital_name]) {
      acc[entry.hospital_name] = [];
    }
    acc[entry.hospital_name].push(entry);
    return acc;
  }, {} as Record<string, OrganBankEntry[]>);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading marketplace...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                  <Store className="h-10 w-10 text-blue-600" />
                  Organ Bank Marketplace
                </h1>
                <p className="text-muted-foreground">
                  Browse organ availability from {sharingHospitalsCount} hospitals in the network
                </p>
              </div>
              <Button onClick={() => navigate("/organ-bank-management")} variant="outline">
                Back to My Bank
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{sharingHospitalsCount}</div>
                <p className="text-sm text-muted-foreground">Sharing Hospitals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-600">{entries.length}</div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {entries.filter(e => e.status === "available").reduce((sum, e) => sum + e.quantity, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Available Organs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {entries.filter(e => e.status === "reserved").reduce((sum, e) => sum + e.quantity, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Reserved Organs</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold">Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="organ_type_filter">Organ Type</Label>
                  <Input
                    id="organ_type_filter"
                    placeholder="Search organ type..."
                    value={filters.organ_type}
                    onChange={(e) => handleFilterChange("organ_type", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="blood_type_filter">Blood Type</Label>
                  <Select
                    value={filters.blood_type}
                    onValueChange={(value) => handleFilterChange("blood_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All blood types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All blood types</SelectItem>
                      {BLOOD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="status_filter">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => handleFilterChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button onClick={fetchMarketplace} className="flex-1">
                    <Search className="h-4 w-4 mr-2" />
                    Apply
                  </Button>
                  <Button onClick={handleClearFilters} variant="outline">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketplace Entries by Hospital */}
          {Object.keys(entriesByHospital).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Hospitals Sharing Yet
                </h3>
                <p className="text-muted-foreground">
                  There are currently no hospitals sharing their organ banks in the network.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(entriesByHospital).map(([hospitalName, hospitalEntries]) => (
                <Card key={hospitalName}>
                  <CardContent className="p-0">
                    <div className="bg-blue-50 px-6 py-4 border-b">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-800">{hospitalName}</h3>
                        <span className="ml-auto text-sm text-gray-600">
                          {hospitalEntries.length} {hospitalEntries.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-bold">Organ Type</TableHead>
                            <TableHead className="font-bold">Blood Type</TableHead>
                            <TableHead className="font-bold">Quantity</TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                            <TableHead className="font-bold">Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hospitalEntries.map((entry) => (
                            <TableRow key={entry.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{entry.organ_type}</TableCell>
                              <TableCell>
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                                  {entry.blood_type}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-lg">{entry.quantity}</span>
                              </TableCell>
                              <TableCell>{getStatusBadge(entry.status)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(entry.updated_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
