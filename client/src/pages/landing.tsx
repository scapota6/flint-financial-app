/**
 * Flint Landing Page - High-converting marketing funnel
 * Route: / (public, static)
 * Tech: React with Tailwind CSS, mobile-first, performance optimized
 * Goal: Convert visitors through tiered CTA funnel
 */

import React, { useState, useEffect } from 'react';
import forbesLogo from '@assets/12-126619_forbes-logo-black-and-white-johns-hopkins-logo_1760731194172.png';
import wsjLogo from '@assets/485-4859692_the-wall-street-journal-png-download-wall-street_1760731194174.png';
import entrepreneurLogo from '@assets/651-6519331_entrepreneur-logo-black-and-white-calligraphy-hd-png_1760731236580.png';
import bloombergLogo from '@assets/png-clipart-new-york-city-bloomberg-logo-business-public-relations-others-text-public-relations_1760730944516.png';

// Institution list for scrolling banner
const INSTITUTIONS = [
  { name: 'Chase', domain: 'chase.com' },
  { name: 'Fidelity', domain: 'fidelity.com' },
  { name: 'Schwab', domain: 'schwab.com' },
  { name: 'Robinhood', domain: 'robinhood.com' },
  { name: 'E*TRADE', domain: 'etrade.com' },
  { name: 'Webull', domain: 'webull.com' },
  { name: 'Interactive Brokers', domain: 'interactivebrokers.com' },
  { name: 'Coinbase', domain: 'coinbase.com' },
  { name: 'Bank of America', domain: 'bankofamerica.com' },
  { name: 'Wells Fargo', domain: 'wellsfargo.com' },
  { name: 'Citi', domain: 'citi.com' },
  { name: 'Capital One', domain: 'capitalone.com' },
  { name: 'Binance', domain: 'binance.com' },
  { name: 'Kraken', domain: 'kraken.com' },
  { name: 'Alpaca', domain: 'alpaca.markets' },
  { name: 'Public', domain: 'public.com' },
  { name: 'Vanguard', domain: 'vanguard.com' },
  { name: 'TD Ameritrade', domain: 'tdameritrade.com' },
  { name: 'Questrade', domain: 'questrade.com' },
  { name: 'Wealthsimple', domain: 'wealthsimple.com' },
  { name: 'Tradestation', domain: 'tradestation.com' },
  { name: 'US Bank', domain: 'usbank.com' },
  { name: 'PNC', domain: 'pnc.com' },
  { name: 'Truist', domain: 'truist.com' }
];
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ArrowRight, Shield, TrendingUp, Zap, CheckCircle, Star, Users, DollarSign, Lock, Building, CreditCard, Check, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { CheckoutModal } from "@/components/checkout-modal";
import flintLogo from "@assets/flint-logo.png";
import dashboardPreview from "@assets/dashboard-preview.png";
import avatar1 from "@assets/generated_images/Professional_Asian_woman_headshot_526eadc3.png";
import avatar2 from "@assets/generated_images/Professional_Black_man_headshot_4ca6d178.png";
import avatar3 from "@assets/generated_images/Professional_Hispanic_woman_headshot_e62bf380.png";
import avatar4 from "@assets/generated_images/Professional_Caucasian_man_headshot_f922a01f.png";
import avatar5 from "@assets/generated_images/Professional_Middle_Eastern_woman_headshot_5f778eae.png";

// Removed Lemon Squeezy - now using Whop for payment processing

