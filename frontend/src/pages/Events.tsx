import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OrganDonationChatbot from "@/components/OrganDonationChatbot";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Plus, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Events = () => {
  const { toast } = useToast();
  const [showEventForm, setShowEventForm] = useState(false);

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Event Created!",
      description: "Your event has been added to the community calendar.",
    });
    setShowEventForm(false);
  };

  const upcomingEvents = [
    {
      title: "National Organ Donation Day",
      date: "August 13, 2025",
      time: "10:00 AM - 4:00 PM",
      location: "Pan-India Virtual Event",
      organizer: "OrganConnect",
      description: "Join us for a nationwide celebration and awareness campaign for organ donation.",
      attendees: 1234,
    },
    {
      title: "Awareness Walk - Delhi",
      date: "September 5, 2025",
      time: "7:00 AM - 9:00 AM",
      location: "India Gate, New Delhi",
      organizer: "Organ India",
      description: "Community walk to raise awareness about organ donation in the capital.",
      attendees: 456,
    },
    {
      title: "Medical Seminar on Transplants",
      date: "October 12, 2025",
      time: "2:00 PM - 6:00 PM",
      location: "AIIMS, Mumbai",
      organizer: "MOHAN Foundation",
      description: "Educational seminar for medical professionals and interested individuals.",
      attendees: 289,
    },
    {
      title: "Blood Donation Camp",
      date: "November 20, 2025",
      time: "9:00 AM - 5:00 PM",
      location: "Community Center, Bangalore",
      organizer: "Red Cross India",
      description: "Special blood donation drive in support of transplant patients.",
      attendees: 567,
    },
    {
      title: "Family Support Workshop",
      date: "December 8, 2025",
      time: "3:00 PM - 6:00 PM",
      location: "Online Event",
      organizer: "OrganConnect",
      description: "Support session for families of organ recipients and donors.",
      attendees: 123,
    },
    {
      title: "Youth Awareness Drive",
      date: "January 15, 2026",
      time: "11:00 AM - 2:00 PM",
      location: "Multiple Cities",
      organizer: "Organ India",
      description: "Educational program targeting college students and young adults.",
      attendees: 890,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <OrganDonationChatbot />

      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4 border-2 border-accent">
              <Calendar className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Community <span className="bg-gradient-hero bg-clip-text text-transparent">Events</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join awareness campaigns, medical seminars, and community gatherings to make a difference.
            </p>
          </div>

          {/* Create Event Button */}
          <div className="flex justify-center mb-12">
            <Button 
              onClick={() => setShowEventForm(!showEventForm)} 
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-medium gap-2"
            >
              <Plus className="h-5 w-5" />
              Create New Event
            </Button>
          </div>

          {/* Event Creation Form */}
          {showEventForm && (
            <Card className="p-8 mb-12 shadow-strong border-accent/20 max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold mb-6">Create Your Event</h3>
              <form onSubmit={handleEventSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="event-title">Event Title</Label>
                  <Input id="event-title" placeholder="Enter event name" required className="mt-2" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-date">Date</Label>
                    <Input id="event-date" type="date" required className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="event-time">Time</Label>
                    <Input id="event-time" type="time" required className="mt-2" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="event-location">Location</Label>
                  <Input id="event-location" placeholder="Enter event location" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    placeholder="Describe your event..."
                    className="min-h-[120px] mt-2"
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowEventForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Create Event
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Events Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event, index) => (
              <Card 
                key={index} 
                className="p-6 shadow-medium hover:shadow-strong transition-smooth border-l-4 border-l-accent group"
              >
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                  <Calendar className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-bold text-xl mb-3">{event.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {event.description}
                </p>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{event.attendees} attending</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">
                    Organized by <span className="font-semibold text-foreground">{event.organizer}</span>
                  </p>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Register Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <section className="mt-16">
            <Card className="p-8 lg:p-12 bg-gradient-hero text-primary-foreground text-center shadow-strong">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Host Your Own Event
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Organize awareness campaigns, workshops, or fundraisers in your community. Together, we can save more lives.
              </p>
              <Button 
                size="lg" 
                onClick={() => setShowEventForm(true)}
                className="bg-background text-foreground hover:bg-background/90 shadow-strong"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Event
              </Button>
            </Card>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Events;
