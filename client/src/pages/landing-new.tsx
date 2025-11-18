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
  TrendingDown,
  Wallet, 
  Zap, 
  ArrowRight, 
  Check, 
  X,
  DollarSign,
  CreditCard,
  Building,
  Building2,
  LineChart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import flintLogo from "@assets/flint-logo.png";
import dashboardPreview from "@assets/dashboard-preview.png";

// Type definitions for demo data
interface DemoAccount {
  name: string;
  type: 'Bank' | 'Investing' | 'Crypto' | 'Credit';
  balance: string;
  change: string;
  id: string;
  creditLimit?: string;
  availableCredit?: string;
  transactions?: DemoTransaction[];
}

interface DemoHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  profitLoss: number;
  profitLossPct: number;
}

interface DemoTransaction {
  date: string;
  merchant: string;
  amount: string;
  category: string;
}

interface DemoSubscription {
  name: string;
  amount: string;
  frequency: string;
  nextDate: string;
}

interface DemoMoneySource {
  name: string;
  amount: number;
}

interface DemoData {
  netWorth: string;
  accounts: DemoAccount[];
  holdings: DemoHolding[];
  transactions: DemoTransaction[];
  subscriptions: DemoSubscription[];
  moneyMovement: {
    moneyIn: number;
    moneyOut: number;
    topSources: DemoMoneySource[];
    topSpend: DemoMoneySource[];
    threeMonthAvg: {
      moneyIn: number;
      moneyOut: number;
    };
  };
}

// Helper function to get company domain from stock/crypto symbol for Brandfetch logos
const getSymbolDomain = (symbol: string): string => {
  const symbolMap: { [key: string]: string } = {
    // Stocks
    'AAPL': 'apple.com',
    'TSLA': 'tesla.com',
    'MSFT': 'microsoft.com',
    'NVDA': 'nvidia.com',
    'GOOGL': 'google.com',
    'AMZN': 'amazon.com',
    'META': 'meta.com',
    'NFLX': 'netflix.com',
    // Crypto
    'BTC': 'bitcoin.org',
    'ETH': 'ethereum.org',
    'SOL': 'solana.com',
    // Exchanges (for account names if needed)
    'Coinbase': 'coinbase.com',
    'Binance': 'binance.com',
    'Kraken': 'kraken.com'
  };
  return symbolMap[symbol] || symbol.toLowerCase() + '.com';
};

// Complete list of supported institutions from SnapTrade and Teller integrations
const INSTITUTIONS = [
  // Banks (Teller Integration)
  { name: 'Chase', domain: 'chase.com' },
  { name: 'Bank of America', domain: 'bankofamerica.com' },
  { name: 'Wells Fargo', domain: 'wellsfargo.com' },
  { name: 'Citi', domain: 'citi.com' },
  { name: 'Capital One', domain: 'capitalone.com' },
  { name: 'US Bank', domain: 'usbank.com' },
  { name: 'PNC', domain: 'pnc.com' },
  { name: 'Truist', domain: 'truist.com' },
  
  // Brokerages (SnapTrade Integration)
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
  
  // Crypto Exchanges (SnapTrade Integration)
  { name: 'Coinbase', domain: 'coinbase.com' },
  { name: 'Binance', domain: 'binance.com' },
  { name: 'Kraken', domain: 'kraken.com' }
];

// Demo data sets with subscriptions and holdings
const DEMO_DATA_1: DemoData = {
  netWorth: '$106,309.21', // Calculated: (5234.12 + 89432.45 + 12876.64) - 1234.00
  accounts: [
    { 
      name: 'Chase Checking', 
      type: 'Bank', 
      balance: '$5,234.12', 
      change: '+2.3%', 
      id: 'chase-1',
      transactions: [
        { date: 'Nov 16', merchant: 'Whole Foods', amount: '-$87.43', category: 'Groceries' },
        { date: 'Nov 15', merchant: 'Shell Gas', amount: '-$45.00', category: 'Transportation' },
        { date: 'Nov 15', merchant: 'Salary Deposit', amount: '+$4,250.00', category: 'Income' }
      ]
    },
    { 
      name: 'Fidelity Brokerage', 
      type: 'Investing', 
      balance: '$89,432.45', 
      change: '+8.7%', 
      id: 'fidelity-1',
      transactions: [
        { date: 'Nov 16', merchant: 'Bought AAPL', amount: '-$1,894.50', category: 'Buy' },
        { date: 'Nov 14', merchant: 'Sold TSLA', amount: '+$2,387.70', category: 'Sell' },
        { date: 'Nov 13', merchant: 'Dividend AAPL', amount: '+$47.50', category: 'Dividend' }
      ]
    },
    { 
      name: 'Coinbase', 
      type: 'Crypto', 
      balance: '$12,876.64', 
      change: '-3.2%', 
      id: 'coinbase-1',
      transactions: [
        { date: 'Nov 16', merchant: 'Bought ETH', amount: '-$500.00', category: 'Buy' },
        { date: 'Nov 14', merchant: 'Sold BTC', amount: '+$1,250.00', category: 'Sell' },
        { date: 'Nov 12', merchant: 'Deposited USD', amount: '+$1,000.00', category: 'Deposit' }
      ]
    },
    { 
      name: 'Chase Sapphire', 
      type: 'Credit', 
      balance: '-$1,234.00', 
      change: '0%', 
      id: 'chase-credit-1',
      creditLimit: '$10,000',
      availableCredit: '$8,766',
      transactions: [
        { date: 'Nov 16', merchant: 'Amazon', amount: '-$42.99', category: 'Shopping' },
        { date: 'Nov 14', merchant: 'Starbucks', amount: '-$6.75', category: 'Food' },
        { date: 'Nov 13', merchant: 'Netflix', amount: '-$15.99', category: 'Entertainment' }
      ]
    }
  ],
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', quantity: 50, avgCost: 175.20, currentPrice: 189.45, value: 9472.50, profitLoss: 712.50, profitLossPct: 8.1 },
    { symbol: 'TSLA', name: 'Tesla Inc.', quantity: 15, avgCost: 245.80, currentPrice: 238.77, value: 3581.55, profitLoss: -105.45, profitLossPct: -2.9 },
    { symbol: 'BTC', name: 'Bitcoin', quantity: 0.25, avgCost: 45200, currentPrice: 43800, value: 10950, profitLoss: -350, profitLossPct: -3.1 },
    { symbol: 'ETH', name: 'Ethereum', quantity: 5, avgCost: 2850, currentPrice: 2920, value: 14600, profitLoss: 350, profitLossPct: 2.5 }
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
  ],
  moneyMovement: {
    moneyIn: 8750.00,
    moneyOut: 3425.86,
    topSources: [
      { name: 'Acme Corp Payroll', amount: 4250.00 },
      { name: 'Freelance Client', amount: 2500.00 },
      { name: 'Stock Dividend', amount: 1500.00 },
      { name: 'Interest Income', amount: 500.00 }
    ],
    topSpend: [
      { name: 'Rent Payment', amount: 1850.00 },
      { name: 'Whole Foods', amount: 542.33 },
      { name: 'Shell Gas', amount: 245.00 },
      { name: 'Amazon', amount: 387.43 },
      { name: 'Restaurants', amount: 401.10 }
    ],
    threeMonthAvg: {
      moneyIn: 8200.00,
      moneyOut: 3100.00
    }
  }
};

