import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FileText, Download, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface DonationApplication {
  id: string;
  full_name: string;
  status: string;
  checkup_status?: "pending_checkup" | "scheduled" | "completed" | "eligible" | "not_eligible" | "none";
  checkup_date?: string;
  eligibility_report_url?: string;
  assigned_branch_hospital_name?: string;
}

interface BranchHospital {
  name: string;
  email: string;
  contact_number: string;
  address: string;
  city: string;
  state: string;
}

const MyReports = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [application, setApplication] = useState<DonationApplication | null>(null);
  const [branchHospital, setBranchHospital] = useState<BranchHospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "donor") {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate, token]);

  const fetchData = async () => {
    try {
      // Fetch donation application
      const appResponse = await fetch(`${API_URL}/api/donations/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (appResponse.ok) {
        const appData = await appResponse.json();
        setApplication(appData);

        // Fetch branch hospital info if assigned
        if (appData?.assigned_branch_hospital_id) {
          const branchResponse = await fetch(`${API_URL}/api/donations/me/branch-hospital`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (branchResponse.ok) {
            const branchData = await branchResponse.json();
            if (branchData.assigned && branchData.branch_hospital) {
              setBranchHospital(branchData.branch_hospital);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!application?.eligibility_report_url) return;

    setDownloading(true);
    try {
      const response = await fetch(`${API_URL}/api/donations/me/report`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eligibility-report-${application.full_name.replace(/\s/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Report downloaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getCheckupStatusInfo = (status: string | undefined) => {
    switch (status) {
      case "eligible":
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          label: "Eligible",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          description: "Congratulations! You have been cleared for organ donation."
        };
      case "not_eligible":
        return {
          icon: <XCircle className="h-8 w-8 text-red-500" />,
          label: "Not Eligible",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          description: "Unfortunately, you are currently not eligible for organ donation based on medical assessment."
        };
      case "completed":
        return {
          icon: <Clock className="h-8 w-8 text-blue-500" />,
          label: "Under Review",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          description: "Your checkup has been completed. Your report is under review by our team."
        };
      case "pending_checkup":
        return {
          icon: <Clock className="h-8 w-8 text-yellow-500" />,
          label: "Pending Checkup",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          description: "Please schedule your eligibility checkup with the assigned branch hospital."
        };
      default:
        return {
          icon: <AlertCircle className="h-8 w-8 text-gray-500" />,
          label: "No Status",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          description: "No checkup information available yet."
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <p className="text-center">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className="p-8 text-center">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Application Found</h2>
              <p className="text-muted-foreground mb-6">
                You haven't created a donation application yet.
              </p>
              <Button onClick={() => navigate('/donor-dashboard')}>
                Go to Dashboard
              </Button>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusInfo = getCheckupStatusInfo(application.checkup_status);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/donor-dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              My <span className="bg-gradient-hero bg-clip-text text-transparent">Reports</span>
            </h1>
            <p className="text-muted-foreground">
              View and download your eligibility reports and checkup status
            </p>
          </div>

          {/* Eligibility Status Card */}
          <Card className={`p-8 mb-6 ${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {statusInfo.icon}
              </div>
              <div className="flex-1">
                <h2 className={`text-2xl font-bold mb-2 ${statusInfo.color}`}>
                  {statusInfo.label}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {statusInfo.description}
                </p>
                
                {application.checkup_date && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Checkup Date:</strong> {new Date(application.checkup_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Branch Hospital Info */}
          {branchHospital && (
            <Card className="p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Assigned Branch Hospital</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {branchHospital.name}</p>
                <p><strong>Address:</strong> {branchHospital.address}, {branchHospital.city}, {branchHospital.state}</p>
                <p><strong>Phone:</strong> {branchHospital.contact_number}</p>
                <p><strong>Email:</strong> {branchHospital.email}</p>
              </div>
            </Card>
          )}

          {/* Report Download Section */}
          {application.eligibility_report_url ? (
            <Card className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Eligibility Report</h3>
                    <p className="text-sm text-muted-foreground">
                      Your eligibility checkup report from {application.assigned_branch_hospital_name || "branch hospital"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={downloadReport}
                  disabled={downloading}
                  size="lg"
                  data-testid="download-report-button"
                >
                  <Download className="h-5 w-5 mr-2" />
                  {downloading ? "Downloading..." : "Download Report"}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Report Available</h3>
              <p className="text-muted-foreground">
                {application.checkup_status === "pending_checkup"
                  ? "Your eligibility report will be available after you complete your checkup at the assigned branch hospital."
                  : "Your eligibility report is not yet available. Please contact the branch hospital for more information."}
              </p>
            </Card>
          )}

          {/* Help Section */}
          <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you have questions about your eligibility status or report, please contact:
            </p>
            <div className="space-y-2 text-sm">
              {branchHospital ? (
                <>
                  <p><strong>Branch Hospital:</strong> {branchHospital.name}</p>
                  <p><strong>Phone:</strong> {branchHospital.contact_number}</p>
                </>
              ) : (
                <p>Support Email: support@organconnect.com</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MyReports;
