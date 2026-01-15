/**
 * Flint Crypto Landing Page - SEO optimized for "crypto portfolio tracker"
 * Route: /crypto
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Shield, 
  TrendingUp, 
  Wallet, 
  Check,
  ArrowRight,
  Eye,
  RefreshCw,
  Send
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

const CRYPTO_INSTITUTIONS = [
  { name: 'MetaMask', domain: 'metamask.io' },
  { name: 'Coinbase', domain: 'coinbase.com' },
  { name: 'Binance', domain: 'binance.com' },
  { name: 'Kraken', domain: 'kraken.com' },
  { name: 'Gemini', domain: 'gemini.com' },
  { name: 'Crypto.com', domain: 'crypto.com' },
  { name: 'Bitfinex', domain: 'bitfinex.com' },
  { name: 'KuCoin', domain: 'kucoin.com' },
  { name: 'Bitstamp', domain: 'bitstamp.net' },
  { name: 'OKX', domain: 'okx.com' },
  { name: 'Bybit', domain: 'bybit.com' },
  { name: 'Gate.io', domain: 'gate.io' },
];

export default function LandingCrypto() {
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
        <title>Crypto Portfolio Tracker - Track and Trade All Your Crypto in One Place | Flint</title>
        <meta name="description" content="Track all your crypto exchanges and wallets in one dashboard. Connect Coinbase, Binance, Kraken, MetaMask and more. Send crypto and place trades without leaving Flint. Free to start." />
        <meta property="og:title" content="Crypto Portfolio Tracker - Track and Trade Crypto in One Place | Flint" />
        <meta property="og:description" content="The multi-exchange crypto tracker that lets you take action. Connect all your wallets, see real-time values, send crypto and place trades from one dashboard." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="crypto portfolio tracker, multi-exchange crypto tracker, track all your wallets and exchanges, track and trade crypto in one place, cryptocurrency dashboard, DeFi portfolio tracker, bitcoin tracker, ethereum portfolio" />
        <link rel="canonical" href="https://flint-investing.com/crypto" />
      </Helmet>

      <div className="min-h-screen bg-[#F4F2ED] overflow-x-hidden">
        <LandingHeader currentPage="crypto" onGetStarted={scrollToSignup} />

        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[#1a56db] font-medium text-sm flex items-center justify-center gap-2 mb-6">
              <Wallet className="h-4 w-4" />
              Multi-Exchange Crypto Tracker
            </p>
            
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
              The Crypto Portfolio Tracker That Lets You Take Action
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Track all your crypto and take action from one dashboard. Send crypto, place trades, and manage your entire portfolio.
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
            <div className="grid md:grid-cols-3 gap-4 md:gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-[#1a56db] mb-2">50+</p>
                <p className="text-gray-500">Exchanges & Wallets</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600 mb-2">Real-Time</p>
                <p className="text-gray-500">Portfolio Tracking</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#1a56db] mb-2">Trade & Send</p>
                <p className="text-gray-500">From One Place</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-500 mb-8">Connect your favorite exchanges and wallets</p>
            <div className="relative overflow-hidden">
              <div className="flex gap-8 animate-[scroll_40s_linear_infinite]">
                {[...CRYPTO_INSTITUTIONS, ...CRYPTO_INSTITUTIONS].map((inst, idx) => (
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-4 text-gray-900">Why Crypto Traders Love Flint</h2>
            <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
              More than a tracker. A complete crypto command center.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">One Dashboard</h3>
                <p className="text-gray-500 text-sm">
                  See all your crypto from every wallet and exchange in a single view.
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">Real-Time Tracking</h3>
                <p className="text-gray-500 text-sm">
                  Watch your total crypto value update live across all chains.
                </p>
              </div>
              
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl border border-blue-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">Trade & Send</h3>
                <p className="text-gray-500 text-sm">
                  Send crypto and place trades without leaving Flint.
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">Your Keys, Your Crypto</h3>
                <p className="text-gray-500 text-sm">
                  We never take custody. Your private keys stay with you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12 text-gray-900">How It Works</h2>
            
            <div className="space-y-10">
              <div className="flex items-start gap-4 md:gap-6">
                <span className="text-3xl md:text-4xl font-black text-[#1a56db] flex-shrink-0">1</span>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Connect Your Exchanges and Wallets</h3>
                  <p className="text-gray-500">Link Coinbase, Binance, Kraken, MetaMask, and 50+ more in seconds.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 md:gap-6">
                <span className="text-3xl md:text-4xl font-black text-[#1a56db] flex-shrink-0">2</span>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">See Your Total Crypto Value in Real Time</h3>
                  <p className="text-gray-500">View your complete portfolio across all connected accounts. Track everything live.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 md:gap-6">
                <span className="text-3xl md:text-4xl font-black text-[#1a56db] flex-shrink-0">3</span>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Take Action Without Leaving Flint</h3>
                  <p className="text-gray-500">Send crypto or place trades on your connected accounts. No app switching required.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-gray-900">Ready to take control of your crypto?</h2>
            <p className="text-gray-500 mb-8">Join thousands of traders managing their portfolios with Flint.</p>
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
            
            <div className="grid md:grid-cols-3 gap-3 md:gap-6">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 md:p-6 h-full flex flex-col">
                <div className="mb-4 md:mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Free</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-500">forever</span>
                  </div>
                  <p className="text-sm text-gray-500">Try it out</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-green-500" /> 4 accounts</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-green-500" /> Track all your crypto</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="h-4 w-4 text-green-500" /> Real-time updates</li>
                </ul>
                <Button onClick={scrollToSignup} className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white" data-testid="button-free-plan">
                  Start Free
                </Button>
              </div>
              
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl border border-[#1a56db] p-4 md:p-6 h-full flex flex-col relative shadow-lg">
                <div className="absolute top-4 right-4">
                  <span className="bg-[#1a56db] text-white text-xs font-semibold px-2 py-1 rounded">Most Popular</span>
                </div>
                <div className="mb-4 md:mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Basic</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">${isAnnual ? '199' : '19.99'}</span>
                    <span className="text-gray-500">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual && <p className="text-sm text-green-600">$199/year - 2 months free!</p>}
                  <p className="text-sm text-gray-500">For active traders</p>
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
              
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 md:p-6 h-full flex flex-col">
                <div className="mb-4 md:mb-6">
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
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Can I track all my crypto exchanges in one app?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Yes! Flint lets you connect multiple exchanges and wallets to see your complete crypto portfolio in one dashboard. We support Coinbase, Binance, Kraken, Gemini, Crypto.com, and 50+ other platforms.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Is there a crypto portfolio tracker that lets me trade?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Yes - that's what makes Flint different. Most portfolio trackers are read-only, but Flint lets you place trades on your connected exchange accounts and send crypto directly from your connected wallet.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Which wallets and exchanges does Flint support?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Flint supports 50+ wallets and exchanges including MetaMask, Coinbase, Binance, Kraken, Gemini, Crypto.com, KuCoin, Bitstamp, OKX, Bybit, and many more.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Is it safe to connect my wallets?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Absolutely. Flint uses secure connections - we never have access to your passwords or private keys. Your keys stay with you. We are not a bank or custodian and never take custody of your funds.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="5" className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900">Is there a free crypto portfolio tracker plan?</AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  Yes! Flint offers a free plan that lets you connect up to 4 accounts and track your crypto portfolio with real-time updates. It's free forever with no credit card required.
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