const DEMO_DATA_2: DemoData = {
  netWorth: '$93,929.40', // Calculated: (3821.33 + 67234.22 + 23766.00) - 892.15
  accounts: [
    { 
      name: 'Wells Fargo Checking', 
      type: 'Bank', 
      balance: '$3,821.33', 
      change: '+1.2%', 
      id: 'wells-1',
      transactions: [
        { date: 'Nov 16', merchant: 'Target', amount: '-$124.99', category: 'Shopping' },
        { date: 'Nov 16', merchant: 'Chipotle', amount: '-$12.45', category: 'Food' },
        { date: 'Nov 14', merchant: 'Freelance Payment', amount: '+$2,500.00', category: 'Income' }
      ]
    },
    { 
      name: 'Robinhood', 
      type: 'Investing', 
      balance: '$67,234.22', 
      change: '+12.4%', 
      id: 'robinhood-1',
      transactions: [
        { date: 'Nov 16', merchant: 'Bought MSFT', amount: '-$1,235.00', category: 'Buy' },
        { date: 'Nov 15', merchant: 'Sold GOOGL', amount: '+$3,450.00', category: 'Sell' },
        { date: 'Nov 13', merchant: 'Dividend MSFT', amount: '+$78.20', category: 'Dividend' }
      ]
    },
    { 
      name: 'Binance', 
      type: 'Crypto', 
      balance: '$23,766.00', 
      change: '+5.6%', 
      id: 'binance-1',
      transactions: [
        { date: 'Nov 16', merchant: 'Bought SOL', amount: '-$750.00', category: 'Buy' },
        { date: 'Nov 14', merchant: 'Sold BTC', amount: '+$2,100.00', category: 'Sell' },
        { date: 'Nov 13', merchant: 'Deposited USD', amount: '+$500.00', category: 'Deposit' }
      ]
    },
    { 
      name: 'Amex Gold Card', 
      type: 'Credit', 
      balance: '-$892.15', 
      change: '0%', 
      id: 'amex-1',
      creditLimit: '$25,000',
      availableCredit: '$24,107.85',
      transactions: [
        { date: 'Nov 16', merchant: 'Gas Station', amount: '-$52.00', category: 'Transportation' },
        { date: 'Nov 13', merchant: 'Gym Membership', amount: '-$45.00', category: 'Health' },
        { date: 'Nov 12', merchant: 'Uber', amount: '-$18.50', category: 'Transportation' }
      ]
    }
  ],
  holdings: [
    { symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 30, avgCost: 385.50, currentPrice: 412.30, value: 12369, profitLoss: 804, profitLossPct: 7.0 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', quantity: 20, avgCost: 520.80, currentPrice: 495.20, value: 9904, profitLoss: -512, profitLossPct: -4.9 },
    { symbol: 'SOL', name: 'Solana', quantity: 100, avgCost: 125, currentPrice: 142.50, value: 14250, profitLoss: 1750, profitLossPct: 14.0 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 40, avgCost: 142.20, currentPrice: 148.18, value: 5927.20, profitLoss: 239.20, profitLossPct: 4.2 }
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
  ],
  moneyMovement: {
    moneyIn: 6250.00,
    moneyOut: 2874.52,
    topSources: [
      { name: 'TechCo Salary', amount: 3750.00 },
      { name: 'Side Project', amount: 2000.00 },
      { name: 'Tax Refund', amount: 500.00 }
    ],
    topSpend: [
      { name: 'Mortgage Payment', amount: 1450.00 },
      { name: 'Target', amount: 324.99 },
      { name: 'Gas Station', amount: 285.00 },
      { name: 'Groceries', amount: 412.55 },
      { name: 'Dining Out', amount: 401.98 }
    ],
    threeMonthAvg: {
      moneyIn: 6100.00,
      moneyOut: 2900.00
    }
  }
};

// Helper function to parse currency strings with proper negative sign handling
function parseCurrency(value: string): number {
  // Remove currency symbols and commas, but preserve the negative sign
  const cleaned = value.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

// Helper function to format number as currency
function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Pricing toggle
  const [isAnnual, setIsAnnual] = useState(false);

  // Sticky nav
  const [showStickyNav, setShowStickyNav] = useState(false);

  // Money goals state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [goalsEmail, setGoalsEmail] = useState('');
  const [goalsSubmitted, setGoalsSubmitted] = useState(false);

  // Social proof notifications
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Account detail modal state
  const [selectedAccount, setSelectedAccount] = useState<DemoAccount | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  // Logo loading failure tracking
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

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

  // Money goals submission
  const handleGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoals.length > 0 && goalsEmail) {
      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: goalsEmail,
            goals: selectedGoals,
            source: 'money_goals',
          }),
        });

        if (response.ok) {
          setGoalsSubmitted(true);
        } else {
          // Still show success to user even if backend fails
          setGoalsSubmitted(true);
          console.error('Failed to submit lead capture');
        }
      } catch (error) {
        // Still show success to user even if network fails
        setGoalsSubmitted(true);
        console.error('Error submitting lead capture:', error);
      }
    }
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  // Social proof notifications - focused on signups and referrals
  useEffect(() => {
    const notifications = [
      "🎉 Alex in San Francisco just joined the Launch Pool!",
      "⚡ Jordan in Austin just referred 3 friends!",
      "🌟 Sam in Miami just signed up for Pro!",
      "🏆 Quinn in Dallas completed 5 referrals!",
      "🎁 Hayden in Detroit entered the Lifetime Giveaway!",
      "⚡ Reese in Las Vegas referred 10 friends!",
      "🌟 Peyton in Tampa just created an account!",
      "🔥 Taylor in New York just signed up!",
      "🎉 Morgan in Denver just joined Flint!",
      "⭐ Cameron in Phoenix just referred 2 friends!",
      "🚀 Riley in Portland just joined the waitlist!",
      "💫 Skyler in Minneapolis just signed up!",
      "🎯 Dakota in Chicago just created an account!",
      "🌟 Avery in Atlanta just joined the Launch Pool!",
      "🏆 Blake in Nashville just referred a friend!",
      "🎁 Parker in Columbus just entered the giveaway!",
      "⚡ Jamie in Boston just signed up for Standard!",
      "🔥 Casey in Seattle just joined Flint!"
    ];

    let activeHideTimer: NodeJS.Timeout | null = null;

    const showRandomNotification = () => {
      // Clear any existing hide timer before showing new notification
      if (activeHideTimer) {
        clearTimeout(activeHideTimer);
      }
      
      const randomMsg = notifications[Math.floor(Math.random() * notifications.length)];
      setNotificationMessage(randomMsg);
      setShowNotification(true);
      
      // Schedule hide and track this timer
      activeHideTimer = setTimeout(() => {
        setShowNotification(false);
        activeHideTimer = null;
      }, 5000);
    };

    // Show first notification after 15 seconds
    const initialTimer = setTimeout(showRandomNotification, 15000);
    
    // Then show notifications every 45 seconds
    const interval = setInterval(showRandomNotification, 45000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
      if (activeHideTimer) {
        clearTimeout(activeHideTimer);
      }
    };
  }, []);

  // Signup submission
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Password validation helper
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

    // Client-side password validation
    if (!isPasswordValid) {
      setSignupError('Password does not meet security requirements');
      return;
    }

    setSignupLoading(true);
    
    try {
      const response = await fetch('/api/auth/public-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: signupData.name,
          email: signupData.email,
          password: signupData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success state
        setSignupSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login?registered=true';
        }, 2000);
      } else {
        // Show error message with helpful context
        if (data.message && data.message.toLowerCase().includes('already')) {
          setSignupError('An account with this email already exists. Try logging in instead.');
        } else {
          setSignupError(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setSignupError('An error occurred. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Single subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-black to-black pointer-events-none" />

      {/* Sticky CTA Nav */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 transition-transform duration-300 ${
          showStickyNav ? 'translate-y-0' : '-translate-y-full'
        }`}
        data-testid="sticky-nav"
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
              F
            </div>
            <span className="font-bold">Flint</span>
          </div>
          <Button
            type="button"
            onClick={scrollToSignup}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 rounded-lg"
            data-testid="button-sticky-nav-cta"
          >
            Get Started Free
          </Button>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-40 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
            <span className="font-semibold">Flint</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button type="button" variant="ghost" className="text-white hover:text-blue-400" data-testid="button-login">
                Log In
              </Button>
            </Link>
            <Button type="button" onClick={scrollToSignup} className="bg-blue-600 hover:bg-blue-700 rounded-lg" data-testid="button-header-signup">
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section - Apple Typography */}
        <section className="apple-section">
          <div className="apple-container">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h1 className="apple-h1 mx-auto">
                All your money,
                <span className="text-blue-400"> one place</span>
              </h1>
              
              <p className="apple-body mx-auto text-gray-300">
                Track all your bank, card, stock, and crypto accounts — in one place. Free forever, no card needed.
              </p>

              <div className="flex flex-col items-center space-y-4">
                <Button 
                  type="button"
                  onClick={scrollToSignup} 
                  className="bg-blue-600 hover:bg-blue-700 text-lg px-12 py-6 h-auto rounded-xl"
                  data-testid="button-hero-cta"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <p className="apple-caption text-blue-300">
                  No credit card required · Join 5,000+ users
                </p>
              </div>

              {/* Interactive Demo Dashboard */}
              <div className="pt-12">
                <div className="aspect-video rounded-xl overflow-hidden border border-white/10 max-w-4xl mx-auto">
                  <img src={dashboardPreview} alt="Flint Dashboard" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Money Goals Section - Moved below hero */}
        <section className="apple-section bg-white/5">
          <div className="apple-container">
            <div className="max-w-md mx-auto">
              {!goalsSubmitted ? (
                <div className="p-8 bg-white/5 border border-white/10 rounded-xl space-y-6 text-center">
                  <h3 className="apple-h3">What's your #1 money goal?</h3>
                  <p className="apple-caption text-gray-300">Get a personalized tip when you join</p>
                    
                    <div className="space-y-2">
                      {['Build savings', 'Track spending', 'Cancel bad subscriptions', 'All of the above'].map((goal) => (
                        <label key={goal} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedGoals.includes(goal)}
                            onChange={() => toggleGoal(goal)}
                            className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
                            data-testid={`checkbox-goal-${goal.toLowerCase().replace(/ /g, '-')}`}
                          />
                          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{goal}</span>
                        </label>
                      ))}
                    </div>

                    <form onSubmit={handleGoalsSubmit} className="space-y-3 pt-2">
                      <Input
                        type="email"
                        placeholder="Your email"
                        value={goalsEmail}
                        onChange={(e) => setGoalsEmail(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        data-testid="input-goals-email"
                        required
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={selectedGoals.length === 0}
                        data-testid="button-goals-submit"
                      >
                        Join Free
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Check className="h-6 w-6 text-green-400 mb-2" />
                    <p className="text-green-400 font-medium">Thanks! Check your email for your personalized tip!</p>
                  </div>
                )}
            </div>
          </div>
        </section>

        {/* Launch Giveaway Section - Single Accent Gradient Allowed */}
        <section className="apple-section bg-gradient-to-r from-blue-900/30 via-blue-800/30 to-blue-900/30 border-y border-white/10">
          <div className="apple-container text-center">
            <h2 className="apple-h2">
              🚀 Flint Launch Giveaway
            </h2>
            <p className="apple-body mx-auto text-gray-200">
              Join now — help us hit our first 10,000 users and win big
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 border-blue-400/30 rounded-xl p-6">
                <span className="text-5xl block mb-2">🎟️</span>
                <h3 className="apple-h3">5 Winners</h3>
                <p className="apple-body text-gray-300">Get 1 year of Flint Pro</p>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-400/40 rounded-xl p-6 transform scale-105">
                <span className="text-5xl block mb-2">🏆</span>
                <h3 className="apple-h3">1 Grand Prize</h3>
                <p className="apple-body text-yellow-200 font-semibold">Flint Pro for Life</p>
              </Card>

              <Card className="bg-white/10 border-blue-400/30 rounded-xl p-6">
                <span className="text-5xl block mb-2">📈</span>
                <h3 className="apple-h3">Boost Odds</h3>
                <p className="apple-body text-gray-300">Refer friends or upgrade</p>
              </Card>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="apple-caption text-gray-300 font-medium">Progress to 10,000 users</p>
                <p className="apple-caption font-bold text-white">3,285 / 10,000</p>
              </div>
              <div className="w-full bg-white/10 rounded-xl h-4 overflow-hidden border border-white/20">
                <div 
                  className="h-full bg-blue-600 rounded-xl transition-all duration-500" 
                  style={{ width: '33%' }}
                  data-testid="launch-giveaway-progress"
                />
              </div>
            </div>

            <p className="apple-body text-blue-300 font-medium">
              🔔 Winners announced when we hit 10,000
            </p>
          </div>
        </section>

        {/* Value Proposition Cards - Apple 2-column Grid for Features */}
        <section className="apple-section">
          <div className="apple-container">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Cut Hidden Fees */}
              <Card className="bg-white/5 border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all" data-testid="value-card-fees">
                <div className="flex flex-col items-center text-center space-y-4">
                  <DollarSign className="h-7 w-7 text-blue-400" />
                  <h3 className="apple-h3">Cut Hidden Fees</h3>
                  <p className="apple-body text-gray-300">
                    We find and alert you to unnecessary bank charges
                  </p>
                </div>
              </Card>

              {/* Grow Net Worth */}
              <Card className="bg-white/5 border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all" data-testid="value-card-grow">
                <div className="flex flex-col items-center text-center space-y-4">
                  <TrendingUp className="h-7 w-7 text-green-400" />
                  <h3 className="apple-h3">Grow Net Worth</h3>
                  <p className="apple-body text-gray-300">
                    See the big picture and make smarter money moves
                  </p>
                </div>
              </Card>

              {/* Stay in Control */}
              <Card className="bg-white/5 border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all" data-testid="value-card-control">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Shield className="h-7 w-7 text-blue-400" />
                  <h3 className="apple-h3">Stay in Control</h3>
                  <p className="apple-body text-gray-300">
                    Personalized budgets that work with you, not against you
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust & Partners Section */}
        <section className="apple-section border-y border-white/10 bg-white/5">
          <div className="apple-container">
            <div className="text-center mb-12">
              <h2 className="apple-h2">Our Partners</h2>
              <p className="apple-caption text-gray-400">Connect to 26 trusted financial institutions</p>
            </div>

            {/* Scrolling logos with Brandfetch */}
            <div className="relative overflow-hidden mb-12">
              <div className="flex gap-8 animate-[scroll_40s_linear_infinite]">
                {[...INSTITUTIONS, ...INSTITUTIONS].map((inst, idx) => (
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
        <section className="apple-section">
          <div className="apple-container">
            <div className="text-center mb-16">
              <h2 className="apple-h2 mb-8">Loved by Early Adopters</h2>
              <div className="inline-block bg-blue-600/10 border border-blue-400/30 rounded-xl p-6 mb-6" data-testid="social-proof-progress">
                <p className="apple-caption text-blue-400 font-semibold mb-3">🔥 LAUNCH POOL FILLING FAST</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-3 bg-white/10 rounded-xl overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-xl" style={{ width: '33%' }} data-testid="progress-bar-fill"></div>
                  </div>
                </div>
                <p className="apple-h3 text-white" data-testid="progress-text">3,285 / 10,000 early spots claimed!</p>
              </div>
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
                    <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-semibold">
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
        <section className="apple-section">
          <div className="apple-container">
            <div className="text-center mb-16">
              <h2 className="apple-h2">What You Get</h2>
              <p className="apple-caption text-gray-300">Simple. Fast. Free to try.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-white/5 border-white/10 rounded-xl p-8 hover:bg-white/10 transition-colors">
                <Wallet className="h-7 w-7 text-blue-400 mb-4" />
                <h3 className="apple-h3">All Your Money</h3>
                <p className="apple-body text-gray-300">
                  See your bank, cards, stocks, and crypto together
                </p>
              </Card>

              <Card className="bg-white/5 border-white/10 rounded-xl p-8 hover:bg-white/10 transition-colors">
                <span className="text-3xl mb-4 block">🔁</span>
                <h3 className="apple-h3">Trade & Transfer</h3>
                <p className="apple-body text-gray-300">
                  Move money and buy stocks directly from Flint
                </p>
              </Card>

              <Card className="bg-white/5 border-white/10 rounded-xl p-8 hover:bg-white/10 transition-colors">
                <TrendingUp className="h-7 w-7 text-blue-400 mb-4" />
                <h3 className="apple-h3">Grow Wealth</h3>
                <p className="apple-body text-gray-300">
                  Track investments and optimize your portfolio
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="apple-section bg-white/5 border-y border-white/10">
          <div className="apple-container max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="apple-h2">See How It Works</h2>
              <p className="apple-caption text-gray-300">Fully interactive demo — click any account to explore</p>
            </div>

            {/* Full dashboard mock matching actual dashboard */}
            <div className="bg-black/40 border border-white/20 rounded-xl overflow-hidden backdrop-blur-sm">
              {/* Top bar with net worth */}
              <div className="p-6 border-b border-white/10 bg-white/5">
                <div className="flex flex-col items-center text-center">
                  <p className="apple-caption text-gray-400 mb-1">Total Net Worth</p>
                  <p className="apple-h1 text-blue-400 mb-2" data-testid="demo-net-worth">
                    {(() => {
                      const bankBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Bank')?.balance || '$0');
                      const investingBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Investing')?.balance || '$0');
                      const cryptoBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Crypto')?.balance || '$0');
                      const debtBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Credit')?.balance || '$0');
                      const netWorth = bankBalance + investingBalance + cryptoBalance + debtBalance;
                      return formatCurrency(netWorth);
                    })()}
                  </p>
                  <p className="apple-caption text-green-400">+2.4% today</p>
                </div>
              </div>

              {/* Scrollable content area */}
              <div className="max-h-[600px] overflow-y-auto">
                {/* Summary Cards - matching actual dashboard */}
                <div className="p-6 border-b border-white/10">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                      // Calculate totals using helper function
                      const bankBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Bank')?.balance || '$0');
                      const investingBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Investing')?.balance || '$0');
                      const cryptoBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Crypto')?.balance || '$0');
                      const debtBalance = parseCurrency(currentDemo.accounts.find(a => a.type === 'Credit')?.balance || '$0');
                      
                      const totalAssets = bankBalance + investingBalance + cryptoBalance;
                      const netWorth = totalAssets + debtBalance; // debtBalance is already negative
                      
                      return (
                        <>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-5 w-5 text-blue-400" />
                              <p className="apple-caption text-gray-400">Total Balance</p>
                            </div>
                            <p className="apple-h3">{formatCurrency(totalAssets)}</p>
                            <p className="apple-caption text-green-400 mt-1">+5.8% change</p>
                          </div>
                          
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="h-5 w-5 text-blue-400" />
                              <p className="apple-caption text-gray-400">Bank Accounts</p>
                            </div>
                            <p className="apple-h3">{formatCurrency(bankBalance)}</p>
                            <p className="apple-caption text-gray-400 mt-1">4% of total</p>
                          </div>
                          
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <LineChart className="h-5 w-5 text-blue-400" />
                              <p className="apple-caption text-gray-400">Investments</p>
                            </div>
                            <p className="apple-h3">{formatCurrency(investingBalance)}</p>
                            <p className="apple-caption text-green-400 mt-1">+8.7% change</p>
                          </div>

                          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-5 w-5 text-red-400" />
                              <p className="apple-caption text-gray-400">Debt</p>
                            </div>
                            <p className="apple-h3 text-red-400">{formatCurrency(Math.abs(debtBalance))}</p>
                            <p className="apple-caption text-gray-400 mt-1">Credit cards</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Connected Accounts */}
                <div className="p-6 border-b border-white/10">
                  <h3 className="apple-h3 mb-4 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    Connected Accounts
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {currentDemo.accounts.map((account, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowAccountModal(true);
                        }}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-blue-500/50 transition-all text-left cursor-pointer group"
                        data-testid={`button-account-${account.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold group-hover:text-blue-400 transition-colors">{account.name}</p>
                            <p className="apple-caption text-gray-400">{account.type}</p>
                          </div>
                          <span className={account.change.startsWith('+') ? 'text-green-400 apple-caption' : account.change.startsWith('-') ? 'text-red-400 apple-caption' : 'text-gray-400 apple-caption'}>
                            {account.change}
                          </span>
                        </div>
                        <p className="apple-h3">{account.balance}</p>
                        <p className="apple-caption text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click for details →</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Portfolio Holdings */}
                <div className="p-6 border-b border-white/10">
                  <h3 className="apple-h3 mb-4 flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-400" />
                    Portfolio Holdings
                  </h3>
                  <div className="space-y-3">
                    {currentDemo.holdings.map((holding, idx) => {
                      const logoKey = `portfolio-${holding.symbol}`;
                      const logoFailed = failedLogos[logoKey];
                      
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {!logoFailed ? (
                                <img 
                                  src={`https://cdn.brandfetch.io/${getSymbolDomain(holding.symbol)}`}
                                  alt={holding.symbol}
                                  className="w-full h-full object-contain p-1"
                                  onError={() => {
                                    const key = `portfolio-${holding.symbol}`;
                                    setFailedLogos(prev => ({ ...prev, [key]: true }));
                                  }}
                                />
                              ) : (
                                <span className="text-blue-400 font-bold text-sm">{holding.symbol.substring(0, 2)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{holding.symbol}</p>
                              <p className="text-sm text-gray-400">{holding.quantity} {holding.quantity === 1 ? 'share' : 'shares'} @ ${holding.avgCost.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">${holding.value.toLocaleString()}</p>
                            <p className={`text-sm flex items-center justify-end gap-1 ${holding.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {holding.profitLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              ${Math.abs(holding.profitLoss).toLocaleString()} ({holding.profitLossPct > 0 ? '+' : ''}{holding.profitLossPct.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-blue-400">Total Portfolio Value</span>
                      <span className="text-xl font-bold">${currentDemo.holdings.reduce((sum, h) => sum + h.value, 0).toLocaleString()}</span>
                    </div>
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

                {/* Money Movement */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      Money Movement
                    </h3>
                    <div className="flex items-center gap-2">
                      <button className="p-1 rounded hover:bg-white/10 text-gray-400 cursor-not-allowed" disabled>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-400 font-medium min-w-[80px] text-center">Nov 2025</span>
                      <button className="p-1 rounded hover:bg-white/10 text-gray-400 cursor-not-allowed" disabled>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Money In Card */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h4 className="text-sm text-gray-400 mb-2">Money in</h4>
                      <div className="text-2xl font-bold text-green-400 mb-4">
                        ${currentDemo.moneyMovement.moneyIn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 mb-2">Top sources</p>
                        <div className="space-y-2">
                          {currentDemo.moneyMovement.topSources.slice(0, 3).map((source, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-sm text-white">{source.name}</span>
                              <span className="text-sm text-white font-medium">
                                ${source.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs text-gray-400 mb-1">Last 3 months average</p>
                        <p className="text-base font-semibold text-white">
                          ${(currentDemo.moneyMovement.threeMonthAvg.moneyIn / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>

                    {/* Money Out Card */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h4 className="text-sm text-gray-400 mb-2">Money out</h4>
                      <div className="text-2xl font-bold text-red-400 mb-4">
                        −${currentDemo.moneyMovement.moneyOut.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 mb-2">Top spend</p>
                        <div className="space-y-2">
                          {currentDemo.moneyMovement.topSpend.slice(0, 3).map((spend, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-sm text-white">{spend.name}</span>
                              <span className="text-sm text-white font-medium">
                                −${spend.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs text-gray-400 mb-1">Last 3 months average</p>
                        <p className="text-base font-semibold text-white">
                          −${(currentDemo.moneyMovement.threeMonthAvg.moneyOut / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
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
            <p className="text-xl text-gray-300 mb-6">Join 3,285+ people taking control of their money</p>
            
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
                <span className="text-sm font-semibold text-blue-400">Launch Pool</span>
                <span className="text-sm text-gray-300">3,285 / 10,000 users</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '33%' }}></div>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Check className="h-3 w-3 text-green-400" />
                3,285 early spots claimed
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
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      required
                      data-testid="input-signup-password"
                    />
                    
                    {/* Password Requirements - show when focused or invalid */}
                    {(passwordFocused || (signupData.password && !isPasswordValid)) && (
                      <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg text-sm space-y-1" data-testid="password-requirements">
                        <p className="text-gray-400 font-semibold mb-2">Password must have:</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {passwordRequirements.length ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-gray-500" />
                            )}
                            <span className={passwordRequirements.length ? 'text-green-400' : 'text-gray-400'}>
                              At least 8 characters
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordRequirements.uppercase ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-gray-500" />
                            )}
                            <span className={passwordRequirements.uppercase ? 'text-green-400' : 'text-gray-400'}>
                              One uppercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordRequirements.lowercase ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-gray-500" />
                            )}
                            <span className={passwordRequirements.lowercase ? 'text-green-400' : 'text-gray-400'}>
                              One lowercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordRequirements.number ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-gray-500" />
                            )}
                            <span className={passwordRequirements.number ? 'text-green-400' : 'text-gray-400'}>
                              One number
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordRequirements.special ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-gray-500" />
                            )}
                            <span className={passwordRequirements.special ? 'text-green-400' : 'text-gray-400'}>
                              One special character (!@#$%^&*...)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {signupError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm" data-testid="signup-error">
                      {signupError}
                      {signupError.includes('already exists') && (
                        <div className="mt-2">
                          <Link href="/login" className="text-blue-400 hover:underline font-semibold" data-testid="link-goto-login">
                            Go to login →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

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

                {/* Referral Unlocks */}
                <div className="mt-6 p-6 bg-gradient-to-br from-blue-600/10 to-blue-800/10 border border-blue-600/20 rounded-lg">
                  <h4 className="text-lg font-bold mb-4">🔄 Invite & Unlock</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold">3</span>
                      </div>
                      <p className="text-gray-300"><span className="font-semibold text-white">Refer 3</span> = Unlock unlimited accounts</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold">5</span>
                      </div>
                      <p className="text-gray-300"><span className="font-semibold text-white">Refer 5</span> = Get 1 free month of Flint Pro</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-yellow-600/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-yellow-400 font-bold">10</span>
                      </div>
                      <p className="text-gray-300"><span className="font-semibold text-white">Refer 10</span> = 5x entries in the Lifetime Giveaway</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-lg text-center space-y-4">
                <Check className="h-16 w-16 text-green-400 mx-auto" />
                <h3 className="text-2xl font-bold">Account Created!</h3>
                <p className="text-gray-300">Redirecting you to login...</p>
                
                <div className="mt-6 space-y-4">
                  {/* Waitlist Position */}
                  <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Your Waitlist Position</p>
                    <p className="text-4xl font-bold text-blue-400">#3,285</p>
                    <p className="text-xs text-gray-400 mt-2">Skip spots by referring friends</p>
                  </div>

                  {/* Referral Preview */}
                  <div className="p-6 bg-gradient-to-br from-blue-600/10 to-blue-800/10 border border-blue-600/20 rounded-lg space-y-3">
                    <p className="text-sm font-semibold text-white">🔄 Invite & Unlock Rewards</p>
                    <div className="space-y-2 text-xs text-gray-300">
                      <p>• Refer 3 = Unlimited accounts</p>
                      <p>• Refer 5 = 1 free month of Pro</p>
                      <p>• Refer 10 = 5x giveaway entries</p>
                    </div>
                    <p className="text-sm text-blue-400 font-medium pt-2">Get your unique referral link after you log in!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="apple-section bg-white/5 border-y border-white/10">
          <div className="apple-container max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="apple-h2">Pick Your Plan</h2>
              <p className="apple-caption text-gray-300">Start free. Upgrade for advanced features.</p>
              
              {/* Monthly/Annual Toggle */}
              <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-6 py-2 rounded-lg apple-caption font-medium transition-all ${
                    !isAnnual ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid="toggle-monthly"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-6 py-2 rounded-lg apple-caption font-medium transition-all ${
                    isAnnual ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid="toggle-annual"
                >
                  Annual
                  <span className="ml-2 text-green-400 apple-caption">Save 17%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Free Plan */}
              <Card className="bg-white/5 border-white/10 rounded-xl p-6">
                <div className="mb-6">
                  <h3 className="apple-h3">Free</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="apple-h2">$0</span>
                    <span className="apple-caption text-gray-400">forever</span>
                  </div>
                  <p className="apple-caption text-gray-300">Try it out</p>
                </div>

                <ul className="space-y-2 mb-8">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">4 accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">See all your money</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Live updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Mobile app</span>
                  </li>
                </ul>

                <Button type="button" onClick={scrollToSignup} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl" data-testid="button-free-plan">
                  Start Free
                </Button>
              </Card>

              {/* Standard Plan */}
              <Card className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border-blue-400/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className="bg-blue-500 text-white apple-caption font-semibold px-2 py-1 rounded-lg">
                    Most Popular
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="apple-h3">Standard</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="apple-h2">${isAnnual ? '199' : '19.99'}</span>
                    <span className="apple-caption text-gray-400">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual && <p className="apple-caption text-green-400 mb-1">$199/year - 2 months free!</p>}
                  <p className="apple-caption text-gray-300">For active users</p>
                </div>

                <ul className="space-y-2 mb-8">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption font-semibold">Unlimited accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Price alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Track spending</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Email support</span>
                  </li>
                </ul>

                <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl" data-testid="button-standard-plan">
                  Get Standard
                </Button>
              </Card>

              {/* Pro Plan */}
              <Card className="bg-white/5 border-white/10 rounded-xl p-6">
                <div className="mb-6">
                  <h3 className="apple-h3">Pro</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="apple-h2">${isAnnual ? '399' : '39.99'}</span>
                    <span className="apple-caption text-gray-400">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual && <p className="apple-caption text-green-400 mb-1">$399/year - 2 months free!</p>}
                  <p className="apple-caption text-gray-300">For power users</p>
                </div>

                <ul className="space-y-2 mb-8">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption font-semibold">Unlimited accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Everything in Standard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption font-semibold">Trading</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption font-semibold">Transfers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Advanced charts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Custom alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Fast support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="apple-caption">Download reports</span>
                  </li>
                </ul>

                <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl" data-testid="button-pro-plan">
                  Get Pro
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
        <section className="apple-section bg-white/5 border-y border-white/10">
          <div className="apple-container max-w-2xl text-center">
            <h2 className="apple-h2">Start managing your money better today</h2>
            <p className="apple-body text-gray-300">Free forever. No credit card needed.</p>
            
            <Button type="button" onClick={scrollToSignup} size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-12 rounded-xl" data-testid="button-cta-after-pricing">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="apple-section">
          <div className="apple-container max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="apple-h2">Questions?</h2>
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

      {/* Social Proof Notification Toast */}
      {showNotification && (
        <div 
          className="fixed bottom-4 left-4 max-w-sm bg-gradient-to-r from-blue-600/90 to-blue-800/90 backdrop-blur-xl border border-white/20 rounded-lg p-4 shadow-2xl z-50 animate-[slideInLeft_0.3s_ease-out]"
          data-testid="social-proof-notification"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">👤</span>
            </div>
            <p className="text-sm font-medium text-white">{notificationMessage}</p>
          </div>
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

      {/* Account Detail Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent 
          className="bg-black border-white/20 max-w-2xl max-h-[80vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            // Only close on overlay click, not content click
            if (e.target === e.currentTarget) {
              setShowAccountModal(false);
            }
          }}
          onInteractOutside={(e) => {
            // Prevent closing when clicking inside the modal
            if ((e.target as HTMLElement).closest('[role="dialog"]')) {
              e.preventDefault();
            }
          }}
        >
          {selectedAccount && (
            <>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  {selectedAccount.type === 'Bank' && <Building2 className="h-6 w-6 text-blue-400" />}
                  {selectedAccount.type === 'Investing' && <LineChart className="h-6 w-6 text-blue-400" />}
                  {selectedAccount.type === 'Crypto' && <Wallet className="h-6 w-6 text-blue-400" />}
                  {selectedAccount.type === 'Credit' && <CreditCard className="h-6 w-6 text-blue-400" />}
                </div>
                {selectedAccount.name}
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-base">
                {selectedAccount.type} Account
              </DialogDescription>

              <div className="mt-6 space-y-6">
                {/* Account Overview */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{selectedAccount.type === 'Credit' ? 'Current Balance' : 'Current Balance'}</p>
                      <p className="text-3xl font-bold">{selectedAccount.balance}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Change</p>
                      <p className={`text-2xl font-semibold ${selectedAccount.change.startsWith('+') ? 'text-green-400' : selectedAccount.change.startsWith('-') ? 'text-red-400' : 'text-gray-400'}`}>
                        {selectedAccount.change}
                      </p>
                    </div>
                  </div>
                  {/* Credit Card Specific Fields */}
                  {selectedAccount.type === 'Credit' && selectedAccount.creditLimit && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Credit Limit</p>
                        <p className="text-lg font-semibold">{selectedAccount.creditLimit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Available Credit</p>
                        <p className="text-lg font-semibold text-green-400">{selectedAccount.availableCredit}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Holdings for Investment/Crypto accounts */}
                {(selectedAccount.type === 'Investing' || selectedAccount.type === 'Crypto') && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-400" />
                        Holdings
                      </h4>
                      <div className="bg-blue-600/20 border border-blue-500/30 rounded-full px-3 py-1">
                        <p className="text-xs font-semibold text-blue-400">✨ Trade & Transfer in Real-Time</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {currentDemo.holdings
                        .filter(h => 
                          (selectedAccount.type === 'Investing' && !['BTC', 'ETH', 'SOL'].includes(h.symbol)) ||
                          (selectedAccount.type === 'Crypto' && ['BTC', 'ETH', 'SOL'].includes(h.symbol))
                        )
                        .map((holding, idx) => {
                          const logoKey = `modal-${holding.symbol}`;
                          const logoFailed = failedLogos[logoKey];
                          
                          return (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-start gap-3">
                                  <div className="h-12 w-12 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {!logoFailed ? (
                                      <img 
                                        src={`https://cdn.brandfetch.io/${getSymbolDomain(holding.symbol)}`}
                                        alt={holding.symbol}
                                        className="w-full h-full object-contain p-1"
                                        onError={() => {
                                          const key = `modal-${holding.symbol}`;
                                          setFailedLogos(prev => ({ ...prev, [key]: true }));
                                        }}
                                      />
                                    ) : (
                                      <span className="text-blue-400 font-bold">{holding.symbol.substring(0, 2)}</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-lg">{holding.symbol}</p>
                                    <p className="text-sm text-gray-400">{holding.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">{holding.quantity} @ ${holding.avgCost.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold">${holding.value.toLocaleString()}</p>
                                  <p className={`text-sm ${holding.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {holding.profitLoss >= 0 ? '+' : ''}${holding.profitLoss.toLocaleString()} ({holding.profitLossPct > 0 ? '+' : ''}{holding.profitLossPct.toFixed(1)}%)
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Recent Transactions */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-400" />
                    Recent Activity
                  </h4>
                  <div className="space-y-2">
                    {(selectedAccount.transactions || currentDemo.transactions.slice(0, 3)).map((txn, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{txn.merchant}</p>
                          <p className="text-sm text-gray-400">{txn.date} · {txn.category}</p>
                        </div>
                        <p className={`font-semibold ${txn.amount.startsWith('+') ? 'text-green-400' : 'text-white'}`}>
                          {txn.amount}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-6 text-center">
                  <p className="text-lg font-semibold mb-2">Ready to connect your real accounts?</p>
                  <p className="text-sm text-gray-300 mb-4">Get started free with up to 4 accounts</p>
                  <Button 
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false);
                      scrollToSignup();
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-modal-signup"
                  >
                    Get Started Free
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
