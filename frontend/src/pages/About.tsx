import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OrganDonationChatbot from "@/components/OrganDonationChatbot";
import { Card } from "@/components/ui/card";
import { Target, Eye, Zap, Shield, Users, Globe } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <OrganDonationChatbot />

      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              About <span className="bg-gradient-hero bg-clip-text text-transparent">OrganConnect</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Revolutionizing India's organ donation ecosystem through AI-powered technology and human compassion.
            </p>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="p-8 shadow-medium">
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To create a unified, real-time organ donation network across India that eliminates fragmentation,
                reduces wait times, and saves lives through cutting-edge AI technology and seamless coordination.
              </p>
            </Card>

            <Card className="p-8 shadow-medium">
              <div className="w-14 h-14 bg-gradient-secondary rounded-xl flex items-center justify-center mb-6">
                <Eye className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                A future where no patient dies waiting for an organ transplant, and where organ donation is a
                celebrated act of humanity embraced by all Indians.
              </p>
            </Card>
          </div>

          {/* The Problem */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">The Critical Challenge</h2>
            <Card className="p-8 shadow-medium bg-muted/30">
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                India faces a severe organ shortage crisis. Thousands of patients die annually while waiting for
                life-saving transplants. The primary challenges include:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Fragmented Systems:</strong> Disconnected databases across states and hospitals
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Slow Matching:</strong> Manual processes delay critical transplants
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Low Awareness:</strong> Myths and misconceptions prevent registration
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Poor Coordination:</strong> Lack of communication between stakeholders
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Our Solution */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Holistic Solution</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 shadow-medium">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Real-Time Matching</h3>
                <p className="text-muted-foreground text-sm">
                  AI-powered algorithm instantly matches recipients with compatible donors across India's entire database,
                  reducing wait times from months to days.
                </p>
              </Card>

              <Card className="p-6 shadow-medium">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Secure Platform</h3>
                <p className="text-muted-foreground text-sm">
                  Bank-grade encryption and HIPAA-compliant systems ensure all medical and personal data is protected
                  with the highest security standards.
                </p>
              </Card>

              <Card className="p-6 shadow-medium">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Community Building</h3>
                <p className="text-muted-foreground text-sm">
                  A vibrant hub where NGOs, activists, and individuals collaborate to create awareness, share stories,
                  and organize life-saving campaigns.
                </p>
              </Card>
            </div>
          </section>

          {/* How It Works - Technical */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Powered by Advanced Technology</h2>
            <Card className="p-8 shadow-medium">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Centralized Pan-India Database
                  </h3>
                  <p className="text-muted-foreground">
                    Our unified database aggregates donor and recipient information from across India, breaking down
                    geographical and administrative barriers that previously limited transplant opportunities.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-secondary" />
                    AI-Powered Matching Algorithm
                  </h3>
                  <p className="text-muted-foreground">
                    Advanced machine learning analyzes multiple parameters including blood type, tissue compatibility,
                    urgency level, geographical proximity, and medical history to find optimal matches in real-time.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    LLM-Powered Support Chatbot
                  </h3>
                  <p className="text-muted-foreground">
                    Our intelligent chatbot provides 24/7 support, answers questions, debunks myths, and guides users
                    through the donation process with empathy and accuracy.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Impact Stats */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Growing Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="p-6 text-center shadow-medium">
                <p className="text-4xl font-bold text-primary mb-2">50K+</p>
                <p className="text-sm text-muted-foreground">Registered Donors</p>
              </Card>
              <Card className="p-6 text-center shadow-medium">
                <p className="text-4xl font-bold text-secondary mb-2">5K+</p>
                <p className="text-sm text-muted-foreground">Lives Saved</p>
              </Card>
              <Card className="p-6 text-center shadow-medium">
                <p className="text-4xl font-bold text-accent mb-2">100+</p>
                <p className="text-sm text-muted-foreground">Partner Hospitals</p>
              </Card>
              <Card className="p-6 text-center shadow-medium">
                <p className="text-4xl font-bold text-primary mb-2">28</p>
                <p className="text-sm text-muted-foreground">States Covered</p>
              </Card>
            </div>
          </section>

          {/* Call to Action */}
          <section>
            <Card className="p-8 lg:p-12 bg-gradient-hero text-primary-foreground text-center shadow-strong">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Be Part of the Solution
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Together, we can eliminate the organ shortage crisis in India. Every registration, every share, every
                conversation brings us closer to a future where no one dies waiting.
              </p>
            </Card>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
