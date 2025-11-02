import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Heart, 
  Building2, 
  Activity,
  TrendingUp,
  Edit,
  Trash2,
  UserCog,
  FileText,
  MessageSquare,
  Calendar,
  BookOpen,
  Flag,
  Eye,
  Plus,
  BarChart3,
  Bell,
  Settings as SettingsIcon
} from "lucide-react";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { DonationApplicationsTab } from "@/components/admin/DonationApplicationsTab";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { RequirementsManagementTab } from "@/components/admin/RequirementsManagementTab";
import { BroadcastNotifications } from "@/components/admin/BroadcastNotifications";
import { PlatformSettings } from "@/components/admin/PlatformSettings";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";
import { MatchingInsightsTab } from "@/components/admin/MatchingInsightsTab";
import { SupportManagementTab } from "@/components/admin/SupportManagementTab";

const API_URL = import.meta.env.VITE_API_URL || '';

interface CommunityPost {
  id: string;
  user_id: string;
  author_name: string;
  author_image?: string;
  content: string;
  image?: string;
  post_type: "post" | "reel";
  likes: number;
  comments_count: number;
  shares: number;
  is_flagged: boolean;
  is_active: boolean;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer_id: string;
  organizer_name: string;
  attendees_count: number;
  is_active: boolean;
  created_at: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  author_id: string;
  author_name: string;
  is_published: boolean;
  created_at: string;
}

