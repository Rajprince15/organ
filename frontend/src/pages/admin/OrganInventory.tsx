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
  Package, 
  Filter,
  Download,
  Search,
  RefreshCw,
  TrendingUp,
  Building2,
  ArrowLeft
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

interface Stats {
  total_organs: number;
  total_entries: number;
  organs_by_type: Record<string, number>;
  organs_by_blood_group: Record<string, number>;
  organs_by_status: Record<string, number>;
  sharing_hospitals_count: number;
  total_hospitals: number;
  sharing_percentage: number;
}

interface Hospital {
  id: string;
  name: string;
  email: string;
  is_sharing: boolean;
  organ_entries_count: number;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUS_OPTIONS = [
  { value: "available", label: "Available", color: "bg-green-100 text-green-800" },
  { value: "reserved", label: "Reserved", color: "bg-yellow-100 text-yellow-800" },
  { value: "in_transit", label: "In Transit", color: "bg-blue-100 text-blue-800" },
  { value: "allocated", label: "Allocated", color: "bg-purple-100 text-purple-800" },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-800" },
];

export default function OrganInventory() {
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<OrganBankEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  const [filters, setFilters] = useState({
    organ_type: "",
    hospital_id: "",
    blood_type: "",
    status: "",
  });

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchStats();
    fetchHospitals();
    fetchInventory();
  }, [user, navigate, isLoading]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/organ-inventory/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchHospitals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/organ-inventory/hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHospitals(data.hospitals);
      }
    } catch (error) {
      console.error("Failed to fetch hospitals:", error);
    }
  };

  const fetchInventory = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.organ_type) params.append("organ_type", filters.organ_type);
      if (filters.hospital_id) params.append("hospital_id", filters.hospital_id);
      if (filters.blood_type) params.append("blood_type", filters.blood_type);
      if (filters.status) params.append("status", filters.status);
      params.append("page", page.toString());
      params.append("limit", "50");
      
      const response = await fetch(`${API_URL}/api/admin/organ-inventory?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setCurrentPage(data.page);
        setTotalPages(data.total_pages);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
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
    setFilters({ organ_type: "", hospital_id: "", blood_type: "", status: "" });
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.organ_type) params.append("organ_type", filters.organ_type);
      if (filters.hospital_id) params.append("hospital_id", filters.hospital_id);
      if (filters.blood_type) params.append("blood_type", filters.blood_type);
      if (filters.status) params.append("status", filters.status);
      
      const response = await fetch(`${API_URL}/api/admin/organ-inventory/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `organ_inventory_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Inventory exported successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export inventory",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return statusConfig ? (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    ) : null;
  };

  if (isLoading || (loading && !stats)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading inventory...</div>
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
                  <Package className="h-10 w-10 text-blue-600" />
                  Organ Inventory
                </h1>
                <p className="text-muted-foreground">
                  Consolidated view of organ availability across all sharing hospitals
                </p>
              </div>
              <Button onClick={() => navigate("/admin-dashboard")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-blue-700">{stats.total_organs}</div>
                      <p className="text-sm text-blue-600 font-medium">Total Organs</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-700">
                        {stats.organs_by_status.available || 0}
                      </div>
                      <p className="text-sm text-green-600 font-medium">Available</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-purple-700">
                        {stats.sharing_hospitals_count}
                      </div>
                      <p className="text-sm text-purple-600 font-medium">Sharing Hospitals</p>
                    </div>
                    <Building2 className="h-8 w-8 text-purple-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-orange-700">
                        {stats.sharing_percentage}%
                      </div>
                      <p className="text-sm text-orange-600 font-medium">Sharing Rate</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Statistics Breakdown */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-gray-700 mb-3">Organs by Type</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.organs_by_type).slice(0, 5).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{type}</span>
                        <span className="font-bold text-blue-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-gray-700 mb-3">By Blood Group</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.organs_by_blood_group).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-red-600">{type}</span>
                        <span className="font-bold text-gray-700">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-gray-700 mb-3">By Status</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.organs_by_status).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">{status}</span>
                        <span className="font-bold text-gray-700">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Filters</h3>
                </div>
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="organ_type_filter">Organ Type</Label>
                  <Input
                    id="organ_type_filter"
                    placeholder="Search..."
                    value={filters.organ_type}
                    onChange={(e) => handleFilterChange("organ_type", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="hospital_filter">Hospital</Label>
                  <Select
                    value={filters.hospital_id}
                    onValueChange={(value) => handleFilterChange("hospital_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All hospitals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All hospitals</SelectItem>
                      {hospitals.filter(h => h.is_sharing).map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id}>
                          {hospital.name} ({hospital.organ_entries_count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="blood_type_filter">Blood Type</Label>
                  <Select
                    value={filters.blood_type}
                    onValueChange={(value) => handleFilterChange("blood_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
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
                  <Button onClick={() => fetchInventory(1)} className="flex-1">
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

          {/* Inventory Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold">Hospital Name</TableHead>
                      <TableHead className="font-bold">Organ Type</TableHead>
                      <TableHead className="font-bold">Blood Type</TableHead>
                      <TableHead className="font-bold">Quantity</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold">Notes</TableHead>
                      <TableHead className="font-bold">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="animate-pulse text-muted-foreground">Loading...</div>
                        </TableCell>
                      </TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No organ inventory data available. Hospitals need to enable sharing.
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              {entry.hospital_name}
                            </div>
                          </TableCell>
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
                          <TableCell className="max-w-xs truncate">
                            {entry.notes || <span className="text-gray-400">-</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(entry.updated_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInventory(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInventory(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
