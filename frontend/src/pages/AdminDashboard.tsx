import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Heart, 
  Building2, 
  Activity,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Calendar,
  BookOpen,
  Settings,
  LifeBuoy,
  GitCompare,
  Bell,
  Shield,
  FileText,
  ArrowRight
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

interface Stats {
  users: {
    total: number;
    donors: number;
    hospitals: number;
    admins: number;
  };
  donations: {
    total: number;
    pending: number;
    approved: number;
    active: number;
    inactive: number;
    cancelled: number;
    pending_checkup: number;
    eligible_donors: number;
    not_eligible_donors: number;
  };
  requirements: {
    total: number;
    active: number;
  };
  community: {
    total_posts: number;
    active_posts: number;
  };
  events: {
    total_events: number;
  };
  resources: {
    total_resources: number;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch stats");

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigationCards = [
    {
      title: "Analytics Dashboard",
      description: "View platform analytics, charts, and insights",
      icon: BarChart3,
      color: "from-blue-500 to-blue-600",
      route: "/admin/analytics",
      stat: stats ? `${stats.users.total} Total Users` : "",
    },
    {
      title: "User Management",
      description: "Manage donors, hospitals, and admin accounts",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      route: "/admin/users",
      stat: stats ? `${stats.users.donors} Donors, ${stats.users.hospitals} Hospitals` : "",
    },
    {
      title: "Donation Applications",
      description: "Review and approve donor applications",
      icon: Heart,
      color: "from-red-500 to-red-600",
      route: "/admin/donations",
      stat: stats ? `${stats.donations.pending} Pending` : "",
    },
    {
      title: "Hospital Requirements",
      description: "Manage organ requirement requests",
      icon: Building2,
      color: "from-green-500 to-green-600",
      route: "/admin/requirements",
      stat: stats ? `${stats.requirements.active} Active` : "",
    },
    {
      title: "Branch Hospitals",
      description: "Manage branch hospital accounts and credentials",
      icon: Building2,
      color: "from-blue-500 to-cyan-600",
      route: "/admin/branch-hospitals",
      stat: "Manage Branch Accounts",
    },
    {
      title: "Matching Insights",
      description: "Algorithm performance and match logs",
      icon: GitCompare,
      color: "from-orange-500 to-orange-600",
      route: "/admin/matching",
      stat: "View Match Analytics",
    },
    {
      title: "Support Management",
      description: "Handle tickets, FAQs, and help docs",
      icon: LifeBuoy,
      color: "from-cyan-500 to-cyan-600",
      route: "/admin/support",
      stat: "Manage Support System",
    },
    {
      title: "Community Posts",
      description: "Moderate posts and reels from users",
      icon: MessageSquare,
      color: "from-pink-500 to-pink-600",
      route: "/admin/community",
      stat: stats ? `${stats.community.total_posts} Posts` : "",
    },
    {
      title: "Events Management",
      description: "Create and manage platform events",
      icon: Calendar,
      color: "from-indigo-500 to-indigo-600",
      route: "/admin/events",
      stat: stats ? `${stats.events.total_events} Events` : "",
    },
    {
      title: "Resources & Articles",
      description: "Manage educational content",
      icon: BookOpen,
      color: "from-yellow-500 to-yellow-600",
      route: "/admin/resources",
      stat: stats ? `${stats.resources.total_resources} Resources` : "",
    },
    {
      title: "Activity Logs",
      description: "Monitor user activities and system logs",
      icon: Activity,
      color: "from-teal-500 to-teal-600",
      route: "/admin/activity",
      stat: "Recent Activity",
    },
    {
      title: "Audit Logs",
      description: "View admin actions and changes",
      icon: Shield,
      color: "from-gray-500 to-gray-600",
      route: "/admin/audit",
      stat: "Security & Compliance",
    },
    {
      title: "Broadcast Notifications",
      description: "Send notifications to all users",
      icon: Bell,
      color: "from-violet-500 to-violet-600",
      route: "/admin/broadcast",
      stat: "Send Messages",
    },
    {
      title: "Platform Settings",
      description: "Configure system settings",
      icon: Settings,
      color: "from-slate-500 to-slate-600",
      route: "/admin/settings",
      stat: "System Configuration",
    },
  ];

  const quickStats = [
    {
      label: "Total Donors",
      value: stats?.donations.total || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Active Donors",
      value: stats?.donations.active || 0,
      icon: Heart,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Pending Checkups",
      value: stats?.donations.pending_checkup || 0,
      icon: FileText,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Pending Applications",
      value: stats?.donations.pending || 0,
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600">
              Welcome back, {user?.name}! Manage your platform from here.
            </p>
          </div>

          {/* Quick Stats */}
          {!loading && stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickStats.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-full`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Navigation Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Management Sections
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {navigationCards.map((card, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-gray-300"
                  onClick={() => navigate(card.route)}
                  data-testid={`admin-card-${card.route.split('/').pop()}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div
                        className={`bg-gradient-to-br ${card.color} p-3 rounded-lg shadow-md mb-3`}
                      >
                        <card.icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  {card.stat && (
                    <CardContent>
                      <div className="text-sm font-medium text-gray-600 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {card.stat}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Help Section */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-blue-600" />
                Need Help?
              </CardTitle>
              <CardDescription>
                Check out the admin documentation or contact support if you need assistance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  View Documentation
                </Button>
                <Button variant="outline" size="sm">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
