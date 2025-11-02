import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Ticket, 
  MessageSquare, 
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to?: string;
  assigned_to_name?: string;
  admin_response?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  is_published: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface HelpDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_published: boolean;
  author_id: string;
  author_name: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export function SupportManagementTab() {
  const { toast } = useToast();
  
  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketStats, setTicketStats] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketResponse, setTicketResponse] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");
  
  // FAQs State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showFAQDialog, setShowFAQDialog] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    category: "",
    order: 0,
    is_published: true
  });
  
  // Help Documents State
  const [helpDocs, setHelpDocs] = useState<HelpDocument[]>([]);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<HelpDocument | null>(null);
  const [docForm, setDocForm] = useState({
    title: "",
    content: "",
    category: "",
    tags: [] as string[],
    is_published: true
  });
  const [tagInput, setTagInput] = useState("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchFAQs();
    fetchHelpDocs();
  }, []);

  // Support Tickets Functions
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/support/tickets?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch tickets");

      const data = await response.json();
      setTickets(data.tickets || []);
      setTicketStats(data.stats);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicket = async () => {
    if (!selectedTicket) return;

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        `${API_URL}/api/admin/support/tickets/${selectedTicket.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: ticketStatus || selectedTicket.status,
            admin_response: ticketResponse,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update ticket");

      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });

      setShowTicketDialog(false);
      setTicketResponse("");
      fetchTickets();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      });
    }
  };

  // FAQ Functions
  const fetchFAQs = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/faqs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch FAQs");

      const data = await response.json();
      setFaqs(data.faqs || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load FAQs",
        variant: "destructive",
      });
    }
  };

  const saveFAQ = async () => {
    try {
      const token = localStorage.getItem("token");
      const isEditing = !!editingFAQ;
      
      const url = isEditing
        ? `${API_URL}/api/admin/faqs/${editingFAQ.id}`
        : `${API_URL}/api/admin/faqs`;
      
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(faqForm),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} FAQ`);

      toast({
        title: "Success",
        description: `FAQ ${isEditing ? 'updated' : 'created'} successfully`,
      });

      setShowFAQDialog(false);
      setEditingFAQ(null);
      setFaqForm({ question: "", answer: "", category: "", order: 0, is_published: true });
      fetchFAQs();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingFAQ ? 'update' : 'create'} FAQ`,
        variant: "destructive",
      });
    }
  };

  const deleteFAQ = async (faqId: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/faqs/${faqId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete FAQ");

      toast({
        title: "Success",
        description: "FAQ deleted successfully",
      });

      fetchFAQs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete FAQ",
        variant: "destructive",
      });
    }
  };

  // Help Documents Functions
  const fetchHelpDocs = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/help/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch help docs");

      const data = await response.json();
      setHelpDocs(data.documents || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load help documents",
        variant: "destructive",
      });
    }
  };

  const saveHelpDoc = async () => {
    try {
      const token = localStorage.getItem("token");
      const isEditing = !!editingDoc;
      
      const url = isEditing
        ? `${API_URL}/api/admin/help/documents/${editingDoc.id}`
        : `${API_URL}/api/admin/help/documents`;
      
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(docForm),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} document`);

      toast({
        title: "Success",
        description: `Help document ${isEditing ? 'updated' : 'created'} successfully`,
      });

      setShowDocDialog(false);
      setEditingDoc(null);
      setDocForm({ title: "", content: "", category: "", tags: [], is_published: true });
      fetchHelpDocs();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingDoc ? 'update' : 'create'} document`,
        variant: "destructive",
      });
    }
  };

  const deleteHelpDoc = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this help document?")) return;

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/help/documents/${docId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete document");

      toast({
        title: "Success",
        description: "Help document deleted successfully",
      });

      fetchHelpDocs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete help document",
        variant: "destructive",
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      critical: "bg-red-600",
      high: "bg-orange-600",
      medium: "bg-yellow-600",
      low: "bg-green-600",
    };
    return <Badge className={variants[priority] || "bg-gray-600"}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "bg-blue-600",
      in_progress: "bg-yellow-600",
      resolved: "bg-green-600",
      closed: "bg-gray-600",
    };
    return <Badge className={variants[status] || "bg-gray-600"}>{status.replace("_", " ")}</Badge>;
  };

  const addTag = () => {
    if (tagInput.trim() && !docForm.tags.includes(tagInput.trim())) {
      setDocForm({ ...docForm, tags: [...docForm.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setDocForm({ ...docForm, tags: docForm.tags.filter(t => t !== tag) });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">
            <Ticket className="h-4 w-4 mr-2" />
            Support Tickets
          </TabsTrigger>
          <TabsTrigger value="faqs">
            <MessageSquare className="h-4 w-4 mr-2" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="h-4 w-4 mr-2" />
            Help Documents
          </TabsTrigger>
        </TabsList>

        {/* Support Tickets Tab */}
        <TabsContent value="tickets">
          {ticketStats && (
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ticketStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Open</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{ticketStats.open}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{ticketStats.in_progress}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{ticketStats.resolved}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Support Tickets</CardTitle>
              <CardDescription>Manage user support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tickets found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ticket.user_name}</p>
                              <p className="text-sm text-muted-foreground">{ticket.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                          <TableCell className="capitalize">{ticket.category}</TableCell>
                          <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setTicketStatus(ticket.status);
                                setTicketResponse(ticket.admin_response || "");
                                setShowTicketDialog(true);
                              }}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>FAQ Management</CardTitle>
                  <CardDescription>Create and manage frequently asked questions</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingFAQ(null);
                    setFaqForm({ question: "", answer: "", category: "", order: 0, is_published: true });
                    setShowFAQDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {faqs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No FAQs found</div>
              ) : (
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <Card key={faq.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{faq.question}</CardTitle>
                              <Badge variant={faq.is_published ? "default" : "secondary"}>
                                {faq.is_published ? "Published" : "Draft"}
                              </Badge>
                            </div>
                            <CardDescription>{faq.category}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingFAQ(faq);
                                setFaqForm({
                                  question: faq.question,
                                  answer: faq.answer,
                                  category: faq.category,
                                  order: faq.order,
                                  is_published: faq.is_published,
                                });
                                setShowFAQDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteFAQ(faq.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{faq.answer}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Documents Tab */}
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Help Documentation</CardTitle>
                  <CardDescription>Create and manage help articles</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingDoc(null);
                    setDocForm({ title: "", content: "", category: "", tags: [], is_published: true });
                    setShowDocDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {helpDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No help documents found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {helpDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>{doc.category}</TableCell>
                          <TableCell>{doc.views}</TableCell>
                          <TableCell>
                            <Badge variant={doc.is_published ? "default" : "secondary"}>
                              {doc.is_published ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(doc.updated_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingDoc(doc);
                                  setDocForm({
                                    title: doc.title,
                                    content: doc.content,
                                    category: doc.category,
                                    tags: doc.tags,
                                    is_published: doc.is_published,
                                  });
                                  setShowDocDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteHelpDoc(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* Ticket Management Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Support Ticket</DialogTitle>
            <DialogDescription>Update ticket status and add response</DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm">{selectedTicket.user_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{selectedTicket.user_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm capitalize">{selectedTicket.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedTicket.priority)}</div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <p className="text-sm mt-1">{selectedTicket.subject}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {selectedTicket.description}
                </p>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={ticketStatus} onValueChange={setTicketStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="response">Admin Response</Label>
                <Textarea
                  id="response"
                  placeholder="Enter your response to the user..."
                  value={ticketResponse}
                  onChange={(e) => setTicketResponse(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateTicket}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Update Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog open={showFAQDialog} onOpenChange={setShowFAQDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFAQ ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="Enter question..."
              />
            </div>
            <div>
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="Enter answer..."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  placeholder="e.g., Donation Process"
                />
              </div>
              <div>
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={faqForm.order}
                  onChange={(e) => setFaqForm({ ...faqForm, order: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                checked={faqForm.is_published}
                onChange={(e) => setFaqForm({ ...faqForm, is_published: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="published">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFAQDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveFAQ}>
              {editingFAQ ? "Update" : "Create"} FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Document Dialog */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit Help Document" : "Add New Help Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                placeholder="Enter document title..."
              />
            </div>
            <div>
              <Label htmlFor="doc_category">Category</Label>
              <Input
                id="doc_category"
                value={docForm.category}
                onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                placeholder="e.g., Getting Started"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={docForm.content}
                onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                placeholder="Enter document content (supports markdown)..."
                rows={10}
              />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tags..."
                />
                <Button type="button" onClick={addTag} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {docForm.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="doc_published"
                checked={docForm.is_published}
                onChange={(e) => setDocForm({ ...docForm, is_published: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="doc_published">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveHelpDoc}>
              {editingDoc ? "Update" : "Create"} Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
