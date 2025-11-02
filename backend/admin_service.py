import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Activity as ActivityIcon, User, Heart, Building2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL || '';

interface ActivityLog {
  id: string;
  user_name: string;
  user_role: string;
  activity_type: string;
  description: string;
  created_at: string;
}

interface ActivityFeedProps {
  token: string;
}

export const ActivityFeed = ({ token }: ActivityFeedProps) => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [typeFilter, roleFilter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchActivities();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, typeFilter, roleFilter]);

  const fetchActivities = async () => {
    try {
      let url = `${API_URL}/api/admin/activity-logs?limit=50`;
      if (typeFilter !== "all") url += `&activity_type=${typeFilter}`;
      if (roleFilter !== "all") url += `&user_role=${roleFilter}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.logs || []);
      }
    } catch (error) {
      // Silently fail for auto-refresh
      if (!autoRefresh) {
        toast({ title: "Failed to fetch activity logs", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: any = {
      registration: User,
      application_submitted: Heart,
      requirement_posted: Building2,
      match_made: ActivityIcon,
      contact_made: MessageSquare,
      status_change: ActivityIcon
    };
    const Icon = icons[type] || ActivityIcon;
    return <Icon className="h-4 w-4" />;
  };

  const getActivityColor = (type: string) => {
    const colors: any = {
      registration: "text-blue-600 bg-blue-50",
      application_submitted: "text-green-600 bg-green-50",
      requirement_posted: "text-purple-600 bg-purple-50",
      match_made: "text-orange-600 bg-orange-50",
      contact_made: "text-pink-600 bg-pink-50",
      status_change: "text-gray-600 bg-gray-50"
    };
    return colors[type] || "text-gray-600 bg-gray-50";
  };

  if (loading) {
    return <div className="text-center py-8">Loading activity feed...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="registration">Registrations</SelectItem>
              <SelectItem value="application_submitted">Applications</SelectItem>
              <SelectItem value="requirement_posted">Requirements</SelectItem>
              <SelectItem value="match_made">Matches</SelectItem>
              <SelectItem value="contact_made">Contacts</SelectItem>
              <SelectItem value="status_change">Status Changes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="donor">Donors</SelectItem>
              <SelectItem value="hospital">Hospitals</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities()}
            data-testid="refresh-activity-btn"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="auto-refresh-toggle"
          >
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No recent activity</p>
          </Card>
        ) : (
          activities.map((activity, index) => (
            <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{activity.user_name}</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {activity.user_role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Stats Summary */}
      <Card className="p-4 mt-6">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold">{activities.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Donors</p>
            <p className="text-xl font-bold text-green-600">
              {activities.filter(a => a.user_role === 'donor').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Hospitals</p>
            <p className="text-xl font-bold text-blue-600">
              {activities.filter(a => a.user_role === 'hospital').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Registrations</p>
            <p className="text-xl font-bold">
              {activities.filter(a => a.activity_type === 'registration').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Matches</p>
            <p className="text-xl font-bold text-orange-600">
              {activities.filter(a => a.activity_type === 'match_made').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Contacts</p>
            <p className="text-xl font-bold text-purple-600">
              {activities.filter(a => a.activity_type === 'contact_made').length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
