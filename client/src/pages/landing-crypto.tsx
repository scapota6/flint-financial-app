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
  Send,
  Link2,
  BarChart3,
  MousePointerClick
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
        <link href="https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Helmet>

      <div className="min-h-screen bg-[#F4F2ED] overflow-x-hidden">
        <LandingHeader currentPage="crypto" onGetStarted={scrollToSignup} />

        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[#1a56db] font-medium text-sm flex items-center justify-center gap-2 mb-6">
              <Wallet className="h-4 w-4" />
              Multi-Exchange Crypto Tracker
            </p>
            
            <h1 className="font-serif text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
              The Crypto Portfolio Tracker That{' '}
              <span className="relative inline-block px-2">
                Lets You Take Action
                <span className="absolute bottom-1 left-0 w-full h-2 bg-yellow-400 -z-10"></span>
              </span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Track all your crypto and take action from one dashboard. Send crypto, place trades, and manage your entire portfolio.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button onClick={scrollToSignup} className="h-12 px-6 bg-black hover:bg-gray-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors" data-testid="button-get-started-hero">
                Get Started Free <ArrowRight className="h-5 w-5" />
              </button>
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
            <h2 className="font-serif text-3xl text-center mb-4 text-gray-900">
              <span className="relative inline-block px-4">
                Why Crypto Traders Love Flint
                <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400"></span>
              </span>
            </h2>
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

        <section className="py-20 px-4 bg-[#F4F2ED]">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-3xl text-center mb-12 text-gray-900">
              <span className="relative inline-block px-4">
                How It Works
                <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400"></span>
              </span>
            </h2>
            
            <div className="flex flex-col md:flex-row w-full gap-8">
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-white border border-gray-200 rounded-2xl h-20 w-20 flex flex-col justify-center items-center shadow-lg">
                    <Link2 className="h-6 w-6 text-amber-500 mb-1" />
                    <span className="font-serif text-2xl text-gray-900">1</span>
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-gray-900">Connect</h3>
                <p className="text-gray-600">
                  Link Coinbase, Binance, Kraken, MetaMask, and 50+ more in seconds.
                </p>
              </div>
              
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-white border border-gray-200 rounded-2xl h-20 w-20 flex flex-col justify-center items-center shadow-lg">
                    <BarChart3 className="h-6 w-6 text-blue-500 mb-1" />
                    <span className="font-serif text-2xl text-gray-900">2</span>
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-gray-900">Track</h3>
                <p className="text-gray-600">
                  View your complete portfolio across all connected accounts. Track everything live.
                </p>
              </div>
              
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-white border border-gray-200 rounded-2xl h-20 w-20 flex flex-col justify-center items-center shadow-lg">
                    <MousePointerClick className="h-6 w-6 text-emerald-500 mb-1" />
                    <span className="font-serif text-2xl text-gray-900">3</span>
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-gray-900">Act</h3>
                <p className="text-gray-600">
                  Send crypto or place trades on your connected accounts. No app switching required.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-[#F4F2ED]">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-3xl mb-4 text-gray-900">Ready to take control of your crypto?</h2>
            <p className="text-gray-500 mb-8">Join thousands of traders managing their portfolios with Flint.</p>
            <button onClick={scrollToSignup} className="h-12 px-8 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors" data-testid="button-cta-mid">
              Get Started Free
            </button>
          </div>
        </section>

        <section id="pricing" className="lg:px-48 md:px-12 px-4 py-20 flex flex-col items-center bg-[#F4F2ED]">
          <h2 className="font-serif text-3xl mb-4 text-center">
            <span className="relative inline-block px-4">
              Pricing
              <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400"></span>
            </span>
          </h2>
          <p className="text-gray-500 mb-6 text-center">Start free. Upgrade for trading and advanced features.</p>
          
          <div className="flex gap-6 mt-4 mb-12">
            <button
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-gray-900 underline underline-offset-4' : 'text-gray-500 hover:text-gray-900'}`}
              data-testid="toggle-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-medium transition-colors ${isAnnual ? 'text-gray-900 underline underline-offset-4' : 'text-gray-500 hover:text-gray-900'}`}
              data-testid="toggle-annual"
            >
              Annual <span className="text-green-600">(Save 17%)</span>
            </button>
          </div>

          <div className="flex w-full flex-col md:flex-row max-w-5xl">
            <div className="flex-1 flex flex-col mx-4 shadow-2xl relative bg-[#F4F2ED] rounded-2xl py-6 px-8 my-8 md:top-16">
              <h3 className="font-serif font-normal text-2xl mb-4">Free</h3>
              <div className="font-bold text-2xl mb-4">
                $0
                <span className="font-normal text-base"> / forever</span>
              </div>

              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>4 accounts</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Track all your crypto</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Real-time updates</p>
              </div>

              <button 
                onClick={scrollToSignup}
                className="border-2 border-solid border-black rounded-xl text-lg py-3 mt-6 hover:bg-black hover:text-white transition-colors"
                data-testid="button-free-plan"
              >
                Start Free
              </button>
            </div>

            <div className="flex-1 flex flex-col mx-4 shadow-2xl relative bg-[#F4F2ED] rounded-2xl py-6 px-8 my-8 md:top-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-serif font-normal text-2xl">Basic</h3>
                <span className="text-xs font-medium bg-yellow-300 px-2 py-1 rounded">Popular</span>
              </div>
              <div className="font-bold text-2xl mb-4">
                ${isAnnual ? '199' : '19.99'}
                <span className="font-normal text-base"> {isAnnual ? '/ year' : '/ month'}</span>
              </div>
              {isAnnual && <p className="text-sm text-green-600 mb-2">2 months free</p>}

              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Unlimited accounts</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Everything in Free</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Recurring subscriptions</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Spending analyzer</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Goal tracking</p>
              </div>

              <button
                onClick={() => openCheckout('basic')}
                className="bg-black text-white rounded-xl text-lg py-3 mt-6 hover:bg-gray-800 transition-colors"
                data-testid="button-basic-plan"
              >
                Get Basic
              </button>
            </div>

            <div className="flex-1 flex flex-col mx-4 shadow-2xl relative bg-[#F4F2ED] rounded-2xl py-6 px-8 my-8 md:top-16">
              <h3 className="font-serif font-normal text-2xl mb-4">Pro</h3>
              <div className="font-bold text-2xl mb-4">
                ${isAnnual ? '399' : '39.99'}
                <span className="font-normal text-base"> {isAnnual ? '/ year' : '/ month'}</span>
              </div>
              {isAnnual && <p className="text-sm text-green-600 mb-2">2 months free</p>}

              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Unlimited accounts</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Everything in Basic</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p className="font-medium">Trading</p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p className="font-medium">Transfers <span className="text-gray-400 font-normal text-sm">(coming soon)</span></p>
              </div>
              <div className="flex items-center mb-2">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <p>Priority support</p>
              </div>

              <button
                onClick={() => openCheckout('pro')}
                className="border-2 border-solid border-black rounded-xl text-lg py-3 mt-6 hover:bg-black hover:text-white transition-colors"
                data-testid="button-pro-plan"
              >
                Get Pro
              </button>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm">
              <Shield className="h-4 w-4 inline mr-2 text-green-500" />
              Cancel anytime. No risk.
            </p>
          </div>
        </section>

        <section id="faq" className="lg:px-48 md:px-12 px-4 py-20 flex flex-col items-start bg-[#F4F2ED]">
          <h2 className="font-serif text-3xl mb-12 self-center text-gray-900">
            <span className="relative inline-block px-4">
              Questions?
              <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400"></span>
            </span>
          </h2>
          
          <div className="w-full max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="1" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Can I track all my crypto exchanges in one app?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Yes! Flint lets you connect multiple exchanges and wallets to see your complete crypto portfolio in one dashboard. We support Coinbase, Binance, Kraken, Gemini, Crypto.com, and 50+ other platforms.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Is there a crypto portfolio tracker that lets me trade?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Yes - that's what makes Flint different. Most portfolio trackers are read-only, but Flint lets you place trades on your connected exchange accounts and send crypto directly from your connected wallet.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Which wallets and exchanges does Flint support?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Flint supports 50+ wallets and exchanges including MetaMask, Coinbase, Binance, Kraken, Gemini, Crypto.com, KuCoin, Bitstamp, OKX, Bybit, and many more.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Is it safe to connect my wallets?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Absolutely. Flint uses secure connections - we never have access to your passwords or private keys. Your keys stay with you. We are not a bank or custodian and never take custody of your funds.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="5" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Is there a free crypto portfolio tracker plan?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Yes! Flint offers a free plan that lets you connect up to 4 accounts and track your crypto portfolio with real-time updates. It's free forever with no credit card required.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section ref={signupRef} className="py-20 px-4 bg-[#F4F2ED]">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-3xl md:text-4xl mb-4 text-gray-900">Start Free Today</h2>
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

                <button 
                  type="submit" 
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50" 
                  disabled={signupLoading}
                  data-testid="button-signup-submit"
                >
                  {signupLoading ? 'Creating Account...' : 'Create Free Account'}
                </button>

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

        <footer className="border-t border-gray-300 bg-[#F4F2ED] py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
                  <span className="text-xl font-semibold text-gray-900">Flint</span>
                </div>
                <p className="text-sm text-gray-500">
                  Track all your crypto in one secure platform.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Product</h4>
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                  <Link href="/banking" className="hover:underline underline-offset-4">Banking</Link>
                  <Link href="/investing" className="hover:underline underline-offset-4">Investing</Link>
                  <Link href="/crypto" className="hover:underline underline-offset-4">Crypto</Link>
                  <Link href="/blog" className="hover:underline underline-offset-4">Blog</Link>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Account</h4>
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                  <Link href="/login" className="hover:underline underline-offset-4">Log In</Link>
                  <Link href="/reset-password" className="hover:underline underline-offset-4">Reset Password</Link>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Legal</h4>
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                  <Link href="/terms" className="hover:underline underline-offset-4">Terms of Service</Link>
                  <Link href="/privacy-policy" className="hover:underline underline-offset-4">Privacy Policy</Link>
                  <a href="mailto:support@flint-investing.com" className="hover:underline underline-offset-4">support@flint-investing.com</a>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-300 text-center text-sm text-gray-500">
              <p>&copy; 2025 Flint Tech Inc. All rights reserved. Flint is not a broker or bank.</p>
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
