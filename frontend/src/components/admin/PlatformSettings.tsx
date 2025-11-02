import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface PlatformSettingsProps {
  token: string;
}

interface Settings {
  site_name: string;
  site_logo: string | null;
  maintenance_mode: boolean;
  public_registration_enabled: boolean;
  email_service_enabled: boolean;
  sms_service_enabled: boolean;
  auto_archive_days: number;
}

export const PlatformSettings = ({ token }: PlatformSettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    site_name: "Organ Donation Platform",
    site_logo: null,
    maintenance_mode: false,
    public_registration_enabled: true,
    email_service_enabled: false,
    sms_service_enabled: false,
    auto_archive_days: 365
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      toast({ title: "Failed to fetch settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({ title: "Settings saved successfully" });
      } else {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Platform Settings
          </CardTitle>
          <CardDescription>
            Configure platform-wide settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General</h3>
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                data-testid="site-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-logo">Site Logo URL</Label>
              <Input
                id="site-logo"
                value={settings.site_logo || ""}
                onChange={(e) => setSettings({ ...settings, site_logo: e.target.value })}
                placeholder="https://example.com/logo.png"
                data-testid="site-logo-input"
              />
            </div>
          </div>

          <Separator />

          {/* Access Control */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Access Control</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable platform access for maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
                data-testid="maintenance-mode-toggle"
              />
            </div>
            {settings.maintenance_mode && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Platform is currently in maintenance mode. Only admins can access.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to register on the platform
                </p>
              </div>
              <Switch
                checked={settings.public_registration_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, public_registration_enabled: checked })}
                data-testid="registration-toggle"
              />
            </div>
          </div>

          <Separator />

          {/* Service Toggles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Service Integrations</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Service</Label>
                <p className="text-sm text-muted-foreground">
                  Enable email notifications and alerts
                </p>
              </div>
              <Switch
                checked={settings.email_service_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, email_service_enabled: checked })}
                data-testid="email-service-toggle"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Service</Label>
                <p className="text-sm text-muted-foreground">
                  Enable SMS notifications for urgent alerts
                </p>
              </div>
              <Switch
                checked={settings.sms_service_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, sms_service_enabled: checked })}
                data-testid="sms-service-toggle"
              />
            </div>
          </div>

          <Separator />

          {/* Data Retention */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Data Retention</h3>
            <div className="space-y-2">
              <Label htmlFor="auto-archive">Auto-Archive After (Days)</Label>
              <Input
                id="auto-archive"
                type="number"
                value={settings.auto_archive_days}
                onChange={(e) => setSettings({ ...settings, auto_archive_days: parseInt(e.target.value) || 365 })}
                data-testid="auto-archive-input"
              />
              <p className="text-sm text-muted-foreground">
                Automatically archive inactive records after specified days
              </p>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};