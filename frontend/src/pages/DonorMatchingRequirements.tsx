import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Target, Droplet, Building2, Heart, AlertCircle, ArrowLeft, Phone, Mail, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const API_URL = import.meta.env.VITE_API_URL || '';

interface RequirementMatch {
  requirement: {
    id: string;
    hospital_name: string;
    patient_name: string;
    age: number;
    blood_group: string;
    organ_required: string;
    urgency_level: 'critical' | 'high' | 'medium';
    doctor_name: string;
    contact_number: string;
    email: string;
    medical_history: string;
    status: string;
    created_at: string;
  };
  match_score: number;
  score_breakdown: {
    organ_match: number;
    blood_compatibility: number;
    location_proximity: number;
    age_suitability: number;
    total_score: number;
  };
}

const DonorMatchingRequirements = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<RequirementMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'donor') {
      navigate('/');
      return;
    }
    fetchMatches();
  }, [user, navigate]);

  const fetchMatches = async () => {
    try {
      const response = await fetch(`${API_URL}/api/matches/requirements/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
        setMessage(data.message || '');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load matching requirements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMatches = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/api/matches/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Matches Refreshed',
          description: `Found ${data.new_matches} matching requirement${data.new_matches !== 1 ? 's' : ''}`,
        });
        await fetchMatches();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh matches',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 250) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 200) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 150) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    if (urgency === 'critical') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <p className="text-muted-foreground">Loading matching requirements...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/donor-dashboard')}
              className="mb-4"
              data-testid="back-to-dashboard-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Matching <span className="bg-gradient-hero bg-clip-text text-transparent">Requirements</span>
                </h1>
                <p className="text-muted-foreground">
                  {matches.length > 0
                    ? `${matches.length} hospital${matches.length !== 1 ? 's' : ''} need your help`
                    : 'No matching requirements found at this time'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefreshMatches}
                disabled={refreshing}
                data-testid="refresh-matches-button"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Matches
              </Button>
            </div>
          </div>

          {/* Stats Card */}
          {matches.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Heart className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Matches</p>
                    <p className="text-3xl font-bold text-red-600">{matches.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Critical Cases</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {matches.filter(m => m.requirement.urgency_level === 'critical').length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Match Score</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {matches.length > 0 ? Math.round(matches.reduce((sum, m) => sum + m.match_score, 0) / matches.length) : 0}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {message && matches.length === 0 && (
            <Card className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-4">
                <Heart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Matches Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
              <Button onClick={handleRefreshMatches} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Check for New Matches
              </Button>
            </Card>
          )}

          {matches.length === 0 && !message && (
            <Card className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-4">
                <Heart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Matching Requirements</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                There are no matching requirements at this time. Check back later or refresh to see new requirements.
              </p>
              <Button onClick={handleRefreshMatches} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Matches
              </Button>
            </Card>
          )}

          {/* Matching Requirements List */}
          {matches.length > 0 && (
            <div className="space-y-6">
              {matches.map((match) => (
                <Card
                  key={match.requirement.id}
                  className={`p-6 hover:shadow-strong transition-all ${
                    match.requirement.urgency_level === 'critical' ? 'border-2 border-red-300 bg-red-50/30' : ''
                  }`}
                  data-testid={`requirement-card-${match.requirement.id}`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                        <Building2 className="h-8 w-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-bold">{match.requirement.hospital_name}</h3>
                          <Badge className={`${getUrgencyColor(match.requirement.urgency_level)} flex items-center gap-1`}>
                            {getUrgencyIcon(match.requirement.urgency_level)}
                            {match.requirement.urgency_level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          Patient: <span className="font-semibold">{match.requirement.patient_name}</span>, Age {match.requirement.age}
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <div
                        className={`inline-flex items-center justify-center h-20 w-20 rounded-full font-bold text-2xl border-4 ${getScoreColor(
                          match.match_score
                        )}`}
                        data-testid="match-score"
                      >
                        {match.match_score}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">Match Score</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Organ Needed</p>
                      <Badge variant="secondary" className="text-lg font-semibold px-4 py-2">
                        <Heart className="h-4 w-4 mr-2" />
                        {match.requirement.organ_required}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Blood Group</p>
                      <Badge variant="outline" className="text-lg font-semibold px-4 py-2">
                        <Droplet className="h-4 w-4 mr-2" />
                        {match.requirement.blood_group}
                      </Badge>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contact Information
                    </h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Doctor</p>
                        <p className="font-medium">{match.requirement.doctor_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Phone</p>
                        <a
                          href={`tel:${match.requirement.contact_number}`}
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {match.requirement.contact_number}
                        </a>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Email</p>
                        <a
                          href={`mailto:${match.requirement.email}`}
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {match.requirement.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {match.requirement.medical_history && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Medical History</p>
                      <p className="text-sm text-blue-800">{match.requirement.medical_history}</p>
                    </div>
                  )}

                  {/* Score Breakdown */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold mb-3 text-muted-foreground">Match Score Breakdown</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {match.score_breakdown.organ_match}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Organ Match</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {match.score_breakdown.blood_compatibility}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Blood</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">
                          {match.score_breakdown.location_proximity}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Location</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">
                          {match.score_breakdown.age_suitability}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Age</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground text-right">
                    Posted on {new Date(match.requirement.created_at).toLocaleDateString()}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DonorMatchingRequirements;
