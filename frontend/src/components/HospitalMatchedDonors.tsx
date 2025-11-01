import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Target, MapPin, Droplet, User, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

interface DonorMatch {
  donor: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    blood_group: string;
    organs: string[];
    city: string;
    state: string;
    date_of_birth: string;
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

interface HospitalMatchedDonorsProps {
  requirementId: string;
  requirementDetails?: {
    organ_required: string;
    blood_group: string;
    urgency_level: string;
  };
}

export const HospitalMatchedDonors: React.FC<HospitalMatchedDonorsProps> = ({
  requirementId,
  requirementDetails,
}) => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/matches/donors/${requirementId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
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
          description: `Found ${data.new_matches} matching donor${data.new_matches !== 1 ? 's' : ''}`,
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
  }, [requirementId]);

  const getScoreColor = (score: number) => {
    if (score >= 250) return 'text-green-600 bg-green-50';
    if (score >= 200) return 'text-blue-600 bg-blue-50';
    if (score >= 150) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
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
    <Card className="p-6" data-testid="hospital-matched-donors-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Compatible Donors
            {requirementDetails && (
              <Badge className={getUrgencyColor(requirementDetails.urgency_level)}>
                {requirementDetails.urgency_level}
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {matches.length} donor{matches.length !== 1 ? 's' : ''} match{matches.length === 1 ? 'es' : ''} your requirement
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

      {matches.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">No compatible donors found yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try refreshing or adjust your requirements
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card
              key={match.donor.id}
              className="p-4 hover:shadow-md transition-shadow"
              data-testid={`donor-match-${match.donor.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                      {match.donor.full_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{match.donor.full_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Droplet className="h-3 w-3 mr-1" />
                          {match.donor.blood_group}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {match.donor.city}, {match.donor.state}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Organs:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {match.donor.organs.map((organ) => (
                          <Badge key={organ} variant="secondary" className="text-xs">
                            {organ}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact:</span>
                      <div className="mt-1 text-xs">
                        <p>{match.donor.email}</p>
                        <p>{match.donor.phone}</p>
                      </div>
                    </div>
                  </div>
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
