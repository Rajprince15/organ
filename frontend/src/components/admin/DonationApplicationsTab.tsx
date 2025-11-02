import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface DonationApplication {
  id: string;
  donor_id: string;
  full_name: string;
  email: string;
  phone: string;
  blood_group: string;
  organs: string[];
  status: string;
  created_at: string;
}

interface DonationApplicationsTabProps {
  token: string;
}

export const DonationApplicationsTab = ({ token }: DonationApplicationsTabProps) => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<DonationApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<DonationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<DonationApplication | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, statusFilter]);

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/donations?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data.donations);
      }
    } catch (error) {
      toast({ title: "Failed to fetch applications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    if (statusFilter === "all") {
      setFilteredApplications(applications);
    } else {
      setFilteredApplications(applications.filter(app => app.status === statusFilter));
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedApplications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedApplications(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedApplications.size === filteredApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(filteredApplications.map(app => app.id)));
    }
  };

  const handleBulkApprove = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/donations/bulk-approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Array.from(selectedApplications))
      });

      if (response.ok) {
        const data = await response.json();
        toast({ title: `${data.approved_count} applications approved successfully` });
        setShowBulkApproveDialog(false);
        setSelectedApplications(new Set());
        fetchApplications();
      }
    } catch (error) {
      toast({ title: "Failed to approve applications", variant: "destructive" });
    }
  };

  const handleBulkReject = async () => {
    if (!rejectReason.trim()) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/donations/bulk-reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          donation_ids: Array.from(selectedApplications),
          reason: rejectReason
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({ title: `${data.rejected_count} applications rejected` });
        setShowBulkRejectDialog(false);
        setSelectedApplications(new Set());
        setRejectReason("");
        fetchApplications();
      }
    } catch (error) {
      toast({ title: "Failed to reject applications", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "outline", icon: Clock, color: "text-yellow-600" },
      approved: { variant: "default", icon: CheckCircle, color: "text-green-600" },
      cancelled: { variant: "destructive", icon: XCircle, color: "text-red-600" }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading applications...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters and Bulk Actions */}
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {selectedApplications.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => setShowBulkApproveDialog(true)}
              data-testid="bulk-approve-btn"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve ({selectedApplications.size})
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowBulkRejectDialog(true)}
              data-testid="bulk-reject-btn"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject ({selectedApplications.size})
            </Button>
          </div>
        )}
      </div>

      {/* Applications Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Organs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedApplications.has(app.id)}
                    onCheckedChange={() => toggleSelection(app.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{app.full_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{app.blood_group}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{app.organs.slice(0, 2).join(", ")}{app.organs.length > 2 ? " +" + (app.organs.length - 2) : ""}</div>
                </TableCell>
                <TableCell>{getStatusBadge(app.status)}</TableCell>
                <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedApplication(app);
                      setShowDetailDialog(true);
                    }}
                    data-testid={`view-app-${app.id}`}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedApplication.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedApplication.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedApplication.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blood Group</p>
                  <p className="font-medium">{selectedApplication.blood_group}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Organs to Donate</p>
                <div className="flex flex-wrap gap-2">
                  {selectedApplication.organs.map(organ => (
                    <Badge key={organ}>{organ}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Dialog */}
      <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve Applications</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedApplications.size} application(s)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkApprove}>
              Approve All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Applications</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedApplications.size} application(s)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkReject}>
              Reject All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};