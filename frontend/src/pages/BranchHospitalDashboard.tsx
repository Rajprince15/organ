import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Clock,
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';

interface DonorApplication {
  id: string;
  donor_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  blood_group: string;
  organs: string[];
  city: string;
  state: string;
  country: string;
  checkup_status: string;
  checkup_date?: string;
  eligibility_report_url?: string;
  assigned_branch_hospital_name: string;
  created_at: string;
}

interface Stats {
  branch_hospital_name: string;
  total_assigned_donors: number;
  pending_checkup: number;
  checkup_completed: number;
  eligible_donors: number;
  not_eligible_donors: number;
}

export default function BranchHospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [donors, setDonors] = useState<DonorApplication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'branch_hospital') {
      navigate('/login');
      return;
    }

    fetchStats();
    fetchDonors('pending_checkup');
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/branch-hospital/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDonors = async (status?: string) => {
    try {
      setLoading(true);
      const url = new URL(`${import.meta.env.VITE_API_URL}/api/branch-hospital/assigned-donors`);
      if (status) {
        url.searchParams.append('status', status);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDonors(data.donors || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch donors',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching donors:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch donors',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    const statusMap: { [key: string]: string } = {
      'pending': 'pending_checkup',
      'completed': 'completed',
      'eligible': 'eligible',
      'not_eligible': 'not_eligible'
    };
    fetchDonors(statusMap[value]);
  };

  const handleFileUpload = async (donorId: string, file: File) => {
    // Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, JPG, or PNG file',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploadingFor(donorId);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/branch-hospital/donors/${donorId}/upload-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Report uploaded successfully'
        });
        fetchDonors(selectedTab === 'pending' ? 'pending_checkup' : selectedTab);
        fetchStats();
      } else {
        const error = await response.json();
        toast({
          title: 'Upload Failed',
          description: error.detail || 'Failed to upload report',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error uploading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload report',
        variant: 'destructive'
      });
    } finally {
      setUploadingFor(null);
    }
  };

  const handleMarkEligibility = async (donorId: string, status: 'eligible' | 'not_eligible') => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/branch-hospital/donors/${donorId}/mark-eligibility`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            eligibility_status: status
          })
        }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Donor marked as ${status === 'eligible' ? 'Eligible' : 'Not Eligible'}. Email notification sent.`
        });
        fetchDonors(selectedTab === 'pending' ? 'pending_checkup' : selectedTab);
        fetchStats();
      } else {
        const error = await response.json();
        toast({
          title: 'Failed',
          description: error.detail || 'Failed to update eligibility',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error marking eligibility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update eligibility',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; color: string } } = {
      'pending_checkup': { label: 'Pending Checkup', color: 'bg-yellow-500' },
      'completed': { label: 'Completed', color: 'bg-blue-500' },
      'eligible': { label: 'Eligible', color: 'bg-green-500' },
      'not_eligible': { label: 'Not Eligible', color: 'bg-red-500' }
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };

    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-8 lg:pt-32 lg:pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="branch-hospital-dashboard-title">
            {stats?.branch_hospital_name || 'Branch Hospital'} Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage donor eligibility assessments and checkups</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  <Users className="inline w-4 h-4 mr-1" />
                  Total Assigned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{stats.total_assigned_donors}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Pending Checkup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_checkup}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">
                  <FileText className="inline w-4 h-4 mr-1" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{stats.checkup_completed}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  <CheckCircle className="inline w-4 h-4 mr-1" />
                  Eligible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{stats.eligible_donors}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  <XCircle className="inline w-4 h-4 mr-1" />
                  Not Eligible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{stats.not_eligible_donors}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Donors List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Donors</CardTitle>
            <CardDescription>Review and process donor eligibility assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Pending Checkup ({stats?.pending_checkup || 0})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">
                  Completed ({stats?.checkup_completed || 0})
                </TabsTrigger>
                <TabsTrigger value="eligible" data-testid="tab-eligible">
                  Eligible ({stats?.eligible_donors || 0})
                </TabsTrigger>
                <TabsTrigger value="not_eligible" data-testid="tab-not-eligible">
                  Not Eligible ({stats?.not_eligible_donors || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab}>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : donors.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No donors found in this category</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {donors.map((donor) => (
                      <Card key={donor.id} className="hover:shadow-md transition-shadow" data-testid={`donor-card-${donor.donor_id}`}>
                        <CardContent className="pt-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Donor Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">{donor.full_name}</h3>
                                  <p className="text-sm text-gray-600">{donor.email} | {donor.phone}</p>
                                </div>
                                {getStatusBadge(donor.checkup_status)}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Blood Group:</span>
                                  <span className="ml-1 font-medium">{donor.blood_group}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Organs:</span>
                                  <span className="ml-1 font-medium">{donor.organs.join(', ')}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Location:</span>
                                  <span className="ml-1 font-medium">{donor.city}, {donor.state}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Registered:</span>
                                  <span className="ml-1 font-medium">
                                    {new Date(donor.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              {donor.eligibility_report_url && (
                                <div className="mt-3">
                                  <a
                                    href={`${import.meta.env.VITE_API_URL}${donor.eligibility_report_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm flex items-center"
                                    data-testid={`view-report-${donor.donor_id}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View Uploaded Report
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 lg:w-64">
                              {/* Upload Report */}
                              {(donor.checkup_status === 'pending_checkup' || donor.checkup_status === 'completed') && (
                                <div>
                                  <input
                                    type="file"
                                    id={`file-${donor.donor_id}`}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(donor.donor_id, file);
                                      }
                                    }}
                                    disabled={uploadingFor === donor.donor_id}
                                  />
                                  <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => document.getElementById(`file-${donor.donor_id}`)?.click()}
                                    disabled={uploadingFor === donor.donor_id}
                                    data-testid={`upload-report-btn-${donor.donor_id}`}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {uploadingFor === donor.donor_id ? 'Uploading...' : 'Upload Report'}
                                  </Button>
                                </div>
                              )}

                              {/* Mark Eligibility */}
                              {donor.checkup_status === 'completed' && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="default"
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleMarkEligibility(donor.donor_id, 'eligible')}
                                    data-testid={`mark-eligible-btn-${donor.donor_id}`}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Eligible
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => handleMarkEligibility(donor.donor_id, 'not_eligible')}
                                    data-testid={`mark-not-eligible-btn-${donor.donor_id}`}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Not Eligible
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
