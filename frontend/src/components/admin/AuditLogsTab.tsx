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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL || '';

interface AuditLog {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  changes: any;
  ip_address: string | null;
  created_at: string;
}

interface AuditLogsTabProps {
  token: string;
}

export const AuditLogsTab = ({ token }: AuditLogsTabProps) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, targetFilter]);

  const fetchLogs = async () => {
    try {
      let url = `${API_URL}/api/admin/audit-logs?limit=100`;
      if (actionFilter !== "all") url += `&action=${actionFilter}`;
      if (targetFilter !== "all") url += `&target_type=${targetFilter}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      toast({ title: "Failed to fetch audit logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Admin', 'Action', 'Target Type', 'Target ID', 'IP Address'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.admin_name,
        log.action,
        log.target_type,
        log.target_id || 'N/A',
        log.ip_address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionBadge = (action: string) => {
    const configs: any = {
      create: { variant: "default", color: "bg-green-100 text-green-800" },
      update: { variant: "secondary", color: "bg-blue-100 text-blue-800" },
      delete: { variant: "destructive", color: "bg-red-100 text-red-800" },
      view: { variant: "outline", color: "bg-gray-100 text-gray-800" },
      login: { variant: "outline", color: "bg-purple-100 text-purple-800" },
      logout: { variant: "outline", color: "bg-orange-100 text-orange-800" }
    };
    const config = configs[action] || configs.view;
    return (
      <Badge variant={config.variant} className="capitalize">
        {action}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Track all admin actions and system changes
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportLogs} data-testid="export-audit-logs-btn">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48" data-testid="action-filter">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-48" data-testid="target-filter">
                <SelectValue placeholder="Filter by target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="donation">Donations</SelectItem>
                <SelectItem value="requirement">Requirements</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="resource">Resources</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-muted-foreground flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              {logs.length} logs
            </div>
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">{log.admin_name}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.target_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.target_id ? log.target_id.substring(0, 8) + '...' : 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || 'N/A'}
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
  );
};