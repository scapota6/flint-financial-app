/**
 * Flint New Landing Page - Optimized for Conversion
 * Route: /new (testing), will replace / after validation
 * Focus: Simple messaging, clear CTAs, interactive demos
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Shield, 
  Lock, 
  TrendingUp, 
  Wallet, 
  Zap, 
  ArrowRight, 
  Check, 
  X,
  DollarSign,
  CreditCard,
  Building,
  LineChart,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import flintLogo from "@assets/flint-logo.png";
import dashboardPreview from "@assets/dashboard-preview.png";

// Institution list for scrolling banner (from existing landing page)
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
  { name: 'TD Ameritrade', domain: 'tdameritrade.com' }
];

// Demo data sets
const DEMO_DATA_1 = {
  netWorth: '$127,543.21',
  accounts: [
    { name: 'Chase Checking', type: 'Bank', balance: '$5,234.12', change: '+2.3%' },
    { name: 'Fidelity Brokerage', type: 'Investing', balance: '$89,432.45', change: '+8.7%' },
    { name: 'Coinbase', type: 'Crypto', balance: '$12,876.64', change: '-3.2%' },
    { name: 'Chase Sapphire', type: 'Credit', balance: '-$1,234.00', change: '0%' }
  ],
  transactions: [
    { date: 'Nov 16', merchant: 'Whole Foods', amount: '-$87.43', category: 'Groceries' },
    { date: 'Nov 15', merchant: 'Shell Gas', amount: '-$45.00', category: 'Transportation' },
    { date: 'Nov 15', merchant: 'Salary Deposit', amount: '+$4,250.00', category: 'Income' }
  ]
};

const DEMO_DATA_2 = {
  netWorth: '$94,821.55',
  accounts: [
    { name: 'Wells Fargo Checking', type: 'Bank', balance: '$3,821.33', change: '+1.2%' },
    { name: 'Robinhood', type: 'Investing', balance: '$67,234.22', change: '+12.4%' },
    { name: 'Binance', type: 'Crypto', balance: '$23,766.00', change: '+5.6%' }
  ],
  transactions: [
    { date: 'Nov 16', merchant: 'Amazon', amount: '-$124.99', category: 'Shopping' },
    { date: 'Nov 16', merchant: 'Netflix', amount: '-$15.99', category: 'Entertainment' },
    { date: 'Nov 14', merchant: 'Freelance Payment', amount: '+$2,500.00', category: 'Income' }
  ]
};

export default function LandingNew() {
  // Email capture states
  const [heroEmail, setHeroEmail] = useState('');
  const [heroEmailSubmitted, setHeroEmailSubmitted] = useState(false);
  const [scrollPopupEmail, setScrollPopupEmail] = useState('');
  const [scrollPopupSubmitted, setScrollPopupSubmitted] = useState(false);
  const [showScrollPopup, setShowScrollPopup] = useState(false);
  const [exitEmail, setExitEmail] = useState('');
  const [exitModalSubmitted, setExitModalSubmitted] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Demo state
  const [currentDemo, setCurrentDemo] = useState(DEMO_DATA_1);
  
  // Signup state
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Refs
  const signupRef = useRef<HTMLDivElement>(null);

  // Scroll to signup
  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll tracking for popup
  useEffect(() => {
    let hasShownPopup = false;
    
    const handleScroll = () => {
      if (hasShownPopup) return;
      
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent > 50 && !scrollPopupSubmitted) {
        setShowScrollPopup(true);
        hasShownPopup = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollPopupSubmitted]);

  // Exit intent detection
  useEffect(() => {
    let hasShownExit = false;
    
    const handleMouseLeave = (e: MouseEvent) => {
      if (hasShownExit) return;
      if (e.clientY <= 0 && !exitModalSubmitted) {
        setShowExitModal(true);
        hasShownExit = true;
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [exitModalSubmitted]);

  // Email submissions
  const handleHeroEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroEmail) {
      setHeroEmailSubmitted(true);
    }
  };

  const handleScrollPopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scrollPopupEmail) {
      setScrollPopupSubmitted(true);
      setTimeout(() => setShowScrollPopup(false), 2000);
    }
  };

  const handleExitEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exitEmail) {
      setExitModalSubmitted(true);
      setTimeout(() => setShowExitModal(false), 2000);
    }
  };

  // Demo switching
  const switchDemoData = () => {
    setCurrentDemo(current => current === DEMO_DATA_1 ? DEMO_DATA_2 : DEMO_DATA_1);
  };

  // Signup submission
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.name && signupData.email && signupData.password) {
      setSignupSuccess(true);
      // In production, this would actually create an account
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/30 via-black to-blue-900/30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
            <span className="text-xl font-semibold">Flint</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-blue-400" data-testid="button-login">
                Log In
              </Button>
            </Link>
            <Button onClick={scrollToSignup} className="bg-blue-600 hover:bg-blue-700" data-testid="button-header-signup">
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                One dashboard for all your money – 
                <span className="text-blue-400"> free forever</span> (up to 4 accounts)
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed">
                Connect your bank, card, investing and crypto accounts in minutes. See everything. Act instantly.
              </p>

              <Button 
                onClick={scrollToSignup} 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 h-auto"
                data-testid="button-hero-cta"
              >
                Get Started Free (No Credit Card Needed)
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              {/* Email capture */}
              <div className="pt-4">
                {!heroEmailSubmitted ? (
                  <form onSubmit={handleHeroEmailSubmit} className="flex gap-2 max-w-md">
                    <Input
                      type="email"
                      placeholder="Enter your email for updates"
                      value={heroEmail}
                      onChange={(e) => setHeroEmail(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      data-testid="input-hero-email"
                    />
                    <Button type="submit" variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="button-hero-email-submit">
                      Get Updates
                    </Button>
                  </form>
                ) : (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400">Thanks! Check your email soon. Ready to see Flint? Continue to signup below!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img src={dashboardPreview} alt="Flint Dashboard" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -inset-4 bg-blue-500/20 blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* Trust & Partners Section */}
        <section className="border-y border-white/10 bg-white/5 backdrop-blur-sm py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Trusted by thousands. Connected everywhere.</h2>
            </div>

            {/* Scrolling logos */}
            <div className="relative overflow-hidden mb-12">
              <div className="flex gap-8 animate-[scroll_40s_linear_infinite]">
                {[...INSTITUTIONS, ...INSTITUTIONS].map((inst, idx) => (
                  <div key={idx} className="flex-shrink-0 w-32 h-16 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <span className="text-sm text-gray-300 font-medium">{inst.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 justify-center">
                <Shield className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-semibold">5,000+ users</p>
                  <p className="text-sm text-gray-400">Managing their money</p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Lock className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-semibold">256-bit encryption</p>
                  <p className="text-sm text-gray-400">Bank-level security</p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Shield className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-semibold">Read-only access</p>
                  <p className="text-sm text-gray-400">We never move your money</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">Everything you need in one place</h2>
              <p className="text-xl text-gray-300">Simple. Powerful. Free to start.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-colors">
                <Wallet className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-3">All Accounts in One Place</h3>
                <p className="text-gray-300">
                  Unify banks, cards, stocks, and crypto in one dashboard.
                </p>
              </Card>

              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-colors">
                <Zap className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-3">Real-Time Insights & Alerts</h3>
                <p className="text-gray-300">
                  Track spending, fees, and net worth in real time. Get automatic alerts.
                </p>
              </Card>

              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-colors">
                <TrendingUp className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-3">Act Right From Flint</h3>
                <p className="text-gray-300">
                  Transfer money and trade without leaving the app.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="py-20 lg:py-32 bg-white/5 border-y border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">See Flint in Action</h2>
              <p className="text-xl text-gray-300">Play with sample data to see how it works</p>
            </div>

            {/* Mock dashboard */}
            <div className="bg-black/40 border border-white/20 rounded-2xl p-8 backdrop-blur-sm">
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-2">Total Net Worth</p>
                <p className="text-5xl font-bold text-blue-400" data-testid="demo-net-worth">{currentDemo.netWorth}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {currentDemo.accounts.map((account, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        <p className="text-sm text-gray-400">{account.type}</p>
                      </div>
                      <span className={account.change.startsWith('+') ? 'text-green-400' : account.change.startsWith('-') ? 'text-red-400' : 'text-gray-400'}>
                        {account.change}
                      </span>
                    </div>
                    <p className="text-2xl font-bold">{account.balance}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Recent Transactions</p>
                <div className="space-y-2">
                  {currentDemo.transactions.map((txn, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-medium">{txn.merchant}</p>
                        <p className="text-sm text-gray-400">{txn.date} · {txn.category}</p>
                      </div>
                      <p className={txn.amount.startsWith('+') ? 'text-green-400 font-semibold' : 'text-white font-semibold'}>
                        {txn.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button onClick={switchDemoData} variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="button-demo-switch">
                Try with sample data
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button onClick={scrollToSignup} className="bg-blue-600 hover:bg-blue-700" data-testid="button-demo-signup">
                Ready to see your own? Sign up free
              </Button>
            </div>
          </div>
        </section>

        {/* Signup Section */}
        <section ref={signupRef} className="py-20 lg:py-32">
          <div className="max-w-md mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4">Create your account</h2>
              <p className="text-gray-300">No credit card required. Connect up to 4 accounts free.</p>
            </div>

            {!signupSuccess ? (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                    data-testid="input-signup-name"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                    data-testid="input-signup-email"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                    data-testid="input-signup-password"
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12" data-testid="button-signup-submit">
                  Create Account
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black text-gray-400">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="button-google-signup">
                    Google
                  </Button>
                  <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="button-apple-signup">
                    Apple
                  </Button>
                </div>

                <p className="text-sm text-gray-400 text-center mt-4">
                  No credit card required. You can connect up to 4 accounts on the Free plan.
                </p>
              </form>
            ) : (
              <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <Check className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Welcome to Flint!</h3>
                <p className="text-gray-300">Taking you to your dashboard...</p>
              </div>
            )}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-32 bg-white/5 border-y border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
              <p className="text-xl text-gray-300">Start free. Upgrade when you need more.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <Card className="bg-white/5 border-white/10 p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-bold">$0</span>
                    <span className="text-gray-400">forever</span>
                  </div>
                  <p className="text-gray-300">Perfect for getting started</p>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Up to 4 accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Basic dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Real-time updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Mobile app access</span>
                  </li>
                </ul>

                <Button onClick={scrollToSignup} className="w-full bg-white/10 hover:bg-white/20 border border-white/20" data-testid="button-free-plan">
                  Get Started Free
                </Button>
              </Card>

              {/* Pro Plan */}
              <Card className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border-blue-400/30 p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">POPULAR</span>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold">$39.99</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">or $399.99/year (Save 15%)</p>
                  <p className="text-sm text-blue-400">≈ $1.10/day</p>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold">Unlimited accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Custom alerts & notifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Export & reporting tools</span>
                  </li>
                </ul>

                <Button className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-pro-plan">
                  Upgrade to Pro
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-32">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="security" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  Is my data secure?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Yes. We use bank-level 256-bit encryption and read-only connections. We never store your login credentials and can't move your money.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="accounts" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  How many accounts can I connect for free?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  You can connect up to 4 accounts on the Free plan. This includes any combination of banks, credit cards, investment accounts, or crypto wallets.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cancel" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  Can I cancel anytime?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Absolutely. There are no contracts or commitments. You can cancel your Pro subscription anytime from your account settings.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="revenue" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  How does Flint make money?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  We earn from Pro subscriptions. We don't sell your data, and we don't charge hidden fees. Our business model is simple and transparent.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="upgrade" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  Why should I upgrade to Pro?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Upgrade if you need to connect more than 4 accounts, want advanced analytics, custom alerts, or priority support. Many users stay on Free and love it!
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Footer */}
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
      </main>

      {/* Scroll Popup */}
      {showScrollPopup && !scrollPopupSubmitted && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-black border border-white/20 rounded-lg p-6 shadow-2xl z-50 animate-[fadeInUp_0.3s_ease-out]">
          <button 
            onClick={() => setShowScrollPopup(false)} 
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
            data-testid="button-close-scroll-popup"
          >
            <X className="h-4 w-4" />
          </button>
          
          <h3 className="text-lg font-semibold mb-2">Stay in the loop!</h3>
          <p className="text-sm text-gray-300 mb-4">Enter your email for updates and beta invites.</p>
          
          <form onSubmit={handleScrollPopupSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder="Your email"
              value={scrollPopupEmail}
              onChange={(e) => setScrollPopupEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              data-testid="input-scroll-popup-email"
            />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="button-scroll-popup-submit">
              Subscribe
            </Button>
          </form>
        </div>
      )}

      {showScrollPopup && scrollPopupSubmitted && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-green-500/10 border border-green-500/20 rounded-lg p-6 shadow-2xl z-50">
          <Check className="h-6 w-6 text-green-400 mb-2" />
          <p className="text-green-400">Thanks for subscribing!</p>
        </div>
      )}

      {/* Exit Intent Modal */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="bg-black border-white/20">
          <DialogTitle className="text-2xl font-bold">
            Don't leave empty-handed!
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Get our free financial planning checklist. Enter your email to receive it.
          </DialogDescription>

          {!exitModalSubmitted ? (
            <form onSubmit={handleExitEmailSubmit} className="space-y-4 mt-4">
              <Input
                type="email"
                placeholder="Your email"
                value={exitEmail}
                onChange={(e) => setExitEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                data-testid="input-exit-modal-email"
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-exit-modal-submit">
                Send Me the Checklist
              </Button>
            </form>
          ) : (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
              <Check className="h-12 w-12 text-green-400 mx-auto mb-2" />
              <p className="text-green-400">Check your email for your free checklist!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
