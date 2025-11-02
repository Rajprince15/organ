import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface HospitalRequirement {
  id: string;
  hospital_name: string;
  patient_name: string;
  organ_required: string;
  blood_group: string;
  urgency_level: string;
  status: string;
  created_at: string;
}

interface RequirementsManagementTabProps {
  token: string;
}

export const RequirementsManagementTab = ({ token }: RequirementsManagementTabProps) => {
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<HospitalRequirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<HospitalRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  useEffect(() => {
    fetchRequirements();
  }, []);

  useEffect(() => {
    filterRequirements();
  }, [requirements, statusFilter, urgencyFilter]);

  const fetchRequirements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/requirements?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequirements(data.requirements);
      }
    } catch (error) {
      toast({ title: "Failed to fetch requirements", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterRequirements = () => {
    let filtered = [...requirements];

    if (statusFilter !== "all") {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (urgencyFilter !== "all") {
      filtered = filtered.filter(req => req.urgency_level === urgencyFilter);
    }

    // Sort by urgency: critical > high > medium
    filtered.sort((a, b) => {
      const urgencyOrder: any = { critical: 0, high: 1, medium: 2 };
      return urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level];
    });

    setFilteredRequirements(filtered);
  };

  const getUrgencyBadge = (urgency: string) => {
    const configs: any = {
      critical: { variant: "destructive", label: "🔴 Critical" },
      high: { variant: "default", label: "🟠 High" },
      medium: { variant: "secondary", label: "🟡 Medium" }
    };
    const config = configs[urgency] || configs.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const configs: any = {
      active: { variant: "default", color: "text-green-600" },
      fulfilled: { variant: "outline", color: "text-blue-600" },
      cancelled: { variant: "destructive", color: "text-red-600" }
    };
    const config = configs[status] || configs.active;
    return <Badge variant={config.variant} className="capitalize">{status}</Badge>;
  };

  const handleDeleteRequirement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/requirements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({ title: "Requirement deleted successfully" });
        fetchRequirements();
      }
    } catch (error) {
      toast({ title: "Failed to delete requirement", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading requirements...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-48" data-testid="urgency-filter">
            <SelectValue placeholder="Filter by urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="critical">🔴 Critical</SelectItem>
            <SelectItem value="high">🟠 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground ml-auto">
          Showing {filteredRequirements.length} of {requirements.length} requirements
        </div>
      </div>

      {/* Requirements Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hospital</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Organ Required</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequirements.map((req) => (
              <TableRow key={req.id} className={req.urgency_level === 'critical' ? 'bg-red-50' : ''}>
                <TableCell className="font-medium">{req.hospital_name}</TableCell>
                <TableCell>{req.patient_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{req.organ_required}</Badge>
                </TableCell>
                <TableCell>{req.blood_group}</TableCell>
                <TableCell>{getUrgencyBadge(req.urgency_level)}</TableCell>
                <TableCell>{getStatusBadge(req.status)}</TableCell>
                <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteRequirement(req.id)}
                      data-testid={`delete-req-${req.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="p-4 border rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">Critical Cases</p>
          <p className="text-2xl font-bold text-red-600">
            {requirements.filter(r => r.urgency_level === 'critical' && r.status === 'active').length}
          </p>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">Active Requirements</p>
          <p className="text-2xl font-bold text-blue-600">
            {requirements.filter(r => r.status === 'active').length}
          </p>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">Fulfilled</p>
          <p className="text-2xl font-bold text-green-600">
            {requirements.filter(r => r.status === 'fulfilled').length}
          </p>
        </div>
      </div>
    </div>
  );
};