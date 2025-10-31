import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OrganDonationChatbot from "@/components/OrganDonationChatbot";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, HelpCircle, FileText, Video } from "lucide-react";

const Resources = () => {
  const faqs = [
    {
      question: "What is organ donation?",
      answer: "Organ donation is the process of surgically removing an organ or tissue from one person (the donor) and placing it into another person (the recipient) whose organ has failed or was injured. Organs that can be donated include kidneys, heart, liver, pancreas, intestines, lungs, skin, bone, bone marrow, and cornea."
    },
    {
      question: "Can I become a living donor?",
      answer: "Yes! Living donation is possible for certain organs like kidneys and parts of the liver, lung, intestine, and pancreas. Living donors must be in good health, 18 years or older, and willing to donate. A thorough medical and psychological evaluation is conducted to ensure safety."
    },
    {
      question: "Does organ donation disfigure the body?",
      answer: "No. Organ donation is a surgical procedure, and organs are removed with utmost care and respect. The body is not disfigured, and normal funeral arrangements can be made. The donation process doesn't interfere with open-casket funerals."
    },
    {
      question: "Is there an age limit for organ donation?",
      answer: "There is no strict age limit. People of all ages can register as organ donors. Medical professionals determine at the time of death whether organs and tissues are suitable for donation based on their condition, not solely on age."
    },
    {
      question: "What is brain death?",
      answer: "Brain death is the irreversible loss of all brain function, including the brainstem. It is a legal definition of death. When brain death occurs, organs can be donated if the person is on ventilator support and the family consents."
    },
    {
      question: "Can my family override my decision to donate?",
      answer: "While your registration is legally valid, in practice, medical professionals typically seek family consent. This is why it's crucial to discuss your decision with your family to ensure your wishes are honored."
    },
    {
      question: "Are there any costs involved in organ donation?",
      answer: "No. There is no cost to the donor's family for organ donation. All costs related to the donation process are borne by the recipient or their insurance. However, the donor's family is responsible for funeral arrangements."
    },
    {
      question: "What are the religious views on organ donation?",
      answer: "Most major religions in India support organ donation as an act of charity and compassion. Hinduism, Islam, Christianity, Sikhism, Buddhism, and Jainism all generally permit organ donation. However, individual beliefs may vary, so consult with your religious leader if needed."
    },
    {
      question: "How do I register as an organ donor?",
      answer: "You can register through OrganConnect by filling out our secure donor registration form. You'll receive a donor card via email. It's also important to inform your family about your decision and carry your donor card."
    },
    {
      question: "Can I change my mind after registering?",
      answer: "Absolutely. You can update or cancel your donor registration at any time through your OrganConnect profile. Your decision is entirely voluntary and reversible."
    }
  ];

  const articles = [
    {
      title: "The Complete Guide to Organ Donation Process",
      description: "Step-by-step explanation of how organ donation works from registration to transplant.",
      category: "Process"
    },
    {
      title: "Understanding Brain Death vs. Cardiac Death",
      description: "Medical explanation of different types of death and their relation to organ donation.",
      category: "Medical"
    },
    {
      title: "Legal Framework of Organ Donation in India",
      description: "Overview of the Transplantation of Human Organs Act and your rights as a donor.",
      category: "Legal"
    },
    {
      title: "Life After Transplant: A Recipient's Journey",
      description: "What to expect before, during, and after receiving an organ transplant.",
      category: "Recipient"
    },
    {
      title: "Myths vs. Facts About Organ Donation",
      description: "Debunking common misconceptions and providing evidence-based information.",
      category: "Awareness"
    },
    {
      title: "Living Donation: Everything You Need to Know",
      description: "Comprehensive guide to becoming a living organ donor and what it entails.",
      category: "Living Donation"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <OrganDonationChatbot />

      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 border-2 border-primary">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Resources & <span className="bg-gradient-hero bg-clip-text text-transparent">Knowledge Base</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about organ donation in India
            </p>
          </div>

          {/* Quick Access Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="p-6 shadow-medium hover:shadow-strong transition-smooth text-center">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Articles & Guides</h3>
              <p className="text-sm text-muted-foreground">In-depth information on all aspects of organ donation</p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-strong transition-smooth text-center">
              <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Video className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Video Library</h3>
              <p className="text-sm text-muted-foreground">Educational videos and testimonials</p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-strong transition-smooth text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto border-2 border-primary">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">FAQs</h3>
              <p className="text-sm text-muted-foreground">Answers to your most common questions</p>
            </Card>
          </div>

          {/* Articles Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Featured Articles
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {articles.map((article, index) => (
                <Card key={index} className="p-6 shadow-medium hover:shadow-strong transition-smooth">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded">
                      {article.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{article.description}</p>
                  <button className="text-sm text-primary hover:text-primary-dark font-medium transition-base">
                    Read Article →
                  </button>
                </Card>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <HelpCircle className="h-7 w-7 text-secondary" />
              Frequently Asked Questions
            </h2>
            <Card className="p-6 shadow-medium">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left font-semibold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </section>

          {/* Additional Resources */}
          <section className="mt-16">
            <Card className="p-8 bg-gradient-subtle shadow-medium">
              <h2 className="text-2xl font-bold mb-4 text-center">Need More Help?</h2>
              <p className="text-muted-foreground text-center mb-6">
                Can't find what you're looking for? Our AI-powered chatbot and support team are here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary-dark transition-base">
                  Chat with AI Assistant
                </button>
                <button className="px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-base">
                  Contact Support Team
                </button>
              </div>
            </Card>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Resources;
