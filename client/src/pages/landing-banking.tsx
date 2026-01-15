/**
 * Flint Banking Landing Page - SEO optimized for bank account users
 * Route: /banking
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Shield, 
  CreditCard, 
  Building2, 
  Check,
  ArrowRight,
  Bell,
  DollarSign,
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

const BANKING_INSTITUTIONS = [
  { name: 'Chase', domain: 'chase.com' },
  { name: 'Bank of America', domain: 'bankofamerica.com' },
  { name: 'Wells Fargo', domain: 'wellsfargo.com' },
  { name: 'Citi', domain: 'citi.com' },
  { name: 'Capital One', domain: 'capitalone.com' },
  { name: 'US Bank', domain: 'usbank.com' },
  { name: 'PNC', domain: 'pnc.com' },
  { name: 'Truist', domain: 'truist.com' },
  { name: 'TD Bank', domain: 'td.com' },
  { name: 'Discover', domain: 'discover.com' },
  { name: 'American Express', domain: 'americanexpress.com' },
  { name: 'Navy Federal', domain: 'navyfederal.org' },
  { name: 'USAA', domain: 'usaa.com' },
  { name: 'Ally Bank', domain: 'ally.com' },
  { name: 'Marcus', domain: 'marcus.com' },
  { name: 'Chime', domain: 'chime.com' },
];

export default function LandingBanking() {
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
        <title>Bank Account Tracker - See All Your Accounts in One Place | Flint</title>
        <meta name="description" content="Track all your bank accounts and credit cards in one dashboard. Connect Chase, Bank of America, Wells Fargo, Capital One and 10,000+ banks. See your total balance, track spending, pay off debt. Free to start." />
        <meta property="og:title" content="Bank Account Tracker - See All Your Money in One Place | Flint" />
        <meta property="og:description" content="The Apple Wallet for all your bank accounts. Connect every account and see your total balance in seconds." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="bank account tracker, net worth tracker, credit card tracker, Chase tracker, Bank of America, account aggregator, personal finance app, money tracker, spending tracker, budget app" />
        <link rel="canonical" href="https://flint-investing.com/banking" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Helmet>

      <div className="min-h-screen bg-[#F4F2ED] overflow-x-hidden">
        <LandingHeader currentPage="banking" onGetStarted={scrollToSignup} />

        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[#1a56db] font-medium text-sm flex items-center justify-center gap-2 mb-6">
              <Building2 className="h-4 w-4" />
              Bank Account Tracker
            </p>
            
            <h1 className="font-serif text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
              All Your Bank Accounts{' '}
              <span className="relative inline-block px-2">
                in One Place
                <span className="absolute bottom-1 left-0 w-full h-2 bg-yellow-400 -z-10"></span>
              </span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Connect all your banks and cards. See your total money. Track your spending. It's that simple.
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
                <p className="text-3xl font-bold text-[#1a56db] mb-2">10,000+</p>
                <p className="text-gray-500">Banks Supported</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600 mb-2">Real-Time</p>
                <p className="text-gray-500">Balance Updates</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#1a56db] mb-2">Transfer</p>
                <p className="text-gray-500">Between Accounts</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-500 mb-8">Connect your favorite banks</p>
            <div className="relative overflow-hidden">
              <div className="flex gap-8 animate-[scroll_45s_linear_infinite]">
                {[...BANKING_INSTITUTIONS, ...BANKING_INSTITUTIONS].map((inst, idx) => (
                  <div key={idx} className="flex-shrink-0 w-40 h-20 bg-white rounded-lg flex items-center justify-center border border-gray-200 p-4 shadow-sm">
                    <img 
                      src={`https://cdn.brandfetch.io/${inst.domain}`}
                      alt={inst.name}
                      className="max-h-12 max-w-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.textContent = '';
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
                Why People Love Flint
                <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400"></span>
              </span>
            </h2>
            <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
              Stop logging into multiple bank apps. See everything in one place.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">Total Net Worth</h3>
                <p className="text-gray-500 text-sm">
                  See your complete financial picture across all accounts.
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">Track Credit Cards</h3>
                <p className="text-gray-500 text-sm">
                  Monitor balances and pay down debt faster.
                </p>
              </div>
              
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl border border-blue-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">Transfer Money</h3>
                <p className="text-gray-500 text-sm">
                  Move money between accounts without leaving Flint.
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-900">Bank-Level Security</h3>
                <p className="text-gray-500 text-sm">
                  We never store your passwords. We're not a custodian and never move your funds.
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
                    <Building2 className="h-6 w-6 text-amber-500 mb-1" />
                    <span className="font-serif text-2xl text-gray-900">1</span>
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-gray-900">Connect</h3>
                <p className="text-gray-600">
                  Link Chase, Bank of America, Capital One, and 10,000+ more banks in seconds.
                </p>
              </div>
              
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-white border border-gray-200 rounded-2xl h-20 w-20 flex flex-col justify-center items-center shadow-lg">
                    <DollarSign className="h-6 w-6 text-blue-500 mb-1" />
                    <span className="font-serif text-2xl text-gray-900">2</span>
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-gray-900">Track</h3>
                <p className="text-gray-600">
                  View all your accounts, track spending, and see your total money in real time.
                </p>
              </div>
              
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-white border border-gray-200 rounded-2xl h-20 w-20 flex flex-col justify-center items-center shadow-lg">
                    <Send className="h-6 w-6 text-emerald-500 mb-1" />
                    <span className="font-serif text-2xl text-gray-900">3</span>
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-gray-900">Act</h3>
                <p className="text-gray-600">
                  Set spending alerts, pay off debt, and transfer money without switching apps.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-[#F4F2ED]">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-3xl mb-4 text-gray-900">Ready to see all your money?</h2>
            <p className="text-gray-500 mb-8">Join thousands of people managing their finances with Flint.</p>
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
          <p className="text-gray-500 mb-6 text-center">Start free. Upgrade for transfers and advanced features.</p>
          
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
                <p>See all your money</p>
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
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Is my money safe?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Yes! Flint uses bank-level encryption. We never store your passwords or keys. We are not a custodian and never take custody of your funds.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Which banks do you support?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  We support Chase, Bank of America, Wells Fargo, Citi, Capital One, American Express, and 10,000+ more banks and credit unions.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Can I transfer money?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Yes! Pro users can transfer money between their connected bank accounts directly through Flint.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="border-b border-gray-300">
                <AccordionTrigger className="text-left hover:no-underline text-gray-900 py-4 font-medium">Is there a free plan?</AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  Yes! Start free with up to 4 accounts. Upgrade anytime for unlimited accounts and more features.
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
                  Track all your bank accounts in one secure platform.
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
