import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Users, Heart, Building2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface AnalyticsDashboardProps {
  token: string;
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export const AnalyticsDashboard = ({ token }: AnalyticsDashboardProps) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/analytics/detailed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      toast({ title: "Failed to fetch analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  const metrics = analytics.real_time_metrics;
  const trends = analytics.trends;

  return (
    <div className="space-y-6">
      {/* Real-Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Platform Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_users}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {trends.users_trend} vs last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Users This Week
            </CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.new_users_this_week}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active registrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Match Success Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.match_success_rate}%</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {trends.matches_trend} vs last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Match Time
            </CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avg_match_time_days} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Time to first contact
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.user_growth.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Users" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Organ Demand Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Organ Demand Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.organ_demand}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.organ_demand.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Group Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Blood Group Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.blood_group_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#EF4444" name="Donors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution (Top States)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.location_distribution.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10B981" name="Donors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">New Donations</p>
              <p className="text-2xl font-bold text-green-600">{metrics.new_donations_this_week}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">New Requirements</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.new_requirements_this_week}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Matches</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.total_matches}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Contacts</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.total_contacts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};