import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { 
  Ticket, 
  MessageSquare, 
  BookOpen,
  Send,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
}

export default function Support() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Tickets State
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    category: "general" as string,
    priority: "medium" as string,
  });
  const [submitting, setSubmitting] = useState(false);
  
  // FAQs State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqSearch, setFaqSearch] = useState("");
  const [selectedFaqCategory, setSelectedFaqCategory] = useState("all");
  
  // Help Docs State
  const [helpDocs, setHelpDocs] = useState<HelpDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<HelpDocument | null>(null);
  const [docSearch, setDocSearch] = useState("");

  useEffect(() => {
    fetchFAQs();
    fetchHelpDocs();
    if (user) {
      fetchMyTickets();
    }
  }, [user]);

  // Fetch Functions
  const fetchMyTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/support/tickets/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch tickets");

      const data = await response.json();
      setMyTickets(data.tickets || []);
    } catch (error) {
      console.error("Failed to load tickets:", error);
    }
  };

  const fetchFAQs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/faqs`);

      if (!response.ok) throw new Error("Failed to fetch FAQs");

      const data = await response.json();
      setFaqs(data.faqs || []);
    } catch (error) {
      console.error("Failed to load FAQs:", error);
    }
  };

  const fetchHelpDocs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/help/documents`);

      if (!response.ok) throw new Error("Failed to fetch help docs");

      const data = await response.json();
      setHelpDocs(data.documents || []);
    } catch (error) {
      console.error("Failed to load help documents:", error);
    }
  };

  const fetchHelpDoc = async (docId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/help/documents/${docId}`);

      if (!response.ok) throw new Error("Failed to fetch document");

      const doc = await response.json();
      setSelectedDoc(doc);
    } catch (error) {
      console.error("Failed to load document:", error);
    }
  };

  // Submit Ticket
  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a support ticket",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/support/tickets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticketForm),
      });

      if (!response.ok) throw new Error("Failed to create ticket");

      toast({
        title: "Success",
        description: "Your support ticket has been submitted. We'll respond soon!",
      });

      setTicketForm({
        subject: "",
        description: "",
        category: "general",
        priority: "medium",
      });

      fetchMyTickets();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter FAQs
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch = faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    const matchesCategory = selectedFaqCategory === "all" || faq.category === selectedFaqCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique FAQ categories
  const faqCategories = Array.from(new Set(faqs.map((faq) => faq.category)));

  // Filter Help Docs
  const filteredDocs = helpDocs.filter((doc) =>
    doc.title.toLowerCase().includes(docSearch.toLowerCase()) ||
    doc.content.toLowerCase().includes(docSearch.toLowerCase())
  );

  // Get Status Icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "closed":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
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

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      critical: "bg-red-600",
      high: "bg-orange-600",
      medium: "bg-yellow-600",
      low: "bg-green-600",
    };
    return <Badge className={variants[priority] || "bg-gray-600"}>{priority}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">OC</span>
              </div>
              <span className="text-xl font-bold text-gray-900">OrganConnect</span>
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link to={user.role === "donor" ? "/donor-dashboard" : user.role === "hospital" ? "/hospital-dashboard" : "/admin-dashboard"}>
                    <Button variant="outline">Dashboard</Button>
                  </Link>
                  <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                </>
              ) : (
                <Link to="/login">
                  <Button>Login</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Support Center</h1>
            <p className="text-lg text-gray-600">
              We're here to help! Browse FAQs, access help documentation, or submit a support ticket.
            </p>
          </div>

          <Tabs defaultValue="faqs" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="faqs" data-testid="faqs-tab">
                <MessageSquare className="h-4 w-4 mr-2" />
                FAQs
              </TabsTrigger>
              <TabsTrigger value="help" data-testid="help-tab">
                <BookOpen className="h-4 w-4 mr-2" />
                Help Docs
              </TabsTrigger>
              <TabsTrigger value="tickets" data-testid="tickets-tab">
                <Ticket className="h-4 w-4 mr-2" />
                My Tickets
              </TabsTrigger>
            </TabsList>

            {/* FAQs Tab */}
            <TabsContent value="faqs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Find quick answers to common questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search and Filter */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search FAQs..."
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        className="pl-10"
                        data-testid="faq-search"
                      />
                    </div>
                    <Select value={selectedFaqCategory} onValueChange={setSelectedFaqCategory}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {faqCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* FAQs List */}
                  {filteredFaqs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No FAQs found matching your search
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {filteredFaqs.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id}>
                          <AccordionTrigger data-testid={`faq-${faq.id}`}>
                            <div className="flex items-start gap-3 text-left">
                              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{faq.question}</span>
                                <span className="ml-2 text-xs text-gray-500">({faq.category})</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-8 pt-2 text-gray-700 whitespace-pre-wrap">
                              {faq.answer}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Help Documentation Tab */}
            <TabsContent value="help" className="space-y-6">
              {selectedDoc ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedDoc.title}</CardTitle>
                        <CardDescription>
                          {selectedDoc.category} • {selectedDoc.views} views
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                        ← Back
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700">
                        {selectedDoc.content}
                      </div>
                    </div>
                    {selectedDoc.tags.length > 0 && (
                      <div className="mt-6 flex gap-2 flex-wrap">
                        {selectedDoc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Help Documentation</CardTitle>
                    <CardDescription>Comprehensive guides and tutorials</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search help documents..."
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        className="pl-10"
                        data-testid="doc-search"
                      />
                    </div>

                    {/* Documents Grid */}
                    {filteredDocs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No help documents found
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredDocs.map((doc) => (
                          <Card
                            key={doc.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => fetchHelpDoc(doc.id)}
                            data-testid={`help-doc-${doc.id}`}
                          >
                            <CardHeader>
                              <CardTitle className="text-lg flex items-start gap-2">
                                <BookOpen className="h-5 w-5 text-purple-600 mt-0.5" />
                                {doc.title}
                              </CardTitle>
                              <CardDescription>{doc.category}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {doc.content.substring(0, 100)}...
                              </p>
                              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                <span>{doc.views} views</span>
                                <span className="text-blue-600 font-medium">Read more →</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* My Tickets Tab */}
            <TabsContent value="tickets" className="space-y-6">
              {!user ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
                    <p className="text-gray-600 mb-4">
                      Please log in to submit and view your support tickets
                    </p>
                    <Button onClick={() => navigate("/login")}>Log In</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Create Ticket Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Support Ticket</CardTitle>
                      <CardDescription>Describe your issue and we'll help you resolve it</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={submitTicket} className="space-y-4">
                        <div>
                          <Label htmlFor="subject">Subject *</Label>
                          <Input
                            id="subject"
                            placeholder="Brief description of your issue"
                            value={ticketForm.subject}
                            onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                            required
                            data-testid="ticket-subject"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            placeholder="Provide detailed information about your issue..."
                            value={ticketForm.description}
                            onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                            rows={5}
                            required
                            data-testid="ticket-description"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select
                              value={ticketForm.category}
                              onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}
                            >
                              <SelectTrigger data-testid="ticket-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">Technical</SelectItem>
                                <SelectItem value="account">Account</SelectItem>
                                <SelectItem value="matching">Matching</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                              value={ticketForm.priority}
                              onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                            >
                              <SelectTrigger data-testid="ticket-priority">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={submitting} data-testid="submit-ticket-btn">
                          <Send className="h-4 w-4 mr-2" />
                          {submitting ? "Submitting..." : "Submit Ticket"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* My Tickets List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>My Tickets</CardTitle>
                      <CardDescription>View and track your support requests</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {myTickets.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No tickets yet. Create your first ticket above!
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {myTickets.map((ticket) => (
                            <Card key={ticket.id} data-testid={`ticket-${ticket.id}`}>
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getStatusIcon(ticket.status)}
                                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {getStatusBadge(ticket.status)}
                                      {getPriorityBadge(ticket.priority)}
                                      <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
                                      <span className="text-xs text-gray-500">
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {ticket.description}
                                  </p>
                                </div>
                                {ticket.admin_response && (
                                  <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded">
                                    <p className="text-sm font-medium text-blue-900 mb-1">Admin Response:</p>
                                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                      {ticket.admin_response}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
