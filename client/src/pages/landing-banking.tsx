/**
 * Flint Banking Landing Page - SEO optimized for bank account users
 * Route: /banking
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { AuroraBackground } from "@/components/ui/aurora-background";
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
import { Helmet } from 'react-helmet';

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
      </Helmet>

      <AuroraBackground className="min-h-screen text-white relative overflow-x-hidden">
        <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-blue-900/20 via-black to-black pointer-events-none" />
        <LandingHeader currentPage="banking" onGetStarted={scrollToSignup} />

        <section className="pt-28 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 mb-6">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300">Bank Account Tracker</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              All Your <span className="text-blue-400">Bank Accounts</span> in One Place
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect all your banks and cards. See your total money. Track your spending. It's that simple.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <RainbowButton onClick={scrollToSignup} className="h-14 px-8 rounded-xl text-lg" data-testid="button-get-started-hero">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </RainbowButton>
            </div>

            <p className="text-sm text-gray-400">Free forever. No credit card needed.</p>
          </div>
        </section>

        <section className="py-16 px-4 bg-white/5 border-y border-white/10">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-400 mb-2">10,000+</p>
                <p className="text-gray-400">Banks Supported</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400 mb-2">Real-Time</p>
                <p className="text-gray-400">Balance Updates</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400 mb-2">Transfer</p>
                <p className="text-gray-400">Between Accounts</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-400 mb-8">Connect your favorite banks</p>
            <div className="relative overflow-hidden">
              <div className="flex gap-8 animate-[scroll_45s_linear_infinite]">
                {[...BANKING_INSTITUTIONS, ...BANKING_INSTITUTIONS].map((inst, idx) => (
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
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why People Love Flint</h2>
            <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
              Stop logging into multiple bank apps. See everything in one place.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <DollarSign className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Total Net Worth</h3>
                  <p className="text-gray-400 text-sm">
                    See your complete financial picture across all accounts.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <CreditCard className="h-8 w-8 text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Track Credit Cards</h3>
                  <p className="text-gray-400 text-sm">
                    Monitor balances and pay down debt faster.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-blue-400/30 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-gradient-to-b from-blue-500/10 to-transparent rounded-lg p-6 h-full">
                  <Send className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Transfer Money</h3>
                  <p className="text-gray-400 text-sm">
                    Move money between accounts without leaving Flint.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <Shield className="h-8 w-8 text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Bank-Level Security</h3>
                  <p className="text-gray-400 text-sm">
                    We never store your passwords. We're not a custodian and never move your funds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-white/5 border-y border-white/10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="space-y-10">
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-blue-500 flex-shrink-0">1</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">Connect Your Accounts</h3>
                  <p className="text-gray-400">Link Chase, Bank of America, Capital One, and 10,000+ more banks in seconds.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-blue-500 flex-shrink-0">2</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">See Your Total Balance</h3>
                  <p className="text-gray-400">View all your accounts, track spending, and see your total money in real time.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <span className="text-4xl font-black text-blue-500 flex-shrink-0">3</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">Take Control</h3>
                  <p className="text-gray-400">Set spending alerts, pay off debt, and transfer money without switching apps.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to see all your money?</h2>
            <p className="text-gray-400 mb-8">Join thousands of people managing their finances with Flint.</p>
            <RainbowButton onClick={scrollToSignup} className="h-14 px-12 rounded-xl text-lg" data-testid="button-cta-mid">
              Get Started Free
            </RainbowButton>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 bg-white/5 border-y border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Pick Your Plan</h2>
              <p className="text-gray-400 mb-6">Start free. Upgrade for transfers and advanced features.</p>
              
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
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> See all your money</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Real-time updates</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Mobile app</li>
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
                    <h3 className="text-xl font-semibold mb-2">Standard</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">${isAnnual ? '199' : '19.99'}</span>
                      <span className="text-gray-400">{isAnnual ? '/year' : '/month'}</span>
                    </div>
                    {isAnnual && <p className="text-sm text-green-400">$199/year - 2 months free!</p>}
                    <p className="text-sm text-gray-400">For active users</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Unlimited accounts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Everything in Free</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Spending alerts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Bill reminders</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Email support</li>
                  </ul>
                  <RainbowButton className="w-full" onClick={() => openCheckout('basic')} data-testid="button-standard-plan">
                    Get Standard
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
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Everything in Standard</li>
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Trading</li>
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Transfers</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Budgeting tools</li>
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
                <AccordionTrigger className="text-left hover:no-underline">Is my money safe?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Flint uses bank-level encryption. We never store your passwords or keys. We are not a custodian and never take custody of your funds.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Which banks do you support?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  We support Chase, Bank of America, Wells Fargo, Citi, Capital One, American Express, and 10,000+ more banks and credit unions.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Can I transfer money?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Pro users can transfer money between their connected bank accounts directly through Flint.
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
      </AuroraBackground>

      <EmbeddedCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        billingPeriod={checkoutBillingPeriod}
      />
    </>
  );
}
