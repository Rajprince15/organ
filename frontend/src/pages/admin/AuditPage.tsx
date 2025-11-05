import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuditPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

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
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                View admin actions and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogsTab token={token} />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}