// Analytics tracking
const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
  // In production, integrate with GA4/Segment
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
  const [dashboardPreviewOpen, setDashboardPreviewOpen] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const { toast } = useToast();

  // Track section views
  useIntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionName = entry.target.getAttribute('data-section');
        trackEvent('view_section', { section: sectionName });
      }
    });
  });

  // Handle CTA clicks - opens Whop checkout in modal
  const handleCTAClick = async (ctaId: string, price: string) => {
    trackEvent('click_cta', { cta_id: ctaId, price });
    
    try {
      // Get checkout plan ID from backend (Whop)
      const response = await fetch(`/api/whop/checkout/${ctaId}${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`);
      const data = await response.json();
      
      if (data.planId) {
        // Open checkout in modal with Whop embed
        setCheckoutPlanId(data.planId);
      } else {
        toast({
          title: "Error",
          description: "Unable to open checkout. Please try again.",
          variant: "destructive"
        });
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30 pointer-events-none" />
      
      {/* Animated floating orbs */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Purple orb - top left */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '4s' }} />
        
        {/* Blue orb - top right */}
        <div className="absolute top-40 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '1s' }} />
        
        {/* Pink orb - middle */}
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '6s', animationDelay: '2s' }} />
        
        {/* Cyan orb - bottom left */}
        <div className="absolute bottom-40 left-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
        
        {/* Purple orb - bottom right */}
        <div className="absolute bottom-20 right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '7s', animationDelay: '0.5s' }} />
      </div>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 pointer-events-none" />
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

      {/* Value Proposition Section */}
      <main className="mx-auto max-w-7xl px-4 lg:px-8 relative z-10">
        <section className="py-20 text-center space-y-8">
          <div className="space-y-6">
            <h2 className="text-5xl lg:text-6xl font-bold tracking-tight">
              Feel confident with your{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                money again.
              </span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Flint brings all your accounts together, helps you cut hidden fees, and grow toward your goals{' '}
              <span className="text-white font-semibold">simply and clearly.</span>
            </p>
            
            {/* Visual elements */}
            <div className="flex items-center justify-center gap-8 pt-8">
              <div className="flex items-center gap-3 text-gray-300">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">Track Growth</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">Cut Fees</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">Stay Secure</span>
              </div>
            </div>
          </div>
        </section>

        {/* As Seen On Section */}
        <section className="py-16 border-y border-gray-800/50 bg-gray-900/30" data-section="as-seen-on">
          <div className="max-w-6xl mx-auto space-y-12 px-4">
            <div className="text-center">
              <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold" data-testid="text-as-seen-on">As Seen On</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center justify-items-center">
              {/* Forbes */}
              <div className="transition-all duration-300 opacity-70 hover:opacity-100 w-full flex justify-center">
                <img 
                  src={forbesLogo}
                  alt="Forbes"
                  className="h-16 w-auto object-contain"
                  style={{ mixBlendMode: 'lighten' }}
                  data-testid="logo-forbes"
                />
              </div>
              {/* Wall Street Journal */}
              <div className="transition-all duration-300 opacity-70 hover:opacity-100 w-full flex justify-center">
                <img 
                  src={wsjLogo}
                  alt="Wall Street Journal"
                  className="h-16 w-auto object-contain"
                  style={{ mixBlendMode: 'lighten' }}
                  data-testid="logo-wsj"
                />
              </div>
              {/* Entrepreneur */}
              <div className="transition-all duration-300 opacity-70 hover:opacity-100 w-full flex justify-center">
                <img 
                  src={entrepreneurLogo}
                  alt="Entrepreneur"
                  className="h-16 w-auto object-contain"
                  style={{ mixBlendMode: 'lighten' }}
                  data-testid="logo-entrepreneur"
                />
              </div>
              {/* Bloomberg */}
              <div className="transition-all duration-300 opacity-70 hover:opacity-100 w-full flex justify-center">
                <img 
                  src={bloombergLogo}
                  alt="Bloomberg"
                  className="h-16 w-auto object-contain invert"
                  data-testid="logo-bloomberg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Supported Institutions Scrolling Banner */}
        <section className="py-12 bg-gradient-to-b from-gray-900/30 to-transparent overflow-hidden" data-section="institutions">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center">
              <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold" data-testid="text-connect-accounts">Connect Your Accounts From</h3>
            </div>
            
            {/* Scrolling container */}
            <div className="relative">
              {/* Gradient overlays for smooth edges */}
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
              
              {/* Scrolling track - seamless infinite scroll */}
              <div className="flex gap-6 animate-scroll-seamless" data-testid="scrolling-institutions">
                {/* First set of logos */}
                {INSTITUTIONS.map((institution, idx) => (
                  <div key={`logo-${idx}`} className="flex-shrink-0 flex items-center justify-center" data-testid={`institution-${institution.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                    <div className="h-16 w-16 rounded-full bg-gray-800/60 border border-gray-700/50 flex items-center justify-center overflow-hidden hover:border-purple-500/50 transition-all duration-300">
                      <img 
                        src={`https://cdn.brandfetch.io/${institution.domain}?c=${import.meta.env.VITE_BRANDFETCH_CLIENT_ID || ''}`}
                        alt={institution.name}
                        className="h-full w-full object-cover scale-125"
                        title={institution.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="text-xs text-gray-400 font-semibold text-center">${institution.name.substring(0, 3).toUpperCase()}</div>`;
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {INSTITUTIONS.map((institution, idx) => (
                  <div key={`logo-dup-${idx}`} className="flex-shrink-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gray-800/60 border border-gray-700/50 flex items-center justify-center overflow-hidden hover:border-purple-500/50 transition-all duration-300">
                      <img 
                        src={`https://cdn.brandfetch.io/${institution.domain}?c=${import.meta.env.VITE_BRANDFETCH_CLIENT_ID || ''}`}
                        alt={institution.name}
                        className="h-full w-full object-cover scale-125"
                        title={institution.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="text-xs text-gray-400 font-semibold text-center">${institution.name.substring(0, 3).toUpperCase()}</div>`;
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-center text-xs text-gray-500 mt-4" data-testid="text-more-institutions">
              + 5,000 more banks and brokerages
            </p>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-20 bg-gradient-to-b from-red-950/20 to-transparent border-y border-red-900/30" data-section="problem">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
                The hidden cost of scattered finances
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Every day, millions waste time and money juggling disconnected financial apps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Time Wasted */}
              <Card className="bg-gray-900/80 border-red-900/50">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-5xl font-bold text-red-400">3+ hours</div>
                    <div className="text-gray-400 text-lg">wasted every week</div>
                  </div>
                  <p className="text-gray-300">
                    Switching between 5-8 different banking apps, brokerages, and spreadsheets just to check your finances
                  </p>
                </CardContent>
              </Card>

              {/* Money Lost */}
              <Card className="bg-gray-900/80 border-red-900/50">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-5xl font-bold text-orange-400">$1,847</div>
                    <div className="text-gray-400 text-lg">lost per year</div>
                  </div>
                  <p className="text-gray-300">
                    Hidden fees, forgotten subscriptions, and missed opportunities across disconnected accounts
                  </p>
                </CardContent>
              </Card>

              {/* Financial Confusion */}
              <Card className="bg-gray-900/80 border-red-900/50">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-5xl font-bold text-yellow-400">68%</div>
                    <div className="text-gray-400 text-lg">don't know their net worth</div>
                  </div>
                  <p className="text-gray-300">
                    Because their money is too scattered across banks, brokerages, and crypto wallets to track
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center pt-8">
              <p className="text-2xl text-gray-200 font-semibold">
                There's a <span className="text-purple-400">better way</span>
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20" data-section="features">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                Everything you need in{' '}
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  one place
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Stop juggling multiple apps and spreadsheets. Flint gives you the complete picture of your finances.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Unified Dashboard */}
              <Card className="bg-gray-900/80 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white">Unified Dashboard</CardTitle>
                  <CardDescription className="text-gray-400">
                    All your bank accounts, credit cards, crypto and stock brokerages accounts in one comprehensive view
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Account Syncing */}
              <Card className="bg-gray-900/80 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white">Synced Balances</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your account balances and portfolio values stay up-to-date with regular automatic syncing
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Trading */}
              <Card className="bg-gray-900/80 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white">Active Trading</CardTitle>
                  <CardDescription className="text-gray-400">
                    Send buy and sell requests to your brokerages for stocks and crypto directly from Flint
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Money Movement */}
              <Card className="bg-gray-900/80 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-4">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white">Money Movement</CardTitle>
                  <CardDescription className="text-gray-400">
                    Track spending patterns, analyze merchants, and transfer money between your accounts
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Portfolio Analytics */}
              <Card className="bg-gray-900/80 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center mb-4">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white">Portfolio Analytics</CardTitle>
                  <CardDescription className="text-gray-400">
                    Monitor your investment performance, track growth, and understand your financial picture
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Security */}
              <Card className="bg-gray-900/80 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white">Bank-Grade Security</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your data is encrypted and protected with the same security standards as major banks
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-gray-900/30" data-section="how-it-works">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
                How it works
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Get started in minutes and take control of your financial life
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {/* Step 1 */}
              <div className="relative space-y-4 text-center">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">1</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">Connect Your Accounts</h3>
                <p className="text-gray-400">
                  Securely link your bank and brokerage accounts in just a few clicks
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-purple-400" />
              </div>

              {/* Step 2 */}
              <div className="relative space-y-4 text-center">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">2</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">See Everything Unified</h3>
                <p className="text-gray-400">
                  View all your accounts, balances, and investments in one dashboard
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-purple-400" />
              </div>

              {/* Step 3 */}
              <div className="relative space-y-4 text-center">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">3</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">Trade, Transfer, Analyze</h3>
                <p className="text-gray-400">
                  Manage your finances, execute trades, and track your progress all in one place
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="py-16 bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="text-sm text-purple-400 font-semibold">Dashboard Preview</div>
                <h3 className="text-2xl font-bold text-white">See Your Complete Financial Picture</h3>
                <p className="text-gray-300">
                  View all your Bank, Credit, Stock and Crypto accounts in one unified dashboard. Track your net worth, monitor balances, and manage your finances with ease.
                </p>
                <button
                  onClick={() => setDashboardPreviewOpen(true)}
                  className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300"
                  data-testid="button-dashboard-preview"
                >
                  <img 
                    src={dashboardPreview} 
                    alt="Flint Dashboard Preview" 
                    className="w-full h-auto rounded-lg transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-600 text-white px-4 py-2 rounded-lg">
                      Click to enlarge
                    </div>
                  </div>
                </button>
              </div>
              <blockquote className="space-y-4">
                <p className="text-xl italic text-gray-300">
                  "Flint is the only place where my banks, cards, and brokerages just… add up."
                </p>
                <cite className="text-sm text-gray-400">— Emily T.</cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Hero Section - CTA 1: Unlimited Annual */}
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
                onClick={() => handleCTAClick('unlimited-yearly', '$499.99')}
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
                    <span className="font-semibold">Trusted financial infrastructure</span>
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
                <img src={avatar1} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
                <img src={avatar2} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
                <img src={avatar3} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
                <img src={avatar4} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
                <img src={avatar5} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
              </div>
              <span className="text-lg font-semibold">2,847+ users</span>
            </div>
            <p className="text-xl text-gray-300 leading-relaxed">
              Over <strong>2,847 users</strong> already upgraded Flint and are managing 12+ accounts, 
              paying off credit cards faster, and cutting hours of financial stress each week.
            </p>
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

        {/* Dashboard Preview Modal */}
        <Dialog open={dashboardPreviewOpen} onOpenChange={setDashboardPreviewOpen}>
          <DialogContent className="max-w-7xl w-full p-0 bg-black border-gray-800">
            <VisuallyHidden>
              <DialogTitle>Dashboard Preview</DialogTitle>
              <DialogDescription>
                Enlarged view of the Flint dashboard showing all your financial accounts and information in one place
              </DialogDescription>
            </VisuallyHidden>
            <div className="relative">
              <button
                onClick={() => setDashboardPreviewOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-gray-900 hover:bg-gray-800 rounded-full text-white transition-colors"
                data-testid="button-close-preview"
              >
                <X className="h-6 w-6" />
              </button>
              <img 
                src={dashboardPreview} 
                alt="Flint Dashboard Full Preview" 
                className="w-full h-auto"
              />
            </div>
          </DialogContent>
        </Dialog>

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
                data-cta="basic-yearly"
                onClick={() => handleCTAClick('basic-yearly', '$199.99')}
              >
                Start with Plus Annual – $199.99
              </Button>
              
              <p className="text-sm text-gray-400">
                Great for 3 accounts connections & core insights.
              </p>
            </div>
          </div>
        </section>

        {/* Social Proof Block #3 - Savings Chart */}
        <section className="py-16 bg-gray-900/30">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-white">Total Savings Over Time</h3>
              <p className="text-xl text-gray-300">
                Flint Plus users save on average <strong className="text-green-400">$127/month</strong> by tracking 
                subscriptions and reducing hidden fees.
              </p>
            </div>
            
            {/* Cumulative Savings Bar Chart */}
            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
              <div className="space-y-6">
                <div className="relative flex items-end justify-center gap-2 h-80">
                  {/* SVG Line Overlay */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <polyline
                      points="8.33%,83.33% 25%,66.67% 41.67%,50% 58.33%,33.33% 75%,16.67% 91.67%,0%"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  </svg>
                  
                  {[
                    { month: 'Month 1', amount: 127, label: '$127' },
                    { month: 'Month 2', amount: 254, label: '$254' },
                    { month: 'Month 3', amount: 381, label: '$381' },
                    { month: 'Month 4', amount: 508, label: '$508' },
                    { month: 'Month 5', amount: 635, label: '$635' },
                    { month: 'Month 6', amount: 762, label: '$762' }
                  ].map((bar, index) => {
                    const maxHeight = 280; // Leave 40px padding at top
                    const heightPx = (bar.amount / 762) * maxHeight;
                    return (
                      <div key={bar.month} className="flex-1 max-w-[140px] flex flex-col items-center gap-3 relative z-10">
                        <div className="relative w-full flex flex-col items-center justify-end">
                          {/* Bar */}
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all duration-300 hover:from-blue-500 hover:to-cyan-300"
                            style={{ height: `${heightPx}px` }}
                          />
                        </div>
                        {/* Value Label Below Bar */}
                        <div className="text-base font-bold text-white">
                          {bar.label}
                        </div>
                        <span className="text-sm text-gray-400 font-medium">{bar.month}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Chart Legend */}
                <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-cyan-400 rounded"></div>
                    <span className="text-sm text-gray-400">Total Saved</span>
                  </div>
                </div>
              </div>
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

        {/* Feature Comparison Table */}
        <section id="feature-comparison" data-section="feature-comparison" className="py-20">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white text-center">
                  Feature Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-feature-comparison">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 text-gray-400">Feature</th>
                        <th className="text-center py-3 text-gray-400">Plus</th>
                        <th className="text-center py-3 text-gray-400">Pro</th>
                        <th className="text-center py-3 text-gray-400">Unlimited</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 text-white">Account Connections</td>
                        <td className="text-center py-3 text-gray-400">3</td>
                        <td className="text-center py-3 text-gray-400">5</td>
                        <td className="text-center py-3 text-gray-400">Unlimited</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 text-white">Recurring Subscription Management</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 text-white">Transfer Funds (Coming Soon)</td>
                        <td className="text-center py-3 text-gray-600">-</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 text-white">Trading (Coming Soon)</td>
                        <td className="text-center py-3 text-gray-600">-</td>
                        <td className="text-center py-3 text-gray-600">-</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 text-white">Priority Support</td>
                        <td className="text-center py-3 text-gray-600">-</td>
                        <td className="text-center py-3 text-gray-600">-</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
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
      <footer className="mt-20 bg-black/80 border-t border-gray-700 relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="text-white font-bold text-xl">Flint</span>
              </div>
              <p className="text-gray-300 text-sm max-w-md">
                Connect all your financial accounts in one secure platform. 
                Take control of your money with bank-grade security.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Legal</h4>
              <div className="flex flex-wrap gap-6 text-sm">
                <a href="/tos" className="text-gray-300 hover:text-purple-400 transition-colors">Terms of Service</a>
                <a href="/privacy-policy" className="text-gray-300 hover:text-purple-400 transition-colors">Privacy Policy</a>
                <span className="text-gray-300">contact us at <a href="mailto:support@flint-investing.com" className="text-purple-400 hover:text-purple-300 transition-colors">support@flint-investing.com</a></span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8 mt-8">
            <p className="text-sm text-gray-300 text-center">
              &copy; 2025 Flint Financial Management Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Checkout Modal */}
      <CheckoutModal 
        planId={checkoutPlanId} 
        onClose={() => setCheckoutPlanId(null)} 
      />
      
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