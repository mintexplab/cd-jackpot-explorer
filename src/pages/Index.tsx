import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Disc3, Sparkles, BarChart3, Brain, ArrowRight, Disc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Disc,
      title: 'CD Collection Only',
      description: 'We filter your Discogs to show only your compact discs, keeping the focus pure.',
    },
    {
      icon: BarChart3,
      title: 'Value Analytics',
      description: 'See real-time market values and track the worth of your collection.',
    },
    {
      icon: Brain,
      title: 'AI Analysis',
      description: 'Get intelligent insights about your taste, hidden gems, and recommendations.',
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-glow rounded-full blur-3xl opacity-30" />
        
        {/* Floating disc decoration */}
        <div className="absolute top-40 right-[15%] hidden lg:block animate-float">
          <div className="w-32 h-32 rounded-full bg-vinyl-black border-4 border-primary/30 flex items-center justify-center vinyl-texture">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-primary">AI-Powered Collection Analysis</span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl tracking-wide leading-tight">
              DISCOVER THE{' '}
              <span className="text-gradient">JACKPOT</span>
              <br />
              IN YOUR CDS
            </h1>

            <p className="mt-6 text-xl text-muted-foreground max-w-xl">
              Connect your Discogs account and unlock deep insights into your CD collection. 
              Track values, discover hidden gems, and get AI-powered analysis of your musical taste.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="xl"
                onClick={() => navigate('/auth')}
                className="group"
              >
                Start Exploring
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide">
              EVERYTHING YOU NEED
            </h2>
            <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
              Powerful tools to explore, analyze, and appreciate your CD collection.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="stat-card group animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-xl tracking-wide mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <Disc3 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin-slow" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-wide">
            READY TO EXPLORE?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Sign up now and connect your Discogs to discover the value hidden in your collection.
          </p>
          <Button 
            variant="hero" 
            size="xl"
            onClick={() => navigate('/auth')}
            className="mt-8"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/30">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-primary" />
            <span className="font-display text-sm tracking-wide">JACKPOT MUSIC CD EXPLORER</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Jackpot Music. Powered by Discogs API.
          </p>
        </div>
      </footer>
    </div>
  );
}
