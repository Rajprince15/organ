import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Send, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface BroadcastNotificationsProps {
  token: string;
}

export const BroadcastNotifications = ({ token }: BroadcastNotificationsProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendNotification = async () => {
    if (!message.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/broadcast-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          target_role: targetRole === "all" ? null : targetRole
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({ 
          title: "Notification sent successfully", 
          description: `Sent to ${data.sent_count} users` 
        });
        setMessage("");
        setTargetRole("all");
        setOpen(false);
      } else {
        toast({ title: "Failed to send notification", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error sending notification", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Broadcast Notifications
        </CardTitle>
        <CardDescription>
          Send notifications to all users or specific user groups
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-6 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Platform-Wide Announcements</h3>
                <p className="text-sm text-muted-foreground">
                  Send important updates to all users or filter by role
                </p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="open-broadcast-dialog">
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Broadcast Notification</DialogTitle>
                  <DialogDescription>
                    Send a notification to users. Choose target audience and compose your message.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-role">Target Audience</Label>
                    <Select value={targetRole} onValueChange={setTargetRole}>
                      <SelectTrigger id="target-role" data-testid="target-role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="donor">Donors Only</SelectItem>
                        <SelectItem value="hospital">Hospitals Only</SelectItem>
                        <SelectItem value="admin">Admins Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your notification message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      data-testid="notification-message"
                    />
                    <p className="text-xs text-muted-foreground">
                      {message.length} characters
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendNotification} disabled={sending} data-testid="send-notification-btn">
                    {sending ? "Sending..." : "Send Notification"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Last Broadcast</p>
              <p className="text-lg font-semibold">Not available</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Sent Today</p>
              <p className="text-lg font-semibold">-</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Delivery Rate</p>
              <p className="text-lg font-semibold">-</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};