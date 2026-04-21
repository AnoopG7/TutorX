import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect } from 'react';
import { BookOpen, Zap, Award, Users, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeContext } from '@/providers/ThemeProvider';

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { resolvedTheme, toggleTheme } = useThemeContext();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: BookOpen,
      title: 'AI-Powered Learning',
      description: 'Get personalized explanations for any CBSE topic using advanced AI',
    },
    {
      icon: Zap,
      title: 'Instant Answers',
      description: 'Ask questions and get detailed answers in seconds, anytime',
    },
    {
      icon: Award,
      title: 'Track Progress',
      description: 'Monitor your learning journey and identify weak areas',
    },
    {
      icon: Users,
      title: 'Multi-Device Sync',
      description: 'Access your learning sessions across all your devices',
    },
  ];

  const benefits = [
    {
      title: 'Grades 9-12',
      description: 'Complete CBSE curriculum coverage',
    },
    {
      title: '24/7 Available',
      description: 'Study at your own pace, anytime',
    },
    {
      title: 'Free Forever',
      description: 'No credit card required',
    },
    {
      title: 'Multiple Subjects',
      description: 'Math, Science, English, Hindi & SST',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-amber-500" />
            <span className="font-bold text-lg">CBSE Study</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/signup')}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Your AI Study Companion for <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-amber-500">CBSE Success</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get personalized explanations, solve doubts instantly, and master any CBSE topic with our AI-powered tutoring system.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate('/signup')} className="gap-2">
              Start Learning Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Already have an account?
            </Button>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mt-12 rounded-xl border border-border bg-card p-8 backdrop-blur">
          <div className="aspect-video bg-gradient-to-br from-violet-500/20 to-amber-500/20 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-4">
              <BookOpen className="h-16 w-16 mx-auto text-primary/50" />
              <p className="text-muted-foreground">Interactive learning interface</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to excel in your studies
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="rounded-lg border border-border bg-card p-6 hover:border-primary/50 transition-colors"
              >
                <Icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose CBSE Study?
          </h2>
          <p className="text-lg text-muted-foreground">
            The perfect tool for CBSE students
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="rounded-lg bg-gradient-to-br from-violet-500/10 to-amber-500/10 border border-border p-6 text-center"
            >
              <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '1',
              title: 'Sign Up',
              description: 'Create your free account in seconds',
            },
            {
              step: '2',
              title: 'Ask Questions',
              description: 'Type any doubt or concept you want to learn',
            },
            {
              step: '3',
              title: 'Get Answers',
              description: 'Receive detailed, personalized explanations instantly',
            },
          ].map((item, idx) => (
            <div key={idx} className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                {idx < 2 && (
                  <div className="absolute left-20 top-6 w-12 h-0.5 bg-gradient-to-r from-primary to-transparent" />
                )}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-primary/20 p-12 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Ready to Excel?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of CBSE students already using AI to master their subjects
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')} className="gap-2">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 py-8 mt-20">
        <div className="mx-auto max-w-7xl px-4 text-center text-muted-foreground text-sm">
          <p>&copy; 2026 CBSE Study Agent. Free forever for all students.</p>
        </div>
      </footer>
    </div>
  );
}