const AdminDashboardEnhanced = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedResource, setResource] = useState<Resource | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '' });
  const [newResource, setNewResource] = useState({ title: '', description: '', content: '', category: '' });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchAllData();
  }, [user, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchPosts(),
      fetchEvents(),
      fetchResources()
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/community-posts?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/events?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/resources?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  const handleTogglePostActive = async (postId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/community-posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      
      if (response.ok) {
        toast({ title: `Post ${!isActive ? 'activated' : 'deactivated'} successfully` });
        fetchPosts();
      } else {
        toast({ title: "Failed to update post", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error updating post", variant: "destructive" });
    }
  };

  const handleTogglePostFlag = async (postId: string, isFlagged: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/community-posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_flagged: !isFlagged })
      });
      
      if (response.ok) {
        toast({ title: `Post ${!isFlagged ? 'flagged' : 'unflagged'} successfully` });
        fetchPosts();
      } else {
        toast({ title: "Failed to flag post", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error flagging post", variant: "destructive" });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/community-posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "Post deleted successfully" });
        fetchPosts();
      } else {
        toast({ title: "Failed to delete post", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error deleting post", variant: "destructive" });
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent)
      });
      
      if (response.ok) {
        toast({ title: "Event created successfully" });
        setNewEvent({ title: '', description: '', date: '', time: '', location: '' });
        setIsCreatingEvent(false);
        fetchEvents();
      } else {
        toast({ title: "Failed to create event", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error creating event", variant: "destructive" });
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: any) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        toast({ title: "Event updated successfully" });
        setShowEventDialog(false);
        fetchEvents();
      } else {
        toast({ title: "Failed to update event", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error updating event", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "Event deleted successfully" });
        fetchEvents();
      } else {
        toast({ title: "Failed to delete event", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error deleting event", variant: "destructive" });
    }
  };

  const handleCreateResource = async () => {
    if (!newResource.title || !newResource.content) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/resources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newResource)
      });
      
      if (response.ok) {
        toast({ title: "Resource created successfully" });
        setNewResource({ title: '', description: '', content: '', category: '' });
        setIsCreatingResource(false);
        fetchResources();
      } else {
        toast({ title: "Failed to create resource", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error creating resource", variant: "destructive" });
    }
  };

  const handleToggleResourcePublish = async (resourceId: string, isPublished: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_published: !isPublished })
      });
      
      if (response.ok) {
        toast({ title: `Resource ${!isPublished ? 'published' : 'unpublished'} successfully` });
        fetchResources();
      } else {
        toast({ title: "Failed to update resource", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error updating resource", variant: "destructive" });
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "Resource deleted successfully" });
        fetchResources();
      } else {
        toast({ title: "Failed to delete resource", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error deleting resource", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" data-testid="admin-dashboard-title">
              Admin <span className="bg-gradient-hero bg-clip-text text-transparent">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              Comprehensive management for users, content, and platform activities
            </p>
          </div>

          {/* Enhanced Stats Cards Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Users Card */}
              <Card data-testid="stats-users-card" className="border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.users.donors} donors • {stats.users.hospitals} hospitals
                  </div>
                </CardContent>
              </Card>

              {/* Donations Card */}
              <Card data-testid="stats-donations-card" className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Donations
                  </CardTitle>
                  <Heart className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.donations.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.donations.approved} approved • {stats.donations.pending} pending
                  </div>
                </CardContent>
              </Card>

              {/* Requirements Card */}
              <Card data-testid="stats-requirements-card" className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Requirements
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.requirements.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.requirements.active} active • {stats.requirements.fulfilled} fulfilled
                  </div>
                </CardContent>
              </Card>

              {/* Matches Card */}
              <Card data-testid="stats-matches-card" className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Matches
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.matches.total_shortlisted}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.matches.total_contacts} contacts made
                  </div>
                </CardContent>
              </Card>

              {/* Community Posts Card */}
              <Card data-testid="stats-posts-card" className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Community Posts
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.community.total_posts}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.community.active_posts} active • {stats.community.reels_count} reels
                  </div>
                </CardContent>
              </Card>

              {/* Events Card */}
              <Card data-testid="stats-events-card" className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Events
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.events.total_events}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.events.active_events} active events
                  </div>
                </CardContent>
              </Card>

              {/* Resources Card */}
              <Card data-testid="stats-resources-card" className="border-l-4 border-l-teal-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resources
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-teal-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.resources.total_resources}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.resources.published_resources} published
                  </div>
                </CardContent>
              </Card>

              {/* Flagged Content Card */}
              <Card data-testid="stats-flagged-card" className="border-l-4 border-l-yellow-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Flagged Content
                  </CardTitle>
                  <Flag className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.community.flagged_posts}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Requires attention
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Management Tabs */}
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-1">
              <TabsTrigger value="posts" data-testid="tab-posts">
                <MessageSquare className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                <Calendar className="h-4 w-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="resources" data-testid="tab-resources">
                <BookOpen className="h-4 w-4 mr-2" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="donations" data-testid="tab-donations">
                <Heart className="h-4 w-4 mr-2" />
                Donations
              </TabsTrigger>
              <TabsTrigger value="requirements" data-testid="tab-requirements">
                <Building2 className="h-4 w-4 mr-2" />
                Requirements
              </TabsTrigger>
              <TabsTrigger value="matching" data-testid="tab-matching">
                <TrendingUp className="h-4 w-4 mr-2" />
                Matching
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">
                <FileText className="h-4 w-4 mr-2" />
                Audit Logs
              </TabsTrigger>
              <TabsTrigger value="support" data-testid="tab-support">
                <MessageSquare className="h-4 w-4 mr-2" />
                Support
              </TabsTrigger>
            </TabsList>

            {/* Community Posts Tab */}
            <TabsContent value="posts">
              <Card>
                <CardHeader>
                  <CardTitle>Community Posts Management</CardTitle>
                  <CardDescription>
                    Moderate posts, reels, and community content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Author</TableHead>
                          <TableHead>Content</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Engagement</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posts.map((post) => (
                          <TableRow key={post.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{post.author_image}</span>
                                <span className="font-medium">{post.author_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md truncate">{post.content}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={post.post_type === 'reel' ? 'secondary' : 'outline'}>
                                {post.post_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                ❤️ {post.likes} • 💬 {post.comments_count}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {post.is_flagged && <Badge variant="destructive">Flagged</Badge>}
                                {!post.is_active && <Badge variant="outline">Inactive</Badge>}
                                {post.is_active && !post.is_flagged && <Badge variant="default">Active</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTogglePostFlag(post.id, post.is_flagged)}
                                  data-testid={`flag-post-${post.id}`}
                                >
                                  <Flag className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTogglePostActive(post.id, post.is_active)}
                                  data-testid={`toggle-post-${post.id}`}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeletePost(post.id)}
                                  data-testid={`delete-post-${post.id}`}
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Events Management</CardTitle>
                    <CardDescription>
                      Create and manage community events
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreatingEvent(true)} data-testid="create-event-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Organizer</TableHead>
                          <TableHead>Attendees</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.title}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{event.date}</div>
                                <div className="text-muted-foreground">{event.time}</div>
                              </div>
                            </TableCell>
                            <TableCell>{event.location}</TableCell>
                            <TableCell>{event.organizer_name}</TableCell>
                            <TableCell>{event.attendees_count}</TableCell>
                            <TableCell>
                              <Badge variant={event.is_active ? 'default' : 'secondary'}>
                                {event.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowEventDialog(true);
                                  }}
                                  data-testid={`edit-event-${event.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  data-testid={`delete-event-${event.id}`}
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Resources Management</CardTitle>
                    <CardDescription>
                      Manage educational articles and resources
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreatingResource(true)} data-testid="create-resource-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Resource
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resources.map((resource) => (
                          <TableRow key={resource.id}>
                            <TableCell className="font-medium">{resource.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{resource.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md truncate">{resource.description}</div>
                            </TableCell>
                            <TableCell>{resource.author_name}</TableCell>
                            <TableCell>
                              <Badge variant={resource.is_published ? 'default' : 'secondary'}>
                                {resource.is_published ? 'Published' : 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleResourcePublish(resource.id, resource.is_published)}
                                  data-testid={`publish-resource-${resource.id}`}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteResource(resource.id)}
                                  data-testid={`delete-resource-${resource.id}`}
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Management Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage all platform users - donors, hospitals, and admins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagementTab token={token} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Donation Applications Tab */}
            <TabsContent value="donations">
              <Card>
                <CardHeader>
                  <CardTitle>Donation Applications</CardTitle>
                  <CardDescription>
                    Review and approve donor applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DonationApplicationsTab token={token} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hospital Requirements Tab */}
            <TabsContent value="requirements">
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Requirements</CardTitle>
                  <CardDescription>
                    Monitor and manage organ requirements from hospitals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequirementsManagementTab token={token} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Dashboard Tab */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>
                    Comprehensive platform analytics and insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsDashboard token={token} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Feed Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Feed</CardTitle>
                  <CardDescription>
                    Real-time platform activity and user actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityFeed token={token} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Broadcast Notifications Tab */}
            <TabsContent value="notifications">
              <BroadcastNotifications token={token} />
            </TabsContent>

            {/* Platform Settings Tab */}
            <TabsContent value="settings">
              <PlatformSettings token={token} />
            </TabsContent>


            {/* Matching Insights Tab */}
            <TabsContent value="matching">
              <MatchingInsightsTab />
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="audit">
              <AuditLogsTab token={token} />
            </TabsContent>

            {/* Support Management Tab */}
            <TabsContent value="support">
              <SupportManagementTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={isCreatingEvent} onOpenChange={setIsCreatingEvent}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Add a new community event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Event title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-date">Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="event-time">Time</Label>
                <Input
                  id="event-time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  placeholder="e.g., 10:00 AM - 4:00 PM"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                placeholder="Event location"
              />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Event description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingEvent(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Resource Dialog */}
      <Dialog open={isCreatingResource} onOpenChange={setIsCreatingResource}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Resource</DialogTitle>
            <DialogDescription>
              Add a new educational resource or article
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resource-title">Title *</Label>
              <Input
                id="resource-title"
                value={newResource.title}
                onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                placeholder="Resource title"
              />
            </div>
            <div>
              <Label htmlFor="resource-category">Category</Label>
              <Input
                id="resource-category"
                value={newResource.category}
                onChange={(e) => setNewResource({...newResource, category: e.target.value})}
                placeholder="e.g., Process, Medical, Legal"
              />
            </div>
            <div>
              <Label htmlFor="resource-description">Description</Label>
              <Input
                id="resource-description"
                value={newResource.description}
                onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label htmlFor="resource-content">Content *</Label>
              <Textarea
                id="resource-content"
                value={newResource.content}
                onChange={(e) => setNewResource({...newResource, content: e.target.value})}
                placeholder="Full content of the resource"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingResource(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateResource}>
              Create Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Event Status</DialogTitle>
            <DialogDescription>
              Change the status of this event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label>Event: {selectedEvent.title}</Label>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  defaultValue={selectedEvent.is_active ? "active" : "inactive"}
                  onValueChange={(value) => 
                    setSelectedEvent({...selectedEvent, is_active: value === "active"})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedEvent && handleUpdateEvent(
              selectedEvent.id, 
              { is_active: selectedEvent.is_active }
            )}>
              Update Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminDashboardEnhanced;