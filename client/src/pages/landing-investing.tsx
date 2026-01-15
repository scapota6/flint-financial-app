/**
 * Flint Investing Landing Page - SEO optimized for stock investors
 * Route: /investing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

      <div className="min-h-screen bg-[#FAFBFC] overflow-x-hidden">
        <LandingHeader currentPage="investing" onGetStarted={scrollToSignup} />

        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[#1a56db] font-medium text-sm flex items-center justify-center gap-2 mb-6">
              <BarChart3 className="h-4 w-4" />
              Stock Portfolio Tracker
            </p>
            
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
              All Your Investment Apps in One Place
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Connect all your brokerages. See your total portfolio. Track your gains. Trade smarter.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Button onClick={scrollToSignup} className="h-12 px-6 bg-[#1a56db] hover:bg-[#1e40af] text-white font-medium rounded-lg" data-testid="button-get-started-hero">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <p className="text-sm text-gray-500">Try for free. No credit card required.</p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-[#1a56db] mb-2">50+</p>
                <p className="text-gray-500">Brokerages Supported</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600 mb-2">Real-Time</p>
                <p className="text-gray-500">Portfolio Updates</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#1a56db] mb-2">Trade</p>
                <p className="text-gray-500">From One Dashboard</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-500 mb-8">Connect your favorite brokerages</p>
            <div className="relative overflow-hidden">
              <div className="flex gap-8 animate-[scroll_50s_linear_infinite]">
                {[...INVESTING_INSTITUTIONS, ...INVESTING_INSTITUTIONS].map((inst, idx) => (
                  <div key={idx} className="flex-shrink-0 w-40 h-20 bg-white rounded-lg flex items-center justify-center border border-gray-200 p-4 shadow-sm">
                    <img 
                      src={`https://cdn.brandfetch.io/${inst.domain}`}
                      alt={inst.name}
                      className="max-h-12 max-w-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const span = document.createElement('span');
                          span.className = 'text-sm text-gray-600 font-medium';
                          span.textContent = inst.name;
                          parent.appendChild(span);
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-4 text-gray-900">Why Investors Love Flint</h2>
            <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
              Stop switching between apps. Manage all your investments in one place.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Unified Portfolio</h3>
                <p className="text-gray-500 text-sm">
                  See all your stocks, ETFs, and funds from every brokerage in one view.
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Track Performance</h3>
                <p className="text-gray-500 text-sm">
                  Watch your gains and losses in real time. No spreadsheets needed.
                </p>
              </div>
              
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl border border-blue-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Trade from Flint</h3>
                <p className="text-gray-500 text-sm">
                  Place trades on your connected brokerages without leaving the app.
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Bank-Level Security</h3>
                <p className="text-gray-500 text-sm">
                  We never store your passwords or keys. We're not a custodian and never move your funds.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12 text-gray-900">How It Works</h2>
            
            <div className="space-y-10">
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-[#1a56db] flex-shrink-0">1</span>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Connect Your Brokerages</h3>
                  <p className="text-gray-500">Link Robinhood, Schwab, Fidelity, E*TRADE, and 50+ more in seconds.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-[#1a56db] flex-shrink-0">2</span>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">See Your Total Portfolio</h3>
                  <p className="text-gray-500">View all your positions, track performance, and see your total value update in real time.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-[#1a56db] flex-shrink-0">3</span>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Trade Smarter</h3>
                  <p className="text-gray-500">Set price alerts, track dividends, and place trades without switching apps.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-gray-900">Ready to simplify your investing?</h2>
            <p className="text-gray-500 mb-8">Join thousands of investors managing their portfolios with Flint.</p>
            <Button onClick={scrollToSignup} className="h-12 px-8 bg-[#1a56db] hover:bg-[#1e40af] text-white font-medium rounded-lg" data-testid="button-cta-mid">
              Get Started Free
            </Button>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 bg-white border-y border-gray-200">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gray-900">Pick Your Plan</h2>
              <p className="text-gray-500 mb-6">Start free. Upgrade for trading and advanced features.</p>
              
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!isAnnual ? 'bg-[#1a56db] text-white' : 'text-gray-500 hover:text-gray-900'}`}
                  data-testid="toggle-monthly"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isAnnual ? 'bg-[#1a56db] text-white' : 'text-gray-500 hover:text-gray-900'}`}
                  data-testid="toggle-annual"
                >
                  Annual <span className={`ml-1 ${isAnnual ? 'text-green-300' : 'text-green-600'}`}>Save 17%</span>
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Free</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-500">forever</span>
                  </div>
                  <p className="text-sm text-gray-500">Try it out</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-green-500" /> 4 accounts</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-green-500" /> See all your investments</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-green-500" /> Real-time updates</li>
                </ul>
                <Button onClick={scrollToSignup} className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white" data-testid="button-free-plan">
                  Start Free
                </Button>
              </div>
              
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl border border-[#1a56db] p-6 h-full flex flex-col relative shadow-lg">
                <div className="absolute top-4 right-4">
                  <span className="bg-[#1a56db] text-white text-xs font-semibold px-2 py-1 rounded">Most Popular</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Basic</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">${isAnnual ? '199' : '19.99'}</span>
                    <span className="text-gray-500">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual && <p className="text-sm text-green-600">$199/year - 2 months free!</p>}
                  <p className="text-sm text-gray-500">For active investors</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Unlimited accounts</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Everything in Free</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Recurring subscriptions</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Spending analyzer</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Goal tracking</li>
                </ul>
                <Button className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white" onClick={() => openCheckout('basic')} data-testid="button-basic-plan">
                  Get Basic
                </Button>
              </div>
              
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Pro</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">${isAnnual ? '399' : '39.99'}</span>
                    <span className="text-gray-500">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual && <p className="text-sm text-green-600">$399/year - 2 months free!</p>}
                  <p className="text-sm text-gray-500">For power users</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Unlimited accounts</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Everything in Basic</li>
                  <li className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Trading</li>
                  <li className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Transfers <span className="text-gray-400 font-normal">(coming soon)</span></li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-[#1a56db]" /> Priority support</li>
                </ul>
                <Button className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white" onClick={() => openCheckout('pro')} data-testid="button-pro-plan">
                  Get Pro
                </Button>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <p className="text-gray-500 text-sm">
                <Shield className="h-4 w-4 inline mr-2 text-green-500" />
                Cancel anytime. No risk.
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-center mb-12 text-gray-900">Questions?</h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="1" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Is my data safe?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Yes! Flint uses bank-level encryption. We never store your passwords or keys. We are not a custodian and never take custody of your funds.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Which brokerages do you support?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  We support Robinhood, Charles Schwab, Fidelity, E*TRADE, TD Ameritrade, Vanguard, Webull, Interactive Brokers, and 50+ more brokerages.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Can I trade from Flint?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Yes! Pro users can place trades directly through Flint. Your orders are sent to your connected brokerage.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Is there a free plan?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Yes! Start free with up to 4 accounts. Upgrade anytime for unlimited accounts and more features.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section ref={signupRef} className="py-20 px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4 text-gray-900">Start Free Today</h2>
              <p className="text-gray-600">No credit card needed. Connect up to 4 accounts free.</p>
            </div>

            {!signupSuccess ? (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  required
                  data-testid="input-signup-name"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
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
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    required
                    data-testid="input-signup-password"
                  />
                  {passwordFocused && signupData.password && (
                    <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg text-sm space-y-1">
                      <p className={passwordRequirements.length ? 'text-green-600' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.length ? '' : 'opacity-30'}`} />
                        At least 8 characters
                      </p>
                      <p className={passwordRequirements.uppercase ? 'text-green-600' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.uppercase ? '' : 'opacity-30'}`} />
                        One uppercase letter
                      </p>
                      <p className={passwordRequirements.lowercase ? 'text-green-600' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.lowercase ? '' : 'opacity-30'}`} />
                        One lowercase letter
                      </p>
                      <p className={passwordRequirements.number ? 'text-green-600' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.number ? '' : 'opacity-30'}`} />
                        One number
                      </p>
                      <p className={passwordRequirements.special ? 'text-green-600' : 'text-gray-400'}>
                        <Check className={`inline h-3 w-3 mr-1 ${passwordRequirements.special ? '' : 'opacity-30'}`} />
                        One special character
                      </p>
                    </div>
                  )}
                </div>

                {signupError && (
                  <p className="text-red-500 text-sm text-center">{signupError}</p>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-[#1a56db] hover:bg-[#1e40af] text-white" 
                  disabled={signupLoading}
                  data-testid="button-signup-submit"
                >
                  {signupLoading ? 'Creating Account...' : 'Create Free Account'}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#1a56db] hover:underline">Log in</Link>
                </p>
              </form>
            ) : (
              <div className="text-center p-8 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Account Created!</h3>
                <p className="text-gray-600">Redirecting you to your dashboard...</p>
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-gray-200 bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
                <span className="text-xl font-semibold text-gray-900">Flint</span>
              </div>

              <div className="flex gap-6 text-sm text-gray-500">
                <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
                <Link href="/support" className="hover:text-gray-900 transition-colors">Support</Link>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Flint is not a broker or bank. Investing and transfers depend on the platforms you connect.</p>
            </div>
          </div>
        </footer>
      </div>

      <EmbeddedCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        billingPeriod={checkoutBillingPeriod}
      />
    </>
  );
}
