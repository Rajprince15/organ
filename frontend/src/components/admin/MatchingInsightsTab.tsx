import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Settings as SettingsIcon,
  BarChart3,
  RefreshCw
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

interface MatchLog {
  id: string;
  match_type: string;
  donor_id: string;
  donor_name: string;
  requirement_id: string;
  requirement_details: string;
  hospital_id: string;
  hospital_name: string;
  match_score: number;
  score_breakdown: {
    organ_match: number;
    blood_compatibility: number;
    location_proximity: number;
    age_suitability: number;
    base_score: number;
    urgency_multiplier: number;
    total_score: number;
  };
  status: string;
  admin_notes?: string;
  created_at: string;
}

interface MatchAnalytics {
  total_matches: number;
  avg_match_score: number;
  status_distribution: Record<string, number>;
  top_hospitals: Array<{ name: string; match_count: number }>;
  match_score_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  recent_matches: MatchLog[];
}

interface AlgorithmConfig {
  id: string;
  organ_match_weight: number;
  blood_compatibility_weight: number;
  location_proximity_weight: number;
  age_suitability_weight: number;
  critical_urgency_multiplier: number;
  high_urgency_multiplier: number;
  medium_urgency_multiplier: number;
  min_match_score_threshold: number;
  updated_at?: string;
}

