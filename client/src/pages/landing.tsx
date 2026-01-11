/**
 * Flint Landing Page - High-converting marketing funnel
 * Route: / (public, static)
 * Tech: React with Tailwind CSS, mobile-first, performance optimized
 * Goal: Convert visitors through tiered CTA funnel
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import forbesLogo from '@assets/forbes-logo-white_1760732850878.png';
import wsjLogo from '@assets/12450_65f1b42317bb1_3142_1760732860674.png';
import entrepreneurLogo from '@assets/images_1760732961328.png';
import bloombergLogo from '@assets/bloomberg-logo-png-bloomberg-logo-png-transparent-amp-svg-vector-pluspng-2400x665_1760732850877.png';

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

// Hide "2,847+ users" social proof section until this timestamp (24 hours from now)
const SHOW_SOCIAL_PROOF_AFTER = new Date('2025-10-22T01:05:00Z').getTime();

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ArrowRight, Shield, TrendingUp, Zap, CheckCircle, Star, Users, DollarSign, Lock, Building, CreditCard, Check, X, ArrowUpDown, RefreshCcw, Receipt, LineChart } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import flintLogo from "@assets/flint-logo.png";
import dashboardPreview from "@assets/dashboard-preview.png";
import avatar1 from "@assets/generated_images/Professional_Asian_woman_headshot_526eadc3.png";
import avatar2 from "@assets/generated_images/Professional_Black_man_headshot_4ca6d178.png";
import avatar3 from "@assets/generated_images/Professional_Hispanic_woman_headshot_e62bf380.png";
import avatar4 from "@assets/generated_images/Professional_Caucasian_man_headshot_f922a01f.png";
import avatar5 from "@assets/generated_images/Professional_Middle_Eastern_woman_headshot_5f778eae.png";
import { CheckoutModal } from "@/components/checkout-modal";
import { EmbeddedCheckoutModal } from "@/components/EmbeddedCheckoutModal";
import FeatureRequestModal from "@/components/FeatureRequestModal";
import { MessageSquare } from "lucide-react";

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

// Feature flag for trading/transfers - enabled for production
const SHOW_TRADING_FEATURES = true;

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
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<{ sessionId: string; planId?: string; email?: string; planName: string } | null>(null);
  const [featureRequestModalOpen, setFeatureRequestModalOpen] = useState(false);
  
  // Embedded checkout state
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutTier, setCheckoutTier] = useState<'basic' | 'pro'>('basic');
  const [checkoutBillingPeriod, setCheckoutBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
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

  // Handle CTA clicks - opens checkout modal directly
  const handleCTAClick = (tier: 'basic' | 'pro', billingPeriod: 'monthly' | 'yearly') => {
    trackEvent('click_cta', { tier, billingPeriod });
    
    // Set tier, billing period and open checkout modal directly
    setCheckoutTier(tier);
    setCheckoutBillingPeriod(billingPeriod);
    setCheckoutModalOpen(true);
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
    <div className="min-h-screen bg-[#FAFBFC] text-gray-900 relative overflow-hidden">
      <Helmet>
        <title>Flint - See All Your Money in One Place | Financial Dashboard</title>
        <meta name="description" content="Flint is a free financial dashboard that connects all your bank accounts, investments, and credit cards in one place. Track your net worth, monitor spending, pay down debt, and reach your money goals. Connect over 10,000 financial institutions securely." />
        <meta name="keywords" content="personal finance, money management, net worth tracker, budgeting app, financial dashboard, bank account aggregator, investment tracking" />
        <meta property="og:title" content="Flint - See All Your Money in One Place" />
        <meta property="og:description" content="Free financial dashboard that connects all your accounts. Track net worth, monitor spending, and reach your goals." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://flint-investing.com/" />
      </Helmet>
      {/* Sticky Header - Light Theme */}
      <header className="sticky top-0 z-50 px-4 lg:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img 
                  src={flintLogo} 
                  alt="Flint Logo" 
                  className="h-8 w-auto"
                />
                <span className="font-semibold text-gray-900 text-lg">Flint</span>
              </div>
            </Link>
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Pricing
              </button>
              <button 
                onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                FAQ
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                data-testid="button-login"
              >
                Sign In
              </Button>
            </Link>
            <Button 
              onClick={() => setCheckoutModalOpen(true)}
              className="bg-[#1a56db] hover:bg-[#1e40af] text-white rounded-lg px-5"
              data-testid="button-get-started-header"
            >
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section - Clean SaaS Style */}
      <main className="mx-auto max-w-7xl px-4 lg:px-8 relative z-10">
        <section className="py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="space-y-6">
            <p className="text-[#1a56db] font-medium text-sm flex items-center gap-2">
              <span className="text-lg">🔥</span> Flint is one of the best options for you.
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1]">
              See All Your Money in One Place
            </h1>
            <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
              Flint brings all your accounts together, helps you cut hidden fees, and grow toward your goals simply and clearly.
            </p>
            
            {/* Email + Get Started CTA */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md pt-4">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={checkoutEmail}
                onChange={(e) => setCheckoutEmail(e.target.value)}
                className="flex-1 h-12 px-4 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-[#1a56db] focus:border-transparent"
              />
              <Button 
                onClick={() => setCheckoutModalOpen(true)}
                className="h-12 px-6 bg-[#1a56db] hover:bg-[#1e40af] text-white font-medium rounded-lg whitespace-nowrap"
                data-testid="button-get-started-hero"
              >
                Get Started
              </Button>
            </div>
            
            <p className="text-sm text-gray-500">
              Try for free. No credit card required.
            </p>
          </div>
          
          {/* Right side - Dashboard Preview */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <img 
                src={dashboardPreview} 
                alt="Flint Dashboard" 
                className="w-full h-auto"
                loading="eager"
              />
            </div>
            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-[#1a56db]" />
              </div>
              <span className="text-sm font-medium text-gray-700">Bank-level Security</span>
            </div>
          </div>
        </section>

        {/* Trust Logos Strip - Light Theme */}
        <section className="py-12 border-t border-gray-200" data-section="as-seen-on">
          <div className="max-w-6xl mx-auto space-y-8 px-4">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 grayscale">
              {/* Forbes */}
              <div className="transition-all duration-300 hover:opacity-100 hover:grayscale-0">
                <img 
                  src={forbesLogo}
                  alt="Forbes"
                  className="h-8 w-auto object-contain invert"
                  loading="lazy"
                  decoding="async"
                  data-testid="logo-forbes"
                />
              </div>
              {/* Wall Street Journal */}
              <div className="transition-all duration-300 hover:opacity-100 hover:grayscale-0">
                <img 
                  src={wsjLogo}
                  alt="Wall Street Journal"
                  className="h-8 w-auto object-contain invert"
                  loading="lazy"
                  decoding="async"
                  data-testid="logo-wsj"
                />
              </div>
              {/* Entrepreneur */}
              <div className="transition-all duration-300 hover:opacity-100 hover:grayscale-0">
                <img 
                  src={entrepreneurLogo}
                  alt="Entrepreneur"
                  className="h-8 w-auto object-contain invert"
                  loading="lazy"
                  decoding="async"
                  data-testid="logo-entrepreneur"
                />
              </div>
              {/* Bloomberg */}
              <div className="transition-all duration-300 hover:opacity-100 hover:grayscale-0">
                <img 
                  src={bloombergLogo}
                  alt="Bloomberg"
                  className="h-8 w-auto object-contain invert"
                  loading="lazy"
                  decoding="async"
                  data-testid="logo-bloomberg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Supported Institutions Scrolling Banner */}
        <section className="py-12 bg-gray-50 overflow-hidden" data-section="institutions">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center">
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold" data-testid="text-connect-accounts">PARTNERS SUPPORTED</h3>
            </div>
            
            {/* Scrolling container */}
            <div className="relative">
              {/* Gradient overlays for smooth edges */}
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
              
              {/* Scrolling track - seamless infinite scroll */}
              <div className="flex gap-6 animate-scroll-seamless" data-testid="scrolling-institutions">
                {/* First set of logos */}
                {INSTITUTIONS.map((institution, idx) => (
                  <div key={`logo-${idx}`} className="flex-shrink-0 flex items-center justify-center" data-testid={`institution-${institution.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                    <div className="h-16 w-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden hover:border-[#1a56db]/50 hover:shadow-md transition-all duration-300">
                      <img 
                        src={`https://cdn.brandfetch.io/${institution.domain}?c=${import.meta.env.VITE_BRANDFETCH_CLIENT_ID || ''}`}
                        alt={institution.name}
                        className="h-full w-full object-cover scale-125"
                        loading="lazy"
                        decoding="async"
                        title={institution.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.textContent = '';
                            const fallback = document.createElement('div');
                            fallback.className = 'text-xs text-gray-400 font-semibold text-center';
                            fallback.textContent = institution.name.substring(0, 3).toUpperCase();
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
                {/* Second set for seamless loop */}
                {INSTITUTIONS.map((institution, idx) => (
                  <div key={`logo-dup-${idx}`} className="flex-shrink-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden hover:border-[#1a56db]/50 hover:shadow-md transition-all duration-300">
                      <img 
                        src={`https://cdn.brandfetch.io/${institution.domain}?c=${import.meta.env.VITE_BRANDFETCH_CLIENT_ID || ''}`}
                        alt={institution.name}
                        className="h-full w-full object-cover scale-125"
                        loading="lazy"
                        decoding="async"
                        title={institution.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.textContent = '';
                            const fallback = document.createElement('div');
                            fallback.className = 'text-xs text-gray-400 font-semibold text-center';
                            fallback.textContent = institution.name.substring(0, 3).toUpperCase();
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
                {/* Third set for longer scroll */}
                {INSTITUTIONS.map((institution, idx) => (
                  <div key={`logo-dup2-${idx}`} className="flex-shrink-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden hover:border-[#1a56db]/50 hover:shadow-md transition-all duration-300">
                      <img 
                        src={`https://cdn.brandfetch.io/${institution.domain}?c=${import.meta.env.VITE_BRANDFETCH_CLIENT_ID || ''}`}
                        alt={institution.name}
                        className="h-full w-full object-cover scale-125"
                        loading="lazy"
                        decoding="async"
                        title={institution.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.textContent = '';
                            const fallback = document.createElement('div');
                            fallback.className = 'text-xs text-gray-400 font-semibold text-center';
                            fallback.textContent = institution.name.substring(0, 3).toUpperCase();
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-center text-xs text-gray-500 mt-4" data-testid="text-more-institutions">
              120+ banks and brokerages supported
            </p>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-20 bg-white border-y border-gray-200" data-section="problem">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                Your money is spread out.
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                This costs you time and money.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-8">
              {/* Time Wasted */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-8 text-center space-y-3 md:space-y-4">
                  <div className="flex justify-center">
                    <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-red-100 flex items-center justify-center">
                      <Users className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                    </div>
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <div className="text-3xl md:text-4xl font-bold text-red-600">3+ hours</div>
                    <div className="text-gray-500 text-base md:text-lg">wasted every week</div>
                  </div>
                  <p className="text-gray-600 text-sm md:text-base">
                    Switching between 5-8 different banking apps, brokerages, and spreadsheets just to check your finances
                  </p>
                </CardContent>
              </Card>

              {/* Money Lost */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-8 text-center space-y-3 md:space-y-4">
                  <div className="flex justify-center">
                    <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-orange-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
                    </div>
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <div className="text-3xl md:text-4xl font-bold text-orange-600">$1,847</div>
                    <div className="text-gray-500 text-base md:text-lg">lost per year</div>
                  </div>
                  <p className="text-gray-600 text-sm md:text-base">
                    Hidden fees, forgotten subscriptions, and missed opportunities across disconnected accounts
                  </p>
                </CardContent>
              </Card>

              {/* Financial Confusion */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-8 text-center space-y-3 md:space-y-4">
                  <div className="flex justify-center">
                    <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Shield className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
                    </div>
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <div className="text-4xl md:text-5xl font-bold text-yellow-600">68%</div>
                    <div className="text-gray-500 text-base md:text-lg">don't know their net worth</div>
                  </div>
                  <p className="text-gray-600 text-sm md:text-base">
                    Because their money is too scattered across banks, brokerages, and crypto wallets to track
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center pt-8">
              <p className="text-2xl text-gray-700 font-semibold">
                There's a <span className="text-[#1a56db]">better way</span>
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50" data-section="features" id="features">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                Everything in{' '}
                <span className="text-[#1a56db]">
                  one place
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Stop jumping between apps. See all your money at once.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Money In/Out Flow */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg hover:border-[#1a56db]/30 transition-all duration-300">
                <CardHeader className="p-4 md:p-6">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-2 md:mb-4">
                    <ArrowUpDown className="h-5 w-5 md:h-6 md:w-6 text-[#1a56db]" />
                  </div>
                  <CardTitle className="text-gray-900 text-base md:text-lg">Money In/Out Flow</CardTitle>
                  <CardDescription className="text-gray-600 text-sm md:text-base">
                    Track where your money comes from and where it goes.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Recurring Subscriptions */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-300">
                <CardHeader className="p-4 md:p-6">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-2 md:mb-4">
                    <RefreshCcw className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-gray-900">Recurring Subscriptions</CardTitle>
                  <CardDescription className="text-gray-600">
                    See all your subscriptions across every account.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Investment P&L */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg hover:border-green-300 transition-all duration-300">
                <CardHeader className="p-4 md:p-6">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-green-100 flex items-center justify-center mb-2 md:mb-4">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-gray-900 text-base md:text-lg">Investment Profit/Loss</CardTitle>
                  <CardDescription className="text-gray-600 text-sm md:text-base">
                    Full view of gains and losses across all investments.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Transaction Review */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg hover:border-cyan-300 transition-all duration-300">
                <CardHeader className="p-4 md:p-6">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-cyan-100 flex items-center justify-center mb-2 md:mb-4">
                    <Receipt className="h-5 w-5 md:h-6 md:w-6 text-cyan-600" />
                  </div>
                  <CardTitle className="text-gray-900 text-base md:text-lg">Transaction History</CardTitle>
                  <CardDescription className="text-gray-600 text-sm md:text-base">
                    Browse and analyze every transaction from all accounts.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Stock Charts */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300">
                <CardHeader className="p-4 md:p-6">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-2 md:mb-4">
                    <LineChart className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-gray-900 text-base md:text-lg">Smart Stock Charts</CardTitle>
                  <CardDescription className="text-gray-600 text-sm md:text-base">
                    Make informed investment decisions with detailed charts.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Credit Card Utilization */}
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg hover:border-orange-300 transition-all duration-300">
                <CardHeader className="p-4 md:p-6">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-orange-100 flex items-center justify-center mb-2 md:mb-4">
                    <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-gray-900 text-base md:text-lg">Credit Card Management</CardTitle>
                  <CardDescription className="text-gray-600 text-sm md:text-base">
                    Monitor and manage your credit card utilization.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white" data-section="how-it-works">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                How it works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get started in just 3 minutes.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-4 md:gap-8 items-center">
              {/* Step 1 */}
              <div className="relative space-y-3 md:space-y-4 text-center">
                <div className="flex items-center justify-center mb-4 md:mb-6">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-[#1a56db] flex items-center justify-center shadow-lg">
                    <span className="text-2xl md:text-3xl font-bold text-white">1</span>
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Connect Your Accounts</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Connect your accounts in seconds.
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>

              {/* Step 2 */}
              <div className="relative space-y-3 md:space-y-4 text-center">
                <div className="flex items-center justify-center mb-4 md:mb-6">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-[#1a56db] flex items-center justify-center shadow-lg">
                    <span className="text-2xl md:text-3xl font-bold text-white">2</span>
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">See Everything Unified</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  See all your money in one place.
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>

              {/* Step 3 */}
              <div className="relative space-y-4 text-center">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl md:text-3xl font-bold text-white">3</span>
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Analyze & Optimize</h3>
                <p className="text-gray-600">
                  Make smarter financial decisions with powerful insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="text-sm text-[#1a56db] font-semibold">Dashboard Preview</div>
                <h3 className="text-2xl font-bold text-gray-900">See Your Complete Financial Picture</h3>
                <p className="text-gray-600">
                  See all your accounts in one place. Track your total worth. Stay on top of your money.
                </p>
                <button
                  onClick={() => setDashboardPreviewOpen(true)}
                  className="relative group cursor-pointer overflow-hidden rounded-xl border border-gray-200 shadow-lg hover:shadow-xl hover:border-[#1a56db]/30 transition-all duration-300"
                  data-testid="button-dashboard-preview"
                >
                  <img 
                    src={dashboardPreview} 
                    alt="Flint Dashboard Preview" 
                    className="w-full h-auto rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center rounded-xl">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#1a56db] text-white px-4 py-2 rounded-lg">
                      Click to enlarge
                    </div>
                  </div>
                </button>
              </div>
              <blockquote className="space-y-4 bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                <p className="text-xl italic text-gray-700">
                  "Flint is the only place where my banks, cards, and brokerages just… add up."
                </p>
                <cite className="text-sm text-gray-500">— Emily T.</cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* CTA 6: Free Application Form */}
        <section id="apply" data-section="apply" className="py-20 bg-white">
          <div className="max-w-2xl mx-auto">
            <div className="text-center space-y-6 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Try <span className="text-[#1a56db]">Flint for free</span>
              </h2>
              <p className="text-xl text-gray-600">
                Tell us what you want to connect.
              </p>
            </div>

            {!formSubmitted ? (
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardContent className="p-8">
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-700">First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                        placeholder="Enter your first name"
                        data-testid="input-first-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                        placeholder="Enter your email"
                        data-testid="input-email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-700">How many accounts are you looking to connect? *</Label>
                      <Select
                        value={formData.accountCount}
                        onValueChange={(value) => setFormData({...formData, accountCount: value})}
                        required
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue placeholder="Select number of accounts" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4+">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-gray-700">What will you connect? *</Label>
                      <RadioGroup
                        value={formData.connectType}
                        onValueChange={(value) => setFormData({...formData, connectType: value})}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="banks" id="banks" className="border-gray-300" />
                          <Label htmlFor="banks" className="text-gray-700 cursor-pointer">Banks</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="brokerages" id="brokerages" className="border-gray-300" />
                          <Label htmlFor="brokerages" className="text-gray-700 cursor-pointer">Brokerages</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="both" id="both" className="border-gray-300" />
                          <Label htmlFor="both" className="text-gray-700 cursor-pointer">Both</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white py-3"
                      disabled={!formData.firstName || !formData.email || !formData.accountCount || !formData.connectType}
                      data-testid="button-submit-application"
                    >
                      Submit Application
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      We'll never sell your data. Privacy policy applies.
                    </p>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="text-6xl">✅</div>
                  <h3 className="text-2xl font-bold text-green-600">Application Submitted!</h3>
                  <p className="text-gray-600">We'll review your application and email you within 24 hours.</p>
                  <Button 
                    variant="outline"
                    className="mt-4 border-gray-300 text-gray-700"
                    onClick={() => setFormSubmitted(false)}
                  >
                    Submit Another Application
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Hero Section - CTA 1: Pro Annual */}
        <section id="annual" data-section="annual" className="grid lg:grid-cols-2 gap-12 py-20 items-center bg-gray-50">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-xl text-gray-600 leading-relaxed">
                Or get started right now and <strong className="text-gray-900">save $80</strong> 
                when you pay yearly for Flint Pro.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-bold text-gray-900">$399.99</span>
                <span className="text-lg text-gray-400 line-through">$480</span>
                <span className="text-lg text-gray-600">/year</span>
              </div>
              
              <Button 
                size="lg" 
                className="w-full lg:w-auto bg-[#1a56db] hover:bg-[#1e40af] text-white px-8 py-4 text-lg"
                data-cta="annual-pro"
                data-testid="button-get-pro-yearly"
                onClick={() => handleCTAClick('pro', 'yearly')}
              >
                Start with Pro Annual – $399.99
              </Button>
              
              <p className="text-sm text-gray-500">
                Founding Member pricing. Renews at same rate if you keep your plan.
              </p>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-gray-900">Bank-grade encryption</span>
                  </div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Building className="h-6 w-6 text-[#1a56db]" />
                    <span className="font-semibold text-gray-900">Trusted financial infrastructure</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Lock className="h-6 w-6 text-[#1a56db]" />
                    <span className="font-semibold text-gray-900">No ads or selling data</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Social Proof Block #1 - Hidden for 24 hours, will auto-show after Oct 22, 2025 01:05 UTC */}
        {Date.now() >= SHOW_SOCIAL_PROOF_AFTER && (
          <section className="py-16 border-y border-gray-200 bg-white">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="flex -space-x-2">
                  <img src={avatar1} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" loading="lazy" decoding="async" />
                  <img src={avatar2} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" loading="lazy" decoding="async" />
                  <img src={avatar3} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" loading="lazy" decoding="async" />
                  <img src={avatar4} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" loading="lazy" decoding="async" />
                  <img src={avatar5} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" loading="lazy" decoding="async" />
                </div>
                <span className="text-lg font-semibold text-gray-900">2,847+ users</span>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed">
                Over <strong className="text-gray-900">2,847 users</strong> already upgraded Flint and are managing 12+ accounts, 
                paying off credit cards faster, and cutting hours of financial stress each week.
              </p>
            </div>
          </section>
        )}

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
                loading="lazy"
                decoding="async"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Social Proof Block #3 - Savings Chart */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-900">Total Savings Over Time</h3>
              <p className="text-xl text-gray-600">
                Flint Basic users save on average <strong className="text-green-600">$127/month</strong> by tracking 
                subscriptions and reducing hidden fees.
              </p>
            </div>
            
            {/* Cumulative Savings Bar Chart */}
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 shadow-sm">
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
                        <div className="text-base font-bold text-gray-900">
                          {bar.label}
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{bar.month}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Chart Legend */}
                <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-cyan-400 rounded"></div>
                    <span className="text-sm text-gray-500">Total Saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA 4: Monthly Pricing Options */}
        <section id="pricing" data-section="monthly" className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
                Choose your <span className="text-[#1a56db]">plan</span>
              </h2>
              
              {/* Monthly/Yearly Toggle */}
              <div className="flex items-center justify-center space-x-4">
                <span className={`text-lg ${!isYearly ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                  Monthly
                </span>
                <Switch 
                  checked={isYearly} 
                  onCheckedChange={setIsYearly}
                  className="data-[state=checked]:bg-[#1a56db] data-[state=unchecked]:bg-gray-300"
                />
                <span className={`text-lg ${isYearly ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                  Yearly
                </span>
                {isYearly && (
                  <Badge className="bg-green-600 text-white">2 months free</Badge>
                )}
              </div>
            </div>
            
            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Free */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl text-gray-900">Flint Free</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-gray-900">
                      $0
                    </div>
                    <div className="text-gray-500">
                      forever
                    </div>
                  </div>
                  <CardDescription className="text-gray-600">
                    Perfect for getting started with your financial overview.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300"
                    data-cta="free"
                    onClick={() => {
                      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Get Started Free
                  </Button>
                </CardContent>
              </Card>
              
              {/* Basic - Most Popular */}
              <Card className="bg-[#1a56db] border-[#1a56db] relative shadow-lg">
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900">
                  Most Popular
                </Badge>
                <CardHeader className="text-center space-y-4 pt-8">
                  <CardTitle className="text-2xl text-white">Flint Basic</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-white">
                      ${isYearly ? '16.67' : '19.99'}
                    </div>
                    <div className="text-blue-100">
                      {isYearly ? '/mo (billed $199.99/year)' : '/month'}
                    </div>
                  </div>
                  <CardDescription className="text-blue-100">
                    Best for managing unlimited accounts and subscriptions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-white hover:bg-gray-100 text-[#1a56db] font-semibold"
                    data-cta={isYearly ? 'basic-yearly' : 'basic-monthly'}
                    data-testid={isYearly ? 'button-get-basic-yearly' : 'button-get-basic'}
                    onClick={() => handleCTAClick('basic', isYearly ? 'yearly' : 'monthly')}
                  >
                    Choose Basic {isYearly ? 'Yearly' : 'Monthly'}
                  </Button>
                </CardContent>
              </Card>
              
              {/* Pro */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl text-gray-900">Flint Pro</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-gray-900">
                      ${isYearly ? '33.33' : '39.99'}
                    </div>
                    <div className="text-gray-500">
                      {isYearly ? '/mo (billed $399.99/year)' : '/month'}
                    </div>
                  </div>
                  <CardDescription className="text-gray-600">
                    Complete control with advanced analytics and automation features.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white"
                    data-cta={isYearly ? 'pro-yearly' : 'pro-monthly'}
                    data-testid={isYearly ? 'button-get-pro-yearly' : 'button-get-pro'}
                    onClick={() => handleCTAClick('pro', isYearly ? 'yearly' : 'monthly')}
                  >
                    Choose Pro {isYearly ? 'Yearly' : 'Monthly'}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center space-y-2">
              <Badge variant="outline" className="border-[#1a56db] text-[#1a56db]">
                Founding Member Pricing — lock this in before new features launch
              </Badge>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section id="feature-comparison" data-section="feature-comparison" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-900 text-center">
                  Feature Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-feature-comparison">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-gray-500">Feature</th>
                        <th className="text-center py-3 text-gray-500">Free</th>
                        <th className="text-center py-3 text-gray-500">Basic</th>
                        <th className="text-center py-3 text-gray-500">Pro</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">Account Connections</td>
                        <td className="text-center py-3 text-gray-600">4</td>
                        <td className="text-center py-3 text-gray-600">Unlimited</td>
                        <td className="text-center py-3 text-gray-600">Unlimited</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">Money In/Out Flow</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">Dashboard & Transaction History</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">Recurring Subscription Management</td>
                        <td className="text-center py-3 text-gray-400">-</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">Credit Card Management</td>
                        <td className="text-center py-3 text-gray-400">-</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">Stock Charts (Coming Soon)</td>
                        <td className="text-center py-3 text-gray-400">-</td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="text-center py-3">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      </tr>
                      {SHOW_TRADING_FEATURES && (
                        <tr className="border-b border-gray-100">
                          <td className="py-3 text-gray-900">Trading (Coming Soon)</td>
                          <td className="text-center py-3 text-gray-400">-</td>
                          <td className="text-center py-3 text-gray-400">-</td>
                          <td className="text-center py-3">
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          </td>
                        </tr>
                      )}
                      {SHOW_TRADING_FEATURES && (
                        <tr>
                          <td className="py-3 text-gray-900">Transfer Funds (Coming Soon)</td>
                          <td className="text-center py-3 text-gray-400">-</td>
                          <td className="text-center py-3 text-gray-400">-</td>
                          <td className="text-center py-3">
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" data-section="faq" className="py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600">
                Everything you need to know about Flint
              </p>
            </div>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-gray-200">
                    <AccordionTrigger className="text-gray-900 hover:text-[#1a56db]">
                      Is my financial data secure?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Yes! We use bank-level encryption to protect your data. We never store your bank login credentials - we use secure, read-only connections through industry-standard providers. Your information is encrypted both in transit and at rest.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-gray-200">
                    <AccordionTrigger className="text-gray-900 hover:text-[#1a56db]">
                      How many accounts can I connect?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      It depends on your plan. Free allows 4 connections, while Basic and Pro both offer unlimited account connections. You can connect banks, credit cards, investment accounts, and crypto wallets.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border-gray-200">
                    <AccordionTrigger className="text-gray-900 hover:text-[#1a56db]">
                      Can I cancel my monthly subscription anytime?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Absolutely. You can cancel your monthly subscription at any time from your account settings with no cancellation fees. If you have a yearly subscription, you can cancel anytime, but we cannot provide refunds for the unused portion of your annual plan.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="border-gray-200">
                    <AccordionTrigger className="text-gray-900 hover:text-[#1a56db]">
                      What banks and brokerages do you support?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      We support over 12,000 financial institutions including Chase, Bank of America, Fidelity, Schwab, Robinhood, Coinbase, and many more. Most major US banks, credit unions, brokerages, and crypto exchanges are supported.
                    </AccordionContent>
                  </AccordionItem>

                  {SHOW_TRADING_FEATURES && (
                    <AccordionItem value="item-5" className="border-gray-200">
                      <AccordionTrigger className="text-gray-900 hover:text-[#1a56db]">
                        How does trading work?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600">
                        With the Pro plan, you can buy and sell stocks directly through your connected brokerage accounts. We provide real-time quotes, market data, and a simple trading interface. Trading is available for only supported brokerages.
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  <AccordionItem value="item-6" className="border-gray-200">
                    <AccordionTrigger className="text-gray-900 hover:text-[#1a56db]">
                      Is there a free plan?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Yes! Flint Free allows you to connect up to 4 accounts and includes money flow tracking, dashboard, and transaction history at no cost. It's a great way to get started with Flint.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-7" className="border-gray-200 border-b-0">
                    <AccordionTrigger className="text-gray-900 hover:text-[#1a56db]">
                      What's the difference between the plans?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Free (4 connections) includes money flow tracking, dashboard, and transaction history. Basic (unlimited connections) adds recurring subscriptions, credit card management, and stock charts. Pro (unlimited connections) includes everything in Basic plus advanced analytics and automation features.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>

      {/* Legal Footer */}
      <footer className="mt-20 border-t border-gray-200 bg-white relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <img src={flintLogo} alt="Flint Logo" className="h-8 w-auto" />
                <span className="text-gray-900 font-bold text-xl">Flint</span>
              </div>
              <p className="text-gray-600 text-sm max-w-md">
                Connect all your financial accounts in one secure platform. 
                Take control of your money with bank-grade security.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-gray-900 font-semibold">Product</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/banking" className="text-gray-600 hover:text-[#1a56db] transition-colors">Bank Account Tracker</Link>
                <Link href="/investing" className="text-gray-600 hover:text-[#1a56db] transition-colors">Stock Portfolio Tracker</Link>
                <Link href="/crypto" className="text-gray-600 hover:text-[#1a56db] transition-colors">Crypto Portfolio Tracker</Link>
                <Link href="/blog" className="text-gray-600 hover:text-[#1a56db] transition-colors">Blog</Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-gray-900 font-semibold">Account</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/login" className="text-gray-600 hover:text-[#1a56db] transition-colors">Log In</Link>
                <Link href="/reset-password" className="text-gray-600 hover:text-[#1a56db] transition-colors">Reset Password</Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-gray-900 font-semibold">Legal</h4>
              <div className="flex flex-col gap-2 text-sm">
                <a href="/tos" className="text-gray-600 hover:text-[#1a56db] transition-colors">Terms of Service</a>
                <a href="/privacy-policy" className="text-gray-600 hover:text-[#1a56db] transition-colors">Privacy Policy</a>
                <a href="mailto:support@flint-investing.com" className="text-[#1a56db] hover:text-[#1e40af] transition-colors">support@flint-investing.com</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 mt-8">
            <p className="text-sm text-gray-500 text-center">
              &copy; 2025 Flint Tech Inc. All rights reserved.
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
      
      {/* Checkout Modal */}
      {selectedCheckout && (
        <CheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => {
            setCheckoutModalOpen(false);
            setSelectedCheckout(null);
          }}
          sessionId={selectedCheckout.sessionId}
          planId={selectedCheckout.planId}
          email={selectedCheckout.email}
          planName={selectedCheckout.planName}
          onSuccess={(planId, receiptId) => {
            // Refresh the page to update UI with new subscription status
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1500);
          }}
        />
      )}

      {/* Embedded Checkout Modal */}
      <EmbeddedCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={(open) => {
          setCheckoutModalOpen(open);
          if (!open) {
            setCheckoutEmail('');
          }
        }}
        email={checkoutEmail}
        tier={checkoutTier}
        billingPeriod={checkoutBillingPeriod}
      />

      {/* Floating Feature Request Button */}
      <button
        onClick={() => setFeatureRequestModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 flex items-center gap-2 group"
        data-testid="button-feature-request-floating"
        aria-label="Request a feature"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="hidden group-hover:inline-block pr-2 font-medium">Request Feature</span>
      </button>

      <FeatureRequestModal 
        open={featureRequestModalOpen}
        onOpenChange={setFeatureRequestModalOpen}
      />
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
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => window.location.href = '/app'}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default Landing;