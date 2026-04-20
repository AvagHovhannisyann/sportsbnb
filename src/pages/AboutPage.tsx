import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Target, Users, Globe, ArrowRight, Eye, Heart, Shield, Sparkles } from "lucide-react";

const AboutPage = () => {
  const values = [
    {
      icon: Globe,
      title: "Accessibility",
      description: "We believe everyone should have easy access to sports facilities, regardless of where they live.",
    },
    {
      icon: Users,
      title: "Community",
      description: "Sports bring people together. We're building tools to help you find teammates and make new friends.",
    },
    {
      icon: Sparkles,
      title: "Simplicity",
      description: "Booking a court should be as easy as booking a restaurant. No phone calls, no hassle.",
    },
    {
      icon: Shield,
      title: "Trust",
      description: "Verified venues, secure payments, and transparent pricing you can count on.",
    },
  ];


  return (
    <Layout>
      <SEOHead
        title="About Sportsbnb"
        description="Learn about Sportsbnb's mission to make sports accessible to everyone. We're building the easiest way to find, book, and play at sports venues near you."
        canonical="/about"
      />
      <div className="bg-background">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Making sports more accessible
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Sportsbnb was born from a simple frustration: booking a sports facility shouldn't 
                require phone calls, waiting, and uncertainty. We're building the platform that 
                makes finding and booking sports venues as easy as it should be.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-background border border-border/40 rounded-2xl p-8 md:p-10">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To make it easy for anyone to find, organize, and join sports activity — removing 
                  the friction that prevents active people from playing regularly.
                </p>
              </div>
              <div className="bg-background border border-border/40 rounded-2xl p-8 md:p-10">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <Eye className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A world where finding a game is as easy as opening an app — one trusted place 
                  to discover, connect, and stay active.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* Values */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">What we believe in</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div key={value.title} className="bg-card rounded-2xl p-6 md:p-8 text-center border border-border/40">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-secondary">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-secondary-foreground mb-4">
                Ready to find your game?
              </h2>
              <p className="text-lg text-secondary-foreground/70 mb-8">
                Join players and venue owners on Sportsbnb.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" variant="hero">
                    Get started free
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="secondaryOutline">
                    Contact us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default AboutPage;
