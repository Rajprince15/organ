import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Target, MapPin, Droplet, Building2, Heart, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export const DonorMatchedRequirements: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<RequirementMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    fetchMatches();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 250) return 'text-green-600 bg-green-50';
    if (score >= 200) return 'text-blue-600 bg-blue-50';
    if (score >= 150) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="donor-matched-requirements-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Matching Requirements
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {matches.length > 0
              ? `${matches.length} hospital${matches.length !== 1 ? 's' : ''} need${matches.length === 1 ? 's' : ''} your help`
              : 'No matching requirements found'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshMatches}
          disabled={refreshing}
          data-testid="refresh-matches-button"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {message && matches.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">{message}</p>
        </div>
      )}

      {matches.length === 0 && !message && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">No matching requirements found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back later or refresh to see new requirements
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card
              key={match.requirement.id}
              className={`p-5 hover:shadow-md transition-all border-2 ${
                match.requirement.urgency_level === 'critical' ? 'border-red-200 bg-red-50/30' : ''
              }`}
              data-testid={`requirement-match-${match.requirement.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        {match.requirement.hospital_name}
                        <Badge className={`${getUrgencyColor(match.requirement.urgency_level)} flex items-center gap-1`}>
                          {getUrgencyIcon(match.requirement.urgency_level)}
                          {match.requirement.urgency_level.toUpperCase()}
                        </Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Patient: {match.requirement.patient_name}, Age {match.requirement.age}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Organ Needed:</span>
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-sm font-semibold">
                          {match.requirement.organ_required}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Blood Group:</span>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-sm">
                          <Droplet className="h-3 w-3 mr-1" />
                          {match.requirement.blood_group}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Doctor:</span>{' '}
                      <span className="font-medium">{match.requirement.doctor_name}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Contact:</span>{' '}
                      <span className="font-medium">{match.requirement.contact_number}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      <span className="font-medium">{match.requirement.email}</span>
                    </p>
                  </div>

                  {match.requirement.medical_history && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Medical History:</p>
                      <p className="text-sm">{match.requirement.medical_history}</p>
                    </div>
                  )}
                </div>

                <div className="text-right ml-4">
                  <div
                    className={`inline-flex items-center justify-center h-16 w-16 rounded-full font-bold text-lg ${getScoreColor(
                      match.match_score
                    )}`}
                    data-testid="match-score"
                  >
                    {match.match_score}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Match Score</p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    {match.score_breakdown.organ_match}
                  </div>
                  <div className="text-muted-foreground">Organ</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {match.score_breakdown.blood_compatibility}
                  </div>
                  <div className="text-muted-foreground">Blood</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">
                    {match.score_breakdown.location_proximity}
                  </div>
                  <div className="text-muted-foreground">Location</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">
                    {match.score_breakdown.age_suitability}
                  </div>
                  <div className="text-muted-foreground">Age</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};
