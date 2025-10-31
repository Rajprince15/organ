import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OrganDonationChatbot from "@/components/OrganDonationChatbot";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Heart, 
  Users, 
  Activity, 
  Search, 
  MessageSquare, 
  Globe,
  CheckCircle2,
  ArrowRight,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <OrganDonationChatbot />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Connecting Lives,{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Restoring Hope
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                India's unified AI-powered organ donation network. Real-time matching, instant connections, lives saved.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Show Register as Donor button only if user is not logged in or is a donor/admin */}
                {(!user || user.role === 'donor' || user.role === 'admin') && (
                  <Link to={user ? "/donate" : "/register"}>
                    <Button size="lg" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground shadow-medium hover:shadow-glow transition-smooth">
                      {user ? "Donate Organs" : "Register as Donor"}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
                {/* Show Post Requirement button only if user is not logged in or is a hospital/admin */}
                {(!user || user.role === 'hospital' || user.role === 'admin') && (
                  <Link to="/recipient-portal">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth">
                      Post Requirement
                    </Button>
                  </Link>
                )}
                <Link to="/community">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Join Community
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl rounded-full"></div>
              <img
                src={heroImage}
                alt="Connecting lives through organ donation"
                className="relative rounded-2xl shadow-strong w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 text-center shadow-medium hover:shadow-strong transition-smooth">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-primary mb-2">50,000+</h3>
              <p className="text-muted-foreground">Registered Donors</p>
            </Card>
            <Card className="p-6 text-center shadow-medium hover:shadow-strong transition-smooth">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-full mb-4">
                <Clock className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-3xl font-bold text-secondary mb-2">12,000+</h3>
              <p className="text-muted-foreground">Patients Waiting</p>
            </Card>
            <Card className="p-6 text-center shadow-medium hover:shadow-strong transition-smooth">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mb-4">
                <Heart className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-3xl font-bold text-accent mb-2">5,000+</h3>
              <p className="text-muted-foreground">Successful Transplants</p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              How <span className="bg-gradient-hero bg-clip-text text-transparent">OrganConnect</span> Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to save lives
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-medium hover:shadow-strong transition-smooth">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Register</h3>
              <p className="text-muted-foreground">
                Donors and recipients create secure profiles with medical information and preferences.
              </p>
            </Card>
            <Card className="p-8 shadow-medium hover:shadow-strong transition-smooth">
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-secondary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Match</h3>
              <p className="text-muted-foreground">
                Our AI instantly connects recipients with available organs or donors based on compatibility.
              </p>
            </Card>
            <Card className="p-8 shadow-medium hover:shadow-strong transition-smooth">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-accent">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect</h3>
              <p className="text-muted-foreground">
                We facilitate communication through proper medical channels for transplant coordination.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-gradient-subtle">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Our Core Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powered by AI, driven by compassion
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-medium hover:shadow-strong transition-smooth group">
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-smooth">
                <Search className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-Time Matching</h3>
              <p className="text-muted-foreground mb-4">
                AI-powered algorithm matches recipients with compatible donors across India in seconds, reducing wait times dramatically.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Pan-India database access</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Compatibility scoring</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Priority-based matching</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 shadow-medium hover:shadow-strong transition-smooth group">
              <div className="w-14 h-14 bg-gradient-secondary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-smooth">
                <MessageSquare className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Chatbot</h3>
              <p className="text-muted-foreground mb-4">
                24/7 intelligent support to guide users through the donation process, answer questions, and provide emotional support.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5" />
                  <span>Instant query resolution</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5" />
                  <span>Myth-busting FAQs</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5" />
                  <span>Multi-language support</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 shadow-medium hover:shadow-strong transition-smooth group">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-smooth border-2 border-primary">
                <Globe className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Community Hub</h3>
              <p className="text-muted-foreground mb-4">
                A collaborative space for NGOs, activists, and individuals to share stories, organize campaigns, and build awareness.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Success stories sharing</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>NGO collaboration tools</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Event organization</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Why OrganConnect */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Why Choose <span className="bg-gradient-hero bg-clip-text text-transparent">OrganConnect?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We're revolutionizing organ donation in India with cutting-edge technology and compassionate care.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Lightning Fast</h4>
                    <p className="text-muted-foreground">
                      Real-time matching reduces wait times from months to days, saving critical lives.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Secure & Private</h4>
                    <p className="text-muted-foreground">
                      Bank-grade encryption protects your sensitive medical and personal information.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Comprehensive Network</h4>
                    <p className="text-muted-foreground">
                      Pan-India coverage connecting patients, donors, hospitals, and NGOs on one platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-secondary opacity-10 blur-3xl rounded-full"></div>
              <Card className="relative p-8 shadow-strong">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
                      <Heart className="h-8 w-8 text-primary-foreground" fill="currentColor" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">The Urgent Need</h3>
                    <p className="text-muted-foreground">
                      In India, thousands of patients die annually waiting for organ transplants due to fragmented systems and lack of coordination.
                    </p>
                  </div>
                  <div className="pt-6 border-t border-border">
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      OrganConnect bridges this gap with:
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary mb-1">90%</p>
                        <p className="text-xs text-muted-foreground">Faster Matching</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-secondary mb-1">24/7</p>
                        <p className="text-xs text-muted-foreground">Support Available</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-accent mb-1">100%</p>
                        <p className="text-xs text-muted-foreground">Secure Platform</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary mb-1">Pan-India</p>
                        <p className="text-xs text-muted-foreground">Coverage</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of donors and recipients in India's most advanced organ donation network.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {(!user || user.role === 'donor' || user.role === 'admin') && (
              <Link to={user ? "/donate" : "/register"}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  {user ? "Donate Organs" : "Register as Donor"}
                  <Heart className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
            {(!user || user.role === 'hospital' || user.role === 'admin') && (
              <Link to="/recipient-portal">
                <Button size="lg" className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90 shadow-strong">
                  Post Your Requirement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
