/**
 * Flint Landing Page - High-converting marketing funnel
 * Route: / (public, static)
 * Tech: React with Tailwind CSS, mobile-first, performance optimized
 * Goal: Convert visitors through tiered CTA funnel
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Shield, TrendingUp, Zap, CheckCircle, Star, Users, DollarSign, Lock, Building, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import flintLogo from "@assets/flint-logo.png";

// Declare Lemon Squeezy types
declare global {
  interface Window {
    createLemonSqueezy: () => void;
    LemonSqueezy: {
      Url: {
        Open: (url: string) => void;
      };
      Setup: (config: {
        eventHandler: (event: { event: string; data: any }) => void;
      }) => void;
    };
  }
}

// Analytics tracking
const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
  // In production, integrate with GA4/Segment
  console.log('Analytics Event:', eventName, properties);
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }
};

// Intersection Observer for section tracking
const useIntersectionObserver = (callback: (entries: IntersectionObserverEntry[]) => void) => {
  useEffect(() => {
    const observer = new IntersectionObserver(callback, {
      threshold: 0.5,
      rootMargin: '-10% 0px -10% 0px'
    });

    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  }, [callback]);
};

// Checkout URL generator
const getCheckoutUrl = (plan: string, email?: string) => {
  const baseUrl = 'https://checkout-staging.flint.example.com';
  const params = new URLSearchParams({
    plan,
    ...(email && { email }),
    utm_source: 'landing',
    utm_medium: 'cta',
    utm_campaign: 'conversion_funnel'
  });
  return `${baseUrl}?${params.toString()}`;
};

function Landing() {
  const [isYearly, setIsYearly] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    accountCount: '',
    connectType: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const { toast } = useToast();

  // Initialize Lemon Squeezy
  useEffect(() => {
    // Load Lemon.js script
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.defer = true;
    script.onload = () => {
      if (window.createLemonSqueezy) {
        window.createLemonSqueezy();
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.head.removeChild(script);
    };
  }, []);

  // Track section views
  useIntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionName = entry.target.getAttribute('data-section');
        trackEvent('view_section', { section: sectionName });
      }
    });
  });

  // Handle CTA clicks - now opens Lemon Squeezy checkout
  const handleCTAClick = async (ctaId: string, price: string) => {
    trackEvent('click_cta', { cta_id: ctaId, price });
    
    try {
      // Get checkout URL from backend
      const response = await fetch(`/api/lemonsqueezy/checkout/${ctaId}${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`);
      const data = await response.json();
      
      if (data.checkoutUrl && window.LemonSqueezy) {
        // Open Lemon Squeezy overlay
        window.LemonSqueezy.Url.Open(data.checkoutUrl);
      } else {
        // Fallback to direct URL
        window.location.href = data.checkoutUrl || `/api/lemonsqueezy/checkout/${ctaId}`;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Unable to open checkout. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    trackEvent('submit_application', {
      account_count: formData.accountCount,
      connect_type: formData.connectType,
    });

    try {
      const response = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormSubmitted(true);
        setFormData({
          firstName: '',
          email: '',
          accountCount: '',
          connectType: ''
        });
        toast({
          title: "Success!",
          description: data.message || "Application submitted! We'll review and email you within 24 hours.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 px-4 lg:px-8 py-4 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={flintLogo} 
              alt="Flint Logo" 
              className="h-10 w-auto"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end space-y-1 bg-gray-800/50 border border-purple-600/30 rounded-lg px-4 py-3">
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  className="text-white hover:text-purple-300 hover:bg-purple-600/20"
                  data-testid="button-login"
                >
                  Log in
                </Button>
              </Link>
              <Link 
                href="/reset-password"
                className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
                data-testid="link-forgot-password"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section - CTA 1: Unlimited Annual */}
      <main className="mx-auto max-w-7xl px-4 lg:px-8">
        <section id="annual" data-section="annual" className="grid lg:grid-cols-2 gap-12 py-20 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                See if you qualify for{' '}
                <span className="text-purple-400">Flint Free</span> below.
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed">
                Or get started right now with <strong>2 free months</strong> (20% savings) 
                when you invest upfront in Flint Unlimited.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-bold text-white">$499.99</span>
                <span className="text-lg text-gray-400 line-through">$600</span>
                <span className="text-lg text-gray-300">/year</span>
              </div>
              
              <Button 
                size="lg" 
                className="w-full lg:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg"
                data-cta="annual-unlimited"
                data-testid="button-cta-annual-unlimited"
                onClick={() => handleCTAClick('annual-unlimited', '$499.99')}
              >
                Start with Unlimited Annual – $499.99
              </Button>
              
              <p className="text-sm text-gray-400">
                Founding Member pricing. Renews at same rate if you keep your plan.
              </p>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="h-6 w-6 text-green-400" />
                    <span className="font-semibold">Bank-grade encryption</span>
                  </div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Building className="h-6 w-6 text-blue-400" />
                    <span className="font-semibold">Built on SnapTrade & Teller</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Lock className="h-6 w-6 text-purple-400" />
                    <span className="font-semibold">No ads or selling data</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Social Proof Block #1 */}
        <section className="py-16 border-y border-gray-800">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 border-2 border-black" />
                ))}
              </div>
              <span className="text-lg font-semibold">2,847+ users</span>
            </div>
            <p className="text-xl text-gray-300 leading-relaxed">
              Over <strong>2,847 users</strong> already upgraded Flint and are managing 12+ accounts, 
              paying off credit cards faster, and cutting hours of financial stress each week.
            </p>
            <div className="flex items-center justify-center space-x-8 opacity-60">
              <div className="text-sm text-gray-400">SnapTrade</div>
              <div className="text-sm text-gray-400">Teller</div>
              <div className="text-sm text-gray-400">Stripe</div>
            </div>
          </div>
        </section>

        {/* CTA 2: 6-Month Commitment */}
        <section id="six" data-section="six" className="py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold">
                A year feels <span className="text-purple-400">too long?</span>
              </h2>
              <p className="text-xl text-gray-300">
                Get one month free when you invest for 6 months.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="text-5xl font-bold text-white">$249.99</div>
              <p className="text-lg text-gray-300">6 months</p>
              
              <Button 
                size="lg" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg"
                data-cta="unlimited-6mo"
                onClick={() => handleCTAClick('unlimited-6mo', '$249.99')}
              >
                Start with Unlimited – 6 Months for $249.99
              </Button>
            </div>
          </div>
        </section>

        {/* Social Proof Block #2 */}
        <section className="py-16 bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <div className="text-sm text-gray-400">Dashboard Preview</div>
                <div className="h-32 bg-gradient-to-r from-purple-500 to-blue-500 rounded opacity-20" />
                <div className="text-xs text-gray-500">Mockup placeholder</div>
              </div>
              <blockquote className="space-y-4">
                <p className="text-xl italic text-gray-300">
                  "Flint is the only place where my banks, cards, and brokerages just… add up."
                </p>
                <cite className="text-sm text-gray-400">— Early user</cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* CTA 3: Plus Annual */}
        <section id="plus-annual" data-section="plus-annual" className="py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold">
                Don't need <span className="text-purple-400">unlimited accounts?</span>
              </h2>
              <p className="text-xl text-gray-300">
                Get 2 free months when you choose Flint Plus on the yearly plan.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-baseline justify-center space-x-2">
                <span className="text-5xl font-bold text-white">$199.99</span>
                <span className="text-lg text-gray-400 line-through">$240</span>
                <span className="text-lg text-gray-300">/year</span>
              </div>
              
              <Button 
                size="lg" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg"
                data-cta="plus-annual"
                onClick={() => handleCTAClick('plus-annual', '$199.99')}
              >
                Start with Plus Annual – $199.99
              </Button>
              
              <p className="text-sm text-gray-400">
                Great for 1–4 accounts & core insights.
              </p>
            </div>
          </div>
        </section>

        {/* Social Proof Block #3 */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <p className="text-xl text-gray-300">
              Flint Plus users save on average <strong>$127/month</strong> by tracking 
              subscriptions and reducing hidden fees.
            </p>
            <div className="flex items-center justify-center">
              <div className="w-24 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded opacity-40" />
              <span className="ml-4 text-sm text-gray-400">Savings chart placeholder</span>
            </div>
          </div>
        </section>

        {/* CTA 4: Monthly Pricing Options */}
        <section id="monthly" data-section="monthly" className="py-20 bg-gray-900/30">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold">
                Choose your <span className="text-purple-400">plan</span>
              </h2>
              
              {/* Monthly/Yearly Toggle */}
              <div className="flex items-center justify-center space-x-4">
                <span className={`text-lg ${!isYearly ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  Monthly
                </span>
                <Switch 
                  checked={isYearly} 
                  onCheckedChange={setIsYearly}
                  className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-600 border-2 border-gray-500"
                />
                <span className={`text-lg ${isYearly ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  Yearly
                </span>
                {isYearly && (
                  <Badge className="bg-green-600 text-white">2 months free</Badge>
                )}
              </div>
            </div>
            
            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Plus */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl">Flint Plus</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      ${isYearly ? '16.67' : '19.99'}
                    </div>
                    <div className="text-gray-400">
                      {isYearly ? '/mo (billed yearly)' : '/month'}
                    </div>
                  </div>
                  <CardDescription className="text-gray-300">
                    Best for individuals who just want to see everything in one place.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                    data-cta={isYearly ? 'plus-yearly' : 'plus-monthly'}
                    onClick={() => handleCTAClick(
                      isYearly ? 'plus-yearly' : 'plus-monthly', 
                      isYearly ? '$199.99' : '$19.99'
                    )}
                  >
                    Choose Plus {isYearly ? 'Yearly' : 'Monthly'}
                  </Button>
                </CardContent>
              </Card>
              
              {/* Pro */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl">Flint Pro</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      ${isYearly ? '33.33' : '39.99'}
                    </div>
                    <div className="text-gray-400">
                      {isYearly ? '/mo (billed yearly)' : '/month'}
                    </div>
                  </div>
                  <CardDescription className="text-gray-300">
                    Best for individuals who want to manage money and simplify payments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    data-cta={isYearly ? 'pro-yearly' : 'pro-monthly'}
                    onClick={() => handleCTAClick(
                      isYearly ? 'pro-yearly' : 'pro-monthly', 
                      isYearly ? '$399.99' : '$39.99'
                    )}
                  >
                    Choose Pro {isYearly ? 'Yearly' : 'Monthly'}
                  </Button>
                </CardContent>
              </Card>
              
              {/* Unlimited - Most Popular */}
              <Card className="bg-purple-900 border-purple-600 relative">
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black">
                  ⭐ Most Popular
                </Badge>
                <CardHeader className="text-center space-y-4 pt-8">
                  <CardTitle className="text-2xl">Flint Unlimited</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      ${isYearly ? '41.67' : '49.99'}
                    </div>
                    <div className="text-gray-300">
                      {isYearly ? '/mo (billed yearly)' : '/month'}
                    </div>
                  </div>
                  <CardDescription className="text-gray-300">
                    Best for individuals who want complete control and future features.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    data-cta={isYearly ? 'unlimited-yearly' : 'unlimited-monthly'}
                    data-testid={isYearly ? 'button-cta-unlimited-yearly' : 'button-cta-unlimited-monthly'}
                    onClick={() => handleCTAClick(
                      isYearly ? 'unlimited-yearly' : 'unlimited-monthly', 
                      isYearly ? '$499.99' : '$49.99'
                    )}
                  >
                    Choose Unlimited {isYearly ? 'Yearly' : 'Monthly'}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center space-y-2">
              <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                Founding Member Pricing — lock this in before new features launch
              </Badge>
            </div>
          </div>
        </section>

        {/* CTA 5: Fast-Track Pass */}
        <section id="fast-track" data-section="fast-track" className="py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold">
                Want to skip the <span className="text-purple-400">waitlist?</span>
              </h2>
              <p className="text-xl text-gray-300">
                Qualify right away with the Fast-Track Pass.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="text-5xl font-bold text-white">$79.99</div>
              
              <Button 
                size="lg" 
                className="bg-yellow-600 hover:bg-yellow-700 text-black px-8 py-4 text-lg font-semibold"
                data-cta="fast-track"
                onClick={() => handleCTAClick('fast-track', '$79.99')}
              >
                Unlock Free Now for $79.99
              </Button>
              
              <p className="text-sm text-gray-400">
                Instant access to Flint Free + priority onboarding. 
                <strong className="text-white">Credited toward any subscription</strong> if you upgrade later.
              </p>
            </div>
          </div>
        </section>

        {/* CTA 6: Free Application Form */}
        <section id="apply" data-section="apply" className="py-20 bg-gray-900/50">
          <div className="max-w-2xl mx-auto">
            <div className="text-center space-y-6 mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold">
                Apply for <span className="text-purple-400">Flint Free</span>
              </h2>
              <p className="text-xl text-gray-300">
                Tell us about your accounts and we'll let you know if you qualify.
              </p>
            </div>

            {!formSubmitted ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-white">First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter your first name"
                        data-testid="input-first-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter your email"
                        data-testid="input-email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white">How many accounts are you looking to connect? *</Label>
                      <Select
                        value={formData.accountCount}
                        onValueChange={(value) => setFormData({...formData, accountCount: value})}
                        required
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select number of accounts" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4+">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-white">What will you connect? *</Label>
                      <RadioGroup
                        value={formData.connectType}
                        onValueChange={(value) => setFormData({...formData, connectType: value})}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="banks" id="banks" className="border-gray-600" />
                          <Label htmlFor="banks" className="text-white cursor-pointer">Banks</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="brokerages" id="brokerages" className="border-gray-600" />
                          <Label htmlFor="brokerages" className="text-white cursor-pointer">Brokerages</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="both" id="both" className="border-gray-600" />
                          <Label htmlFor="both" className="text-white cursor-pointer">Both</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                      disabled={!formData.firstName || !formData.email || !formData.accountCount || !formData.connectType}
                      data-testid="button-submit-application"
                    >
                      Submit Application
                    </Button>
                    
                    <p className="text-xs text-gray-400 text-center">
                      We'll never sell your data. Privacy policy applies.
                    </p>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="text-6xl">✅</div>
                  <h3 className="text-2xl font-bold text-green-400">Application Submitted!</h3>
                  <p className="text-gray-300">We'll review your application and email you within 24 hours.</p>
                  <Button 
                    variant="outline"
                    className="mt-4"
                    onClick={() => setFormSubmitted(false)}
                  >
                    Submit Another Application
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      {/* Legal Footer */}
      <footer className="mt-20 bg-gray-900 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="text-white font-bold text-xl">Flint</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Connect all your financial accounts in one secure platform. 
                Take control of your money with bank-grade security.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Legal</h4>
              <div className="flex flex-wrap gap-6 text-sm">
                <a href="/terms" className="text-gray-400 hover:text-white">Terms of Service</a>
                <a href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</a>
                <a href="/contact" className="text-gray-400 hover:text-white">Contact</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8">
            <p className="text-xs text-gray-400 text-center">
              &copy; 2025 Flint Financial Management Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      {/* JSON-LD Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Flint",
          "description": "Financial management platform for connecting banks, brokerages, and crypto wallets",
          "url": "https://flint.com",
          "logo": "https://flint.com/logo.png",
          "sameAs": [
            "https://twitter.com/flintfinance",
            "https://linkedin.com/company/flint"
          ]
        })
      }} />
      
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Flint Financial Management",
          "description": "Connect all your financial accounts in one secure platform",
          "brand": {
            "@type": "Brand",
            "name": "Flint"
          },
          "offers": {
            "@type": "Offer",
            "price": "19.99",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        })
      }} />
    </div>
  );
}

// Success page component for checkout completions
export function SuccessPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get('plan');
  
  useEffect(() => {
    trackEvent('purchase_complete', { plan });
  }, [plan]);
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold">Welcome to Flint!</h1>
        <p className="text-gray-300">
          Thank you for choosing {plan}. Check your email for next steps.
        </p>
        <Button 
          className="bg-purple-600 hover:bg-purple-700"
          onClick={() => window.location.href = '/app'}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default Landing;