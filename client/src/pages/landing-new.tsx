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

// Demo data sets with subscriptions
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
    { date: 'Nov 15', merchant: 'Salary Deposit', amount: '+$4,250.00', category: 'Income' },
    { date: 'Nov 14', merchant: 'Amazon', amount: '-$42.99', category: 'Shopping' },
    { date: 'Nov 14', merchant: 'Starbucks', amount: '-$6.75', category: 'Food' },
    { date: 'Nov 13', merchant: 'Netflix', amount: '-$15.99', category: 'Entertainment' }
  ],
  subscriptions: [
    { name: 'Netflix', amount: '$15.99', frequency: 'Monthly', nextDate: 'Dec 13' },
    { name: 'Spotify', amount: '$10.99', frequency: 'Monthly', nextDate: 'Dec 18' },
    { name: 'Amazon Prime', amount: '$14.99', frequency: 'Monthly', nextDate: 'Dec 5' },
    { name: 'Apple iCloud', amount: '$2.99', frequency: 'Monthly', nextDate: 'Nov 28' }
  ]
};

const DEMO_DATA_2 = {
  netWorth: '$94,821.55',
  accounts: [
    { name: 'Wells Fargo Checking', type: 'Bank', balance: '$3,821.33', change: '+1.2%' },
    { name: 'Robinhood', type: 'Investing', balance: '$67,234.22', change: '+12.4%' },
    { name: 'Binance', type: 'Crypto', balance: '$23,766.00', change: '+5.6%' },
    { name: 'Amex Gold Card', type: 'Credit', balance: '-$892.15', change: '0%' }
  ],
  transactions: [
    { date: 'Nov 16', merchant: 'Target', amount: '-$124.99', category: 'Shopping' },
    { date: 'Nov 16', merchant: 'Chipotle', amount: '-$12.45', category: 'Food' },
    { date: 'Nov 14', merchant: 'Freelance Payment', amount: '+$2,500.00', category: 'Income' },
    { date: 'Nov 13', merchant: 'Gas Station', amount: '-$52.00', category: 'Transportation' },
    { date: 'Nov 13', merchant: 'Gym Membership', amount: '-$45.00', category: 'Health' },
    { date: 'Nov 12', merchant: 'Uber', amount: '-$18.50', category: 'Transportation' }
  ],
  subscriptions: [
    { name: 'Gym Membership', amount: '$45.00', frequency: 'Monthly', nextDate: 'Dec 13' },
    { name: 'Disney+', amount: '$13.99', frequency: 'Monthly', nextDate: 'Dec 2' },
    { name: 'Adobe Creative', amount: '$54.99', frequency: 'Monthly', nextDate: 'Dec 8' },
    { name: 'YouTube Premium', amount: '$11.99', frequency: 'Monthly', nextDate: 'Dec 15' }
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

  // Pricing toggle
  const [isAnnual, setIsAnnual] = useState(false);

  // Sticky nav
  const [showStickyNav, setShowStickyNav] = useState(false);

  // Refs
  const signupRef = useRef<HTMLDivElement>(null);

  // Scroll to signup
  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll tracking for popup and sticky nav
  useEffect(() => {
    let hasShownPopup = false;
    
    const handleScroll = () => {
      // Show sticky nav after scrolling 300px
      setShowStickyNav(window.scrollY > 300);
      
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
  const [signupLoading, setSignupLoading] = useState(false);

  const handleSignupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Landing New] Signup form submitted', { name: signupData.name, email: signupData.email });
    
    if (signupData.name && signupData.email && signupData.password) {
      console.log('[Landing New] All fields valid, showing success message');
      setSignupSuccess(true);
      // Note: This is a demo landing page. Real signup happens through /login or Stripe checkout
    } else {
      console.log('[Landing New] Form validation failed', signupData);
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/30 via-black to-blue-900/30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Sticky CTA Nav */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 transition-transform duration-300 ${
          showStickyNav ? 'translate-y-0' : '-translate-y-full'
        }`}
        data-testid="sticky-nav"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-bold">
              F
            </div>
            <span className="font-bold text-xl">Flint</span>
          </div>
          <Button
            type="button"
            onClick={scrollToSignup}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-sticky-nav-cta"
          >
            Get Started Free
          </Button>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-40 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
            <span className="text-xl font-semibold">Flint</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button type="button" variant="ghost" className="text-white hover:text-blue-400" data-testid="button-login">
                Log In
              </Button>
            </Link>
            <Button type="button" onClick={scrollToSignup} className="bg-blue-600 hover:bg-blue-700" data-testid="button-header-signup">
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
                All your money,
                <span className="text-blue-400"> one place</span>
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed">
                Track your bank, brokerage, and crypto accounts in one smart dashboard — find savings, avoid fees, and grow wealth automatically.
              </p>

              <div className="space-y-3">
                <Button 
                  type="button"
                  onClick={scrollToSignup} 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-xl px-10 py-7 h-auto shadow-2xl shadow-blue-600/50"
                  data-testid="button-hero-cta"
                >
                  Get Started Free
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                
                <p className="text-sm text-gray-400">
                  🔒 No spam, bank-level encryption, cancel anytime.
                </p>
              </div>

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

        {/* Value Proposition Cards */}
        <section className="py-20 lg:py-24 bg-gradient-to-b from-black to-blue-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Cut Hidden Fees */}
              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-all hover:scale-105 hover:shadow-2xl" data-testid="value-card-fees">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Cut Hidden Fees</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We find and alert you to unnecessary bank charges. Stop losing money to fees you didn't know about.
                  </p>
                </div>
              </Card>

              {/* Grow Net Worth */}
              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-all hover:scale-105 hover:shadow-2xl" data-testid="value-card-grow">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-600/20 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Grow Net Worth</h3>
                  <p className="text-gray-300 leading-relaxed">
                    All accounts on one screen helps you grow with clarity. See the big picture and make smarter money moves.
                  </p>
                </div>
              </Card>

              {/* Stay in Control */}
              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-all hover:scale-105 hover:shadow-2xl" data-testid="value-card-control">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-purple-600/20 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Stay in Control</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Personalized budgets and tips that work with you, not against you. Your money, your rules.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust & Partners Section */}
        <section className="border-y border-white/10 bg-white/5 backdrop-blur-sm py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Works With Your Banks</h2>
            </div>

            {/* Scrolling logos with Brandfetch */}
            <div className="relative overflow-hidden mb-12">
              <div className="flex gap-8 animate-[scroll_40s_linear_infinite]">
                {[...INSTITUTIONS, ...INSTITUTIONS].map((inst, idx) => (
                  <div key={idx} className="flex-shrink-0 w-40 h-20 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 p-4">
                    <img 
                      src={`https://img.logo.dev/${inst.domain}?token=pk_X-WsTzKaQ_C20eGOSz4ZYA&size=80`}
                      alt={inst.name}
                      className="max-h-12 max-w-full object-contain filter brightness-0 invert opacity-70 hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-sm text-gray-300 font-medium">${inst.name}</span>`;
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 justify-center">
                <Shield className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-semibold">5,000+ people</p>
                  <p className="text-sm text-gray-400">Use Flint every day</p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Lock className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-semibold">Super safe</p>
                  <p className="text-sm text-gray-400">Same security as banks</p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Shield className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-semibold">We only look</p>
                  <p className="text-sm text-gray-400">We can't move your money</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-20 lg:py-24 bg-gradient-to-b from-blue-950/20 to-black">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Progress Bar */}
            <div className="text-center mb-16">
              <div className="inline-block bg-blue-600/10 border border-blue-400/30 rounded-xl p-6 mb-6" data-testid="social-proof-progress">
                <p className="text-sm text-blue-400 font-semibold mb-3">EARLY ACCESS FILLING FAST</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '82%' }} data-testid="progress-bar-fill"></div>
                  </div>
                </div>
                <p className="text-2xl font-bold text-white" data-testid="progress-text">8,200 / 10,000 early spots claimed!</p>
              </div>
              
              <p className="text-gray-400 text-sm">Loved by early adopters for clarity and ease.</p>
            </div>

            {/* Testimonials */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Testimonial 1 */}
              <Card className="bg-white/5 border-white/10 p-6" data-testid="testimonial-1">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="text-gray-300 italic">
                    "Finally, I can see all my accounts in one place. Found $400 in fees I didn't know I was paying!"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-semibold">
                      JM
                    </div>
                    <div>
                      <p className="font-semibold text-white">Jessica M.</p>
                      <p className="text-sm text-gray-400">Early Adopter</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Testimonial 2 */}
              <Card className="bg-white/5 border-white/10 p-6" data-testid="testimonial-2">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="text-gray-300 italic">
                    "Super easy to use. I connected 8 accounts in under 5 minutes. The alerts are game-changing."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-600/20 flex items-center justify-center text-green-400 font-semibold">
                      DR
                    </div>
                    <div>
                      <p className="font-semibold text-white">David R.</p>
                      <p className="text-sm text-gray-400">Pro User</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Testimonial 3 */}
              <Card className="bg-white/5 border-white/10 p-6" data-testid="testimonial-3">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="text-gray-300 italic">
                    "Clean design, works perfectly. Helps me track crypto and stocks without jumping between apps."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-semibold">
                      SK
                    </div>
                    <div>
                      <p className="font-semibold text-white">Sarah K.</p>
                      <p className="text-sm text-gray-400">Investor</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">What You Get</h2>
              <p className="text-xl text-gray-300">Simple. Fast. Free to try.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-colors">
                <Wallet className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-3">All Your Money</h3>
                <p className="text-gray-300">
                  See your bank, cards, stocks, and crypto together.
                </p>
              </Card>

              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-colors">
                <Zap className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-3">Live Updates</h3>
                <p className="text-gray-300">
                  Watch your money change in real time. Get alerts when things happen.
                </p>
              </Card>

              <Card className="bg-white/5 border-white/10 p-8 hover:bg-white/10 transition-colors">
                <TrendingUp className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-3">Do More</h3>
                <p className="text-gray-300">
                  Move money and buy stocks right from Flint.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="py-20 lg:py-32 bg-white/5 border-y border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Banner above demo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-400/30 rounded-full px-6 py-3" data-testid="demo-banner">
                <Zap className="h-4 w-4 text-blue-400" />
                <p className="text-blue-400 font-medium">
                  See how Flint works — try the dashboard now (no sign-up needed)
                </p>
              </div>
            </div>

            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">See How It Works</h2>
              <p className="text-xl text-gray-300">Watch your money all in one place</p>
            </div>

            {/* Full dashboard mock with scrolling */}
            <div className="bg-black/40 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-sm">
              {/* Top bar with net worth */}
              <div className="p-6 border-b border-white/10 bg-white/5">
                <p className="text-sm text-gray-400 mb-1">Total Net Worth</p>
                <p className="text-5xl font-bold text-blue-400" data-testid="demo-net-worth">{currentDemo.netWorth}</p>
              </div>

              {/* Scrollable content area */}
              <div className="max-h-[600px] overflow-y-auto">
                {/* Accounts grid */}
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    Your Accounts
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {currentDemo.accounts.map((account, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{account.name}</p>
                            <p className="text-sm text-gray-400">{account.type}</p>
                          </div>
                          <span className={account.change.startsWith('+') ? 'text-green-400 text-sm' : account.change.startsWith('-') ? 'text-red-400 text-sm' : 'text-gray-400 text-sm'}>
                            {account.change}
                          </span>
                        </div>
                        <p className="text-2xl font-bold">{account.balance}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscriptions */}
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    Your Subscriptions
                  </h3>
                  <div className="space-y-3">
                    {currentDemo.subscriptions.map((sub, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <div>
                          <p className="font-semibold">{sub.name}</p>
                          <p className="text-sm text-gray-400">{sub.frequency} • Next: {sub.nextDate}</p>
                        </div>
                        <p className="text-lg font-bold">{sub.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transactions */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-400" />
                    Recent Activity
                  </h3>
                  <div className="space-y-2">
                    {currentDemo.transactions.map((txn, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
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
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button type="button" onClick={switchDemoData} size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-6" data-testid="button-demo-switch">
                Switch Sample Data
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button type="button" onClick={scrollToSignup} size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-6 shadow-2xl shadow-blue-600/50" data-testid="button-demo-signup">
                Get Started Free
              </Button>
            </div>
          </div>
        </section>

        {/* CTA After Demo */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h3 className="text-3xl font-bold mb-3">Ready to see your full picture?</h3>
            <p className="text-xl text-gray-300 mb-6">Join 8,200+ people taking control of their money</p>
            
            <Button type="button" onClick={scrollToSignup} size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-12 text-lg" data-testid="button-cta-after-demo">
              Get Started Free
            </Button>
          </div>
        </section>

        {/* Signup Section */}
        <section ref={signupRef} className="py-20 lg:py-32">
          <div className="max-w-md mx-auto px-4 sm:px-6">
            {/* Progress bar */}
            <div className="mb-8 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-400">Early Access</span>
                <span className="text-sm text-gray-300">3,183 / 10,000 spots</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '31.83%' }}></div>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Check className="h-3 w-3 text-green-400" />
                3,183 early spots claimed
              </p>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4">Start Free Today</h2>
              <p className="text-gray-300">No credit card needed. Connect up to 4 accounts free.</p>
            </div>

            {!signupSuccess ? (
              <div>
                <form onSubmit={handleSignupSubmit} action="#" className="space-y-4">
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

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12" 
                    disabled={signupLoading}
                    data-testid="button-signup-submit"
                  >
                    {signupLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>

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

                {/* Referral CTA */}
                <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg text-center">
                  <p className="text-sm font-semibold text-blue-400 mb-1">Want unlimited accounts?</p>
                  <p className="text-white">Get unlimited by referring 3 friends</p>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-lg text-center space-y-4">
                <Check className="h-16 w-16 text-green-400 mx-auto" />
                <h3 className="text-2xl font-bold">You're on the list!</h3>
                <p className="text-gray-300">This is a demo landing page. To actually create an account, visit our signup page.</p>
                
                <div className="mt-6 space-y-4">
                  {/* Demo Waitlist Preview */}
                  <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Your Waitlist Position (Demo)</p>
                    <p className="text-4xl font-bold text-blue-400">#8,247</p>
                    <p className="text-xs text-gray-400 mt-2">Skip spots by referring friends</p>
                  </div>

                  {/* Demo Referral Info */}
                  <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-3">
                    <p className="text-sm font-semibold text-white">Share & Get Unlimited Accounts</p>
                    <p className="text-xs text-gray-400">Refer 3 friends to unlock unlimited accounts for free</p>
                    <p className="text-sm text-blue-400 font-medium">Get your unique referral link when you sign up!</p>
                  </div>

                  {/* CTA to actual signup */}
                  <Link href="/login">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12" data-testid="button-go-to-login">
                      Create Real Account →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-32 bg-white/5 border-y border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4">Pick Your Plan</h2>
              <p className="text-xl text-gray-300 mb-6">Start free. Pay when you want more.</p>
              
              {/* Monthly/Annual Toggle */}
              <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full p-1">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    !isAnnual ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid="toggle-monthly"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    isAnnual ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid="toggle-annual"
                >
                  Annual
                  <span className="ml-2 text-green-400 text-xs">Save 17%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Free Plan */}
              <Card className="bg-white/5 border-white/10 p-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-gray-400">forever</span>
                  </div>
                  <p className="text-gray-300 text-sm">Try it out</p>
                </div>

                <ul className="space-y-2 mb-8">
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>4 accounts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>See all your money</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Live updates</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Mobile app</span>
                  </li>
                </ul>

                <Button type="button" onClick={scrollToSignup} className="w-full bg-white/10 hover:bg-white/20 border border-white/20" data-testid="button-free-plan">
                  Start Free
                </Button>
              </Card>

              {/* Standard Plan */}
              <Card className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border-blue-400/30 p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Standard</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold">${isAnnual ? '199' : '19.99'}</span>
                    <span className="text-gray-400">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual && <p className="text-sm text-green-400 mb-1">$199/year - 2 months free!</p>}
                  <p className="text-gray-300 text-sm">For active users</p>
                </div>

                <ul className="space-y-2 mb-8">
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold">Unlimited accounts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Price alerts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Track spending</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Email support</span>
                  </li>
                </ul>

                <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-standard-plan">
                  Get Standard
                </Button>
              </Card>

              {/* Plus Plan */}
              <Card className="bg-white/5 border-white/10 p-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Plus</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold">${isAnnual ? '399' : '39.99'}</span>
                    <span className="text-gray-400">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual && <p className="text-sm text-green-400 mb-1">$399/year - 2 months free!</p>}
                  <p className="text-gray-300 text-sm">For power users</p>
                </div>

                <ul className="space-y-2 mb-8">
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold">Unlimited accounts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Everything in Standard</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Advanced charts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Custom alerts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Fast support</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Download reports</span>
                  </li>
                </ul>

                <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-plus-plan">
                  Get Plus
                </Button>
              </Card>
            </div>

            {/* Guarantee */}
            <div className="text-center mt-8">
              <p className="text-gray-400 text-sm">
                <Shield className="h-4 w-4 inline mr-2 text-green-400" />
                Cancel anytime. No risk.
              </p>
            </div>
          </div>
        </section>

        {/* CTA After Pricing */}
        <section className="py-16 bg-white/5 border-y border-white/10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h3 className="text-3xl font-bold mb-3">Start managing your money better today</h3>
            <p className="text-xl text-gray-300 mb-6">Free forever. No credit card needed.</p>
            
            <Button type="button" onClick={scrollToSignup} size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-12 text-lg" data-testid="button-cta-after-pricing">
              Get Started Free
            </Button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-32">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Questions?</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="security" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  Is my money safe?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Yes! We use the same security as banks. We can only look at your accounts. We can't move your money.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="accounts" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  How many accounts are free?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  You can connect 4 accounts for free. This means banks, cards, stocks, or crypto.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cancel" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  Can I cancel?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Yes. You can stop paying anytime. No long contracts.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="revenue" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  How do you make money?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  We make money when people pay for Pro. We never sell your info.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="upgrade" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  Why go Pro?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Go Pro if you want more than 4 accounts, better charts, or fast help. Free works great for most people!
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
        <DialogContent className="bg-black border-white/20 max-w-md">
          <DialogTitle className="text-2xl font-bold">
            Not ready yet?
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-base">
            Get a free guide: <span className="font-semibold text-white">"How to Spot Hidden Bank Fees"</span> — Enter email below.
          </DialogDescription>

          {!exitModalSubmitted ? (
            <form onSubmit={handleExitEmailSubmit} className="space-y-4 mt-4">
              <Input
                type="email"
                placeholder="Your email"
                value={exitEmail}
                onChange={(e) => setExitEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12"
                data-testid="input-exit-modal-email"
                required
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold" data-testid="button-exit-modal-submit">
                Send Me the Free Guide
              </Button>
              <p className="text-xs text-gray-400 text-center">We'll email you the guide right away. No spam, ever.</p>
            </form>
          ) : (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center space-y-3">
              <Check className="h-12 w-12 text-green-400 mx-auto" />
              <p className="text-green-400">Check your email for your free checklist!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
