import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Share2,
  X,
  Save
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

export default function OrganBankManagement() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<OrganBankEntry[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OrganBankEntry | null>(null);
  
  const [formData, setFormData] = useState({
    organ_type: "",
    blood_type: "",
    quantity: 1,
    status: "available" as const,
    notes: "",
  });

  useEffect(() => {
    if (!user || user.role !== "hospital") {
      navigate("/");
      return;
    }
    fetchSharingStatus();
    fetchEntries();
  }, [user, navigate]);

  const fetchSharingStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/organ-bank/sharing-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsSharing(data.is_sharing);
      }
    } catch (error) {
      console.error("Failed to fetch sharing status:", error);
    }
  };

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${API_URL}/api/organ-bank/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSharing = async () => {
    try {
      const response = await fetch(`${API_URL}/api/organ-bank/toggle-sharing`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsSharing(data.is_sharing);
        toast({
          title: "Success",
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle sharing status",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingEntry
        ? `${API_URL}/api/organ-bank/${editingEntry.id}`
        : `${API_URL}/api/organ-bank`;
      
      const method = editingEntry ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: editingEntry ? "Entry updated successfully" : "Entry created successfully",
        });
        
        setShowForm(false);
        setEditingEntry(null);
        resetForm();
        fetchEntries();
      } else {
        throw new Error("Failed to save entry");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entry: OrganBankEntry) => {
    setEditingEntry(entry);
    setFormData({
      organ_type: entry.organ_type,
      blood_type: entry.blood_type,
      quantity: entry.quantity,
      status: entry.status,
      notes: entry.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/organ-bank/${entryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Entry deleted successfully",
        });
        fetchEntries();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      organ_type: "",
      blood_type: "",
      quantity: 1,
      status: "available",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return statusConfig ? (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    ) : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
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
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Package className="h-10 w-10 text-blue-600" />
              Organ Bank Management
            </h1>
            <p className="text-muted-foreground">
              Manage your hospital's organ inventory and share with the network
            </p>
          </div>

          {/* Sharing Control Card */}
          <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-600" />
                Organ Bank Sharing
              </CardTitle>
              <CardDescription>
                Enable sharing to make your organ inventory visible to the admin platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Status: {isSharing ? (
                      <span className="text-green-600">Sharing Enabled</span>
                    ) : (
                      <span className="text-gray-600">Sharing Disabled</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isSharing 
                      ? "Your organ bank is visible to the admin and other hospitals"
                      : "Your organ bank is private"}
                  </p>
                </div>
                <Switch
                  checked={isSharing}
                  onCheckedChange={handleToggleSharing}
                  data-testid="sharing-toggle"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
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
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">
                  {entries.filter(e => e.status === "allocated").reduce((sum, e) => sum + e.quantity, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Allocated Organs</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Inventory Entries</h2>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/organ-bank-marketplace")}
                variant="outline"
                data-testid="view-marketplace-button"
              >
                <Share2 className="h-4 w-4 mr-2" />
                View Marketplace
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingEntry(null);
                  setShowForm(true);
                }}
                data-testid="add-entry-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <Card className="mb-6 border-2 border-blue-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {editingEntry ? "Edit Entry" : "Add New Entry"}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEntry(null);
                      resetForm();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organ_type">Organ Type *</Label>
                      <Input
                        id="organ_type"
                        value={formData.organ_type}
                        onChange={(e) => setFormData({ ...formData, organ_type: e.target.value })}
                        placeholder="e.g., Heart, Kidney, Liver"
                        required
                        data-testid="organ-type-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="blood_type">Blood Type *</Label>
                      <Select
                        value={formData.blood_type}
                        onValueChange={(value) => setFormData({ ...formData, blood_type: value })}
                        required
                      >
                        <SelectTrigger data-testid="blood-type-select">
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOOD_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        required
                        data-testid="quantity-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="status">Status *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                        required
                      >
                        <SelectTrigger data-testid="status-select">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this entry..."
                      rows={3}
                      data-testid="notes-input"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button type="submit" data-testid="save-entry-button">
                      <Save className="h-4 w-4 mr-2" />
                      {editingEntry ? "Update Entry" : "Add Entry"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingEntry(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Entries Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold">Organ Type</TableHead>
                      <TableHead className="font-bold">Blood Type</TableHead>
                      <TableHead className="font-bold">Quantity</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold">Notes</TableHead>
                      <TableHead className="font-bold">Last Updated</TableHead>
                      <TableHead className="font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No entries yet. Click "Add Entry" to create your first organ bank entry.
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry) => (
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
                          <TableCell className="max-w-xs truncate">
                            {entry.notes || <span className="text-gray-400">-</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(entry.updated_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                                data-testid={`edit-entry-${entry.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`delete-entry-${entry.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
