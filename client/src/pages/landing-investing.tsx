/**
 * Flint Investing Landing Page - SEO optimized for stock investors
 * Route: /investing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { BeamsBackground } from "@/components/ui/beams-background";
import { 
  Shield, 
  TrendingUp, 
  BarChart3, 
  Check,
  ArrowRight,
  LineChart,
  PieChart,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import flintLogo from "@assets/flint-logo.png";
import { LandingHeader } from "@/components/layout/landing-header";
import { EmbeddedCheckoutModal } from "@/components/EmbeddedCheckoutModal";
import { Helmet } from 'react-helmet-async';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
};

const INVESTING_INSTITUTIONS = [
  { name: 'Fidelity', domain: 'fidelity.com' },
  { name: 'Charles Schwab', domain: 'schwab.com' },
  { name: 'Robinhood', domain: 'robinhood.com' },
  { name: 'E*TRADE', domain: 'etrade.com' },
  { name: 'Webull', domain: 'webull.com' },
  { name: 'Interactive Brokers', domain: 'interactivebrokers.com' },
  { name: 'TD Ameritrade', domain: 'tdameritrade.com' },
  { name: 'Alpaca', domain: 'alpaca.markets' },
  { name: 'Vanguard', domain: 'vanguard.com' },
  { name: 'Public', domain: 'public.com' },
  { name: 'Tradestation', domain: 'tradestation.com' },
  { name: 'Questrade', domain: 'questrade.com' },
  { name: 'Wealthsimple', domain: 'wealthsimple.com' },
  { name: 'Tastytrade', domain: 'tastytrade.com' },
  { name: 'Tradier', domain: 'tradier.com' },
  { name: 'Betterment', domain: 'betterment.com' },
  { name: 'Wealthfront', domain: 'wealthfront.com' },
  { name: 'M1 Finance', domain: 'm1finance.com' },
];

export default function LandingInvesting() {
  const isMobile = useIsMobile();
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<'basic' | 'pro'>('basic');
  const [checkoutBillingPeriod, setCheckoutBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const signupRef = useRef<HTMLDivElement>(null);
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);

  const scrollToSignup = useCallback(() => {
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    return requirements;
  };

  const passwordRequirements = validatePassword(signupData.password);
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setSignupError('');
    
    if (!signupData.name || !signupData.email || !signupData.password) {
      setSignupError('Please fill in all fields');
      return;
    }

    if (!isPasswordValid) {
      setSignupError('Password does not meet security requirements');
      return;
    }

    setSignupLoading(true);
    
    try {
      const response = await fetch('/api/auth/public-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupData.name,
          email: signupData.email,
          password: signupData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: signupData.email,
            password: signupData.password,
          }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok && loginData.success) {
          setSignupSuccess(true);
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          setSignupSuccess(true);
          setTimeout(() => {
            window.location.href = '/login?registered=true';
          }, 2000);
        }
      } else {
        if (data.message && data.message.toLowerCase().includes('already')) {
          setSignupError('An account with this email already exists. Try logging in instead.');
        } else {
          setSignupError(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setSignupError('Network error. Please check your connection and try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  const openCheckout = (tier: 'basic' | 'pro') => {
    setCheckoutTier(tier);
    setCheckoutBillingPeriod(isAnnual ? 'yearly' : 'monthly');
    setCheckoutOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Stock Portfolio Tracker - Connect All Your Brokerages | Flint</title>
        <meta name="description" content="Track all your investments in one dashboard. Connect Robinhood, Schwab, Fidelity, E*TRADE, Webull and 50+ brokerages. See your total portfolio value, track gains, and trade smarter. Free to start." />
        <meta property="og:title" content="Stock Portfolio Tracker - See All Your Investments in One Place | Flint" />
        <meta property="og:description" content="The Apple Wallet for all your investment apps. Connect every brokerage and see your total portfolio in seconds." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="stock portfolio tracker, investment dashboard, Robinhood tracker, Schwab portfolio, brokerage aggregator, stock tracker, portfolio manager, investment tracker, stock market app, portfolio dashboard" />
        <link rel="canonical" href="https://flint-investing.com/investing" />
      </Helmet>

      <BeamsBackground className="min-h-screen text-white overflow-x-hidden">
        <LandingHeader currentPage="investing" onGetStarted={scrollToSignup} />

        <section className="pt-28 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 mb-6">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300">Stock Portfolio Tracker</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              All Your <span className="text-blue-400">Investment Apps</span> in One Place
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect all your brokerages. See your total portfolio. Track your gains. Trade smarter.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <RainbowButton onClick={scrollToSignup} className="h-14 px-8 rounded-xl text-lg" data-testid="button-get-started-hero">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </RainbowButton>
            </div>

            <p className="text-sm text-gray-400">Free forever. No credit card needed.</p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-400 mb-2">50+</p>
                <p className="text-gray-400">Brokerages Supported</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400 mb-2">Real-Time</p>
                <p className="text-gray-400">Portfolio Updates</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400 mb-2">Trade</p>
                <p className="text-gray-400">From One Dashboard</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-400 mb-8">Connect your favorite brokerages</p>
            <div className="relative overflow-hidden">
              <div className="flex gap-8 animate-[scroll_50s_linear_infinite]">
                {[...INVESTING_INSTITUTIONS, ...INVESTING_INSTITUTIONS].map((inst, idx) => (
                  <div key={idx} className="flex-shrink-0 w-40 h-20 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 p-4">
                    <img 
                      src={`https://cdn.brandfetch.io/${inst.domain}`}
                      alt={inst.name}
                      className="max-h-12 max-w-full object-contain filter brightness-0 invert opacity-70 hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-sm text-gray-300 font-medium">${inst.name}</span>`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why Investors Love Flint</h2>
            <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
              Stop switching between apps. Manage all your investments in one place.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <h3 className="text-lg font-semibold mb-2">Unified Portfolio</h3>
                  <p className="text-gray-400 text-sm">
                    See all your stocks, ETFs, and funds from every brokerage in one view.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <h3 className="text-lg font-semibold mb-2">Track Performance</h3>
                  <p className="text-gray-400 text-sm">
                    Watch your gains and losses in real time. No spreadsheets needed.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-blue-400/30 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-gradient-to-b from-blue-500/10 to-transparent rounded-lg p-6 h-full">
                  <h3 className="text-lg font-semibold mb-2">Trade from Flint</h3>
                  <p className="text-gray-400 text-sm">
                    Place trades on your connected brokerages without leaving the app.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <h3 className="text-lg font-semibold mb-2">Bank-Level Security</h3>
                  <p className="text-gray-400 text-sm">
                    We never store your passwords or keys. We're not a custodian and never move your funds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="space-y-10">
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-blue-500 flex-shrink-0">1</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">Connect Your Brokerages</h3>
                  <p className="text-gray-400">Link Robinhood, Schwab, Fidelity, E*TRADE, and 50+ more in seconds.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-blue-500 flex-shrink-0">2</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">See Your Total Portfolio</h3>
                  <p className="text-gray-400">View all your positions, track performance, and see your total value update in real time.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-blue-500 flex-shrink-0">3</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">Trade Smarter</h3>
                  <p className="text-gray-400">Set price alerts, track dividends, and place trades without switching apps.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to simplify your investing?</h2>
            <p className="text-gray-400 mb-8">Join thousands of investors managing their portfolios with Flint.</p>
            <RainbowButton onClick={scrollToSignup} className="h-14 px-12 rounded-xl text-lg" data-testid="button-cta-mid">
              Get Started Free
            </RainbowButton>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 bg-white/5 border-y border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Pick Your Plan</h2>
              <p className="text-gray-400 mb-6">Start free. Upgrade for trading and advanced features.</p>
              
              <div className="inline-flex bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!isAnnual ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  data-testid="toggle-monthly"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isAnnual ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  data-testid="toggle-annual"
                >
                  Annual <span className="text-green-400 ml-1">Save 17%</span>
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Free</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">$0</span>
                      <span className="text-gray-400">forever</span>
                    </div>
                    <p className="text-sm text-gray-400">Try it out</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> 4 accounts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> See all your investments</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Real-time updates</li>
                  </ul>
                  <RainbowButton onClick={scrollToSignup} className="w-full" data-testid="button-free-plan">
                    Start Free
                  </RainbowButton>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-blue-400/30 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-gradient-to-b from-blue-500/10 to-transparent rounded-lg p-6 h-full flex flex-col relative">
                  <div className="absolute top-4 right-4">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded">Most Popular</span>
                  </div>
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Basic</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">${isAnnual ? '199' : '19.99'}</span>
                      <span className="text-gray-400">{isAnnual ? '/year' : '/month'}</span>
                    </div>
                    {isAnnual && <p className="text-sm text-green-400">$199/year - 2 months free!</p>}
                    <p className="text-sm text-gray-400">For active investors</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Unlimited accounts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Everything in Free</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Recurring subscriptions</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Spending analyzer</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Goal tracking</li>
                  </ul>
                  <RainbowButton className="w-full" onClick={() => openCheckout('basic')} data-testid="button-basic-plan">
                    Get Basic
                  </RainbowButton>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Pro</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">${isAnnual ? '399' : '39.99'}</span>
                      <span className="text-gray-400">{isAnnual ? '/year' : '/month'}</span>
                    </div>
                    {isAnnual && <p className="text-sm text-green-400">$399/year - 2 months free!</p>}
                    <p className="text-sm text-gray-400">For power users</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Unlimited accounts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Everything in Basic</li>
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Trading</li>
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Transfers <span className="text-gray-500 font-normal">(coming soon)</span></li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Priority support</li>
                  </ul>
                  <RainbowButton className="w-full" onClick={() => openCheckout('pro')} data-testid="button-pro-plan">
                    Get Pro
                  </RainbowButton>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <p className="text-gray-400 text-sm">
                <Shield className="h-4 w-4 inline mr-2 text-green-400" />
                Cancel anytime. No risk.
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Questions?</h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="1" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Is my data safe?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Flint uses bank-level encryption. We never store your passwords or keys. We are not a custodian and never take custody of your funds.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Which brokerages do you support?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  We support Robinhood, Charles Schwab, Fidelity, E*TRADE, TD Ameritrade, Vanguard, Webull, Interactive Brokers, and 50+ more brokerages.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Can I trade from Flint?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Pro users can place trades directly through Flint. Your orders are sent to your connected brokerage.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Is there a free plan?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Start free with up to 4 accounts. Upgrade anytime for unlimited accounts and more features.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section ref={signupRef} className="py-20 px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Free Today</h2>
              <p className="text-gray-300">No credit card needed. Connect up to 4 accounts free.</p>
            </div>

            {!signupSuccess ? (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  required
                  data-testid="input-signup-name"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  required
                  data-testid="input-signup-email"
                />
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                    data-testid="input-signup-password"
                  />
                  {passwordFocused && signupData.password && (
                    <div className="mt-2 p-3 bg-white/5 rounded-lg text-sm space-y-1">
                      <p className={passwordRequirements.length ? 'text-green-400' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.length ? '' : 'opacity-30'}`} />
                        At least 8 characters
                      </p>
                      <p className={passwordRequirements.uppercase ? 'text-green-400' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.uppercase ? '' : 'opacity-30'}`} />
                        One uppercase letter
                      </p>
                      <p className={passwordRequirements.lowercase ? 'text-green-400' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.lowercase ? '' : 'opacity-30'}`} />
                        One lowercase letter
                      </p>
                      <p className={passwordRequirements.number ? 'text-green-400' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.number ? '' : 'opacity-30'}`} />
                        One number
                      </p>
                      <p className={passwordRequirements.special ? 'text-green-400' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.special ? '' : 'opacity-30'}`} />
                        One special character
                      </p>
                    </div>
                  )}
                </div>

                {signupError && (
                  <p className="text-red-400 text-sm text-center">{signupError}</p>
                )}

                <RainbowButton 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={signupLoading}
                  data-testid="button-signup-submit"
                >
                  {signupLoading ? 'Creating Account...' : 'Create Free Account'}
                </RainbowButton>

                <p className="text-center text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-400 hover:underline">Log in</Link>
                </p>
              </form>
            ) : (
              <div className="text-center p-8 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Account Created!</h3>
                <p className="text-gray-300">Redirecting you to your dashboard...</p>
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-white/10 bg-white/5 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
                <span className="text-xl font-semibold">Flint</span>
              </div>

              <div className="flex gap-6 text-sm text-gray-400">
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/support" className="hover:text-white transition-colors">Support</Link>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-400">
              <p>Flint is not a broker or bank. Investing and transfers depend on the platforms you connect.</p>
            </div>
          </div>
        </footer>
      </BeamsBackground>

      <EmbeddedCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        billingPeriod={checkoutBillingPeriod}
      />
    </>
  );
}