export function MatchingInsightsTab() {
  const { toast } = useToast();
  const [matchLogs, setMatchLogs] = useState<MatchLog[]>([]);
  const [analytics, setAnalytics] = useState<MatchAnalytics | null>(null);
  const [algorithmConfig, setAlgorithmConfig] = useState<AlgorithmConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchLog | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchMatchLogs();
    fetchAnalytics();
    fetchAlgorithmConfig();
  }, [filterStatus]);

  const fetchMatchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const statusParam = filterStatus !== "all" ? `&status=${filterStatus}` : "";
      
      const response = await fetch(`${API_URL}/api/admin/match-logs?limit=100${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch match logs");

      const data = await response.json();
      setMatchLogs(data.logs || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load match logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/match-analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load match analytics",
        variant: "destructive",
      });
    }
  };

  const fetchAlgorithmConfig = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/algorithm-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch algorithm config");

      const data = await response.json();
      setAlgorithmConfig(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load algorithm configuration",
        variant: "destructive",
      });
    }
  };

  const handleApprovalAction = async () => {
    if (!selectedMatch) return;

    try {
      const token = localStorage.getItem("token");
      const endpoint = approvalAction === "approve" ? "approve" : "reject";
      
      const response = await fetch(
        `${API_URL}/api/admin/match-logs/${selectedMatch.id}/${endpoint}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            admin_notes: adminNotes,
          }),
        }
      );

      if (!response.ok) throw new Error(`Failed to ${approvalAction} match`);

      toast({
        title: "Success",
        description: `Match ${approvalAction === "approve" ? "approved" : "rejected"} successfully`,
      });

      setShowApprovalDialog(false);
      setAdminNotes("");
      fetchMatchLogs();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${approvalAction} match`,
        variant: "destructive",
      });
    }
  };

  const updateAlgorithmConfig = async () => {
    if (!algorithmConfig) return;

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/admin/algorithm-config`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(algorithmConfig),
      });

      if (!response.ok) throw new Error("Failed to update algorithm config");

      toast({
        title: "Success",
        description: "Algorithm configuration updated successfully",
      });

      fetchAlgorithmConfig();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update algorithm configuration",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      auto_matched: { variant: "default", label: "Auto Matched" },
      manually_approved: { variant: "secondary", label: "Approved" },
      manually_rejected: { variant: "destructive", label: "Rejected" },
      pending: { variant: "outline", label: "Pending" },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 200) return <Badge className="bg-green-600">Excellent ({score})</Badge>;
    if (score >= 150) return <Badge className="bg-blue-600">Good ({score})</Badge>;
    if (score >= 100) return <Badge className="bg-yellow-600">Fair ({score})</Badge>;
    return <Badge variant="destructive">Poor ({score})</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">
            <Target className="h-4 w-4 mr-2" />
            Match Logs
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Analytics
          </TabsTrigger>
          <TabsTrigger value="config">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Algorithm Settings
          </TabsTrigger>
        </TabsList>

        {/* Match Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Match Logs</CardTitle>
                  <CardDescription>All donor-requirement matches tracked by the system</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Matches</SelectItem>
                      <SelectItem value="auto_matched">Auto Matched</SelectItem>
                      <SelectItem value="manually_approved">Approved</SelectItem>
                      <SelectItem value="manually_rejected">Rejected</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchMatchLogs} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading match logs...</div>
              ) : matchLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No match logs found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Donor</TableHead>
                        <TableHead>Requirement</TableHead>
                        <TableHead>Hospital</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchLogs.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium">{match.donor_name}</TableCell>
                          <TableCell>{match.requirement_details}</TableCell>
                          <TableCell>{match.hospital_name}</TableCell>
                          <TableCell>{getScoreBadge(match.match_score)}</TableCell>
                          <TableCell>{getStatusBadge(match.status)}</TableCell>
                          <TableCell>{new Date(match.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {match.status === "auto_matched" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedMatch(match);
                                      setApprovalAction("approve");
                                      setShowApprovalDialog(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedMatch(match);
                                      setApprovalAction("reject");
                                      setShowApprovalDialog(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics?.total_matches || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics?.avg_match_score.toFixed(1) || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Excellent Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {analytics?.match_score_distribution.excellent || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Good Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {analytics?.match_score_distribution.good || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Top Hospitals by Match Count</CardTitle>
              <CardDescription>Hospitals with the most matches in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.top_hospitals && analytics.top_hospitals.length > 0 ? (
                <div className="space-y-4">
                  {analytics.top_hospitals.map((hospital, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{hospital.name}</p>
                      </div>
                      <Badge variant="secondary">{hospital.match_count} matches</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hospital data available</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics?.status_distribution && Object.entries(analytics.status_distribution).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="capitalize">{status.replace(/_/g, " ")}</span>
                    <Badge>{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Algorithm Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Configuration</CardTitle>
              <CardDescription>
                Adjust matching algorithm weights and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {algorithmConfig && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="organ_weight">Organ Match Weight</Label>
                      <Input
                        id="organ_weight"
                        type="number"
                        value={algorithmConfig.organ_match_weight}
                        onChange={(e) =>
                          setAlgorithmConfig({
                            ...algorithmConfig,
                            organ_match_weight: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Current: {algorithmConfig.organ_match_weight} points
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="blood_weight">Blood Compatibility Weight</Label>
                      <Input
                        id="blood_weight"
                        type="number"
                        value={algorithmConfig.blood_compatibility_weight}
                        onChange={(e) =>
                          setAlgorithmConfig({
                            ...algorithmConfig,
                            blood_compatibility_weight: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Current: {algorithmConfig.blood_compatibility_weight} points
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location_weight">Location Proximity Weight</Label>
                      <Input
                        id="location_weight"
                        type="number"
                        value={algorithmConfig.location_proximity_weight}
                        onChange={(e) =>
                          setAlgorithmConfig({
                            ...algorithmConfig,
                            location_proximity_weight: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Current: {algorithmConfig.location_proximity_weight} points
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age_weight">Age Suitability Weight</Label>
                      <Input
                        id="age_weight"
                        type="number"
                        value={algorithmConfig.age_suitability_weight}
                        onChange={(e) =>
                          setAlgorithmConfig({
                            ...algorithmConfig,
                            age_suitability_weight: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Current: {algorithmConfig.age_suitability_weight} points
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Urgency Multipliers</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="critical_multiplier">Critical Urgency</Label>
                        <Input
                          id="critical_multiplier"
                          type="number"
                          step="0.1"
                          value={algorithmConfig.critical_urgency_multiplier}
                          onChange={(e) =>
                            setAlgorithmConfig({
                              ...algorithmConfig,
                              critical_urgency_multiplier: parseFloat(e.target.value),
                            })
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          {algorithmConfig.critical_urgency_multiplier}x multiplier
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="high_multiplier">High Urgency</Label>
                        <Input
                          id="high_multiplier"
                          type="number"
                          step="0.1"
                          value={algorithmConfig.high_urgency_multiplier}
                          onChange={(e) =>
                            setAlgorithmConfig({
                              ...algorithmConfig,
                              high_urgency_multiplier: parseFloat(e.target.value),
                            })
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          {algorithmConfig.high_urgency_multiplier}x multiplier
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="medium_multiplier">Medium Urgency</Label>
                        <Input
                          id="medium_multiplier"
                          type="number"
                          step="0.1"
                          value={algorithmConfig.medium_urgency_multiplier}
                          onChange={(e) =>
                            setAlgorithmConfig({
                              ...algorithmConfig,
                              medium_urgency_multiplier: parseFloat(e.target.value),
                            })
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          {algorithmConfig.medium_urgency_multiplier}x multiplier
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="threshold">Minimum Match Score Threshold</Label>
                      <Input
                        id="threshold"
                        type="number"
                        value={algorithmConfig.min_match_score_threshold}
                        onChange={(e) =>
                          setAlgorithmConfig({
                            ...algorithmConfig,
                            min_match_score_threshold: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Matches below {algorithmConfig.min_match_score_threshold} points won't be shown
                      </p>
                    </div>
                  </div>

                  <Button onClick={updateAlgorithmConfig} className="w-full">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Update Algorithm Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval/Rejection Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve" : "Reject"} Match
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? "Manually approve this match between donor and requirement"
                : "Manually reject this match"}
            </DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Donor: {selectedMatch.donor_name}</p>
                <p className="text-sm text-muted-foreground">
                  Requirement: {selectedMatch.requirement_details}
                </p>
                <p className="text-sm text-muted-foreground">
                  Hospital: {selectedMatch.hospital_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Match Score: {selectedMatch.match_score}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="admin_notes"
                  placeholder="Add notes about this decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprovalAction}
              variant={approvalAction === "approve" ? "default" : "destructive"}
            >
              {approvalAction === "approve" ? "Approve Match" : "Reject Match"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
