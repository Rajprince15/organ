import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Flag, Eye, Trash2, ArrowLeft } from "lucide-react";

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

export default function CommunityPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
      return;
    }
    if (user && user.role === "admin") {
      fetchPosts();
    }
  }, [user, navigate]);

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
    } finally {
      setLoading(false);
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
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/admin")}
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Community Posts Management</CardTitle>
              <CardDescription>
                Moderate posts, reels, and community content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading posts...</div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}