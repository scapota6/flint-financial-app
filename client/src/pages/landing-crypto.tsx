/**
 * Flint Crypto Landing Page - SEO optimized for crypto/DeFi users
 * Route: /crypto
 * Focus: MetaMask, Coinbase, DeFi wallets, crypto portfolio tracking
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { 
  Shield, 
  Lock, 
  TrendingUp, 
  Wallet, 
  Check,
  ArrowRight,
  Zap,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import flintLogo from "@assets/flint-logo.png";
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

const CRYPTO_INSTITUTIONS = [
  { name: 'MetaMask', domain: 'metamask.io' },
  { name: 'Coinbase', domain: 'coinbase.com' },
  { name: 'Trust Wallet', domain: 'trustwallet.com' },
  { name: 'Phantom', domain: 'phantom.app' },
  { name: 'Ledger', domain: 'ledger.com' },
  { name: 'Kraken', domain: 'kraken.com' },
  { name: 'Binance', domain: 'binance.com' },
  { name: 'Gemini', domain: 'gemini.com' },
];

export default function LandingCrypto() {
  const isMobile = useIsMobile();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<'standard' | 'pro'>('standard');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, goals: ['crypto'], source: 'crypto_landing' }),
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit:', error);
    }
    setIsSubmitting(false);
  };

  const openCheckout = (tier: 'standard' | 'pro') => {
    setCheckoutTier(tier);
    setCheckoutOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Crypto Portfolio Tracker | Connect All Your Wallets | Flint</title>
        <meta name="description" content="Track all your crypto in one place. Connect MetaMask, Coinbase, Trust Wallet and more. See your total crypto value, track gains, and manage your DeFi portfolio easily." />
        <meta property="og:title" content="Crypto Portfolio Tracker | Flint" />
        <meta property="og:description" content="The Apple Wallet for all your crypto wallets. Connect every wallet and see your total crypto value in seconds." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="crypto portfolio tracker, DeFi dashboard, MetaMask tracker, Coinbase portfolio, crypto wallet aggregator, bitcoin tracker, ethereum portfolio" />
      </Helmet>

      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <img src={flintLogo} alt="Flint" className="h-8 w-8" />
                <span className="font-bold text-xl">Flint</span>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Log In
                </Button>
              </Link>
              <Button onClick={() => openCheckout('standard')} className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-full px-4 py-2 mb-6">
              <Wallet className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-orange-300">Crypto Portfolio Tracker</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              The Apple Wallet for All Your <span className="text-orange-400">Crypto Wallets</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect all your crypto wallets in one place. See your total value. Track your gains. It's that easy.
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  required
                />
                <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600">
                  {isSubmitting ? 'Joining...' : 'Get Started Free'}
                </Button>
              </form>
            ) : (
              <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4 max-w-md mx-auto mb-8">
                <Check className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-green-400">You're in! Check your email.</p>
              </div>
            )}

            <p className="text-sm text-gray-400">Free to start. No credit card needed.</p>
          </div>
        </section>

        {/* Supported Wallets */}
        <section className="py-12 border-y border-white/10 bg-white/5">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-400 mb-8">Connect your favorite crypto wallets</p>
            <div className="flex flex-wrap justify-center gap-8">
              {CRYPTO_INSTITUTIONS.map((inst) => (
                <div key={inst.name} className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                  <img 
                    src={`https://cdn.brandfetch.io/${inst.domain}/w/48/h/48?c=1id_IeGVi5W4b9Ev4e5`} 
                    alt={inst.name}
                    className="h-8 w-8 rounded-lg"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span className="text-gray-300 font-medium">{inst.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why Crypto Traders Love Flint</h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Stop switching between apps. See all your crypto in one place.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <Eye className="h-8 w-8 text-orange-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">See Everything</h3>
                  <p className="text-gray-400">
                    View all your crypto from every wallet. Bitcoin, Ethereum, Solana - all in one screen.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <TrendingUp className="h-8 w-8 text-green-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Track Your Gains</h3>
                  <p className="text-gray-400">
                    See how much you've made (or lost). Real-time prices. No spreadsheets needed.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <Shield className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Super Safe</h3>
                  <p className="text-gray-400">
                    Read-only access. We can't move your crypto. Bank-level security.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 bg-white/5 border-y border-white/10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">1</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Connect Your Wallets</h3>
                  <p className="text-gray-400">Link MetaMask, Coinbase, or any other wallet in seconds. We support 50+ wallets.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">2</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">See Your Total Value</h3>
                  <p className="text-gray-400">Watch your total crypto value update in real-time. All tokens included.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">3</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Track & Grow</h3>
                  <p className="text-gray-400">Set price alerts, track performance, and make smarter moves with your money.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple Pricing</h2>
            <p className="text-gray-400 text-center mb-12">Start free. Upgrade when you need more.</p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-3xl font-bold mb-4">$0<span className="text-lg text-gray-400">/mo</span></p>
                <ul className="space-y-3 mb-6 text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Up to 4 wallets</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Real-time prices</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Basic tracking</li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => openCheckout('standard')}>
                  Get Started
                </Button>
              </div>
              
              <div className="bg-gradient-to-b from-orange-500/20 to-transparent border border-orange-400/30 rounded-xl p-6 transform scale-105">
                <div className="text-orange-400 text-sm font-semibold mb-2">MOST POPULAR</div>
                <h3 className="text-xl font-semibold mb-2">Standard</h3>
                <p className="text-3xl font-bold mb-4">$9<span className="text-lg text-gray-400">/mo</span></p>
                <ul className="space-y-3 mb-6 text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Unlimited wallets</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Price alerts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> DeFi tracking</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Export reports</li>
                </ul>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => openCheckout('standard')}>
                  Start Free Trial
                </Button>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-3xl font-bold mb-4">$19<span className="text-lg text-gray-400">/mo</span></p>
                <ul className="space-y-3 mb-6 text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Everything in Standard</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Trade from Flint</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Tax reports</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Priority support</li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => openCheckout('pro')}>
                  Start Free Trial
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 bg-white/5 border-t border-white/10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Questions? We Got You.</h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="1" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Is my crypto safe?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Flint uses read-only access. We can see your balances but we can never move your crypto. Your keys stay with you.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Which wallets do you support?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  We support MetaMask, Coinbase, Trust Wallet, Phantom, Ledger, and 50+ more wallets and exchanges.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Can I track DeFi positions?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Flint tracks your DeFi positions including staking, liquidity pools, and lending protocols.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Is there a free plan?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Start free with up to 4 wallets. Upgrade anytime for unlimited wallets and more features.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Track All Your Crypto?</h2>
            <p className="text-gray-400 mb-8">Join thousands of crypto traders who use Flint every day.</p>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600" onClick={() => openCheckout('standard')}>
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-white/10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={flintLogo} alt="Flint" className="h-6 w-6" />
              <span className="text-gray-400">© 2025 Flint</span>
            </div>
            <div className="flex gap-6 text-gray-400">
              <Link href="/tos"><span className="hover:text-white cursor-pointer">Terms</span></Link>
              <Link href="/privacy-policy"><span className="hover:text-white cursor-pointer">Privacy</span></Link>
            </div>
          </div>
        </footer>
      </div>

      <EmbeddedCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        tier={checkoutTier}
        billingPeriod="monthly"
      />
    </>
  );
}
