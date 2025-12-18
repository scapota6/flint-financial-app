/**
 * Flint Investing Landing Page - SEO optimized for stock investors
 * Route: /investing
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { 
  Shield, 
  TrendingUp, 
  BarChart3, 
  Check,
  ArrowRight,
  LineChart,
  PieChart
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

      <div className="min-h-screen bg-black text-white overflow-x-hidden">
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
                <Button variant="ghost" className="text-gray-300 hover:text-white" data-testid="link-login">
                  Log In
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-get-started-header">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 mb-6">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300">Stock Portfolio Tracker</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              The Apple Wallet for All Your <span className="text-blue-400">Investment Apps</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect all your brokerages in one place. See your total portfolio. Track your gains. Trade smarter.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700" data-testid="button-get-started-hero">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/20" data-testid="button-login-hero">
                  Log In
                </Button>
              </Link>
            </div>

            <p className="text-sm text-gray-400">Free to start. No credit card needed.</p>
          </div>
        </section>

        <section className="py-12 border-y border-white/10 bg-white/5">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-400 mb-8">Connect 50+ brokerages</p>
            <div className="relative overflow-hidden">
              <div className="flex gap-8 animate-[scroll_50s_linear_infinite]">
                {[...INVESTING_INSTITUTIONS, ...INVESTING_INSTITUTIONS].map((inst, idx) => (
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

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why Investors Love Flint</h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Stop logging into 5 different apps. See all your stocks in one place.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <PieChart className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">One Dashboard</h3>
                  <p className="text-gray-400">
                    See stocks from Robinhood, Schwab, Fidelity - all your brokers in one screen.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <TrendingUp className="h-8 w-8 text-green-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Track Performance</h3>
                  <p className="text-gray-400">
                    See your total gains across all accounts. Real-time updates. No manual tracking.
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl border border-white/10 p-2">
                <GlowingEffect spread={40} glow={true} disabled={isMobile} proximity={64} inactiveZone={0.01} borderWidth={1} />
                <div className="bg-white/5 rounded-lg p-6 h-full">
                  <LineChart className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Trade Smarter</h3>
                  <p className="text-gray-400">
                    Set price alerts, watch stocks, and even trade directly from Flint.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-white/5 border-y border-white/10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">1</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Connect Your Brokers</h3>
                  <p className="text-gray-400">Link Robinhood, Schwab, Fidelity or any other broker in seconds. We support 50+ brokerages.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">2</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">See Your Total Portfolio</h3>
                  <p className="text-gray-400">Watch your total investment value update in real-time. All stocks, ETFs, and options included.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">3</div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Invest & Grow</h3>
                  <p className="text-gray-400">Set alerts, track dividends, and make smarter investment decisions with better data.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Pick Your Plan</h2>
              <p className="text-gray-400 mb-6">Start free. Upgrade for advanced features.</p>
              
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
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Live updates</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-400" /> Mobile app</li>
                  </ul>
                  <Link href="/login">
                    <Button variant="outline" className="w-full" data-testid="button-free-plan">
                      Start Free
                    </Button>
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
                    <p className="text-sm text-gray-400">For active investors</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-blue-400" /> Unlimited accounts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Everything in Free</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Price alerts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Dividend tracking</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Email support</li>
                  </ul>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => openCheckout('basic')} data-testid="button-standard-plan">
                    Get Standard
                  </Button>
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
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Advanced charts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-blue-400" /> Fast support</li>
                  </ul>
                  <Button variant="outline" className="w-full" onClick={() => openCheckout('pro')} data-testid="button-pro-plan">
                    Get Pro
                  </Button>
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

        <section className="py-20 px-4 bg-white/5 border-t border-white/10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Common Questions</h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="1" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Is my data safe?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Flint uses bank-level encryption and read-only access. We can see your holdings but we can never make trades without your permission.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="2" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Which brokerages do you support?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  We support Robinhood, Charles Schwab, Fidelity, E*TRADE, TD Ameritrade, Vanguard, Webull, Interactive Brokers, and 50+ more brokerages.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="3" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Can I trade from Flint?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Pro users can place trades directly through Flint. Your orders are sent to your connected brokerage.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="4" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-left">Is there a free plan?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes! Start free with up to 4 accounts. Upgrade anytime for unlimited accounts and more features.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Track All Your Investments?</h2>
            <p className="text-gray-400 mb-8">Join thousands of investors who use Flint every day.</p>
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700" data-testid="button-cta-bottom">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

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
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        billingPeriod={checkoutBillingPeriod}
      />
    </>
  );
}
