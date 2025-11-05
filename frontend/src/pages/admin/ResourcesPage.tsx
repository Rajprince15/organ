import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Eye, Trash2, ArrowLeft, Plus } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

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

export default function ResourcesPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', description: '', content: '', category: '' });

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
      return;
    }
    if (user && user.role === "admin") {
      fetchResources();
    }
  }, [user, navigate]);

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
    } finally {
      setLoading(false);
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
        setIsCreating(false);
        fetchResources();
      } else {
        toast({ title: "Failed to create resource", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error creating resource", variant: "destructive" });
    }
  };

  const handleTogglePublish = async (resourceId: string, isPublished: boolean) => {
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/admin")}
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button onClick={() => setIsCreating(true)} data-testid="create-resource-btn">
              <Plus className="h-4 w-4 mr-2" />
              Create Resource
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Resources Management</CardTitle>
              <CardDescription>
                Manage educational articles and resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading resources...</div>
              ) : (
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
                                onClick={() => handleTogglePublish(resource.id, resource.is_published)}
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Resource Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
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
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateResource}>
              Create Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}