'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ShoppingBag, Coins, Shield } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-16">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            AI Art Revenue Exchange
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Generate stunning AI artwork, trade in our marketplace, and earn tokens. 
          The secure platform for digital art creators and collectors.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              <Sparkles className="w-5 h-5" />
              Get Started
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button size="lg" variant="outline" className="gap-2">
              <ShoppingBag className="w-5 h-5" />
              Explore Marketplace
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <Sparkles className="w-10 h-10 text-purple-600 mb-2" />
            <CardTitle>AI Generation</CardTitle>
            <CardDescription>
              Create unique artwork with state-of-the-art AI models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate high-quality images from text prompts. Multiple styles and models available.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShoppingBag className="w-10 h-10 text-blue-600 mb-2" />
            <CardTitle>Marketplace</CardTitle>
            <CardDescription>
              Buy and sell artwork via auction or instant purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              List your creations for sale. Set your price or let buyers bid.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Coins className="w-10 h-10 text-yellow-600 mb-2" />
            <CardTitle>Token Economy</CardTitle>
            <CardDescription>
              Earn tokens through engagement and daily activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Daily logins, referrals, challenges, and more ways to earn.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="w-10 h-10 text-green-600 mb-2" />
            <CardTitle>Secure Platform</CardTitle>
            <CardDescription>
              Enterprise-grade security with encrypted transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Double-entry accounting, immutable ledger, and zero-trust architecture.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* How It Works */}
      <section className="text-center space-y-8 py-8">
        <h2 className="text-3xl font-bold">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-purple-600">1</span>
            </div>
            <h3 className="text-xl font-semibold">Generate Art</h3>
            <p className="text-muted-foreground">
              Use our AI tools to create unique digital artwork from your imagination.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="text-xl font-semibold">List for Sale</h3>
            <p className="text-muted-foreground">
              Set your price or create an auction. You keep 90% of every sale.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-green-600">3</span>
            </div>
            <h3 className="text-xl font-semibold">Earn & Grow</h3>
            <p className="text-muted-foreground">
              Collect payments, earn tokens, and build your digital art portfolio.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-8">
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardHeader>
            <CardTitle className="text-3xl text-white">Ready to Create?</CardTitle>
            <CardDescription className="text-white/80">
              Join thousands of artists and collectors on the AI Art Revenue Exchange
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Start Creating Today
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
