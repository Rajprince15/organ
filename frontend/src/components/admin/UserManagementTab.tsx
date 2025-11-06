import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Edit, Trash2, UserCog, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  mobile?: string;
  is_active: boolean;
  created_at: string;
}

interface UserManagementTabProps {
  token: string;
}

export const UserManagementTab = ({ token }: UserManagementTabProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      toast({ title: "Failed to fetch users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(user =>
        statusFilter === "active" ? user.is_active : !user.is_active
      );
    }

    setFilteredUsers(filtered);
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        toast({ title: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully` });
        fetchUsers();
      } else {
        const errorData = await response.json();
        toast({ title: errorData.detail || "Failed to update user", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({ title: "User deleted successfully" });
        setShowDeleteDialog(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  };

  const exportUsers = () => {
    const csv = [
      ['Name', 'Email', 'Role', 'Mobile', 'Status', 'Registered Date'].join(','),
      ...filteredUsers.map(user => [
        user.name,
        user.email,
        user.role,
        user.mobile || 'N/A',
        user.is_active ? 'Active' : 'Inactive',
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="user-search-input"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32" data-testid="role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="donor">Donors</SelectItem>
              <SelectItem value="hospital">Hospitals</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportUsers} data-testid="export-users-btn">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>{user.mobile || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'outline'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      data-testid={`toggle-user-${user.id}`}
                    >
                      <UserCog className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteDialog(true);
                      }}
                      data-testid={`delete-user-${user.id}`}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};