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
import { Calendar, Edit, Trash2, ArrowLeft, Plus } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

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

export default function EventsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '' });

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
      return;
    }
    if (user && user.role === "admin") {
      fetchEvents();
    }
  }, [user, navigate]);

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
    } finally {
      setLoading(false);
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
        setIsCreating(false);
        fetchEvents();
      } else {
        toast({ title: "Failed to create event", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error creating event", variant: "destructive" });
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
            <Button onClick={() => setIsCreating(true)} data-testid="create-event-btn">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Events Management</CardTitle>
              <CardDescription>
                Create and manage community events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading events...</div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Event Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
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
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}