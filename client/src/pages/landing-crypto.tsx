/**
 * Flint Crypto Landing Page - SEO optimized for "crypto portfolio tracker"
 * Route: /crypto
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
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

  const openCheckout = (tier: 'basic' | 'pro') => {
    setCheckoutTier(tier);
    setCheckoutBillingPeriod(isAnnual ? 'yearly' : 'monthly');
    setCheckoutOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Crypto Portfolio Tracker - Track and Trade All Your Crypto in One Place | Flint</title>
        <meta name="description" content="Track all your crypto exchanges and wallets in one dashboard. Connect Coinbase, Binance, Kraken, MetaMask and more. Send Ethereum and place trades without leaving Flint. Free to start." />
        <meta property="og:title" content="Crypto Portfolio Tracker - Track and Trade Crypto in One Place | Flint" />
        <meta property="og:description" content="The multi-exchange crypto tracker that lets you take action. Connect all your wallets, see real-time values, send crypto and place trades from one dashboard." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="crypto portfolio tracker, multi-exchange crypto tracker, track all your wallets and exchanges, track and trade crypto in one place, cryptocurrency dashboard, DeFi portfolio tracker, bitcoin tracker, ethereum portfolio" />
        <link rel="canonical" href="https://flint-investing.com/crypto" />
      </Helmet>

      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        <LandingHeader currentPage="crypto" />

        <section className="pt-28 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 mb-6">
              <Wallet className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300">Multi-Exchange Crypto Tracker</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              The <span className="text-blue-400">Crypto Portfolio Tracker</span> That Lets You Take Action
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Track all your crypto and take action from one dashboard. Send Ethereum, place trades, and manage your entire portfolio.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Link href="/login">
                <RainbowButton className="h-14 px-8 rounded-xl text-lg" data-testid="button-get-started-hero">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </RainbowButton>
              </Link>
            </div>

            <p className="text-sm text-gray-400">Free forever. No credit card needed.</p>
          </div>
        </section>

        <section className="py-16 px-4 bg-white/5 border-y border-white/10">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-400 mb-2">50+</p>
                <p className="text-gray-400">Exchanges & Wallets</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400 mb-2">Real-Time</p>
                <p className="text-gray-400">Portfolio Tracking</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400 mb-2">Trade & Send</p>
                <p className="text-gray-400">From One Place</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-400 mb-8">Connect your favorite exchanges and wallets</p>
            <div className="relative overflow-hidden">
              <div className="flex gap-8 animate-[scroll_40s_linear_infinite]">
                {[...CRYPTO_INSTITUTIONS, ...CRYPTO_INSTITUTIONS].map((inst, idx) => (
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
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why Crypto Traders Love Flint</h2>
            <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
              More than a tracker. A complete crypto command center.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <Eye className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">One Dashboard</h3>
                  <p className="text-gray-400 text-sm">
                    See all your crypto from every wallet and exchange in a single view.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <RefreshCw className="h-8 w-8 text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Real-Time Tracking</h3>
                  <p className="text-gray-400 text-sm">
                    Watch your total crypto value update live across all chains.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-blue-400/30 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-gradient-to-b from-blue-500/10 to-transparent rounded-lg p-6 h-full">
                  <Send className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Trade & Send</h3>
                  <p className="text-gray-400 text-sm">
                    Send Ethereum and place trades without leaving Flint.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <Shield className="h-8 w-8 text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Your Keys, Your Crypto</h3>
                  <p className="text-gray-400 text-sm">
                    We never take custody. Your private keys stay with you.
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
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-black">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Connect Your Exchanges and Wallets</h3>
                  <p className="text-gray-400">Link Coinbase, Binance, Kraken, MetaMask, and 50+ more in seconds.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-black">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">See Your Total Crypto Value in Real Time</h3>
                  <p className="text-gray-400">View your complete portfolio across all connected accounts. Track everything live.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-black">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Take Action Without Leaving Flint</h3>
                  <p className="text-gray-400">Send Ethereum or place trades on your connected accounts. No app switching required.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to take control of your crypto?</h2>
            <p className="text-gray-400 mb-8">Join thousands of traders managing their portfolios with Flint.</p>
            <Link href="/login">
              <RainbowButton className="h-14 px-12 rounded-xl text-lg" data-testid="button-cta-mid">
                Get Started Free
              </RainbowButton>
            </Link>
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
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Track all your crypto</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Real-time updates</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Mobile app</li>
                  </ul>
                  <Link href="/login">
                    <RainbowButton className="w-full" data-testid="button-free-plan">
                      Start Free
                    </RainbowButton>
                  </Link>
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
                    <p className="text-sm text-gray-400">For active traders</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Unlimited accounts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Everything in Free</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Price alerts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> DeFi tracking</li>
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
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Send crypto</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Advanced charts</li>
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
                <AccordionTrigger className="text-left hover:no-underline">Can I track all my crypto exchanges in one app?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Flint lets you connect multiple exchanges and wallets to see your complete crypto portfolio in one dashboard. We support Coinbase, Binance, Kraken, Gemini, Crypto.com, and 50+ other platforms.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Is there a crypto portfolio tracker that lets me trade?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes - that's what makes Flint different. Most portfolio trackers are read-only, but Flint lets you place trades on your connected exchange accounts and send Ethereum directly from your connected wallet.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Which wallets and exchanges does Flint support?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Flint supports 50+ wallets and exchanges including MetaMask, Coinbase, Binance, Kraken, Gemini, Crypto.com, KuCoin, Bitstamp, OKX, Bybit, and many more.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Is it safe to connect my wallets?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Absolutely. Flint uses secure connections - we never have access to your passwords or private keys. Your keys stay with you. We are not a bank or custodian and never take custody of your funds.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="5" className="bg-white/5 border border-white/10 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">Is there a free crypto portfolio tracker plan?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Flint offers a free plan that lets you connect up to 4 accounts and track your crypto portfolio with real-time updates. It's free forever with no credit card required.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section className="py-20 px-4 bg-white/5 border-t border-white/10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start managing your crypto today</h2>
            <p className="text-gray-400 mb-8">Free forever. No credit card needed.</p>
            <Link href="/login">
              <RainbowButton className="h-14 px-12 rounded-xl text-lg" data-testid="button-cta-bottom">
                Get Started Free
              </RainbowButton>
            </Link>
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
